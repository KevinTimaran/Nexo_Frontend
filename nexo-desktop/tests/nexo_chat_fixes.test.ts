import assert from "node:assert/strict";
import {
  initialDiscovery,
  recordUserInput,
  isDiscoveryReady,
  nextDiscoveryQuestion,
} from "../src/services/ai/discovery";
import {
  isPlaceholderResponse,
  sanitizeAssistantText,
  getSystemInstruction,
  buildUserPrompt,
} from "../src/services/ai/prompts";
import { useWorkspaceStore } from "../src/store/useWorkspaceStore";
import { mockServices } from "../src/services/mock";
import type { WorkspaceProject, ProjectMap } from "../src/domain/types";

console.log("=== REGRESSION SUITE: NEXO CHAT REPEATED COMPLETION CARDS & BROKEN RESPONSES ===");

// Helper to create user message
const makeUserMsg = (id: string, text: string) => ({
  id,
  role: "user" as const,
  text,
  createdAt: new Date().toISOString(),
});

// =========================================================================
// 1. PREMATURE COMPLETION PREVENTION & DISCOVERY LIFECYCLE
// =========================================================================
console.log("\n[1/4] Verificando prevención de finalización prematura del Discovery...");

// 1.1 Greetings should NOT mark discovery as ready
const d0 = initialDiscovery();
const greetingInputs = ["Hola", "Buenas tardes", "Hey!", "Buenos días", "hello"];
for (const greeting of greetingInputs) {
  const dGreeting = recordUserInput(d0, makeUserMsg("m-greet", greeting));
  assert.notEqual(
    dGreeting.lifecycle,
    "ready",
    `Greeting '${greeting}' should NOT mark lifecycle as ready`
  );
  assert.equal(
    isDiscoveryReady(dGreeting),
    false,
    `isDiscoveryReady should be false for greeting '${greeting}'`
  );
}

// 1.2 Vague short phrases should NOT mark discovery as ready
const vagueInputs = [
  "Tengo una idea",
  "Quiero hacer una app",
  "Ayuda con un proyecto",
  "Quiero programar algo",
];
for (const vague of vagueInputs) {
  const dVague = recordUserInput(d0, makeUserMsg("m-vague", vague));
  assert.notEqual(
    dVague.lifecycle,
    "ready",
    `Vague phrase '${vague}' should NOT mark lifecycle as ready`
  );
  assert.equal(
    isDiscoveryReady(dVague),
    false,
    `isDiscoveryReady should be false for vague phrase '${vague}'`
  );
  const questions = nextDiscoveryQuestion(dVague);
  assert.ok(
    questions.length > 0,
    `Should provide follow-up questions for vague phrase '${vague}'`
  );
}

// 1.3 Minimal domain keyword alone (e.g., "app para restaurante" or "app para gestionar ventas") is not enough for readiness
const dPartial = recordUserInput(
  d0,
  makeUserMsg("m-partial", "Quiero una app para restaurante")
);
assert.equal(
  isDiscoveryReady(dPartial),
  false,
  "Partial/incomplete domain input without clear outcome/problem should not be ready"
);
assert.ok(
  nextDiscoveryQuestion(dPartial).length > 0,
  "Should ask follow-up questions for incomplete domain info"
);

// 1.3b Generic action verb with broad topic (e.g., "app para gestionar ventas") must NOT complete prematurely on turn 1
const dGestionVentas = recordUserInput(
  d0,
  makeUserMsg("m-gv", "Quiero una app para gestionar ventas")
);
assert.equal(
  dGestionVentas.lifecycle,
  "discovering",
  "Generic short intent 'app para gestionar ventas' must remain in discovering phase"
);
assert.equal(
  isDiscoveryReady(dGestionVentas),
  false,
  "isDiscoveryReady must be false for single-sentence generic intent"
);

// Conversational filler on turn 2 (e.g. 'ok', 'hola') must not prematurely mark ready
const dTurn2Filler = recordUserInput(
  dGestionVentas,
  makeUserMsg("m-gv-ok", "ok")
);
assert.equal(
  dTurn2Filler.lifecycle,
  "discovering",
  "Filler reply 'ok' on turn 2 must not mark discovery ready"
);

// Substantive reply on turn 2 completes discovery properly
const dTurn2Rich = recordUserInput(
  dGestionVentas,
  makeUserMsg("m-gv-ans", "Es para digitalizar comandas de mesas a cocina y evitar demoras en restaurantes")
);
assert.equal(
  dTurn2Rich.lifecycle,
  "ready",
  "Substantive answer on turn 2 should mark discovery ready"
);

