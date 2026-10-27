import assert from "node:assert";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  loginSchema,
  registerSchema,
} from "../src/features/auth/authValidations.ts";
import { getSystemInstruction } from "../src/services/ai/prompts.ts";
import { mockServices } from "../src/services/mock/index.ts";

console.log("=== INICIANDO PRUEBAS DE VERIFICACIÓN PROFUNDA ===");

// ---------------------------------------------------------
// 1. Validaciones de Email (incluyendo sanitización y trims)
// ---------------------------------------------------------
console.log("\n[1/7] Probando emailSchema...");
const validEmails = [
  "kevin@nexo.ai",
  "test@example.com",
  "user.name+tag@sub.domain.org",
  "  kevin.trimmed@nexo.ai  ", // Should trim and succeed
];
for (const email of validEmails) {
  const result = emailSchema.safeParse(email);
  assert.strictEqual(result.success, true, `Email válido falló: ${email}`);
}

const invalidEmails = [
  "",
  "   ",
  "not-an-email",
  "@no-user.com",
  "user@.com",
  "user@domain..com",
];
for (const email of invalidEmails) {
  const result = emailSchema.safeParse(email);
  assert.strictEqual(result.success, false, `Email inválido fue aceptado: ${email}`);
}
console.log("✓ emailSchema validado correctamente.");

// ---------------------------------------------------------
// 2. Validaciones de Contraseña (Límites y Edge Cases)
// ---------------------------------------------------------
console.log("\n[2/7] Probando passwordSchema (min 8 chars, 1 mayús, 1 num, 1 especial)...");
const validPasswords = [
  "Nexo@1234",
  "P@ssw0rd2026",
  "Valid123#Secure",
  "A1!aaaaa", // Exactamente 8 caracteres límite inferior
  "Z9$abcdefghijklmnopqrstuvwxyz",
  "Ñandú!2026", // Mayúscula Unicode y acentos
  "Pass with spaces 123!@", // Con espacios permitidos pero con los requisitos
];
for (const pwd of validPasswords) {
  const result = passwordSchema.safeParse(pwd);
  assert.strictEqual(result.success, true, `Contraseña válida rechazada: ${pwd}`);
}

// Exactly 7 characters (Boundary failure)
assert.strictEqual(passwordSchema.safeParse("A1!aaaa").success, false, "Debe rechazar exactamente 7 caracteres");
// Exactly 8 characters without uppercase
assert.strictEqual(passwordSchema.safeParse("a1!aaaaa").success, false, "Debe rechazar 8 caracteres sin mayúscula");
// Exactly 8 characters without number
assert.strictEqual(passwordSchema.safeParse("Aa!aaaaa").success, false, "Debe rechazar 8 caracteres sin número");
// Exactly 8 characters without special char
assert.strictEqual(passwordSchema.safeParse("Aa1aaaaa").success, false, "Debe rechazar 8 caracteres sin símbolo especial");
// Empty string
assert.strictEqual(passwordSchema.safeParse("").success, false, "Debe rechazar string vacío");
// Whitespace only
assert.strictEqual(passwordSchema.safeParse("        ").success, false, "Debe rechazar espacios en blanco sin mayús/num/símbolo");
console.log("✓ passwordSchema validado correctamente en todos sus límites y casos de borde.");

// ---------------------------------------------------------
// 3. Validaciones de Nombre
// ---------------------------------------------------------
console.log("\n[3/7] Probando nameSchema (min 2 chars, sin símbolos raros)...");
const validNames = [
  "Kevin",
  "María José",
  "Jean-Luc",
  "O'Connor",
  "René Descartes",
  "  Kevin Rivera  ", // Trimmed automatically
];
for (const name of validNames) {
  const result = nameSchema.safeParse(name);
  assert.strictEqual(result.success, true, `Nombre válido rechazado: ${name}`);
}

const invalidNames = [
  "",
  "   ",
  "K",
  "Kevin123",
  "User<script>",
  "Admin@#$",
  "John_Doe",
  "Pedro; DROP TABLE users;",
];
for (const name of invalidNames) {
  const result = nameSchema.safeParse(name);
  assert.strictEqual(result.success, false, `Nombre inválido aceptado: ${name}`);
}
console.log("✓ nameSchema validado correctamente.");

// ---------------------------------------------------------
// 4. Validaciones de Login Schema y Register Schema
// ---------------------------------------------------------
console.log("\n[4/7] Probando loginSchema y registerSchema...");
const validLogin = loginSchema.safeParse({ email: "kevin@nexo.ai", password: "Nexo@1234" });
assert.strictEqual(validLogin.success, true, "Login válido rechazado");

const invalidLogin = loginSchema.safeParse({ email: "bad-email", password: "123" });
assert.strictEqual(invalidLogin.success, false, "Login inválido aceptado");

const validRegister = registerSchema.safeParse({
  name: "Kevin Rivera",
  email: "kevin@nexo.ai",
  password: "Nexo@1234",
  confirmPassword: "Nexo@1234",
});
assert.strictEqual(validRegister.success, true, "Register válido rechazado");

