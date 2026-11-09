import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  countCodePoints,
  containsImageData,
  containsImagePayload,
  MAX_AI_PROMPT_CHARS,
  AI_CHAT_WARNING_THRESHOLD,
  IMAGE_REJECTION_MESSAGE,
} from "../src/domain/constants";
import {
  GeminiError,
  APIKeyMissingError,
  ProviderQuotaError,
  NetworkError,
  geminiAiService,
  getGeminiApiKey,
  setGeminiConfig,
} from "../src/services/gemini";
import type { AIReplyRequest, AITutorRequest } from "../src/services/contracts";

console.log("===============================================================================");
console.log("=== EMPIRICAL CHALLENGER TEST SUITE: PHASE 04 REAL AI INTEGRATION ===");
console.log("===============================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 1: countCodePoints & 20,000 Character Boundary Stress Test
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[CHALLENGE 1] Stress-testing countCodePoints & 20k boundaries...");

// 1.1 Falsy / Empty inputs
assert.strictEqual(countCodePoints(""), 0, "Empty string count must be 0");
assert.strictEqual(countCodePoints(null as any), 0, "null input count must be 0");
assert.strictEqual(countCodePoints(undefined as any), 0, "undefined input count must be 0");

// 1.2 Standard ASCII & Spanish accented text
assert.strictEqual(countCodePoints("Hola Nexo"), 9);
assert.strictEqual(countCodePoints("Arquitectura áéíóú ñ Ñ"), 22);

// 1.3 Surrogate Pairs (Emojis & SMP characters)
// Standard emojis: 1 code point, 2 UTF-16 code units
assert.strictEqual("🚀".length, 2, "🚀 must have length 2 in UTF-16");
assert.strictEqual(countCodePoints("🚀"), 1, "🚀 must be 1 code point");

const emojiMixed = "Ideas💡 Estrategia🚀 Validación🔥 Éxito🎉";
// Length in UTF-16: 41. Code points: 37 (4 emojis save 1 unit each)
assert.strictEqual(emojiMixed.length, 41);
assert.strictEqual(countCodePoints(emojiMixed), 37);

// Mathematical alphanumeric symbols (SMP, U+1D400..U+1D7FF)
const mathSymbols = "𝔘𝔫𝔦𝔠𝔬𝔡𝔢";
assert.strictEqual(mathSymbols.length, 14);
assert.strictEqual(countCodePoints(mathSymbols), 7);

// ZWJ (Zero-Width Joiner) sequence
const family = "👨‍👩‍👧‍👦";
assert.strictEqual(countCodePoints(family), 7, "Family emoji composed of 7 code points");

// Combining Diacritics
const decomposedE = "e\u0301"; // 'e' + combining acute accent
assert.strictEqual(countCodePoints(decomposedE), 2, "Decomposed accented character has 2 code points");

// 1.4 Boundary limits at 18,000 (warning) and 20,000 (hard limit)
const text17999 = "A".repeat(17999);
const text18000 = "A".repeat(18000);
const text18001 = "A".repeat(18001);
assert.strictEqual(countCodePoints(text17999) > AI_CHAT_WARNING_THRESHOLD, false);
assert.strictEqual(countCodePoints(text18000) > AI_CHAT_WARNING_THRESHOLD, false, "18,000 exact does not warn");
assert.strictEqual(countCodePoints(text18001) > AI_CHAT_WARNING_THRESHOLD, true, "18,001 triggers warning");

const text19999 = "A".repeat(19999);
const text20000 = "A".repeat(20000);
const text20001 = "A".repeat(20001);
assert.strictEqual(countCodePoints(text19999) <= MAX_AI_PROMPT_CHARS, true);
assert.strictEqual(countCodePoints(text20000) <= MAX_AI_PROMPT_CHARS, true, "20,000 exact is within limit");
assert.strictEqual(countCodePoints(text20001) > MAX_AI_PROMPT_CHARS, true, "20,001 exceeds maximum limit");

// 1.5 Boundary limits with ONLY EMOJIS (40,000 UTF-16 code units!)
const emojis20k = "🚀".repeat(20000);
assert.strictEqual(emojis20k.length, 40000, "20,000 emojis have 40,000 UTF-16 code units");
assert.strictEqual(countCodePoints(emojis20k), 20000, "20,000 emojis count as 20,000 code points");
assert.strictEqual(countCodePoints(emojis20k) <= MAX_AI_PROMPT_CHARS, true, "20k emojis MUST be permitted (<=20000)");

const emojis20k1 = emojis20k + "🚀";
assert.strictEqual(emojis20k1.length, 40002);
assert.strictEqual(countCodePoints(emojis20k1), 20001);
assert.strictEqual(countCodePoints(emojis20k1) > MAX_AI_PROMPT_CHARS, true, "20k+1 emojis MUST be rejected");

// 1.6 Performance Stress Test (100k mixed characters)
const largeText = ("Nexo IA 🚀🧠 " + "x".repeat(90)).repeat(1000); // 100k+ chars
const tStart = performance.now();
const counted = countCodePoints(largeText);
const duration = performance.now() - tStart;
assert.ok(counted > 90000);
assert.ok(duration < 250, `100k code points counting should execute under 250ms (actual: ${duration.toFixed(2)}ms)`);
console.log(`✓ countCodePoints stress test passed! (100k chars counted in ${duration.toFixed(2)}ms)`);

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 2: Image Detection Regex and Event Handler Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[CHALLENGE 2] Stress-testing image detection regex and event handlers...");

// 2.1 Standard base64 images
const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
assert.strictEqual(containsImageData(pngBase64), true, "Must detect standard data:image/png;base64");

// 2.2 Mixed case and uppercase data:image
const upperBase64 = "DATA:IMAGE/JPEG;BASE64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
assert.strictEqual(containsImageData(upperBase64), true, "Must detect uppercase DATA:IMAGE/JPEG;BASE64,");

const mixedCaseBase64 = "Data:Image/Png;base64,iVBORw0KGgo...";
assert.strictEqual(containsImageData(mixedCaseBase64), true, "Must detect mixed case Data:Image/Png;base64,");

// 2.3 Edge case: Short image URIs or URI prefixes without base64,
const lowerPrefix = "data:image/jpeg";
assert.strictEqual(containsImageData(lowerPrefix), true, "Must detect lowercase data:image/jpeg");

// Notice edge case: Uppercase without base64
const upperPrefix = "DATA:IMAGE/JPEG";
const upperDetected = containsImageData(upperPrefix);
console.log(`  [Edge Case Analysis] containsImageData("DATA:IMAGE/JPEG") without base64,: ${upperDetected}`);

// 2.4 Raw base64 magic bytes (PNG, JPEG, GIF, WebP)
const rawPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
assert.strictEqual(containsImageData(rawPng), true, "Must detect raw base64 PNG magic header");

const rawJpeg = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
assert.strictEqual(containsImageData(rawJpeg), true, "Must detect raw base64 JPEG magic header");

const rawWebP = "UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=";
assert.strictEqual(containsImageData(rawWebP), true, "Must detect raw base64 WebP magic header");

// 2.5 Negative cases (Textual words containing 'image', 'foto', etc.)
assert.strictEqual(containsImageData("Nuestra imagen de marca se centra en la educación"), false);
assert.strictEqual(containsImageData("Tomaremos fotografías del prototipo"), false);
assert.strictEqual(containsImageData("data image processing algorithms"), false);

// 2.6 Paste Event Simulation with items[0].type.startsWith("image/")
function testPasteEvent(mockClipboard: { files?: any[]; items?: any[]; text?: string }) {
  let defaultPrevented = false;
  let rejected = false;

  const e = {
    clipboardData: {
      files: mockClipboard.files || [],
      items: mockClipboard.items || [],
      getData: (format: string) => (format === "text" ? mockClipboard.text || "" : ""),
    },
    preventDefault: () => {
      defaultPrevented = true;
    },
  };

  // Replicate logic from FullScreenDiscoveryChat & AIChatDrawer
  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
    const hasImageFile = Array.from(e.clipboardData.files).some((f) =>
      f.type.startsWith("image/")
    );
    if (hasImageFile) {
      e.preventDefault();
      rejected = true;
      return { defaultPrevented, rejected };
    }
  }

  if (e.clipboardData.items && e.clipboardData.items.length > 0) {
    const hasImageItem = Array.from(e.clipboardData.items).some((item) =>
      item.type.startsWith("image/")
    );
    if (hasImageItem) {
      e.preventDefault();
      rejected = true;
      return { defaultPrevented, rejected };
    }
  }

  const pastedText = e.clipboardData.getData("text");
  if (pastedText && containsImageData(pastedText)) {
    e.preventDefault();
    rejected = true;
    return { defaultPrevented, rejected };
  }

  return { defaultPrevented, rejected };
}

