import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isSoundEnabled,
  setSoundEnabled,
} from "../src/services/audio/soundEffects";
import {
  getPreferences,
  savePreferences,
  applyReducedMotion,
  DEFAULT_PREFERENCES,
} from "../src/services/preferences";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
} from "../src/components/onboarding/onboardingData";

describe("Phase 08 Onboarding and Interaction Settings", () => {
  beforeEach(() => {
    // Reset global dom/localStorage mocks
    if (typeof globalThis.document === "undefined") {
      const classList = new Set<string>();
      const attributes = new Map<string, string>();

      (globalThis as any).document = {
        documentElement: {
          classList: {
            toggle: (cls: string, force?: boolean) => {
              if (force === true) classList.add(cls);
              else if (force === false) classList.delete(cls);
              else if (classList.has(cls)) classList.delete(cls);
              else classList.add(cls);
              return classList.has(cls);
            },
            contains: (cls: string) => classList.has(cls),
          },
          setAttribute: (name: string, val: string) => attributes.set(name, val),
          removeAttribute: (name: string) => attributes.delete(name),
          getAttribute: (name: string) => attributes.get(name) || null,
        },
      };
    }

    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    };
  });

  it("manages sound effects preference and muting state", () => {
    assert.equal(isSoundEnabled(), true);

    setSoundEnabled(false);
    assert.equal(isSoundEnabled(), false);

    setSoundEnabled(true);
    assert.equal(isSoundEnabled(), true);
  });

  it("applies reduced motion application-wide via class and data-reduce-motion attribute", () => {
    applyReducedMotion(true);
    const root = document.documentElement;
    assert.equal(root.classList.contains("reduce-motion"), true);
    assert.equal(root.getAttribute("data-reduce-motion"), "true");

    applyReducedMotion(false);
    assert.equal(root.classList.contains("reduce-motion"), false);
    assert.equal(root.getAttribute("data-reduce-motion"), null);
  });

  it("persists preferences and synchronizes reduced motion", () => {
    const prefs = savePreferences({ reduceMotion: true, sound: false });
    assert.equal(prefs.reduceMotion, true);
    assert.equal(prefs.sound, false);

    const retrieved = getPreferences();
    assert.equal(retrieved.reduceMotion, true);
    assert.equal(retrieved.sound, false);

    // Verify root HTML element received data-reduce-motion
    assert.equal(document.documentElement.getAttribute("data-reduce-motion"), "true");
  });

  it("provides complete 4-step onboarding tour with valid keys and metadata", () => {
    assert.equal(ONBOARDING_STEPS.length, 4);
    assert.equal(ONBOARDING_STORAGE_KEY, "nexo.onboarding.completed");

    const ids = ONBOARDING_STEPS.map((s) => s.id);
    assert.deepEqual(ids, ["ideation", "board", "spatial", "export"]);

    for (const step of ONBOARDING_STEPS) {
      assert.ok(step.title.length > 5, "Step has descriptive title");
      assert.ok(step.description.length > 20, "Step has detailed walkthrough text");
      assert.ok(step.icon, "Step provides Lucide icon");
    }
  });

  it("verifies SettingsModal contains restart onboarding button", () => {
    const settingsPath = path.resolve(__dirname, "../src/features/settings/SettingsModal.tsx");
    const content = fs.readFileSync(settingsPath, "utf-8");

    assert.match(content, /handleRestartOnboarding/);
    assert.match(content, /Reiniciar guía de bienvenida/);
    assert.match(content, /nexo:start-onboarding/);
  });

  it("verifies node selection sound triggers in SpatialCanvas3D and ConceptCanvas", () => {
    const spatialCanvasPath = path.resolve(__dirname, "../src/features/spatial/SpatialCanvas3D.tsx");
    const spatialCanvas = fs.readFileSync(spatialCanvasPath, "utf-8");
    assert.match(spatialCanvas, /playNodeSelectSound/);

    const conceptCanvasPath = path.resolve(__dirname, "../src/features/workspace/ConceptCanvas.tsx");
    const conceptCanvas = fs.readFileSync(conceptCanvasPath, "utf-8");
    assert.match(conceptCanvas, /playNodeSelectSound/);
  });
});
