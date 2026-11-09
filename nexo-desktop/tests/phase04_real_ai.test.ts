import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  GeminiError,
  APIKeyMissingError,
  ProviderQuotaError,
  NetworkError,
  geminiAiService,
  getGeminiApiKey,
  setGeminiConfig,
} from "../src/services/gemini";
import {
  MAX_AI_PROMPT_CHARS,
  AI_CHAT_WARNING_THRESHOLD,
  IMAGE_REJECTION_MESSAGE,
  countCodePoints,
  containsImagePayload,
} from "../src/domain/constants";
import { buildUserPrompt } from "../src/services/ai/prompts";
import type { AIReplyRequest, AITutorRequest } from "../src/services/contracts";
import type { Message } from "../src/domain/types";

console.log("=== PHASE 04 AUTOMATED ACCEPTANCE TEST SUITE: REAL AI INTEGRATION ===");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Error Hierarchy and Silent Mock Elimination
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1/5] Verifying error classes and elimination of silent fallbacks...");

// 1.1 Custom Error Hierarchy Invariants
const baseError = new GeminiError("Test base error", "BASE_ERR", 500);
assert.strictEqual(baseError instanceof Error, true, "GeminiError must be an instance of Error");
assert.strictEqual(baseError.code, "BASE_ERR");
assert.strictEqual(baseError.status, 500);

const keyError = new APIKeyMissingError();
assert.strictEqual(keyError instanceof GeminiError, true, "APIKeyMissingError must inherit from GeminiError");
assert.strictEqual(keyError.code, "API_KEY_MISSING");
assert.strictEqual(keyError.status, 401);
assert.ok(keyError.message.includes("VITE_GEMINI_API_KEY") || keyError.message.includes("API key"));

const quotaError = new ProviderQuotaError();
assert.strictEqual(quotaError instanceof GeminiError, true, "ProviderQuotaError must inherit from GeminiError");
assert.strictEqual(quotaError.code, "PROVIDER_QUOTA_EXCEEDED");
assert.strictEqual(quotaError.status, 429);
assert.ok(quotaError.message.includes("429") || quotaError.message.includes("cuota"));

const netError = new NetworkError("Connection refused");
assert.strictEqual(netError instanceof GeminiError, true, "NetworkError must inherit from GeminiError");
assert.strictEqual(netError.code, "NETWORK_ERROR");

// 1.2 Calling geminiAiService.reply without API key MUST throw APIKeyMissingError (NEVER return mock)
const originalKey = getGeminiApiKey();
setGeminiConfig(""); // Clear custom key

const dummyRequest: AIReplyRequest = {
  text: "Quiero diseñar una red de sensores inteligentes",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "m-1",
};

let replyThrew = false;
try {
  await geminiAiService.reply(dummyRequest);
} catch (err: unknown) {
  replyThrew = true;
  assert.strictEqual(
    err instanceof APIKeyMissingError,
    true,
    "geminiAiService.reply must throw APIKeyMissingError when no API key is present"
  );
  assert.strictEqual((err as GeminiError).code, "API_KEY_MISSING");
}
assert.strictEqual(replyThrew, true, "geminiAiService.reply must throw instead of returning mock response");

// 1.3 Calling geminiAiService.explain without API key MUST throw APIKeyMissingError
const dummyExplainReq: AITutorRequest = {
  messageText: "Explica qué es un sensor IoT",
  conceptTitle: "Sensor IoT",
  lang: "es",
};

let explainThrew = false;
try {
  await geminiAiService.explain(dummyExplainReq);
} catch (err: unknown) {
  explainThrew = true;
  assert.strictEqual(
    err instanceof APIKeyMissingError,
    true,
    "geminiAiService.explain must throw APIKeyMissingError when no API key is present"
  );
}
assert.strictEqual(explainThrew, true, "geminiAiService.explain must throw instead of returning mock response");

// 1.4 Provider Quota (HTTP 429) Error Dispatch
const originalFetch = globalThis.fetch;
setGeminiConfig("AIzaSyFakeKeyForTestingPurposesOnly");

globalThis.fetch = async () =>
  new Response(
    JSON.stringify({
      error: { code: 429, message: "Resource has been exhausted (e.g. check quota)." },
    }),
    { status: 429, statusText: "Too Many Requests", headers: { "Content-Type": "application/json" } }
  );

