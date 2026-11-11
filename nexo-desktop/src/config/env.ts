/**
 * Build-time, NON-secret configuration. Each value is read with a static `import.meta.env.VITE_X`
 * expression so Vite only inlines these specific variables (never the whole env object, which could
 * contain API keys). Outside Vite (tests run in Node) the access throws and we fall back to undefined.
 */
const clean = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export function buildApiUrl(): string | undefined {
  try { return clean(import.meta.env.VITE_API_URL); } catch { return undefined; }
}

export function buildDefaultMode(): "server" | "mock" | undefined {
  try {
    const value = clean(import.meta.env.VITE_DEFAULT_MODE);
    return value === "server" || value === "mock" ? value : undefined;
  } catch { return undefined; }
}

export function buildSupabaseUrl(): string | undefined {
  try { return clean(import.meta.env.VITE_SUPABASE_URL); } catch { return undefined; }
}

/** The anon key is public by design (row access is enforced by the server); it is safe to ship. */
export function buildSupabaseAnonKey(): string | undefined {
  try { return clean(import.meta.env.VITE_SUPABASE_ANON_KEY); } catch { return undefined; }
}

/**
 * Shared demo account for reviewers (one click on the login screen). These credentials are PUBLIC by
 * design: anyone with the app can read them, so the account must hold only demo data.
 */
export function buildDemoAccount(): { email: string; password: string } | undefined {
  try {
    const email = clean(import.meta.env.VITE_DEMO_EMAIL);
    const password = clean(import.meta.env.VITE_DEMO_PASSWORD);
    return email && password ? { email, password } : undefined;
  } catch { return undefined; }
}

/** Windows installer served by the web app itself (public/downloads). VITE_RELEASES_URL overrides it. */
export const WINDOWS_INSTALLER_PATH = "/downloads/Nexo-Setup-x64.exe";

export function buildReleasesUrl(): string {
  try { return clean(import.meta.env.VITE_RELEASES_URL) ?? WINDOWS_INSTALLER_PATH; }
  catch { return WINDOWS_INSTALLER_PATH; }
}