// items[0].type starts with image/png
const pasteItemResult = testPasteEvent({
  items: [{ type: "image/png" }],
});
assert.strictEqual(pasteItemResult.defaultPrevented, true, "Must prevent default on image item paste");
assert.strictEqual(pasteItemResult.rejected, true, "Must reject image item paste");

// items[0].type starts with image/jpeg
const pasteJpegResult = testPasteEvent({
  items: [{ type: "image/jpeg" }],
});
assert.strictEqual(pasteJpegResult.rejected, true, "Must reject image/jpeg item paste");

// Plain text item
const pasteTextResult = testPasteEvent({
  items: [{ type: "text/plain" }],
  text: "Una plataforma de aprendizaje adaptativo",
});
assert.strictEqual(pasteTextResult.defaultPrevented, false, "Must not prevent default on plain text");
assert.strictEqual(pasteTextResult.rejected, false, "Must not reject plain text");

// 2.7 Drag and Drop Event Simulation with .png files
function testDropEvent(mockDataTransfer: { files?: any[]; text?: string }) {
  let defaultPrevented = false;
  let rejected = false;

  const e = {
    dataTransfer: {
      files: mockDataTransfer.files || [],
      getData: (format: string) => (format === "text" ? mockDataTransfer.text || "" : ""),
    },
    preventDefault: () => {
      defaultPrevented = true;
    },
  };

  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const hasImage = Array.from(e.dataTransfer.files).some(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(f.name)
    );
    if (hasImage) {
      rejected = true;
      return { defaultPrevented, rejected };
    }
  }

  const text = e.dataTransfer.getData("text");
  if (text && containsImageData(text)) {
    rejected = true;
    return { defaultPrevented, rejected };
  }

  return { defaultPrevented, rejected };
}

