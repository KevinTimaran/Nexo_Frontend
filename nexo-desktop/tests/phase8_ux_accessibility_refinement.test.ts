import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { ChatMessage } from "../src/domain/types";
import { saveFeedbackLabel, userFacingError } from "../src/services/uxFeedback";

console.log("=== PHASE 8: UX, ACCESSIBILITY AND INTERFACE REFINEMENT ===");

const root = process.cwd();
const source = (relative: string) => fs.readFileSync(path.resolve(root, relative), "utf8");

if (!Module._extensions[".ts"]) {
  Module._extensions[".ts"] = (module, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
}
if (!Module._extensions[".tsx"]) {
  Module._extensions[".tsx"] = (module, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
}

function loadTsxComponent<T>(relative: string): T {
  const filePath = path.resolve(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filePath,
  });
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  mod._compile(output.outputText, filePath);
  return mod.exports as T;
}

const { ViewModeToggle } = loadTsxComponent<{ ViewModeToggle: React.FC<Record<string, unknown>> }>("src/components/ui/ViewModeToggle.tsx");
const { FullScreenDiscoveryChat, recoverComposerDraft } = loadTsxComponent<{
  FullScreenDiscoveryChat: React.FC<Record<string, unknown>>;
  recoverComposerDraft: (current: string, submitted: string | null, failed: boolean, lastSent?: string | null) => string;
}>("src/features/workspace/FullScreenDiscoveryChat.tsx");

const toggleHtml = renderToStaticMarkup(React.createElement(ViewModeToggle, {
  mode: "discovery",
  onChange: () => {},
  isLocked: true,
}));
assert.match(toggleHtml, /aria-label="1\. Ideación IA"/);
assert.match(toggleHtml, /aria-label="2\. Tablero de Conceptos"/);
assert.match(toggleHtml, /aria-disabled="true"/);
assert.ok(toggleHtml.includes("lg:hidden"), "View navigation must expose compact labels for narrow windows");

assert.equal(recoverComposerDraft("", "Mi explicación no debe perderse", true), "Mi explicación no debe perderse");
assert.equal(recoverComposerDraft("Borrador más reciente", "Anterior", true), "Borrador más reciente");
assert.equal(recoverComposerDraft("", "Enviado", false), "");
assert.equal(recoverComposerDraft("", "Hola, quiero crear una app", true, "Hola, quiero crear una app"), "", "A draft already saved in the conversation must not be restored (it caused repeated messages)");
assert.ok(!userFacingError(new Error("Request failed: 422 invalid schema"), "es").includes("422"));
assert.match(userFacingError(new Error("Failed to fetch"), "es"), /sigue guardada/i);
assert.equal(saveFeedbackLabel("saving", "es"), "Guardando…");
assert.equal(saveFeedbackLabel("error", "en"), "Not saved");

const tenTurns: ChatMessage[] = Array.from({ length: 10 }, (_, index) => ({
  id: `turn-${index}`,
  role: index % 2 === 0 ? "user" as const : "assistant" as const,
  type: "text" as const,
  content: index % 2 === 0 ? `Aporte del usuario ${index + 1}` : `Respuesta clara de Nexo ${index + 1}`,
}));
const chatHtml = renderToStaticMarkup(React.createElement(FullScreenDiscoveryChat, {
  messages: tenTurns,
  isThinking: true,
  thinkingLabel: "Investigando fuentes…",
  onSendMessage: () => {},
}));
assert.ok(chatHtml.includes("Aporte del usuario 9") && chatHtml.includes("Respuesta clara de Nexo 10"));
assert.match(chatHtml, /aria-label="Mensaje para Nexo"/);
assert.match(chatHtml, /aria-label="Enviar mensaje"/);
assert.match(chatHtml, /role="status"/);
assert.ok(chatHtml.includes("Investigando fuentes…"));

const errorHtml = renderToStaticMarkup(React.createElement(FullScreenDiscoveryChat, {
  messages: tenTurns.slice(0, 2),
  error: "No pude conectar con el servicio. Tu información sigue guardada y puedes reintentar.",
  onRetry: () => {},
  onSendMessage: () => {},
}));
assert.match(errorHtml, /role="alert"/);
assert.ok(errorHtml.includes("Reintentar ahora"));

const focusHook = source("src/hooks/useDialogFocus.ts");
const modal = source("src/components/ui/Modal.tsx");
const commandPalette = source("src/components/navigation/CommandPalette.tsx");
const onboarding = source("src/components/onboarding/OnboardingTour.tsx");
const notionViewer = source("src/features/workspace/NotionModalViewer.tsx");
const styles = source("src/styles/index.css");
const workspace = source("src/features/workspace/WorkspaceView.tsx");
const spatial = source("src/features/spatial/SpatialCanvas3D.tsx");
const spaceWorkspace = source("src/features/spatial/SpaceWorkspace.tsx");
const conceptCanvas = source("src/features/workspace/ConceptCanvas.tsx");
const chat = source("src/features/workspace/FullScreenDiscoveryChat.tsx");

assert.ok(focusHook.includes("previousFocus") && focusHook.includes("FOCUSABLE_SELECTOR"));
for (const [name, file] of [["Modal", modal], ["CommandPalette", commandPalette], ["OnboardingTour", onboarding], ["NotionModalViewer", notionViewer]] as const) {
  assert.ok(file.includes("useDialogFocus"), `${name} must trap and restore focus`);
}
assert.ok(styles.includes(":focus-visible") && styles.includes("outline: 2px solid var(--focus)"));
assert.ok(workspace.includes("saveFeedbackLabel(saveStatus") && workspace.includes("Quitar concepto del proyecto"));
assert.ok(spatial.includes("Ajustar todos los conceptos en la vista 3D"));
assert.ok(spaceWorkspace.includes("empty-spatial-title"));
assert.ok(conceptCanvas.includes("boardEmpty.title") && conceptCanvas.includes("ux.continueIdeation"));
assert.ok(chat.includes("Ver fuentes analizadas") && chat.includes("Interpretación de Nexo"));
assert.ok(chat.includes("Mayús más Enter"), "Composer must explain its multiline keyboard behavior");

const es = JSON.parse(source("src/i18n/locales/es/translation.json"));
const en = JSON.parse(source("src/i18n/locales/en/translation.json"));
assert.equal(es.views.board, "2. Tablero de Conceptos");
assert.equal(en.views.board, "2. Concept Board");
assert.ok(es.ux.boardEmpty.title && en.ux.boardEmpty.title);

console.log("✓ Phase 8 accessibility, feedback, empty/error/loading states, responsiveness and 10-turn readability passed");