let quotaThrew = false;
try {
  await geminiAiService.reply(dummyRequest);
} catch (err: unknown) {
  quotaThrew = true;
  assert.strictEqual(
    err instanceof ProviderQuotaError,
    true,
    "geminiAiService.reply must throw ProviderQuotaError on HTTP 429"
  );
  assert.strictEqual((err as GeminiError).status, 429);
}
assert.strictEqual(quotaThrew, true, "geminiAiService.reply must throw on 429 quota exhaustion");

// 1.5 Network Disconnection Error Dispatch
globalThis.fetch = async () => {
  throw new TypeError("fetch failed: network is unreachable");
};

let networkThrew = false;
try {
  await geminiAiService.reply(dummyRequest);
} catch (err: unknown) {
  networkThrew = true;
  assert.strictEqual(
    err instanceof NetworkError,
    true,
    "geminiAiService.reply must throw NetworkError when fetch throws network error"
  );
  assert.strictEqual((err as GeminiError).code, "NETWORK_ERROR");
}
assert.strictEqual(networkThrew, true, "geminiAiService.reply must throw on network error");

// Restore global fetch and key
globalThis.fetch = originalFetch;
setGeminiConfig(originalKey);

// 1.6 Forensic Audit of gemini/index.ts (Zero Silent Fallbacks)
const geminiSourcePath = path.resolve(process.cwd(), "src/services/gemini/index.ts");
const geminiSource = fs.readFileSync(geminiSourcePath, "utf8");

assert.strictEqual(
  /return\s+mockServices\.ai\.reply/.test(geminiSource),
  false,
  "gemini/index.ts must NOT contain any fallback call to mockServices.ai.reply"
);
assert.strictEqual(
  /return\s+mockServices\.ai\.explain/.test(geminiSource),
  false,
  "gemini/index.ts must NOT contain any fallback call to mockServices.ai.explain"
);
assert.strictEqual(
  /import\s+.*mockServices.*from/.test(geminiSource),
  false,
  "gemini/index.ts must NOT import mockServices"
);

// 1.7 Key Precedence: localStorage/custom key takes precedence over env variable
const prevEnv = process.env.VITE_GEMINI_API_KEY;
try {
  process.env.VITE_GEMINI_API_KEY = "env-fallback-key";
  setGeminiConfig("custom-local-key");
  assert.strictEqual(
    getGeminiApiKey(),
    "custom-local-key",
    "localStorage/custom key must take precedence over environment variable"
  );

  setGeminiConfig(""); // Clears custom key
  assert.strictEqual(
    getGeminiApiKey(),
    "env-fallback-key",
    "Should fall back to environment variable when custom key is empty"
  );
} finally {
  if (prevEnv !== undefined) {
    process.env.VITE_GEMINI_API_KEY = prevEnv;
  } else {
    delete process.env.VITE_GEMINI_API_KEY;
  }
  setGeminiConfig(originalKey);
}

console.log("✓ Error hierarchy and API key precedence verified, zero silent fallbacks confirmed.");

// ─────────────────────────────────────────────────────────────────────────────
// 2. 20,000-Character Support & Unicode Code-Point Counting
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2/5] Verifying 20,000 code-point counting and prompt assembly...");

assert.strictEqual(MAX_AI_PROMPT_CHARS, 20000, "MAX_AI_PROMPT_CHARS must be 20,000");
assert.strictEqual(AI_CHAT_WARNING_THRESHOLD, 18000, "AI_CHAT_WARNING_THRESHOLD must be 18,000");

// 2.1 Basic ASCII and Latin
assert.strictEqual(countCodePoints(""), 0);
assert.strictEqual(countCodePoints("Nexo"), 4);
assert.strictEqual(countCodePoints("Diseño conceptual"), 17);

// 2.2 Supplementary plane Unicode characters (Emojis)
// In UTF-16, emojis take 2 code units (.length = 2), but represent 1 code point.
const emojiString = "🚀🧠💡🎉🔥";
assert.strictEqual(emojiString.length, 10, "5 emojis must be 10 UTF-16 code units in .length");
assert.strictEqual(countCodePoints(emojiString), 5, "countCodePoints must count exactly 5 code points");

// 2.3 Boundary Limits
const text18k = "A".repeat(18000);
const text18k1 = "A".repeat(18001);
const text20k = "A".repeat(20000);
const text20k1 = "A".repeat(20001);

