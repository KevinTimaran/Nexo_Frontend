/**
 * Zero-dependency Web Audio API sound effects for Nexo Desktop.
 * Provides subtle auditory feedback on UI button clicks and distinct harmonic chime on 3D node selection.
 * Controlled by user preferences (sound: boolean).
 */

const PREFERENCES_STORAGE_KEY = "nexo.preferences.v1";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function isSoundEnabled(): boolean {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null);
    if (!storage) return true;
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return true;
    const prefs = JSON.parse(raw);
    return prefs.sound !== false;
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null);
    if (!storage) return;
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    prefs.sound = enabled;
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/**
 * Plays a short, crisp transient click tone for UI button interactions.
 */
export function playButtonClickSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    // Graceful fallback for blocked audio contexts
  }
}

/**
 * Plays a gentle, distinct harmonic chime for 2D/3D node selection.
 */
export function playNodeSelectSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Fundamental tone: 523.25 Hz (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Harmonic overtone: 1046.5 Hz (C6) for sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1046.5, now);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.15);
  } catch {
    // Graceful fallback
  }
}