// 1.4 Comprehensive, meaningful input marks discovery ready
const richInput =
  "Quiero crear un sistema SaaS de gestión de comandas y reservas para restaurantes gastronómicos que reduzca el tiempo de espera y evite pérdidas de pedidos";
const dRich = recordUserInput(d0, makeUserMsg("m-rich", richInput));
assert.equal(
  dRich.lifecycle,
  "ready",
  "Rich input with offering, problem, audience, and outcome should be ready"
);
assert.equal(isDiscoveryReady(dRich), true, "isDiscoveryReady should return true for rich input");

// 1.5 Existing generated project lifecycle and post-generation preservation
const dExisting = initialDiscovery(true);
assert.equal(
  dExisting.lifecycle,
  "generated",
  "initialDiscovery with existing nodes must initialize in 'generated' lifecycle"
);
const dPostGenChat = recordUserInput(
  dExisting,
  makeUserMsg("m-post", "En vez de React prefiero Vue para el frontend")
);
assert.equal(
  dPostGenChat.lifecycle,
  "generated",
  "Conversational phrase 'en vez de' during architecture discussion must preserve lifecycle: 'generated'"
);

// Explicit project correction restarts discovery
const dCorrection = recordUserInput(
  dExisting,
  makeUserMsg("m-corr", "En realidad quiero hacer una aplicación")
);
assert.equal(
  dCorrection.lifecycle,
  "discovering",
  "Explicit project reset 'En realidad quiero hacer una aplicación' should restart discovery"
);

console.log("✓ Prevención de finalización prematura verificada correctamente.");

// =========================================================================
// 2. PLACEHOLDER RESPONSES DETECTION & SANITIZATION
// =========================================================================
console.log("\n[2/4] Verificando detección y sanitización de respuestas placeholder...");

// 2.1 Test detection of exact and partial placeholder phrases
const placeholderSamples = [
  "Your strategic analysis or response on how to branch this framework into the project.",
  "Tu análisis estratégico o respuesta sobre cómo ramificar este marco en el proyecto.",
  "Respuesta estratégica sobre cómo ramificar este marco en el proyecto...",
  "Tu respuesta o análisis estratégico sobre cómo ramificar el marco en el proyecto.",
  "Your strategic analysis...",
];

for (const sample of placeholderSamples) {
  assert.ok(
    isPlaceholderResponse(sample),
    `Should detect placeholder response: "${sample}"`
  );
}

// 2.2 Legitimate responses should NOT be flagged as placeholder
const validResponses = [
  "Para tu restaurante, recomiendo priorizar el módulo de KDS (Kitchen Display System) y la sincronización offline.",
  "Analizando la perspectiva económica, el modelo freemium con comisión por transacción reduce la fricción de entrada.",
  "Here is a strategic roadmap focusing on compliance with local food safety regulations.",
  "Para el modelo de precios, un análisis estratégico inicial requiere definir si cobrarás por suscripción mensual o por porcentaje de venta.",
  "A strategic analysis of your competitors shows an opportunity in local delivery.",
  "El análisis estratégico elaborado muestra cómo mitigar riesgos operacionales.",
];

for (const valid of validResponses) {
  assert.equal(
    isPlaceholderResponse(valid),
    false,
    `Should NOT detect legitimate text as placeholder: "${valid}"`
  );
}

// 2.3 Sanitization replaces placeholders with contextual project guidance
const sanitizedEs = sanitizeAssistantText(
  "Tu análisis estratégico o respuesta sobre cómo ramificar este marco en el proyecto.",
  "es",
  "Sistema de Comandas"
);
assert.ok(!isPlaceholderResponse(sanitizedEs), "Sanitized ES text should not be a placeholder");
assert.ok(
  sanitizedEs.includes("Sistema de Comandas"),
  "Sanitized ES text should include project topic context"
);

const sanitizedEn = sanitizeAssistantText(
  "Your strategic analysis or response on how to branch this framework into the project.",
  "en",
  "Restaurant POS"
);
assert.ok(!isPlaceholderResponse(sanitizedEn), "Sanitized EN text should not be a placeholder");
assert.ok(
  sanitizedEn.includes("Restaurant POS"),
  "Sanitized EN text should include project topic context"
);

// 2.4 Verify PHASE_3_EXPANSION prompt does NOT contain placeholder strings
const phase3Instruction = getSystemInstruction("PHASE_3_EXPANSION", "es");
assert.ok(
  !phase3Instruction.includes("Tu análisis estratégico o respuesta sobre cómo ramificar"),
  "Phase 3 system instruction must NOT contain the old placeholder string"
);
assert.ok(
  phase3Instruction.includes("PROHIBICIÓN ESTRICTA DE TEXTOS PLANTILLA") &&
  phase3Instruction.includes("placeholders"),
  "Phase 3 system instruction must forbid placeholder responses"
);

