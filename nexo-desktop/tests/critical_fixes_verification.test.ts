import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { getSystemInstruction, buildUserPrompt } from "../src/services/ai/prompts";
import { mockServices } from "../src/services/mock";

console.log("=== VERIFICACIÓN DE LAS 4 CORRECCIONES CRÍTICAS ===");

// ─── TAREA 1: Prompt AI sin bucle de alucinación ni restaurantes/agricultura ───
console.log("\n[1/4] Verificando Tarea 1: System Prompts y Detección Dinámica...");

const phase1System = getSystemInstruction("PHASE_1_DISCOVERY", "es");
const phase2System = getSystemInstruction("PHASE_2_STRUCTURING", "es");
const phase3System = getSystemInstruction("PHASE_3_EXPANSION", "es");

const userPromptPhase1 = buildUserPrompt({
  phase: "PHASE_1_DISCOVERY",
  lang: "es",
  userMessage: "Quiero crear una app de citas para universitarios",
});

// 1.1 Nueva instrucción estricta en Phase 1 (Enrutador JSON y Regla de Contextualización Estricta)
const expectedRouterHeader =
  "Eres un Arquitecto de Software Consultor experto. Tu objetivo es entender la idea del usuario. DEBES responder SIEMPRE con un objeto JSON válido con esta estructura:";
const expectedDecisionRules = [
  '1. Si la idea es vaga, confusa o fuera de tema (ej. \'quiero hacer un sándwich\' o \'hola\'): Usa action: "chat", haz preguntas abiertas en texto pidiendo que aclare su idea de software. NO envíes cuestionarios.',
  '2. Si la idea ya es clara (ej. \'app de citas para doctores\'): Usa action: "questionnaire" y genera exactamente 3 preguntas clave de opción múltiple para definir detalles técnicos o de negocio.',
  '3. Si el usuario ya respondió el cuestionario o la idea está 100% clara y definida: Usa action: "ready", y en el mensaje dile que estás listo para generar el proyecto.',
];
const expectedStrictContextRules = [
  "Eres un Arquitecto de Software Consultor experto. Cuando la idea del usuario esté clara y decidas enviar un 'questionnaire', TIENES PROHIBIDO usar preguntas genéricas de plantillas de startups (nada de 'público general', 'early adopters' o 'comunidades P2P' a menos que sea una red social).",
  "Tus 3 preguntas deben estar HIPER-PERSONALIZADAS a la INDUSTRIA y MODELO DE NEGOCIO que propone el usuario.",
  "1. Roles y permisos (Ej: ¿El sistema tendrá jerarquía entre Superadmin de franquicia, Gerente de sede y Meseros?).",
  "2. Arquitectura de datos (Ej: ¿Sincronización multi-tenant en tiempo real o bases de datos aisladas por sede?).",
  "3. Operaciones (Ej: ¿Se integrará con hardware POS e impresoras térmicas o será 100% cloud en tablets?).",
  "Genera siempre un JSON válido adaptando las preguntas y las opciones de respuesta estrictamente al dominio del problema del usuario.",
];

assert.ok(
  phase1System.includes(expectedRouterHeader),
  "getSystemInstruction(PHASE_1_DISCOVERY) debe incluir el encabezado de Arquitecto Consultor experto y estructura JSON"
);

for (const rule of expectedDecisionRules) {
  assert.ok(
    phase1System.includes(rule),
    `getSystemInstruction(PHASE_1_DISCOVERY) debe incluir la regla de decisión: "${rule}"`
  );
  assert.ok(
    userPromptPhase1.includes(rule),
    `buildUserPrompt(PHASE_1_DISCOVERY) debe incluir la regla de decisión: "${rule}"`
  );
}

for (const contextRule of expectedStrictContextRules) {
  assert.ok(
    phase1System.includes(contextRule),
    `getSystemInstruction(PHASE_1_DISCOVERY) debe incluir la regla de contextualización estricta: "${contextRule}"`
  );
  assert.ok(
    userPromptPhase1.includes(contextRule),
    `buildUserPrompt(PHASE_1_DISCOVERY) debe incluir la regla de contextualización estricta: "${contextRule}"`
  );
}