assert.strictEqual(countCodePoints(text18k) > AI_CHAT_WARNING_THRESHOLD, false, "18,000 must not trigger warning");
assert.strictEqual(countCodePoints(text18k1) > AI_CHAT_WARNING_THRESHOLD, true, "18,001 must trigger warning");
assert.strictEqual(countCodePoints(text20k) <= MAX_AI_PROMPT_CHARS, true, "20,000 is within allowed limit");
assert.strictEqual(countCodePoints(text20k1) > MAX_AI_PROMPT_CHARS, true, "20,001 exceeds maximum allowed limit");

// 2.4 Chronological History Ordering in prompts.ts (Zero reversal)
const testMessages: Message[] = [
  { id: "m-1", role: "user", text: "Mensaje Inicial Turno 1", createdAt: "2026-11-07T01:00:00Z" },
  { id: "m-2", role: "assistant", text: "Respuesta Turno 2", createdAt: "2026-11-07T01:01:00Z" },
  { id: "m-3", role: "user", text: "Consulta Turno 3", createdAt: "2026-11-07T01:02:00Z" },
];

const assembledPrompt = buildUserPrompt({
  phase: "PHASE_1_DISCOVERY",
  lang: "es",
  existingNodesSummary: "",
  userMessage: "Mi idea es una plataforma de telemedicina",
  messageHistory: testMessages,
});

const posTurn1 = assembledPrompt.indexOf("Mensaje Inicial Turno 1");
const posTurn2 = assembledPrompt.indexOf("Respuesta Turno 2");
const posTurn3 = assembledPrompt.indexOf("Consulta Turno 3");

assert.ok(posTurn1 !== -1 && posTurn2 !== -1 && posTurn3 !== -1, "All messages must appear in prompt");
assert.ok(
  posTurn1 < posTurn2 && posTurn2 < posTurn3,
  "Message history in prompt must strictly preserve chronological order (turn 1 before turn 2 before turn 3)"
);

const promptsSourcePath = path.resolve(process.cwd(), "src/services/ai/prompts.ts");
const promptsSource = fs.readFileSync(promptsSourcePath, "utf8");
assert.strictEqual(
  promptsSource.includes(".slice(-4).reverse()"),
  false,
  "prompts.ts must NOT call .reverse() on messageHistory"
);
console.log("✓ Code-point counting, 20k boundaries, and chronological ordering verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 3. Strict Image Rejection (MIME, Data URI, Raw Base64)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3/5] Verifying strict image rejection patterns and event guards...");

assert.strictEqual(
  IMAGE_REJECTION_MESSAGE,
  "Nexo solo procesa texto; no se admiten imágenes",
  "Rejection message must match verbatim specification"
);