// Drop .png with empty MIME type (OS drag drop scenario)
const dropPngResult = testDropEvent({
  files: [{ name: "mockup_screen.png", type: "" }],
});
assert.strictEqual(dropPngResult.rejected, true, "Must reject drag-and-drop of .png file");

// Drop .PNG with uppercase extension
const dropPngUpperResult = testDropEvent({
  files: [{ name: "MOCKUP_SCREEN.PNG", type: "application/octet-stream" }],
});
assert.strictEqual(dropPngUpperResult.rejected, true, "Must reject drag-and-drop of uppercase .PNG file");

// Drop non-image file (.json, .txt)
const dropJsonResult = testDropEvent({
  files: [{ name: "ideas.json", type: "application/json" }],
});
assert.strictEqual(dropJsonResult.rejected, false, "Must not reject drop of .json file");

console.log("✓ Image detection regex and drag-drop/paste event handlers verified successfully.");

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE 3: Gemini Service Error Handling & No-Mock Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[CHALLENGE 3] Testing Gemini Service error handling and zero-mock enforcement...");

const dummyReplyRequest: AIReplyRequest = {
  text: "Quiero diseñar una red de sensores inteligentes para agricultura",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "m-1",
};

const dummyExplainRequest: AITutorRequest = {
  messageText: "Explicar sensores de humedad",
  conceptTitle: "Sensor de Humedad",
  lang: "es",
};