// 1.2 Eliminación completa de ejemplos quemados de agricultura
const allPromptsCombined = `${phase1System}\n${phase2System}\n${phase3System}`;
assert.strictEqual(
  allPromptsCombined.includes("Mercado Agrícola"),
  false,
  "System Prompts no deben contener 'Mercado Agrícola'"
);
assert.strictEqual(
  allPromptsCombined.includes("restaurantes urbanos"),
  false,
  "System Prompts no deben contener 'restaurantes urbanos'"
);
assert.strictEqual(
  allPromptsCombined.includes("agricultores certificados"),
  false,
  "System Prompts no deben contener 'agricultores certificados'"
);

// 1.3 Verificación de respuestas mock hiper-personalizadas por industria (citas, restaurantes, música, general)
async function testMockCitas() {
  // 1.3.1 Prueba de Regla 1: Idea vaga o saludo -> action: "chat"
  const greetingReply = await mockServices.ai.reply({
    text: "hola",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "msg-test-greet",
    chatPhase: "PHASE_1_DISCOVERY",
  });
  assert.strictEqual(greetingReply.message.action, "chat", "Saludo debe retornar action: 'chat'");
  assert.strictEqual(greetingReply.message.readyForStructuring, false);
  assert.strictEqual(greetingReply.message.discoveryQuestions?.length, 0, "No debe enviar cuestionarios en saludo");

  // 1.3.2 Prueba de Regla 2: Idea clara de citas -> action: "questionnaire" con exactamente 3 preguntas
  const datingReply = await mockServices.ai.reply({
    text: "App de citas para jóvenes profesionales",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "msg-test",
    chatPhase: "PHASE_1_DISCOVERY",
  });

  assert.strictEqual(datingReply.message.action, "questionnaire", "Idea clara debe retornar action: 'questionnaire'");
  assert.strictEqual(datingReply.message.readyForStructuring, false);
  assert.strictEqual(datingReply.message.discoveryQuestions?.length, 3, "Debe generar exactamente 3 preguntas");
  const q1 = datingReply.message.discoveryQuestions![0];
  const q2 = datingReply.message.discoveryQuestions![1];
  const q3 = datingReply.message.discoveryQuestions![2];

  assert.ok(
    q1.question.toLowerCase().includes("match"),
    "La primera pregunta para citas debe indagar sobre algoritmos o enfoque de match"
  );
  assert.ok(
    q2.question.toLowerCase().includes("perfil") || q2.question.toLowerCase().includes("seguridad"),
    "La segunda pregunta para citas debe indagar sobre perfiles o verificación"
  );
  assert.ok(
    q3.question.toLowerCase().includes("monetización") || q3.question.toLowerCase().includes("negocio"),
    "La tercera pregunta para citas debe indagar sobre monetización o modelo de negocio"
  );

  // Asegurar que cuando pide citas no contenga restaurantes ni agricultores
  const datingOutputJson = JSON.stringify(datingReply);
  assert.strictEqual(datingOutputJson.includes("restaurante"), false);
  assert.strictEqual(datingOutputJson.includes("agricultor"), false);
  assert.strictEqual(datingOutputJson.includes("productores locales"), false);

  // 1.3.3 Prueba de Hiper-Personalización B2B Restaurantes (caso exacto reportado por el usuario)
  const restaurantReply = await mockServices.ai.reply({
    text: "Hola, quiero crea una app de gestion de restauran para meseros",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "msg-test-rest",
    chatPhase: "PHASE_1_DISCOVERY",
  });
  assert.strictEqual(restaurantReply.message.action, "questionnaire", "App de restaurante para meseros debe retornar action: 'questionnaire'");
  assert.strictEqual(restaurantReply.message.discoveryQuestions?.length, 3, "Debe generar exactamente 3 preguntas hiper-personalizadas");
  const restJson = JSON.stringify(restaurantReply.message.discoveryQuestions);
  assert.ok(
    restJson.includes("Superadmin") && restJson.includes("Meseros"),
    "Pregunta 1 de restaurantes debe abordar jerarquía de roles (Superadmin, Gerente de sede, Meseros)"
  );
  assert.ok(
    restJson.includes("multi-tenant") && restJson.includes("sede"),
    "Pregunta 2 de restaurantes debe abordar arquitectura de datos multi-tenant o bases aisladas por sede"
  );
  assert.ok(
    restJson.includes("hardware POS") && restJson.includes("impresoras térmicas"),
    "Pregunta 3 de restaurantes debe abordar integración con hardware POS e impresoras térmicas o 100% cloud en tablets"
  );
  assert.strictEqual(restJson.includes("P2P"), false, "PROHIBIDO incluir preguntas genéricas de comunidades P2P");
  assert.strictEqual(restJson.includes("Early Adopters"), false, "PROHIBIDO incluir preguntas genéricas de Early Adopters");
  assert.strictEqual(restJson.includes("Público general"), false, "PROHIBIDO incluir preguntas genéricas de Público general");

  // 1.4 Verificación de respuesta musical y fallback B2B: exactamente 3 preguntas sin plantillas genéricas
  const generalReply = await mockServices.ai.reply({
    text: "Plataforma de streaming musical para creadores independientes",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "msg-test-2",
    chatPhase: "PHASE_1_DISCOVERY",
  });
  assert.strictEqual(generalReply.message.action, "questionnaire");
  assert.strictEqual(generalReply.message.discoveryQuestions?.length, 3, "Respuesta general debe generar 3 preguntas");
  const generalOutputJson = JSON.stringify(generalReply);
  assert.strictEqual(generalOutputJson.includes("Early Adopters"), false);
  assert.strictEqual(generalOutputJson.includes("Público general"), false);
  assert.strictEqual(generalOutputJson.includes("restaurante"), false);
  assert.strictEqual(generalOutputJson.includes("agricultor"), false);

  const customErpReply = await mockServices.ai.reply({
    text: "Sistema de control de inventario logístico para almacenes",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "msg-test-erp",
    chatPhase: "PHASE_1_DISCOVERY",
  });
  const customErpJson = JSON.stringify(customErpReply.message.discoveryQuestions);
  assert.strictEqual(customErpJson.includes("P2P"), false, "Fallback tampoco debe usar plantillas genéricas P2P");
  assert.strictEqual(customErpJson.includes("Early Adopters"), false, "Fallback tampoco debe usar Early Adopters");
  assert.strictEqual(customErpJson.includes("Público general"), false, "Fallback tampoco debe usar Público general");

  // 1.5 Prueba de Regla 3: Respuesta lista o completada -> action: "ready"
  const readyReply = await mockServices.ai.reply({
    text: "Listo, generar arquitectura",
    map: { nodes: [], relations: [] },
    lang: "es",
    replyTo: "msg-test-ready",
    chatPhase: "PHASE_1_DISCOVERY",
  });
  assert.strictEqual(readyReply.message.action, "ready", "Comando listo debe retornar action: 'ready'");
  assert.strictEqual(readyReply.message.readyForStructuring, true, "readyForStructuring debe ser true");
  assert.strictEqual(readyReply.message.discoveryQuestions?.length, 0);

  // 1.6 Verificación de formato JSON en getSystemInstruction
  assert.ok(
    phase1System.includes('"action": "chat" | "questionnaire" | "ready"'),
    "El formato de salida JSON en FASE 1 debe especificar el enrutador action"
  );
}

