import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  OpenAIError,
  OpenAIKeyMissingError,
  OpenAIQuotaError,
  OpenAINetworkError,
  openaiAiService,
  getOpenAIApiKey,
  getOpenAIModel,
  setOpenAIConfig,
  isOpenAIConfigured,
  isOpenAIEnabled,
  testOpenAIConnection,
  DEFAULT_OPENAI_API_KEY,
} from "../src/services/openai";
import {
  getAiProvider,
  setAiProvider,
  getServices,
  registry,
} from "../src/services/registry";
import type { AIReplyRequest, AITutorRequest } from "../src/services/contracts";

let localApiKey = DEFAULT_OPENAI_API_KEY;
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const m = content.match(/VITE_OPENAI_API_KEY\s*=\s*([^\r\n]+)/);
    if (m && m[1].trim()) {
      localApiKey = m[1].trim();
    }
  }
} catch {
  // Ignore
}

console.log("=== VERIFICACIÓN DE INTEGRACIÓN OPENAI GPT EN NEXO ===");

// 1. Error Hierarchy
console.log("\n[1/5] Verificando jerarquía de errores de OpenAI...");
const baseError = new OpenAIError("Base error", "BASE_ERR", 500);
assert.strictEqual(baseError instanceof Error, true);
assert.strictEqual(baseError.code, "BASE_ERR");
assert.strictEqual(baseError.status, 500);

const keyError = new OpenAIKeyMissingError();
assert.strictEqual(keyError instanceof OpenAIError, true);
assert.strictEqual(keyError.code, "API_KEY_MISSING");
assert.strictEqual(keyError.status, 401);

const quotaError = new OpenAIQuotaError();
assert.strictEqual(quotaError instanceof OpenAIError, true);
assert.strictEqual(quotaError.code, "PROVIDER_QUOTA_EXCEEDED");
assert.strictEqual(quotaError.status, 429);

const netError = new OpenAINetworkError("Connection reset");
assert.strictEqual(netError instanceof OpenAIError, true);
assert.strictEqual(netError.code, "NETWORK_ERROR");
console.log("✓ Jerarquía de errores verificada correctamente.");

// 2. Precedencia y Configuración
console.log("\n[2/5] Verificando precedencia de claves y modelo...");
const originalKey = getOpenAIApiKey();
const originalModel = getOpenAIModel();

setOpenAIConfig("test-key-override", "gpt-4o");
assert.strictEqual(getOpenAIApiKey(), "test-key-override");
assert.strictEqual(getOpenAIModel(), "gpt-4o");

setOpenAIConfig("", "gpt-4o-mini");
assert.strictEqual(getOpenAIModel(), "gpt-4o-mini");
console.log("✓ Configuración y precedencia verificadas.");

// 3. Verificación de Lanzamiento de Errores sin Clave
console.log("\n[3/5] Verificando eliminación de fallbacks silenciosos (debe fallar si no hay clave)...");
let replyThrew = false;
try {
  await openaiAiService.reply({
    text: "Quiero hacer una app de citas",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "root",
  });
} catch (err) {
  if (err instanceof OpenAIKeyMissingError) {
    replyThrew = true;
  }
}
assert.strictEqual(replyThrew, true, "openaiAiService.reply debe lanzar OpenAIKeyMissingError cuando no hay clave");

let explainThrew = false;
try {
  await openaiAiService.explain({
    messageText: "Explicar arquitectura microservicios",
    lang: "es",
  });
} catch (err) {
  if (err instanceof OpenAIKeyMissingError) {
    explainThrew = true;
  }
}
assert.strictEqual(explainThrew, true, "openaiAiService.explain debe lanzar OpenAIKeyMissingError cuando no hay clave");
console.log("✓ Fallback silencioso eliminado: responde con excepciones tipadas.");

// 4. Enrutamiento dinámico en el Registry
console.log("\n[4/5] Verificando enrutamiento dinámico de proveedores en Registry...");
setOpenAIConfig(localApiKey, "gpt-4o-mini");
setAiProvider("openai");
assert.strictEqual(getAiProvider(), "openai");
const activeServicesOpenAI = getServices();
assert.strictEqual(activeServicesOpenAI.ai, openaiAiService, "Registry debe devolver openaiAiService cuando provider es openai");

setAiProvider("gemini");
assert.strictEqual(getAiProvider(), "gemini");
const activeServicesGemini = getServices();
assert.notStrictEqual(activeServicesGemini.ai, openaiAiService, "Registry no debe devolver openaiAiService cuando provider es gemini");

// Restaurar a openai como predeterminado
setAiProvider("openai");
console.log("✓ Enrutamiento dinámico entre OpenAI y Gemini verificado.");

// 5. Llamada Real a la API de OpenAI con la Clave del Usuario
console.log("\n[5/5] Ejecutando prueba de conexión real contra https://api.openai.com...");
const testResult = await testOpenAIConnection(localApiKey, "gpt-4o-mini");
assert.strictEqual(testResult.ok, true, `La prueba de conexión con OpenAI debe ser exitosa. Error: ${testResult.error}`);
assert.strictEqual(testResult.model, "gpt-4o-mini");
assert.ok(testResult.latencyMs > 0, "Debe registrar latencia en milisegundos");
console.log(`✓ Conexión real con OpenAI GPT exitosa (${testResult.latencyMs} ms, modelo: ${testResult.model})`);

// 5.1 Llamada real end-to-end de Ideación con gpt-4o-mini
console.log("\n[Bonus] Ejecutando llamada real de Ideación con OpenAI gpt-4o-mini...");
const aiResponse = await openaiAiService.reply({
  text: "Hola, quiero crear una app de telemedicina para citas con psicólogos",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-0",
});

assert.ok(aiResponse.message, "Debe incluir un mensaje en la respuesta");
assert.ok(aiResponse.message.text.length > 0, "El mensaje debe tener texto generado por OpenAI");
console.log("Respuesta de OpenAI recibida:");
console.log(`- Acción: ${aiResponse.message.action}`);
console.log(`- Texto: ${aiResponse.message.text.slice(0, 100)}...`);
if (aiResponse.message.discoveryQuestions && aiResponse.message.discoveryQuestions.length > 0) {
  console.log(`- Preguntas generadas: ${aiResponse.message.discoveryQuestions.length}`);
  for (const q of aiResponse.message.discoveryQuestions) {
    console.log(`  * ${q.question} (${q.options.length} opciones)`);
  }
}

console.log("\n[6/6] Verificando resiliencia de normalización de categorías contra errores de renderizado...");
const { normalizeCategory } = await import("../src/domain/constants");
assert.strictEqual(normalizeCategory("social"), "political", "'social' debe mapearse a categoría canónica 'political'");
assert.strictEqual(normalizeCategory("business"), "economic", "'business' debe mapearse a 'economic'");
assert.strictEqual(normalizeCategory("regulatorio"), "legal", "'regulatorio' debe mapearse a 'legal'");
assert.strictEqual(normalizeCategory("core"), "technical", "'core' debe mapearse a 'technical'");
assert.strictEqual(normalizeCategory("unknown_random_category"), "technical", "Categorías desconocidas deben tener fallback seguro a 'technical'");
assert.strictEqual(normalizeCategory(undefined), "technical", "undefined debe tener fallback a 'technical'");
console.log("✓ Normalización de categorías canónicas validada (inmune a errores de lectura de 'push').");

console.log("\n=======================================================");
console.log("✨ ¡TODAS LAS VERIFICACIONES DE OPENAI GPT COMPLETADAS CON ÉXITO! ✨");
console.log("=======================================================");
