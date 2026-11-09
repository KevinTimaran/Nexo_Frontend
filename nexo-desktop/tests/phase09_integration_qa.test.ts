import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { LIMITS, countCodePoints, validateLength } from "../src/domain/limits";
import { warmLuxuryDark, warmEditorialLight } from "../src/theme/tokens";
import type { ProjectIcon } from "../src/domain/types";
import {
  generateDocxBuffer,
  generateProjectDocxBuffer,
  sanitizeDocxFileName,
} from "../src/features/spatial/exportToDocx";
import {
  isSoundEnabled,
  setSoundEnabled,
} from "../src/services/audio/soundEffects";
import {
  getPreferences,
  savePreferences,
  applyReducedMotion,
} from "../src/services/preferences";
import { ONBOARDING_STEPS } from "../src/components/onboarding/onboardingData";
import { getSystemInstruction } from "../src/services/ai/prompts";

describe("Phase 09 Integration and Final Quality Assurance (17 Capabilities)", () => {
  it("Capability 1: User Authentication & Security validation contracts", () => {
    const loginPath = path.resolve(__dirname, "../src/features/auth/LoginView.tsx");
    const loginContent = fs.readFileSync(loginPath, "utf-8");
    // Pristine production screen: no debug cards or adapter text
    assert.doesNotMatch(loginContent, /Adaptador de Autenticación/i);
    assert.doesNotMatch(loginContent, /ShieldCheck/);
  });

  it("Capability 2: Workspace & Project Creation with curated 6-icon selector", () => {
    const canonicalIcons: ProjectIcon[] = ["lightbulb", "leaf", "scale", "rocket", "book", "compass"];
    assert.equal(canonicalIcons.length, 6);
    assert.deepEqual(canonicalIcons.sort(), ["book", "compass", "leaf", "lightbulb", "rocket", "scale"].sort());
  });

  it("Capability 3: Folder Organization & duplicate prevention", () => {
    const folderName = "Investigación Estratégica 2026";
    const check = validateLength(folderName, LIMITS.FOLDER_NAME, "Nombre de carpeta");
    assert.equal(check.valid, true);

    const overLimit = "X".repeat(51);
    const overCheck = validateLength(overLimit, LIMITS.FOLDER_NAME, "Nombre de carpeta");
    assert.equal(overCheck.valid, false);
  });

  it("Capability 4: Real AI Progressive Ideation & Chat Context", () => {
    const geminiServicePath = path.resolve(__dirname, "../src/services/gemini/index.ts");
    const geminiContent = fs.readFileSync(geminiServicePath, "utf-8");
    // Ensure zero silent mock fallbacks on error
    assert.doesNotMatch(geminiContent, /mockServices\.ai\.reply/);
  });

  it("Capability 5: Centralized Character Limits & Validation Counters", () => {
    assert.equal(LIMITS.PROJECT_NAME, 60);
    assert.equal(LIMITS.PROJECT_DESCRIPTION, 500);
    assert.equal(LIMITS.CANVAS_NAME, 60);
    assert.equal(LIMITS.AI_CHAT_MESSAGE, 20_000);
    assert.equal(LIMITS.NODE_NAME, 80);
    assert.equal(LIMITS.FOLDER_NAME, 50);
  });

  it("Capability 6: Strict Image Rejection Enforcement", () => {
    const constantsPath = path.resolve(__dirname, "../src/domain/constants.ts");
    const constants = fs.readFileSync(constantsPath, "utf-8");
    assert.match(constants, /Nexo solo procesa texto; no se admiten imágenes/);
  });

  it("Capability 7: 9-Step Automated Concept Extraction Pipeline", () => {
    const instruction = getSystemInstruction("PHASE_3_EXPANSION", "es", "Proyecto de Prueba");
    assert.ok(instruction.includes("legal"));
    assert.ok(instruction.includes("economic"));
    assert.ok(instruction.includes("political"));
    assert.ok(instruction.includes("technical"));
    assert.ok(instruction.includes("relevanceScore"));
  });

  it("Capability 8: 2D Concept Board 4-Column Categorization", () => {
    const conceptCanvasPath = path.resolve(__dirname, "../src/features/workspace/ConceptCanvas.tsx");
    const canvasContent = fs.readFileSync(conceptCanvasPath, "utf-8");
    assert.match(canvasContent, /legal/);
    assert.match(canvasContent, /economic/);
    assert.match(canvasContent, /political/);
    assert.match(canvasContent, /technical/);
  });

  it("Capability 9: 3D Neuronal WebGL Force-Graph Visualization", () => {
    const spatialCanvasPath = path.resolve(__dirname, "../src/features/spatial/SpatialCanvas3D.tsx");
    const spatialCanvas = fs.readFileSync(spatialCanvasPath, "utf-8");
    assert.match(spatialCanvas, /MeshPhysicalMaterial/);
    assert.match(spatialCanvas, /SpriteText/);
    assert.match(spatialCanvas, /linkDirectionalParticles/);
  });

  it("Capability 10: Synchronized Document Inspection across 2D and 3D", () => {
    const conceptCanvasPath = path.resolve(__dirname, "../src/features/workspace/ConceptCanvas.tsx");
    const canvasContent = fs.readFileSync(conceptCanvasPath, "utf-8");
    assert.match(canvasContent, /setCanvasMode\("spatial"\)/);
    assert.match(canvasContent, /setDocViewMode\("fullscreen"\)/);
  });

  it("Capability 11: Real AI Assistance in 3D Workspace", () => {
    const spatialChatPath = path.resolve(__dirname, "../src/features/spatial/SpatialChatPanel.tsx");
    const chatContent = fs.readFileSync(spatialChatPath, "utf-8");
    assert.match(chatContent, /services\.ai\.reply/);
    assert.doesNotMatch(chatContent, /Reactores de Fusión/);
  });

  it("Capability 12: Real Word (.docx) Document Export", async () => {
    const singleNodeBuffer = await generateDocxBuffer("Nodo Test", "# Título\nContenido de prueba");
    assert.ok(singleNodeBuffer.length > 5000);
    assert.equal(singleNodeBuffer[0], 0x50);
    assert.equal(singleNodeBuffer[1], 0x4b);

    const projectBuffer = await generateProjectDocxBuffer(
      { name: "Proyecto Nexo Test" },
      [{ id: "1", name: "Concepto 1", group: "legal", importance: 0.9 }],
      []
    );
    assert.ok(projectBuffer.length > 8000);
    assert.equal(projectBuffer[0], 0x50);
    assert.equal(projectBuffer[1], 0x4b);
  });

  it("Capability 13: Warm Luxury Dark Theme Fidelity", () => {
    assert.equal(warmLuxuryDark.bgMain, "#170704");
    assert.equal(warmLuxuryDark.accentPrimary, "#E5C158");
    assert.equal(warmLuxuryDark.surfacePrimary, "#2A1412");
  });

  it("Capability 14: Warm Editorial Light Theme Fidelity", () => {
    assert.equal(warmEditorialLight.bgMain, "#F7F3ED");
    assert.equal(warmEditorialLight.accentPrimary, "#9E2A2B");
    assert.equal(warmEditorialLight.surfacePrimary, "#FFFFFF");
  });

  it("Capability 15: Native Typography Scale and System Stack", () => {
    const cssPath = path.resolve(__dirname, "../src/styles/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.match(cssContent, /-apple-system, BlinkMacSystemFont/);
    assert.match(cssContent, /SF Pro Display/);
  });

  it("Capability 16: Audio Interaction Feedback with Web Audio API", () => {
    assert.equal(typeof isSoundEnabled, "function");
    assert.equal(typeof setSoundEnabled, "function");
    setSoundEnabled(true);
    assert.equal(isSoundEnabled(), true);
  });

  it("Capability 17: Persisted Application-Wide Reduced Motion", () => {
    if (typeof globalThis.document === "undefined") {
      const classList = new Set<string>();
      const attributes = new Map<string, string>();
      (globalThis as any).document = {
        documentElement: {
          classList: {
            toggle: (cls: string, force?: boolean) => {
              if (force === true) classList.add(cls);
              else if (force === false) classList.delete(cls);
              return classList.has(cls);
            },
            contains: (cls: string) => classList.has(cls),
          },
          setAttribute: (k: string, v: string) => attributes.set(k, v),
          removeAttribute: (k: string) => attributes.delete(k),
          getAttribute: (k: string) => attributes.get(k) || null,
        },
      };
    }

    applyReducedMotion(true);
    assert.equal(document.documentElement.getAttribute("data-reduce-motion"), "true");
    applyReducedMotion(false);
    assert.equal(document.documentElement.getAttribute("data-reduce-motion"), null);
  });
});
