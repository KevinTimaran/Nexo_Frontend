import assert from "node:assert";
import { detectMessageLanguage, getSystemInstruction, buildUserPrompt } from "../src/services/ai/prompts";

console.log("=== PRUEBAS DE DETECCIÓN Y COMPORTAMIENTO BILINGÜE (ESPEJO) ===");

// 1. Detección en Español
const spanishInputs = [
  "Hola, quiero hacer una app para estudiantes",
  "Tengo una idea de negocio agrícola",
  "¿Cómo puedo estructurar el modelo económico?",
  "Plataforma de delivery con trazabilidad",
  "necesito validar los clientes B2B",
];

for (const input of spanishInputs) {
  const detected = detectMessageLanguage(input, "en");
  assert.strictEqual(
    detected,
    "es",
    `Debe detectar 'es' para: "${input}" (obtuvo ${detected})`
  );
}
console.log("✓ Detección de Español validada correctamente.");

// 2. Detección en Inglés
const englishInputs = [
  "Hello, I want to create an app for university students",
  "I have a business idea about agriculture logistics",
  "How should I structure the revenue model?",
  "Delivery platform with real-time tracking",
  "I need to validate B2B customers and pricing",
];

for (const input of englishInputs) {
  const detected = detectMessageLanguage(input, "es");
  assert.strictEqual(
    detected,
    "en",
    `Debe detectar 'en' para: "${input}" (obtuvo ${detected})`
  );
}
console.log("✓ Detección de Inglés validada correctamente.");

// 3. Casos neutros o ambiguos (deben recurrir al fallback)
assert.strictEqual(detectMessageLanguage("B2B SaaS 123", "es"), "es");
assert.strictEqual(detectMessageLanguage("B2B SaaS 123", "en"), "en");
console.log("✓ Casos neutros usan el idioma de fallback.");

// 4. Verificación de reglas en System Instruction
const esInstruction = getSystemInstruction("PHASE_1_DISCOVERY", "es");
assert.ok(
  esInstruction.includes("REGLA ABSOLUTA DE IDIOMA (COMPORTAMIENTO ESPEJO)"),
  "Debe contener la regla espejo"
);
assert.ok(
  esInstruction.includes("Si el usuario te habla o escribe en ESPAÑOL: Responde ABSOLUTAMENTE TODO en ESPAÑOL"),
  "Debe exigir español cuando el usuario hable español"
);

// 5. Verificación de directiva en buildUserPrompt
const esPrompt = buildUserPrompt({
  phase: "PHASE_1_DISCOVERY",
  lang: "es",
  userMessage: "Quiero una tienda online",
});
assert.ok(esPrompt.includes("DEBE ESTAR 100% EN ESPAÑOL"), "Prompt en español debe exigir salida en español");

const enPrompt = buildUserPrompt({
  phase: "PHASE_1_DISCOVERY",
  lang: "en",
  userMessage: "I want an online store",
});
assert.ok(enPrompt.includes("MUST BE 100% IN ENGLISH"), "Prompt en inglés debe exigir salida en inglés");

console.log("✓ Prompts y directivas de lenguaje verificadas con éxito.");
console.log("===============================================================");
