import type { Preferences } from "../../domain/types";

export const PREFERENCES_STORAGE_KEY = "nexo.preferences.v1";

export const DEFAULT_PREFERENCES: Preferences = {
  reduceMotion: false,
  desktopNotifications: true,
  sound: true,
};

export function getPreferences(): Preferences {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null);
    if (!storage) return DEFAULT_PREFERENCES;
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function applyReducedMotion(reduceMotion: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", reduceMotion);
  if (reduceMotion) {
    root.setAttribute("data-reduce-motion", "true");
  } else {
    root.removeAttribute("data-reduce-motion");
  }
}

export function savePreferences(prefs: Partial<Preferences>): Preferences {
  const current = getPreferences();
  const updated = { ...current, ...prefs };
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null);
    if (storage) {
      storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
    }
    if (typeof prefs.reduceMotion === "boolean") {
      applyReducedMotion(prefs.reduceMotion);
    }
  } catch {
    /* ignore */
  }
  return updated;
}

export function initPreferences(): void {
  if (typeof window === "undefined") return;
  const prefs = getPreferences();
  const osPrefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const shouldReduce = prefs.reduceMotion || osPrefersReducedMotion;
  applyReducedMotion(shouldReduce);
}