await testMockCitas();
console.log("✓ Tarea 1: Instrucciones estrictas y ausencia de alucinación/hardcoding verificadas.");

// ─── TAREA 2: Aislamiento del Chat exclusivamente a Ideación IA ───
console.log("\n[2/4] Verificando Tarea 2: Aislamiento del chat en Ideación IA...");

const spaceWorkspacePath = path.resolve(__dirname, "../src/features/spatial/SpaceWorkspace.tsx");
const spatialDockPath = path.resolve(__dirname, "../src/features/spatial/SpatialDock.tsx");
const workspaceViewPath = path.resolve(__dirname, "../src/features/workspace/WorkspaceView.tsx");

const spaceWorkspaceCode = fs.readFileSync(spaceWorkspacePath, "utf-8");
const spatialDockCode = fs.readFileSync(spatialDockPath, "utf-8");
const workspaceViewCode = fs.readFileSync(workspaceViewPath, "utf-8");

// 2.1 En SpaceWorkspace no debe renderizarse SpatialChatPanel
assert.strictEqual(
  spaceWorkspaceCode.includes("<SpatialChatPanel"),
  false,
  "SpaceWorkspace.tsx NO debe renderizar SpatialChatPanel"
);

// 2.2 En SpatialDock no debe haber botón de chat
assert.strictEqual(
  spatialDockCode.includes('key: "chat"'),
  false,
  "SpatialDock.tsx NO debe incluir botón de chat en panelItems"
);
assert.strictEqual(
  spatialDockCode.includes("Abrir Chat de IA"),
  false,
  "SpatialDock.tsx NO debe contener la etiqueta 'Abrir Chat de IA'"
);

