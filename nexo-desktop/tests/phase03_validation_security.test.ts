import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LIMITS,
  MAX_PROJECT_NAME_CHARS,
  MAX_PROJECT_DESC_CHARS,
  MAX_CANVAS_NAME_CHARS,
  MAX_AI_PROMPT_CHARS,
  MAX_NODE_NAME_CHARS,
  MAX_FOLDER_NAME_CHARS,
  countCodePoints,
  validateLength,
} from "../src/domain/limits";

describe("Phase 03 Validation, Authentication and Security", () => {
  it("enforces exact centralized character limits per roadmap specification", () => {
    assert.equal(LIMITS.PROJECT_NAME, 60);
    assert.equal(LIMITS.PROJECT_DESCRIPTION, 500);
    assert.equal(LIMITS.CANVAS_NAME, 60);
    assert.equal(LIMITS.AI_CHAT_MESSAGE, 20_000);
    assert.equal(LIMITS.NODE_NAME, 80);
    assert.equal(LIMITS.FOLDER_NAME, 50);

    assert.equal(MAX_PROJECT_NAME_CHARS, 60);
    assert.equal(MAX_PROJECT_DESC_CHARS, 500);
    assert.equal(MAX_CANVAS_NAME_CHARS, 60);
    assert.equal(MAX_AI_PROMPT_CHARS, 20_000);
    assert.equal(MAX_NODE_NAME_CHARS, 80);
    assert.equal(MAX_FOLDER_NAME_CHARS, 50);
  });

  it("accurately counts Unicode code points for complex surrogate pairs and emojis", () => {
    // Single character emojis
    assert.equal(countCodePoints("🧠"), 1);
    assert.equal(countCodePoints("🚀"), 1);
    // Compound or accented strings
    assert.equal(countCodePoints("Nexo 🚀 Ideación"), 15);
    // 60-character project name with emojis
    const nameWithEmojis = "Plataforma Nexo " + "🌟".repeat(44);
    assert.equal(countCodePoints(nameWithEmojis), 60);
    const validCheck = validateLength(nameWithEmojis, LIMITS.PROJECT_NAME, "Nombre del proyecto");
    assert.equal(validCheck.valid, true);

    // Exceeding limit
    const overLimitName = nameWithEmojis + "!";
    const overCheck = validateLength(overLimitName, LIMITS.PROJECT_NAME, "Nombre del proyecto");
    assert.equal(overCheck.valid, false);
    assert.match(overCheck.error || "", /excede el límite máximo de 60/);
  });

  it("verifies LoginView has zero debug adapter notes or cards", () => {
    const loginViewPath = path.resolve(__dirname, "../src/features/auth/LoginView.tsx");
    const loginViewContent = fs.readFileSync(loginViewPath, "utf-8");

    assert.doesNotMatch(loginViewContent, /Adaptador de Autenticación/i);
    assert.doesNotMatch(loginViewContent, /auth\.adapterTitle/i);
    assert.doesNotMatch(loginViewContent, /auth\.adapterDescription/i);
    assert.doesNotMatch(loginViewContent, /ShieldCheck/);
  });
});