console.log("✓ Detección y sanitización de placeholders verificada correctamente.");

// =========================================================================
// 3. REPEATED COMPLETION CARDS PREVENTION
// =========================================================================
console.log("\n[3/4] Verificando prevención de tarjetas de completitud repetidas...");

// 3.1 Initial project setup with generated lifecycle
const mockProject: WorkspaceProject = {
  id: "proj-101",
  name: "Plataforma de Comandas",
  description: "SaaS gastronómico",
  status: "draft",
  icon: "utensils",
  updatedAt: new Date().toISOString(),
  nodeCount: 4,
};

const mockMap: ProjectMap = {
  nodes: [
    {
      id: "n1",
      title: "KDS Central",
      description: "Pantalla de cocina",
      kind: "concept",
      status: "exploring",
      phase: "planning",
      x: 100,
      y: 100,
    },
    {
      id: "n2",
      title: "Control de Costos",
      description: "Materia prima",
      kind: "viability",
      status: "exploring",
      phase: "execution",
      x: 300,
      y: 100,
    },
  ],
  relations: [
    {
      id: "r1",
      source: "n1",
      target: "n2",
      label: "impacta",
    },
  ],
};

const initialConversation = [
  makeUserMsg("u1", "Quiero digitalizar las comandas de mi restaurante con KDS"),
  {
    id: "a1",
    role: "assistant" as const,
    text: "Excelente, el KDS optimiza la comunicación de cocina.",
    createdAt: new Date().toISOString(),
  },
];

// Set initial generated workspace
useWorkspaceStore.getState().setWorkspace({
  project: mockProject,
  map: mockMap,
  messages: initialConversation,
  discovery: {
    ...dRich,
    lifecycle: "generated",
    completionAnchorMessageId: "u1",
  },
});

const stateAfterGen = useWorkspaceStore.getState();
const readyCardsInitial = stateAfterGen.discoveryMessages.filter((m) => m.type === "ready");
assert.equal(
  readyCardsInitial.length,
  1,
  `Should have exactly 1 ready completion card after initial generation, got ${readyCardsInitial.length}`
);
assert.equal(
  readyCardsInitial[0].id,
  `generation-status-${mockProject.id}`,
  "Ready card should have standard generation-status id"
);

// 3.2 Post-generation turn 1: User asks a follow-up question
const postGenInput1 = makeUserMsg(
  "u2",
  "¿Cómo manejamos la contingencia si se cae el internet en la cocina?"
);
// In discovery, recordUserInput should preserve lifecycle: "generated" and completionAnchorMessageId
const dAfterTurn1 = recordUserInput(
  stateAfterGen.workspace!.discovery!,
  postGenInput1
);
assert.equal(
  dAfterTurn1.lifecycle,
  "generated",
  "recordUserInput must preserve lifecycle='generated' for post-generation conversation"
);
assert.equal(
  dAfterTurn1.completionAnchorMessageId,
  "u1",
  "recordUserInput must preserve completionAnchorMessageId to avoid moving card"
);

// Append turn 1 to workspace messages
const conversationTurn1 = [
  ...initialConversation,
  postGenInput1,
  {
    id: "a2",
    role: "assistant" as const,
    text: "Para contingencia sin internet, implementaremos una arquitectura Local-First con sincronización diferida mediante CRDTs y cola de mensajería SQLite.",
    createdAt: new Date().toISOString(),
  },
];

useWorkspaceStore.getState().setWorkspace({
  project: mockProject,
  map: mockMap,
  messages: conversationTurn1,
  discovery: dAfterTurn1,
});

const stateAfterTurn1 = useWorkspaceStore.getState();
const readyCardsTurn1 = stateAfterTurn1.discoveryMessages.filter((m) => m.type === "ready");
assert.equal(
  readyCardsTurn1.length,
  1,
  `Should still have exactly 1 ready card after turn 1, got ${readyCardsTurn1.length}`
);

// Verify position: ready card must be at anchor position (index 1), NOT at the end
const readyCardIndexTurn1 = stateAfterTurn1.discoveryMessages.findIndex((m) => m.type === "ready");
assert.equal(
  readyCardIndexTurn1,
  1,
  `Ready card must remain anchored at index 1, not pushed to the end (was at ${readyCardIndexTurn1})`
);
assert.equal(
  stateAfterTurn1.discoveryMessages[stateAfterTurn1.discoveryMessages.length - 1].role,
  "assistant",
  "Last message must be the assistant response, not the completion card"
);