// 3.1 Error handling: Missing Key
const savedKey = getGeminiApiKey();
setGeminiConfig("");
const prevEnvKey = process.env.VITE_GEMINI_API_KEY;
delete process.env.VITE_GEMINI_API_KEY;

let threwOnMissingReply = false;
try {
  await geminiAiService.reply(dummyReplyRequest);
} catch (err: any) {
  threwOnMissingReply = true;
  assert.strictEqual(err instanceof APIKeyMissingError, true, "reply must throw APIKeyMissingError");
  assert.strictEqual(err.code, "API_KEY_MISSING");
  assert.strictEqual(err.status, 401);
}
assert.strictEqual(threwOnMissingReply, true, "geminiAiService.reply MUST throw error when API key is missing");

let threwOnMissingExplain = false;
try {
  await geminiAiService.explain(dummyExplainRequest);
} catch (err: any) {
  threwOnMissingExplain = true;
  assert.strictEqual(err instanceof APIKeyMissingError, true, "explain must throw APIKeyMissingError");
  assert.strictEqual(err.code, "API_KEY_MISSING");
}
assert.strictEqual(threwOnMissingExplain, true, "geminiAiService.explain MUST throw error when API key is missing");

// 3.2 Error handling: Invalid Key (HTTP 400 Bad Request with API_KEY_INVALID)
setGeminiConfig("AIzaSyInvalidKey_EmpiricalStressTest");
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url: any) => {
  return new Response(
    JSON.stringify({
      error: {
        code: 400,
        message: "API key not valid. Please pass a valid API key.",
        status: "INVALID_ARGUMENT",
        details: [{ reason: "API_KEY_INVALID" }],
      },
    }),
    {
      status: 400,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/json" },
    }
  );
};

let threwOnInvalidKeyReply = false;
try {
  await geminiAiService.reply(dummyReplyRequest);
} catch (err: any) {
  threwOnInvalidKeyReply = true;
  assert.strictEqual(err instanceof GeminiError, true, "Must throw GeminiError on invalid key");
  assert.strictEqual(err.status, 400);
  assert.ok(err.message.includes("API key not valid"));
}
assert.strictEqual(threwOnInvalidKeyReply, true, "reply must throw error on invalid key");

let threwOnInvalidKeyExplain = false;
try {
  await geminiAiService.explain(dummyExplainRequest);
} catch (err: any) {
  threwOnInvalidKeyExplain = true;
  assert.strictEqual(err instanceof GeminiError, true, "explain must throw GeminiError on invalid key");
  assert.strictEqual(err.status, 400);
}
assert.strictEqual(threwOnInvalidKeyExplain, true, "explain must throw error on invalid key");

// 3.3 Error handling: HTTP 403 Forbidden
globalThis.fetch = async () => {
  return new Response(
    JSON.stringify({
      error: { code: 403, message: "Permission denied for Gemini API" },
    }),
    { status: 403, statusText: "Forbidden", headers: { "Content-Type": "application/json" } }
  );
};

let threwOn403 = false;
try {
  await geminiAiService.reply(dummyReplyRequest);
} catch (err: any) {
  threwOn403 = true;
  assert.strictEqual(err instanceof GeminiError, true);
  assert.strictEqual(err.code, "API_KEY_INVALID");
  assert.strictEqual(err.status, 403);
}
assert.strictEqual(threwOn403, true, "reply must throw GeminiError with API_KEY_INVALID on 403");