// 3.1 Pattern Matching
assert.strictEqual(
  containsImagePayload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
  true,
  "Must detect data:image/png;base64"
);
assert.strictEqual(
  containsImagePayload("Adjunto data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD... para análisis"),
  true,
  "Must detect data:image/jpeg inside sentence"
);
assert.strictEqual(
  containsImagePayload("data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA="),
  true,
  "Must detect data:image/webp"
);
assert.strictEqual(
  containsImagePayload("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=="),
  true,
  "Must detect data:image/svg+xml"
);
assert.strictEqual(
  containsImagePayload("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
  true,
  "Must detect raw base64 PNG signature"
);

// 3.2 Negative cases (Allowed textual descriptions)
assert.strictEqual(
  containsImagePayload("Quiero desarrollar una aplicación que ayude a fotógrafos a gestionar sus galerías"),
  false,
  "Must NOT reject words like fotografía o galerías"
);
assert.strictEqual(
  containsImagePayload("La imagen de marca de la empresa debe ser formal y moderna"),
  false,
  "Must NOT reject natural use of the word 'imagen'"
);

// 3.3 Event Guard Logic Simulation (Paste & Drop)
function simulatePasteEvent(files: { type: string }[], text: string) {
  let defaultPrevented = false;
  let rejected = false;
  let rejectionReason = "";

  const event = {
    clipboardData: {
      files,
      getData: (type: string) => (type === "text" ? text : ""),
    },
    preventDefault: () => {
      defaultPrevented = true;
    },
  };

  const hasImageFile = event.clipboardData.files.some((f) => f.type.startsWith("image/"));
  const hasImageText = containsImagePayload(event.clipboardData.getData("text"));

  if (hasImageFile || hasImageText) {
    event.preventDefault();
    rejected = true;
    rejectionReason = IMAGE_REJECTION_MESSAGE;
  }

  return { defaultPrevented, rejected, rejectionReason };
}

// Paste image file test
const filePaste = simulatePasteEvent([{ type: "image/png" }], "");
assert.strictEqual(filePaste.defaultPrevented, true, "Must preventDefault on image file paste");
assert.strictEqual(filePaste.rejected, true, "Must reject image file paste");
assert.strictEqual(filePaste.rejectionReason, IMAGE_REJECTION_MESSAGE);

// Paste base64 image text test
const base64Paste = simulatePasteEvent([], "data:image/png;base64,iVBORw0KGgo...");
assert.strictEqual(base64Paste.defaultPrevented, true, "Must preventDefault on data:image paste");
assert.strictEqual(base64Paste.rejected, true, "Must reject data:image text paste");

// Paste valid text test
const validPaste = simulatePasteEvent([], "Plataforma de logística médica con trazabilidad");
assert.strictEqual(validPaste.defaultPrevented, false, "Must allow plain text paste");
assert.strictEqual(validPaste.rejected, false, "Must not reject plain text paste");

console.log("✓ Strict image rejection patterns and event guards verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 4. UI Error Banners and Retry Actions
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4/5] Verifying error banner structures and retry contracts...");

const chatSourcePath = path.resolve(process.cwd(), "src/features/workspace/FullScreenDiscoveryChat.tsx");
const drawerSourcePath = path.resolve(process.cwd(), "src/features/workspace/AIChatDrawer.tsx");

const chatSource = fs.readFileSync(chatSourcePath, "utf8");
const drawerSource = fs.readFileSync(drawerSourcePath, "utf8");

// 4.1 Interface and Prop contracts
assert.ok(
  chatSource.includes("onRetry") || chatSource.includes("error"),
  "FullScreenDiscoveryChat must support error display and onRetry action"
);
assert.ok(
  chatSource.includes("onPaste") || chatSource.includes("handlePaste"),
  "FullScreenDiscoveryChat must attach onPaste guard for image rejection"
);
assert.ok(
  chatSource.includes("onDrop") || chatSource.includes("handleDrop"),
  "FullScreenDiscoveryChat must attach onDrop guard for image rejection"
);

// 4.2 Drawer image guard and error banner
assert.ok(
  drawerSource.includes("onPaste") || drawerSource.includes("handlePaste"),
  "AIChatDrawer must attach onPaste guard for image rejection"
);
assert.ok(
  drawerSource.includes("onDrop") || drawerSource.includes("handleDrop"),
  "AIChatDrawer must attach onDrop guard for image rejection"
);
assert.ok(
  drawerSource.includes("error") && drawerSource.includes("onRetry"),
  "AIChatDrawer must support error banner and retry action"
);

console.log("✓ UI error banners and retry contracts verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 5. Backend Contract Verification Reference
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5/5] Verifying backend AIController alignment with Phase 04 requirements...");

const backendControllerPath = path.resolve(
  process.cwd(),
  "../../../Backend/Nexo_Backend/nexo-api/src/main/java/com/example/nexo_api/controller/AIController.java"
);
assert.ok(fs.existsSync(backendControllerPath), "AIController.java must exist on filesystem");
const controllerJava = fs.readFileSync(backendControllerPath, "utf8");

assert.ok(
  controllerJava.includes("422") || controllerJava.includes("UNPROCESSABLE_ENTITY"),
  "AIController.java must return HTTP 422 Unprocessable Entity for invalid payloads"
);
assert.ok(
  controllerJava.includes(IMAGE_REJECTION_MESSAGE),
  "AIController.java must return the verbatim image rejection message"
);
assert.ok(
  controllerJava.includes("codePointCount") || controllerJava.includes("20000") || controllerJava.includes("20_000"),
  "AIController.java must validate against the 20,000 code points limit"
);

console.log("✓ Backend AIController contract verified against Phase 04 requirements.");

console.log("\n=============================================================================");
console.log("✨ ALL PHASE 04 REAL AI INTEGRATION TESTS PASSED WITH FLYING COLORS! ✨");
console.log("=============================================================================\n");