// 2.3 En WorkspaceView el AIChatDrawer solo se renderiza si isDiscoveryMode
assert.ok(
  workspaceViewCode.includes("isDiscoveryMode && isChatOpen"),
  "AIChatDrawer debe estar condicionado estrictamente a isDiscoveryMode"
);
assert.strictEqual(
  workspaceViewCode.includes("canvasMode !== \"spatial\" && !isDiscoveryMode"),
  false,
  "AIChatDrawer ya no debe renderizarse en el Tablero de Conceptos (!isDiscoveryMode)"
);

// 2.4 ConceptCanvas en Tablero no debe sufrir espaciado fantasma de drawer
assert.ok(
  workspaceViewCode.includes("isChatOpen={false}"),
  "ConceptCanvas debe recibir isChatOpen={false} para evitar espacio vacío a la derecha"
);

// 2.5 Header global sin botón Copilot IA
const headerRegex = /<header[\s\S]*?<\/header>/;
const headerMatch = workspaceViewCode.match(headerRegex);
assert.ok(headerMatch);
assert.strictEqual(
  headerMatch[0].includes("Copilot IA"),
  false,
  "El header global de WorkspaceView no debe renderizar botón de Copilot IA"
);

console.log("✓ Tarea 2: Aislamiento total del chat a la vista de Ideación IA verificado.");

// ─── TAREA 3: Límite de caracteres en Creación de Proyecto ───
console.log("\n[3/4] Verificando Tarea 3: maxLength y contador en CreateProjectModal...");

const createProjectModalPath = path.resolve(__dirname, "../src/features/dashboard/CreateProjectModal.tsx");
const createProjectModalCode = fs.readFileSync(createProjectModalPath, "utf-8");

assert.ok(
  createProjectModalCode.includes("maxLength={150}"),
  "textarea de descripción debe tener atributo maxLength={150}"
);
assert.ok(
  createProjectModalCode.includes("{description.length}/150"),
  "CreateProjectModal debe renderizar el contador de caracteres {description.length}/150"
);
assert.ok(
  createProjectModalCode.includes("text-muted text-xs"),
  "El contador de caracteres debe usar clases semánticas text-muted text-xs"
);
assert.ok(
  createProjectModalCode.includes("description.length > 150"),
  "CreateProjectModal debe validar activamente contra descripciones > 150 caracteres"
);

console.log("✓ Tarea 3: maxLength={150} y contador {description.length}/150 verificados.");

// ─── TAREA 4: Tokens semánticos en Píldora Guardado (sin verdes genéricos) ───
console.log("\n[4/4] Verificando Tarea 4: Tokens semánticos en píldora Guardado...");

// Verificar en el header de WorkspaceView
assert.strictEqual(
  headerMatch[0].includes("bg-emerald-"),
  false,
  "Píldora de estado en header no debe usar clases genéricas bg-emerald"
);
assert.strictEqual(
  headerMatch[0].includes("text-emerald-"),
  false,
  "Píldora de estado en header no debe usar clases genéricas text-emerald"
);
assert.ok(
  headerMatch[0].includes("bg-positive/10 text-positive border border-positive/20"),
  "Píldora de estado debe usar los tokens exactos bg-positive/10 text-positive border border-positive/20"
);
assert.ok(
  headerMatch[0].includes("glass-pill"),
  "Píldora de estado debe incorporar la utilidad glass-pill"
);

// Verificar ausencia de verdes genéricos en AIChatDrawer
const aiChatDrawerPath = path.resolve(__dirname, "../src/features/workspace/AIChatDrawer.tsx");
const aiChatDrawerCode = fs.readFileSync(aiChatDrawerPath, "utf-8");
assert.strictEqual(
  aiChatDrawerCode.includes("to-emerald-"),
  false,
  "AIChatDrawer.tsx no debe contener clases genéricas to-emerald-"
);

console.log("✓ Tarea 4: Tokens semánticos del Design System y eliminación de verdes genéricos verificados.");

console.log("\n=======================================================");
console.log("✨ ¡TODAS LAS VERIFICACIONES DE LAS 4 TAREAS EXITOSAS! ✨");
console.log("=======================================================");