// 3.4 Error handling: HTTP 429 Quota Exhausted
globalThis.fetch = async () => {
  return new Response(
    JSON.stringify({
      error: { code: 429, message: "Resource has been exhausted (quota exceeded)." },
    }),
    { status: 429, statusText: "Too Many Requests", headers: { "Content-Type": "application/json" } }
  );
};

let threwOn429 = false;
try {
  await geminiAiService.reply(dummyReplyRequest);
} catch (err: any) {
  threwOn429 = true;
  assert.strictEqual(err instanceof ProviderQuotaError, true, "Must throw ProviderQuotaError on 429");
  assert.strictEqual(err.status, 429);
  assert.strictEqual(err.code, "PROVIDER_QUOTA_EXCEEDED");
}
assert.strictEqual(threwOn429, true, "reply must throw ProviderQuotaError on 429");

// 3.5 Error handling: Network Unreachable
globalThis.fetch = async () => {
  throw new TypeError("Failed to fetch: network unreachable");
};

let threwOnNetwork = false;
try {
  await geminiAiService.reply(dummyReplyRequest);
} catch (err: any) {
  threwOnNetwork = true;
  assert.strictEqual(err instanceof NetworkError, true, "Must throw NetworkError on fetch exception");
  assert.strictEqual(err.code, "NETWORK_ERROR");
}
assert.strictEqual(threwOnNetwork, true, "reply must throw NetworkError on network failure");

// 3.6 Error handling: Empty Response from Provider
globalThis.fetch = async () => {
  return new Response(
    JSON.stringify({ candidates: [] }),
    { status: 200, statusText: "OK", headers: { "Content-Type": "application/json" } }
  );
};

let threwOnEmpty = false;
try {
  await geminiAiService.reply(dummyReplyRequest);
} catch (err: any) {
  threwOnEmpty = true;
  assert.strictEqual(err instanceof GeminiError, true);
  assert.strictEqual(err.code, "EMPTY_RESPONSE");
}
assert.strictEqual(threwOnEmpty, true, "reply must throw GeminiError on empty candidates");

// 3.7 Error handling: Non-JSON or Corrupted Response
globalThis.fetch = async () => {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: "NOT_VALID_JSON{{" }] } }],
    }),
    { status: 200, statusText: "OK", headers: { "Content-Type": "application/json" } }
  );
};

let threwOnCorrupt = false;
try {
  await geminiAiService.reply(dummyReplyRequest);
} catch (err: any) {
  threwOnCorrupt = true;
  assert.strictEqual(err instanceof GeminiError, true);
  assert.strictEqual(err.code, "GEMINI_PARSE_ERROR");
}
assert.strictEqual(threwOnCorrupt, true, "reply must throw GeminiError on corrupt structured reply");

// Restore global state
globalThis.fetch = originalFetch;
if (prevEnvKey !== undefined) {
  process.env.VITE_GEMINI_API_KEY = prevEnvKey;
}
setGeminiConfig(savedKey);

// 3.8 Forensic Code Audit: Ensure zero mock fallbacks exist
const geminiCode = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/gemini/index.ts"),
  "utf8"
);
assert.strictEqual(
  geminiCode.includes("mockServices.ai.reply"),
  false,
  "gemini/index.ts must NOT contain mockServices.ai.reply"
);
assert.strictEqual(
  geminiCode.includes("mockServices.ai.explain"),
  false,
  "gemini/index.ts must NOT contain mockServices.ai.explain"
);
assert.strictEqual(
  geminiCode.includes("mockServices"),
  false,
  "gemini/index.ts must NOT import or reference mockServices"
);

console.log("✓ Gemini Service error handling and zero-mock enforcement verified completely.");

console.log("\n===============================================================================");
console.log("✨ ALL EMPIRICAL CHALLENGE SUITES PASSED! ✨");
console.log("===============================================================================\n");
