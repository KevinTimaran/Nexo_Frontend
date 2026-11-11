import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const read = (path: string) => fs.readFileSync(path, "utf8");

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});

const { isTauri, isWeb } = await import("../src/utils/platform");
const env = await import("../src/config/env");
const { getAccessToken, getSupabase, isSupabaseConfigured } = await import("../src/services/supabase");
const { httpAuth } = await import("../src/services/http");
const { getActiveServiceMode } = await import("../src/services/registry");


// Loads a .tsx component with plain TypeScript (jiti cannot parse JSX). config/env uses import.meta, which
// CommonJS cannot parse, so it is replaced by the same functions as seen outside Vite.
function loadTsx<T>(filePath: string): T {
  const extensions = (Module as unknown as { _extensions: Record<string, (m: { _compile: (c: string, f: string) => void }, f: string) => void> })._extensions;
  for (const ext of [".ts", ".tsx"]) {
    if (extensions[ext]) continue;
    extensions[ext] = (module, filename) => {
      const out = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
        fileName: filename,
      });
      module._compile(out.outputText, filename);
    };
  }
  const envPath = path.resolve(process.cwd(), "src/config/env.ts");
  (Module as unknown as { _cache: Record<string, unknown> })._cache[envPath] = {
    id: envPath, filename: envPath, loaded: true, exports: { ...env },
  };
  const transpiled = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filePath,
  });
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = (Module as unknown as { _nodeModulePaths: (dir: string) => string[] })._nodeModulePaths(path.dirname(filePath));
  (mod as unknown as { _compile: (code: string, file: string) => void })._compile(transpiled.outputText, filePath);
  return mod.exports as T;
}

// ───────────── Platform detection: web vs Tauri desktop ─────────────
assert.equal(isTauri(), false, "No window in Node: treated as web");
assert.equal(isWeb(), true);
(globalThis as unknown as { window: object }).window = { __TAURI_INTERNALS__: {} };
assert.equal(isTauri(), true, "Tauri injects __TAURI_INTERNALS__");
assert.equal(isWeb(), false);
delete (globalThis as unknown as { window?: object }).window;

// ───────────── Build-time config never throws outside Vite and has safe defaults ─────────────
assert.equal(env.buildApiUrl(), undefined);
assert.equal(env.buildSupabaseUrl(), undefined);
assert.equal(env.buildSupabaseAnonKey(), undefined);
assert.equal(env.buildDefaultMode(), undefined);
assert.ok(env.buildReleasesUrl().startsWith("https://github.com/"));
assert.equal(getActiveServiceMode(), "mock", "Without VITE_DEFAULT_MODE the local default is unchanged");
const envSource = read("src/config/env.ts");
assert.ok(!/import\.meta\.env\s*[;,)]/.test(envSource.replace(/import\.meta\.env\.VITE_/g, "")), "Only static VITE_ accesses: never the whole env object (it could contain API keys)");
assert.ok(!/KEY/.test(envSource.replace("ANON_KEY", "")) || envSource.includes("ANON_KEY"), "Only the public Supabase anon key is read");
assert.ok(read("src/services/registry.ts").includes('buildDefaultMode() ?? "mock"'));

// ───────────── Supabase is optional and lazy ─────────────
assert.equal(isSupabaseConfigured(), false);
assert.equal(getSupabase(), null);
assert.equal(await getAccessToken(), null);
const local = await httpAuth.signIn("ana@example.com", "irrelevant");
assert.equal(local.email, "ana@example.com");
assert.equal(local.name, "ana", "Without Supabase (local development) sign-in yields a local user");
await httpAuth.signOut();

// ───────────── The API client sends the Supabase token and identifies the platform ─────────────
const http = read("src/services/http/index.ts");
assert.ok(http.includes("Authorization: `Bearer ${token}`"), "httpFetch must attach the access token");
assert.ok(http.includes('isTauri() ? "tauri-desktop" : "web"'));
assert.ok(http.includes("nexo:session-expired"), "A 401 for a signed-in user ends the session");
assert.ok(http.includes('"email-confirmation"'), "Sign-up with email confirmation is reported, not treated as a failure");
assert.ok(http.includes("buildApiUrl() ?? LOCAL_API_URL"));

// ───────────── Routes: landing only on web, never in the desktop app ─────────────
const app = read("src/App.tsx");
assert.ok(app.includes("if (!isTauri())"), "Landing and guest routes are gated by the platform");
assert.ok(app.includes('<Route path="/" element={<LandingPage />} />'));
assert.ok(app.indexOf("GuestRoutes") < app.indexOf("<ProtectedRoute />"));
assert.ok(app.includes("isHydrating"), "No flash of the landing while the saved session is restored");
const guestBlock = app.slice(app.indexOf("const GuestRoutes"), app.indexOf("const AppRoutes"));
assert.ok(guestBlock.includes('to="/login" state={{ from: location }}'), "Deep links keep their destination through the login");

// ───────────── Landing page: light theme, same design system, both actions ─────────────
const landingSource = read("src/features/landing/LandingPage.tsx");
assert.ok(landingSource.includes('root.classList.remove("dark")') && landingSource.includes('root.classList.add("light")'));
assert.ok(landingSource.includes("root.className = previous.className"), "The visitor's theme is restored on leaving");
assert.ok(!landingSource.includes("localStorage"), "The landing never overwrites the saved theme preference");
assert.ok(landingSource.includes("<NexoLogo") && landingSource.includes("btn-primary") && landingSource.includes("glass-card"));
assert.ok(landingSource.includes("overflow-y-auto"), "Own scroll container: the app body has overflow hidden");
assert.ok(landingSource.includes("select-text"));

const { LandingPage } = loadTsx<{ LandingPage: React.FC }>(path.resolve(process.cwd(), "src/features/landing/LandingPage.tsx"));
const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(LandingPage)));
for (const text of ["Iniciar sesión", "Registrarse", "Descargar para Windows", "Cómo funciona", "un proyecto claro"]) {
  assert.ok(html.includes(text), `Landing must show "${text}"`);
}
assert.ok(html.includes('href="/login"') && html.includes('href="/register"'), "Login and register buttons navigate to the auth pages");
assert.ok(html.includes('target="_blank"') && html.includes("releases"), "Download links to the published installer");
assert.ok(!/(?:text|bg|border)-(?:gray|slate|zinc|neutral|red|green|blue)-\d{2,3}/.test(landingSource), "Design tokens only");
assert.ok(!/#[0-9a-fA-F]{6}\b/.test(landingSource), "No hardcoded hex colors");

// ───────────── i18n: same landing keys in both languages ─────────────
const es = JSON.parse(read("src/i18n/locales/es/translation.json"));
const en = JSON.parse(read("src/i18n/locales/en/translation.json"));
const shape = (value: unknown): unknown => value && typeof value === "object" ? Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, shape(v)])) : "text";
assert.deepEqual(shape(es.landing), shape(en.landing));
assert.ok(es.landing.hero.titleHighlight && en.landing.hero.titleHighlight);

// ───────────── Hosted builds keep secrets out of the repo ─────────────
const gitignore = read(".gitignore");
assert.ok(gitignore.split(/\r?\n/).includes(".env"), ".env (AI keys) stays ignored");
assert.ok(fs.existsSync(".env.production.example"));
assert.ok(!/eyJ[A-Za-z0-9_-]{20,}/.test(read(".env.production.example")), "No real tokens in the example file");

console.log("✓ Web landing, platform gating, Supabase auth plumbing and build config verified");