// 3.3 Post-generation turn 2, 3, 4: multiple subsequent turns
let runningConversation = [...conversationTurn1];
let currentDiscovery = dAfterTurn1;

for (let turn = 3; turn <= 6; turn++) {
  const uMsg = makeUserMsg(`u${turn}`, `Pregunta de seguimiento ${turn}: ¿Qué stack recomiendas?`);
  currentDiscovery = recordUserInput(currentDiscovery, uMsg);
  const aMsg = {
    id: `a${turn}`,
    role: "assistant" as const,
    text: `Respuesta de seguimiento ${turn}: Recomiendo React con IndexedDB en frontend y Node.js en backend.`,
    createdAt: new Date().toISOString(),
  };
  runningConversation.push(uMsg, aMsg);

  useWorkspaceStore.getState().setWorkspace({
    project: mockProject,
    map: mockMap,
    messages: runningConversation,
    discovery: currentDiscovery,
  });

  const stateCurrent = useWorkspaceStore.getState();
  const readyCardsCurrent = stateCurrent.discoveryMessages.filter((m) => m.type === "ready");
  assert.equal(
    readyCardsCurrent.length,
    1,
    `Must maintain exactly 1 ready card at turn ${turn}, found ${readyCardsCurrent.length}`
  );
  assert.equal(
    stateCurrent.discoveryMessages[stateCurrent.discoveryMessages.length - 1].id,
    `a${turn}`,
    `Latest message in discoveryMessages must be the assistant response a${turn}`
  );
}

console.log("✓ Prevención de tarjetas de completitud repetidas verificada con éxito.");

// =========================================================================
// 4. POST-GENERATION CONTINUOUS CONVERSATION & AI RESPONSES
// =========================================================================
console.log("\n[4/4] Verificando conversación continua post-generación...");

// 4.1 Mock AI reply in PHASE_3_EXPANSION with existing map nodes
async function testPostGenAIReply() {
  const replyResult = await mockServices.ai.reply({
    text: "¿Cómo podemos monetizar este sistema de comandas?",
    map: mockMap,
    lang: "es",
    replyTo: "u6",
    chatPhase: "PHASE_3_EXPANSION",
    messageHistory: runningConversation as any,
  });

  assert.equal(
    replyResult.message.action,
    "chat",
    "Post-generation AI reply must have action: 'chat', not 'ready' or 'questionnaire'"
  );
  assert.equal(
    replyResult.message.readyForStructuring,
    false,
    "readyForStructuring must be false in post-generation conversation"
  );
  assert.equal(
    replyResult.message.discoveryQuestions?.length ?? 0,
    0,
    "Should not ask discovery questionnaires after generation"
  );
  assert.ok(
    replyResult.message.text.length > 20,
    "Should provide a substantive, contextual response"
  );
  assert.ok(
    !isPlaceholderResponse(replyResult.message.text),
    "AI response must not contain placeholder text"
  );

  // 4.2 Explicit command to add node in post-generation conversation
  const addNodeResult = await mockServices.ai.reply({
    text: "Por favor agrega un nodo para el módulo de fidelización de clientes",
    map: mockMap,
    lang: "es",
    replyTo: "u7",
    chatPhase: "PHASE_3_EXPANSION",
    messageHistory: runningConversation as any,
  });

  assert.ok(
    addNodeResult.newNodes.length > 0,
    "Explicit command to add node should return newNodes in post-generation"
  );
  assert.equal(
    addNodeResult.message.action,
    "chat",
    "Action should still be 'chat' when adding nodes in post-generation"
  );

  // 4.3 Off-topic guardrail still functions in post-generation
  const offTopicResult = await mockServices.ai.reply({
    text: "Escríbeme un poema sobre el espacio exterior",
    map: mockMap,
    lang: "es",
    replyTo: "u8",
    chatPhase: "PHASE_3_EXPANSION",
    messageHistory: runningConversation as any,
  });

  assert.equal(
    offTopicResult.message.cardType,
    "warning",
    "Off-topic messages must still trigger warning card in post-generation"
  );
}

await testPostGenAIReply();
console.log("✓ Conversación continua post-generación y respuestas AI verificadas.");

// =========================================================================
// RESUMEN
// =========================================================================
console.log("\n=======================================================");
console.log("✨ ¡TODAS LAS PRUEBAS DE REGRESIÓN DE CHAT PASARON! ✨");
console.log("=======================================================\n");
