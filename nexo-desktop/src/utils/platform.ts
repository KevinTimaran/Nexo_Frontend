/**
 * Runtime platform detection. The same bundle runs in the browser (web) and inside the Tauri
 * desktop shell; only the web build shows the public landing page.
 */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const isWeb = (): boolean => !isTauri();