const mismatchRegister = registerSchema.safeParse({
  name: "Kevin Rivera",
  email: "kevin@nexo.ai",
  password: "Nexo@1234",
  confirmPassword: "DifferentPassword!1",
});
assert.strictEqual(mismatchRegister.success, false, "Register con contraseñas distintas fue aceptado");
if (!mismatchRegister.success) {
  const issue = mismatchRegister.error.issues.find((i) => i.path.includes("confirmPassword"));
  assert.ok(issue, "Debe haber un error en confirmPassword");
  assert.strictEqual(issue.message, "Las contraseñas no coinciden");
}
console.log("✓ loginSchema y registerSchema validados correctamente.");

// ---------------------------------------------------------
// 5. Guardrail Semántico en prompts.ts
// ---------------------------------------------------------
console.log("\n[5/7] Probando getSystemInstruction con Guardrail...");
const instruction = getSystemInstruction("PHASE_1_DISCOVERY", "es", "Proyecto Test");
assert.ok(instruction.includes("REGLA DE CONTEXTO ESTRICTO (GUARDRAIL)"), "Falta la directiva de guardrail");
assert.ok(instruction.includes('"cardType": "warning"'), "Falta cardType warning en guardrail");
assert.ok(
  instruction.includes("Tu mensaje parece estar fuera del alcance de este proyecto"),
  "Falta mensaje de off-topic exacto"
);
assert.ok(
  instruction.includes("Mensaje fuera de contexto detectado."),
  "Falta explicación simplificada de off-topic"
);
assert.ok(instruction.includes('"readyForStructuring": false'), "readyForStructuring debe ser false en guardrail");
assert.ok(instruction.includes('"nodes": []'), "nodes debe ser [] en guardrail");
console.log("✓ Guardrail verificado en getSystemInstruction.");

// ---------------------------------------------------------
// 6. Simulación Mock de Guardrail Anti-Off-Topic
// ---------------------------------------------------------
console.log("\n[6/7] Probando mockServices.ai.reply para mensajes off-topic en todas las fases...");
async function testMockAi() {
  const offTopicQueries = [
    "Dame una receta para cocinar pizza margarita con queso",
    "¿Cuál es el horóscopo de hoy?",
    "Hablemos del partido de fútbol de ayer",
    "Cuéntame un chiste gracioso",
    "What is the weather in Paris?",
    "Tell me a joke about dogs",
    "Escribe una canción o poema sobre flores",
  ];

  for (const q of offTopicQueries) {
    const res = await mockServices.ai.reply({
      text: q,
      map: { nodes: [], relations: [] },
      lang: "es",
      replyTo: "m-user-1",
      chatPhase: "PHASE_1_DISCOVERY",
    });

    assert.strictEqual(res.message.cardType, "warning", `El cardType debe ser warning para query: "${q}"`);
    assert.strictEqual(res.message.readyForStructuring, false, "readyForStructuring debe ser false");
    assert.strictEqual(res.newNodes.length, 0, "No debe generar nuevos nodos en off-topic");
    assert.ok(
      res.message.text.includes("fuera del alcance") || res.message.text.includes("outside the scope"),
      "Texto de respuesta debe advertir off-topic"
    );
    assert.strictEqual(
      res.message.simplifiedExplanation,
      "Mensaje fuera de contexto detectado."
    );
  }

  // Verificar que el guardrail también actúe en PHASE_3_EXPANSION
  const resPhase3 = await mockServices.ai.reply({
    text: "dime una receta de cocina",
    map: {
      nodes: [
        {
          id: "n-1",
          kind: "concept",
          title: "Plataforma Agro",
          description: "Desc",
          status: "confirmed",
          metadata: "Meta",
          x: 0,
          y: 0,
        },
      ],
      relations: [],
    },
    lang: "es",
    replyTo: "m-user-phase3",
    chatPhase: "PHASE_3_EXPANSION",
  });
  assert.strictEqual(resPhase3.message.cardType, "warning");
  assert.strictEqual(resPhase3.newNodes.length, 0);

  // Mensaje on-topic normal
  const onTopicResp = await mockServices.ai.reply({
    text: "Quiero diseñar una plataforma de logística agrícola B2B",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "m-user-2",
    chatPhase: "PHASE_1_DISCOVERY",
  });
  assert.strictEqual(onTopicResp.message.cardType, "idea", "El cardType en on-topic debe ser idea");
  assert.ok(
    (onTopicResp.message.discoveryQuestions?.length ?? 0) > 0,
    "Debe generar preguntas en discovery"
  );
}

await testMockAi();
console.log("✓ mockServices.ai.reply detecta off-topic y responde con warning limpiamente.");

// ---------------------------------------------------------
// 7. Simulación Mock de Autenticación (signIn & signUp)
// ---------------------------------------------------------
console.log("\n[7/7] Probando mockServices.auth signIn y signUp...");
const signedIn = await mockServices.auth.signIn("kevin@nexo.ai", "Nexo@1234");
assert.strictEqual(signedIn.email, "kevin@nexo.ai");
assert.ok(signedIn.id);

const signedUp = await mockServices.auth.signUp("Kevin Rivera", "kevin2@nexo.ai", "Nexo@1234");
assert.strictEqual(signedUp.email, "kevin2@nexo.ai");
assert.strictEqual(signedUp.name, "Kevin Rivera");
assert.ok(signedUp.id);
console.log("✓ mockServices.auth maneja login y registro.");

console.log("\n==========================================");
console.log("¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!");
console.log("==========================================");
