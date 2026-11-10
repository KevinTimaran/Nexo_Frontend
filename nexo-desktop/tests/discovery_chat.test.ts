import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { useWorkspaceStore } from "../src/store/useWorkspaceStore";
import { INITIAL_DISCOVERY_MESSAGES } from "../src/domain/types";
import { mockServices } from "../src/services/mock";

function loadTsxComponent<T = Record<string, unknown>>(filePath: string): T {
  const source = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filePath,
  });
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  mod._compile(transpiled.outputText, filePath);
  return mod.exports as T;
}

console.log("=== PRUEBAS DE VERIFICACIÓN: FULL SCREEN DISCOVERY CHAT & ARQUITECTURA WORKSPACE ===");

if (!Module._extensions[".ts"]) {
  Module._extensions[".ts"] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(transpiled.outputText, filename);
  };
}
if (!Module._extensions[".tsx"]) {
  Module._extensions[".tsx"] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(transpiled.outputText, filename);
  };
}

const chatFilePath = path.resolve(
  process.cwd(),
  "src/features/workspace/FullScreenDiscoveryChat.tsx"
);
const toggleFilePath = path.resolve(
  process.cwd(),
  "src/components/ui/ViewModeToggle.tsx"
);
const workspaceViewPath = path.resolve(
  process.cwd(),
  "src/features/workspace/WorkspaceView.tsx"
);
const conceptCanvasPath = path.resolve(
  process.cwd(),
  "src/features/workspace/ConceptCanvas.tsx"
);
const indexCssPath = path.resolve(
  process.cwd(),
  "src/styles/index.css"
);

const chatSource = fs.readFileSync(chatFilePath, "utf8");
const toggleSource = fs.readFileSync(toggleFilePath, "utf8");
const workspaceViewSource = fs.readFileSync(workspaceViewPath, "utf8");
const conceptCanvasSource = fs.readFileSync(conceptCanvasPath, "utf8");
const indexCssSource = fs.readFileSync(indexCssPath, "utf8");

// 1. Verificar Tipado y Mock Data de 1 solo mensaje inicial
console.log("\n[1/6] Verificando interface ChatMessage y Mock Data de 1 mensaje inicial...");
assert.ok(
  chatSource.includes("export interface ChatMessage"),
  "FullScreenDiscoveryChat.tsx debe exportar interface ChatMessage"
);
assert.strictEqual(
  INITIAL_DISCOVERY_MESSAGES.length,
  1,
  "INITIAL_DISCOVERY_MESSAGES debe tener exactamente 1 mensaje inicial"
);
assert.strictEqual(
  INITIAL_DISCOVERY_MESSAGES[0].role,
  "assistant",
  "Msg 1 debe tener rol 'assistant'"
);
assert.strictEqual(
  INITIAL_DISCOVERY_MESSAGES[0].type,
  "text",
  "Msg 1 debe tener type: 'text'"
);
assert.strictEqual(
  INITIAL_DISCOVERY_MESSAGES[0].content,
  "¡Hola! Cuéntame, ¿qué tipo de proyecto o aplicación tienes en mente?",
  "Msg 1 debe coincidir exactamente con el saludo inicial"
);
console.log("✓ Interface ChatMessage y Mock Data de mensaje inicial validados.");

// 2. Verificar Reglas del Design System y Layout de Pantalla Completa
console.log("\n[2/6] Verificando estructura de Layout y utilidades del Design System...");
const requiredClasses = [
  "flex flex-col h-full w-full bg-app",
  "flex-1 min-h-0 overflow-y-auto p-6 pt-6",
  "max-w-4xl mx-auto w-full",
  "glass-card",
  "bg-surface-elevated border border-primary/30",
  "text-fg",
  "text-muted",
  "glass-card hover:bg-[var(--hover)] transition-colors cursor-pointer",
  "border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--surface-elevated)]",
  "btn-primary",
  "grid-cols-2",
  "glass-card p-4 m-6 mt-0",
  "focus:ring-0",
];

for (const cls of requiredClasses) {
  assert.ok(
    chatSource.includes(cls),
    `FullScreenDiscoveryChat.tsx debe incluir la utilidad requerida: "${cls}"`
  );
}

assert.ok(
  workspaceViewSource.includes("flex flex-col h-screen"),
  "WorkspaceView.tsx debe tener 'flex flex-col h-screen' en el contenedor principal"
);
assert.ok(
  workspaceViewSource.includes("shrink-0 z-50 relative"),
  "El Header en WorkspaceView.tsx debe tener 'shrink-0 z-50 relative'"
);
assert.ok(
  workspaceViewSource.includes("flex-1 overflow-hidden relative"),
  "El contenedor central en WorkspaceView.tsx debe tener 'flex-1 overflow-hidden relative'"
);
assert.ok(
  chatSource.includes("✨ CUESTIONARIO DE DEFINICIÓN"),
  "El widget questionnaire debe mostrar el header '✨ CUESTIONARIO DE DEFINICIÓN'"
);
assert.ok(
  chatSource.includes("Preparando arquitectura automáticamente"),
  "FullScreenDiscoveryChat debe mostrar el progreso de generación automática"
);
assert.ok(
  indexCssSource.includes("--color-surface-elevated") &&
    indexCssSource.includes("--surface-elevated:"),
  "index.css debe definir --surface-elevated y mapear --color-surface-elevated en @theme inline"
);
console.log("✓ Layout y utilidades del Design System validados.");

// 3. Auditoría Estricta de Código Fuente (Cero colores hexadecimales o clases genéricas prohibidas)
console.log("\n[3/6] Auditando FullScreenDiscoveryChat.tsx contra colores hexadecimales y clases genéricas...");
assert.strictEqual(
  /#[0-9a-fA-F]{3,8}\b/.test(chatSource),
  false,
  "No debe contener colores hexadecimales en FullScreenDiscoveryChat.tsx"
);
assert.strictEqual(
  /\b(bg|text|border|ring)-(gray|slate|zinc|neutral|stone|blue|indigo|violet|purple|amber|emerald|red|green|yellow)-\d+\b/.test(
    chatSource
  ),
  false,
  "No debe contener clases de color genéricas de Tailwind en FullScreenDiscoveryChat.tsx"
);
console.log("✓ Auditoría de Design System (Regla de los 3 Colores) aprobada.");

// 4. Renderizado Real del Árbol React (FullScreenDiscoveryChat & ViewModeToggle)
console.log("\n[4/6] Ejecutando renderizado real de FullScreenDiscoveryChat y ViewModeToggle...");
const { FullScreenDiscoveryChat } = loadTsxComponent<{
  FullScreenDiscoveryChat: React.FC<Record<string, unknown>>;
}>(chatFilePath);
const { ViewModeToggle } = loadTsxComponent<{
  ViewModeToggle: React.FC<Record<string, unknown>>;
}>(toggleFilePath);

const renderedDefaultHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat)
);
assert.ok(
  renderedDefaultHtml.includes("¡Hola! Cuéntame, ¿qué tipo de proyecto o aplicación tienes en mente?"),
  "El HTML renderizado debe mostrar el mensaje inicial de la IA"
);
assert.ok(
  renderedDefaultHtml.includes("justify-start"),
  "El HTML renderizado debe alinear el mensaje de bienvenida de la IA a la izquierda"
);

// Probar renderizado de cuestionario agrupado (múltiples preguntas dentro de UN SOLO contenedor)
const sampleQuestionnaireMsg = {
  id: "msg-q-grouped",
  role: "assistant" as const,
  content: "Por favor define estos aspectos clave:",
  type: "questionnaire" as const,
  questions: [
    {
      id: "q-test-1",
      question: "¿A quién va dirigida la app?",
      options: ["Doctores", "Usuarios comunes", "Ambos", "Ninguna de las anteriores"],
    },
    {
      id: "q-test-2",
      question: "¿Qué tipo de plataforma?",
      options: ["Web", "Móvil", "Ambas"],
    },
  ],
};

const renderedQuestionnaireHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat, {
    messages: [sampleQuestionnaireMsg],
    initialSelectedOptions: { "q-test-1": "Doctores" },
  })
);

assert.ok(
  renderedQuestionnaireHtml.includes("✨ CUESTIONARIO DE DEFINICIÓN"),
  "El contenedor padre único debe renderizar el header '✨ CUESTIONARIO DE DEFINICIÓN'"
);
assert.ok(
  renderedQuestionnaireHtml.includes("¿A quién va dirigida la app?"),
  "Debe renderizar la primera sub-pregunta"
);
assert.ok(
  renderedQuestionnaireHtml.includes("¿Qué tipo de plataforma?"),
  "Debe renderizar la segunda sub-pregunta"
);
assert.ok(
  renderedQuestionnaireHtml.includes('aria-pressed="true"') &&
    renderedQuestionnaireHtml.includes("border-[var(--accent)] ring-1 ring-[var(--accent)]"),
  "La opción seleccionada debe renderizar aria-pressed=true y estilo de borde de acento"
);
assert.ok(
  renderedQuestionnaireHtml.includes("Selecciona una opción para cada pregunta (1/2)"),
  "Cuando faltan preguntas por responder el botón debe indicar el progreso 'Selecciona una opción para cada pregunta (1/2)'"
);

// Probar cuestionario completamente respondido (habilita botón de confirmación)
const renderedAllAnsweredHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat, {
    messages: [sampleQuestionnaireMsg],
    initialSelectedOptions: { "q-test-1": "Doctores", "q-test-2": "Web" },
  })
);
assert.ok(
  renderedAllAnsweredHtml.includes("Confirmar respuestas del cuestionario"),
  "Cuando todas las preguntas están seleccionadas debe mostrar 'Confirmar respuestas del cuestionario'"
);
assert.ok(
  renderedAllAnsweredHtml.includes("Todas las opciones seleccionadas"),
  "La cabecera debe indicar 'Todas las opciones seleccionadas'"
);

// Probar cuestionario ya respondido en el historial (muestra estado completado y deshabilita)
const renderedAlreadyAnsweredHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat, {
    messages: [
      sampleQuestionnaireMsg,
      { id: "msg-user-ans", role: "user", content: "Mis respuestas", type: "text", questionnaireId: sampleQuestionnaireMsg.id },
    ],
    initialSelectedOptions: { "q-test-1": "Doctores", "q-test-2": "Web" },
  })
);
assert.ok(
  renderedAlreadyAnsweredHtml.includes("Respuestas enviadas"),
  "Cuando ya fue respondido debe mostrar 'Respuestas enviadas'"
);
assert.ok(
  renderedAlreadyAnsweredHtml.includes("Respuestas registradas"),
  "La cabecera debe indicar 'Respuestas registradas'"
);

// Probar renderizado de tarjeta ready con botón dorado
const sampleReadyMsg = {
  id: "msg-ready-test",
  role: "assistant" as const,
  content: "¡Listo para estructurar la arquitectura del proyecto!",
  type: "ready" as const,
};

const renderedReadyHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat, {
    messages: [sampleReadyMsg],
    onGenerateArchitecture: () => {},
    generationStatus: "generated",
  })
);

assert.ok(
  renderedReadyHtml.includes("Ver Tablero de Conceptos"),
  "Tras generar el proyecto, el botón debe navegar al tablero"
);
assert.ok(
  renderedReadyHtml.includes("btn-primary"),
  "El botón de generación debe usar la clase 'btn-primary'"
);

const renderedToggleHtml = renderToStaticMarkup(
  React.createElement(ViewModeToggle, {
    mode: "discovery",
    onChange: () => {},
    isLocked: true,
  })
);
assert.ok(
  renderedToggleHtml.includes("Tablero Notion") &&
    renderedToggleHtml.includes("Descubrimiento IA") &&
    renderedToggleHtml.includes("Neural 3D"),
  "ViewModeToggle debe renderizar los 3 modos de vista"
);
assert.ok(
  renderedToggleHtml.includes("opacity-40 cursor-not-allowed"),
  "ViewModeToggle bloqueado debe incluir las clases opacity-40 cursor-not-allowed en pestañas 2 y 3"
);
assert.strictEqual(
  renderedToggleHtml.includes("Constelación Obsidian"),
  false,
  "ViewModeToggle renderizado no debe contener 'Constelación Obsidian'"
);
console.log("✓ Renderizado real de componentes React validado.");

// 5. Verificar Fase 1: Limpieza Arquitectónica y Navegación Superior
console.log("\n[5/6] Verificando limpieza arquitectónica (Fase 1)...");
assert.ok(
  toggleSource.includes("Descubrimiento IA") || toggleSource.includes("Copilot IA"),
  "ViewModeToggle debe renombrar el botón superior a 'Descubrimiento IA' o 'Copilot IA'"
);
assert.strictEqual(
  toggleSource.includes("Constelación Obsidian"),
  false,
  "ViewModeToggle ya no debe mostrar 'Constelación Obsidian'"
);
assert.strictEqual(
  conceptCanvasSource.includes("NodeCanvasLayout"),
  false,
  "ConceptCanvas.tsx no debe importar ni renderizar NodeCanvasLayout (Constelación 2D)"
);
assert.strictEqual(
  workspaceViewSource.includes("NodeInspectorSheet"),
  false,
  "WorkspaceView.tsx no debe importar ni renderizar NodeInspectorSheet"
);
assert.ok(
  workspaceViewSource.includes("FullScreenDiscoveryChat"),
  "WorkspaceView.tsx debe importar y renderizar FullScreenDiscoveryChat en el espacio central"
);
assert.ok(
  workspaceViewSource.includes("!isDiscoveryMode"),
  "WorkspaceView.tsx debe ocultar el panel lateral derecho AIChatDrawer cuando la vista central de descubrimiento está activa"
);
console.log("✓ Limpieza arquitectónica y ocultamiento del chat lateral verificados.");

// 6. Verificar Estado Global y Persistencia entre Pestañas en Zustand (useWorkspaceStore)
console.log("\n[6/6] Verificando transición de canvasMode y persistencia de estado en useWorkspaceStore...");
const store = useWorkspaceStore.getState();
assert.strictEqual(store.canvasMode, "notion", "canvasMode inicial debe ser 'notion'");
assert.strictEqual(
  store.discoveryMessages.length,
  1,
  "discoveryMessages inicial en store debe tener 1 mensaje"
);
assert.strictEqual(
  store.isArchitectureUnlocked,
  false,
  "isArchitectureUnlocked inicial para proyecto vacío debe ser false"
);

store.setArchitectureUnlocked(true);
assert.strictEqual(
  useWorkspaceStore.getState().isArchitectureUnlocked,
  true,
  "setArchitectureUnlocked debe actualizar el estado"
);
store.setArchitectureUnlocked(false);

store.setCanvasMode("discovery");
assert.strictEqual(
  useWorkspaceStore.getState().canvasMode,
  "discovery",
  "Debe permitir cambiar canvasMode a 'discovery'"
);

// Simular envío de mensaje y selección de opción en Descubrimiento IA y cambio de pestaña
store.setWorkspace({
  project: { id: "test-chat", name: "Proyecto de prueba", description: "", status: "draft", icon: "lightbulb", updatedAt: new Date().toISOString(), nodeCount: 0 },
  map: { nodes: [], relations: [] },
  messages: [
    { id: "msg-assistant-test", role: "assistant", text: INITIAL_DISCOVERY_MESSAGES[0].content, createdAt: new Date().toISOString() },
    { id: "msg-user-test", role: "user", text: "Para médicos especialistas", createdAt: new Date().toISOString() },
  ],
});
store.setDiscoverySelectedOptions({ "q-test-1": "Doctores" });

store.setCanvasMode("spatial");
assert.strictEqual(
  useWorkspaceStore.getState().canvasMode,
  "spatial",
  "Debe permitir cambiar canvasMode a 'spatial'"
);
store.setCanvasMode("notion");
store.setCanvasMode("discovery");
assert.strictEqual(
  useWorkspaceStore.getState().discoveryMessages.length,
  2,
  "Los mensajes de FullScreenDiscoveryChat deben persistir al cambiar entre pestañas"
);
assert.strictEqual(
  useWorkspaceStore.getState().discoverySelectedOptions["q-test-1"],
  "Doctores",
  "La opción seleccionada del cuestionario debe persistir al cambiar entre pestañas"
);

// Reset store state cleanly
store.setCanvasMode("notion");
store.resetWorkspace();
console.log("✓ Transiciones de canvasMode y persistencia entre pestañas en Zustand verificadas.");

// 7. Verificar Resiliencia Conversacional Multi-Turno en Mock AI y Reconstrucción de Mensajes
console.log("\n[7/7] Verificando resiliencia conversacional multi-turno y reconstrucción de mensajes...");

// 7.1 Cambio de idea después de cuestionario genera nuevo cuestionario (Regla 2), no salta a ready
const doctorReply = await mockServices.ai.reply({
  text: "App de citas para doctores",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-1",
  chatPhase: "PHASE_1_DISCOVERY",
  messageHistory: [],
});
assert.strictEqual(doctorReply.message.action, "questionnaire");

const musicReply = await mockServices.ai.reply({
  text: "Quiero cambiar de idea, ahora quiero una app de música para artistas",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-2",
  chatPhase: "PHASE_1_DISCOVERY",
  messageHistory: [
    { id: "msg-1", role: "user", text: "App de citas para doctores", createdAt: new Date().toISOString() },
    doctorReply.message,
  ],
});
assert.strictEqual(
  musicReply.message.action,
  "questionnaire",
  "Cambiar de idea después de un cuestionario debe emitir un nuevo cuestionario bajo Regla 2"
);

// 7.2 Pregunta de aclaración genera chat (Regla 1)
const clarifyReply = await mockServices.ai.reply({
  text: "No entendí las preguntas, ¿me explicas?",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-3",
  chatPhase: "PHASE_1_DISCOVERY",
  messageHistory: [
    { id: "msg-2", role: "user", text: "App de música", createdAt: new Date().toISOString() },
    musicReply.message,
  ],
});
assert.strictEqual(
  clarifyReply.message.action,
  "chat",
  "Preguntas de aclaración deben responder con action: 'chat' bajo Regla 1"
);

// 7.3 Envío de respuestas al cuestionario activa ready (Regla 3)
const submitAnswersReply = await mockServices.ai.reply({
  text: "Respuestas al cuestionario:\n1. Modelo -> Suscripciones y propinas\n2. Infraestructura -> Red CDN global\n3. Descubrimiento -> Algoritmo de recomendación",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-4",
  chatPhase: "PHASE_1_DISCOVERY",
  messageHistory: [
    { id: "msg-2", role: "user", text: "App de música", createdAt: new Date().toISOString() },
    musicReply.message,
  ],
});
assert.strictEqual(
  submitAnswersReply.message.action,
  "ready",
  "El envío de respuestas al cuestionario debe activar action: 'ready' bajo Regla 3"
);
assert.strictEqual(submitAnswersReply.message.readyForStructuring, true);

// 7.4 Reconstrucción de discoveryMessages a partir de workspace.messages en setWorkspace
const workspaceWithHistory = {
  project: {
    id: "proj-history-test",
    name: "Proyecto Historial",
    description: "Test",
    status: "active" as const,
    icon: "lightbulb" as const,
    updatedAt: new Date().toISOString(),
    nodeCount: 0,
  },
  map: { nodes: [], relations: [] },
  messages: [
    { id: "m1", role: "user" as const, text: "Idea inicial", createdAt: new Date().toISOString() },
    submitAnswersReply.message,
  ],
};
store.setWorkspace(workspaceWithHistory);
assert.strictEqual(
  useWorkspaceStore.getState().discoveryMessages.length,
  2,
  "setWorkspace debe reconstruir discoveryMessages a partir de workspace.messages"
);
assert.strictEqual(
  useWorkspaceStore.getState().discoveryMessages[1].type,
  "text",
  "Una respuesta ready antigua se muestra como texto si el workspace no tiene estado de generación confirmado"
);

store.resetWorkspace();
console.log("✓ Resiliencia conversacional multi-turno y reconstrucción de mensajes verificadas.");

// Regressión: el historial viejo no debe forzar un dominio de restaurante en mensajes nuevos
const staleRestaurantHistoryReply = await mockServices.ai.reply({
  text: "Quiero una app para gestionar citas de abogados y clientes",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-restaurant-regression",
  chatPhase: "PHASE_1_DISCOVERY",
  messageHistory: [
    { id: "msg-legacy-user", role: "user", text: "Quiero una app de restaurantes con delivery", createdAt: new Date().toISOString() },
    {
      id: "msg-legacy-ai",
      role: "assistant",
      createdAt: new Date().toISOString(),
      text: "¿Cómo se estructurará la jerarquía de roles y permisos operativos en el restaurante?",
      type: "questionnaire",
      action: "questionnaire",
      discoveryQuestions: [{ id: "q-legacy", question: "¿Cómo se estructurará la jerarquía de roles y permisos operativos en el restaurante?", options: ["Opción 1"] }],
      cardType: "idea",
      readyForStructuring: false,
      chatPhase: "PHASE_1_DISCOVERY",
    },
  ],
});
assert.ok(
  !/restaurante|mesero|cocina|comanda|kds|pos|franquicia|gastronom/i.test(
    `${staleRestaurantHistoryReply.message.text} ${staleRestaurantHistoryReply.message.discoveryQuestions?.map((q) => q.question).join(" ") || ""}`
  ),
  "El historial antiguo de restaurante no debe contaminar el dominio del mensaje actual"
);

// 8. Nuevas capacidades: Selección Múltiple/Única, Escape "Ninguna", Consultoría Abierta y Dimensiones Estratégicas
console.log("\n[8/8] Verificando cuestionarios múltiples/únicos, escape con respuesta personalizada, consultoría y dimensiones...");

// 8.1 Renderizado de badges de selección única/múltiple y botón de escape
const advancedQuestionsMsg = {
  id: "msg-adv-q",
  role: "assistant" as const,
  content: "Por favor define estos aspectos:",
  type: "questionnaire" as const,
  questions: [
    {
      id: "q-single",
      question: "¿Modelo de hosting?",
      options: ["Cloud AWS", "On-Premise"],
      type: "single" as const,
      allowCustom: true,
    },
    {
      id: "q-multiple",
      question: "¿Canales de notificación?",
      options: ["SMS", "Email", "Push Notification"],
      type: "multiple" as const,
      allowCustom: true,
    },
    {
      id: "q-no-custom",
      question: "¿Acepta términos?",
      options: ["Sí", "No"],
      type: "single" as const,
      allowCustom: false,
    },
  ],
};

const renderedAdvHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat, {
    messages: [advancedQuestionsMsg],
    initialSelectedOptions: {},
  })
);

assert.ok(
  renderedAdvHtml.includes("Selección única"),
  "Debe mostrar badge 'Selección única' para preguntas single"
);
assert.ok(
  renderedAdvHtml.includes("Selección múltiple"),
  "Debe mostrar badge 'Selección múltiple' para preguntas multiple"
);
assert.ok(
  renderedAdvHtml.includes("Ninguna de las anteriores / Otra opción"),
  "Debe mostrar botón de escape cuando allowCustom !== false"
);

// 8.1b Renderizado con selección rápida de 'Ninguna de las opciones anteriores'
const renderedNoneSelectedHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat, {
    messages: [advancedQuestionsMsg],
    initialSelectedOptions: {
      "q-single": "Ninguna de las opciones anteriores me parece adecuada",
      "q-multiple": ["SMS"],
      "q-no-custom": "Sí",
    },
  })
);
assert.ok(
  renderedNoneSelectedHtml.includes("Confirmar respuestas del cuestionario"),
  "Marcar 'Ninguna de las opciones anteriores' debe contar como pregunta respondida y habilitar el botón"
);

// 8.2 Consultoría abierta con ejemplos de la industria (Toast POS, Square)
const consultingReply = await mockServices.ai.reply({
  text: "¿Qué me recomiendas como arquitectura similar a Toast POS o Square para restaurantes?",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-consult",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(consultingReply.message.cardType, "idea", "Consultoría no debe ser off-topic");
assert.strictEqual(consultingReply.message.action, "chat", "Consultoría debe responder con action: 'chat'");
assert.ok(
  consultingReply.message.text.includes("Toast POS") || consultingReply.message.text.includes("Square for Restaurants"),
  "Debe incluir referencias y buenas prácticas de Toast POS o Square"
);

// 8.2b Consultoría y aclaraciones sobre términos técnicos (ej. multi-tenant)
const multiTenantQReply = await mockServices.ai.reply({
  text: "¿Qué significa multi-tenant en este caso y cuáles son sus ventajas?",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-q-multitenant",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(multiTenantQReply.message.cardType, "idea");
assert.strictEqual(multiTenantQReply.message.action, "chat", "Una duda no debe cerrar el cuestionario como ready");
assert.strictEqual(multiTenantQReply.message.readyForStructuring, false);
assert.ok(
  multiTenantQReply.message.text.toLowerCase().includes("multi-tenant"),
  "Debe explicar el concepto multi-tenant"
);

// 8.2c Validador de Evento: Rechazo de opciones del cuestionario
const rejectOptionsReply = await mockServices.ai.reply({
  text: "Ninguna de las opciones me parece adecuada para mi restaurante",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-reject",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(rejectOptionsReply.message.cardType, "idea");
assert.strictEqual(rejectOptionsReply.message.action, "chat", "Rechazar opciones debe abrir consultoría en chat, no ready");
assert.strictEqual(rejectOptionsReply.message.readyForStructuring, false);
assert.ok(
  rejectOptionsReply.message.text.includes("ninguna de las opciones"),
  "Debe reconocer empáticamente que las opciones propuestas no se ajustan"
);

// 8.2d Validación de concepto de software para pizzería (no debe ser off-topic)
const pizzeriaReply = await mockServices.ai.reply({
  text: "Quiero diseñar una app para mi pizzería con comanderas y delivery",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-pizzeria",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(pizzeriaReply.message.cardType, "idea", "Una app para pizzería debe ser aceptada como software legítimo");
assert.strictEqual(pizzeriaReply.message.action, "questionnaire");
assert.strictEqual(pizzeriaReply.message.discoveryQuestions?.length, 3);

// 8.3 Envío de respuestas al cuestionario de restaurante con palabras clave (cocina, meseros)
// Verificar que NO cae en off-topic ni fuerza el catálogo histórico de cuatro dimensiones
const restaurantAnswersReply = await mockServices.ai.reply({
  text: "Respuestas al cuestionario:\n1. ¿Cómo se estructurará la jerarquía de roles? -> Jerarquía entre Superadmin de franquicia, Gerente de sede, Meseros y Cocina\n2. ¿Qué arquitectura de datos requerirá? -> Sincronización multi-tenant en tiempo real entre sedes, salón y cocina\n3. ¿Cómo se integrará con el hardware? -> Integración con hardware POS e impresoras térmicas de barra y cocina",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-rest-ans",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(restaurantAnswersReply.message.cardType, "idea", "Respuestas de restaurante no deben ser off-topic");
assert.strictEqual(restaurantAnswersReply.message.action, "ready", "Debe cambiar a action: 'ready'");
assert.strictEqual(restaurantAnswersReply.message.readyForStructuring, true);
assert.strictEqual(restaurantAnswersReply.message.dimensions, undefined, "El mensaje ready no debe imponer cuatro perspectivas universales");

// 8.4 Explorar dimensiones estratégicas individuales y poblar ventanas de Tablero 2D y 3D
const exploreSocialReply = await mockServices.ai.reply({
  text: "Explorar punto de vista social y meseros",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-dim-social",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(exploreSocialReply.message.cardType, "idea");
assert.ok(
  exploreSocialReply.message.text.includes("Meseros y Cocina") || exploreSocialReply.message.text.includes("Social"),
  "La respuesta debe detallar la perspectiva social y de meseros"
);
assert.strictEqual(
  exploreSocialReply.newNodes.length,
  4,
  "Explorar dimensión debe estructurar y poblar los 4 pilares en el lienzo"
);
assert.strictEqual(
  exploreSocialReply.newRelations.length,
  4,
  "Explorar dimensión debe estructurar las 4 relaciones causales"
);
assert.strictEqual(
  exploreSocialReply.message.actionableNode?.category,
  "political",
  "El nodo accionable destacado debe ser el social/humano (categoría political)"
);

const exploreEconomicReply = await mockServices.ai.reply({
  text: "Explorar punto de vista económico",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-dim-eco",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(exploreEconomicReply.message.cardType, "idea");
assert.ok(
  exploreEconomicReply.message.text.includes("Económica") || exploreEconomicReply.message.text.includes("Monetización"),
  "La respuesta debe detallar la perspectiva económica"
);
assert.strictEqual(
  exploreEconomicReply.newNodes.length,
  4,
  "Explorar dimensión económica debe estructurar los nodos en el mapa"
);

// 8.5 Renderizado adaptativo de perspectivas y botones de navegación
const readyWithDimsMsg = {
  id: "msg-ready-dims",
  role: "assistant" as const,
  content: "La idea base está clara y podemos verla desde diferentes perspectivas:",
  type: "ready" as const,
};

const adaptivePerspectives = [
  { perspectiveId: "operational", label: "Operativa", relevance: "relevant", rationale: "La memoria confirmada describe comandas y cocina. Esta perspectiva examina el flujo; no es un hecho nuevo.", focus: "procesos y continuidad", linkedFactIds: ["intent"], linkedNodeIds: [], explorationStatus: "suggested", evaluationVersion: "p3:test", source: "deterministic", rank: 12 },
  { perspectiveId: "human", label: "Social / humana", relevance: "potentially_relevant", rationale: "La memoria menciona meseros. Esta perspectiva examina adopción; no es un hecho nuevo.", focus: "personas y adopción", linkedFactIds: ["users"], linkedNodeIds: [], explorationStatus: "suggested", evaluationVersion: "p3:test", source: "deterministic", rank: 9 },
] as any;

const renderedReadyDimsHtml = renderToStaticMarkup(
  React.createElement(FullScreenDiscoveryChat, {
    messages: [readyWithDimsMsg],
    onGenerateArchitecture: () => {},
    onSendMessage: () => {},
    onNavigateToMode: () => {},
    generationStatus: "generated",
    perspectives: adaptivePerspectives,
  })
);
assert.ok(
  renderedReadyDimsHtml.includes("Operativa") && renderedReadyDimsHtml.includes("Social / humana"),
  "Debe renderizar solo las perspectivas adaptativas seleccionadas"
);
assert.ok(!renderedReadyDimsHtml.includes("Económico") && !renderedReadyDimsHtml.includes("Técnico"), "No debe renderizar el catálogo universal histórico");
assert.ok(
  renderedReadyDimsHtml.includes("Tablero de Conceptos") &&
    renderedReadyDimsHtml.includes("Espacio Neuronal 3D"),
  "Debe renderizar botones rápidos para navegar al Tablero 2D y Espacio 3D"
);

// 8.6 Generación de arquitectura multidimensional (PHASE_2_STRUCTURING)
// Debe poblar las 4 columnas canónicas de ConceptCanvas (technical, economic, political, legal) y 3D
const structuringReply = await mockServices.ai.reply({
  text: "Generar arquitectura del proyecto para restaurante con comanderas y KDS",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-struct",
  chatPhase: "PHASE_2_STRUCTURING",
});

assert.strictEqual(
  structuringReply.newNodes.length,
  4,
  "PHASE_2_STRUCTURING debe generar exactamente 4 nodos multidimensionales"
);
const nodeCategories = structuringReply.newNodes.map((n) => n.category);
assert.ok(nodeCategories.includes("technical"), "Debe tener un nodo technical");
assert.ok(nodeCategories.includes("economic"), "Debe tener un nodo economic");
assert.ok(nodeCategories.includes("political"), "Debe tener un nodo political (social/meseros)");
assert.ok(nodeCategories.includes("legal"), "Debe tener un nodo legal");
assert.strictEqual(
  structuringReply.newRelations.length,
  4,
  "PHASE_2_STRUCTURING debe generar 4 relaciones causales entre los nodos"
);
console.log("✓ Selección única/múltiple, escape rápido, validador de rechazo, consultoría abierta, ideas gastronómicas y dimensiones validadas.");

// 8.7 Verificación del bug de rechazo parcial del cuestionario (El usuario responde Q2 y Q3 pero deja Q1 con 'Ninguna...')
console.log("\n[9/9] Verificando respuesta parcial al cuestionario y generación contextual por dominio...");

const partialQuestionnaireText = `Respuestas al cuestionario:
1. ¿Cómo se estructurarán los roles, jerarquías y permisos dentro del sistema? -> Ninguna de las opciones anteriores me parece adecuada
2. ¿Qué arquitectura de datos y sincronización requerirá la operación del negocio? -> Sincronización multi-tenant en tiempo real con estado compartido en la nube
3. ¿Cómo se integrará con el hardware o servicios externos? -> Ecosistema modular (API abierta para integrarse con hardware existente)`;

const partialReply = await mockServices.ai.reply({
  text: partialQuestionnaireText,
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-q-submission",
  chatPhase: "PHASE_1_DISCOVERY",
});

assert.strictEqual(
  partialReply.message.action,
  "ready",
  "Una respuesta parcial con opciones concretas seleccionadas debe pasar a 'ready', no a 'chat'"
);
assert.strictEqual(
  partialReply.message.readyForStructuring,
  true,
  "readyForStructuring debe ser true cuando hay respuestas válidas al cuestionario"
);
assert.ok(
  !partialReply.message.text.includes("Entiendo perfectamente que ninguna de las opciones propuestas se ajusta a lo que buscas"),
  "NO debe responder con rechazo total cuando el usuario sí contestó preguntas del cuestionario"
);
assert.ok(
  partialReply.message.text.includes("Sincronización multi-tenant en tiempo real") &&
    partialReply.message.text.includes("Ecosistema modular"),
  "Debe acusar recibo de las opciones efectivamente seleccionadas"
);
assert.ok(
  partialReply.message.text.includes("flexible y abierta") || partialReply.message.text.includes("flexible y personalizada"),
  "Debe indicar que la opción no seleccionada se mantendrá flexible"
);

// Rechazo TOTAL del cuestionario (todas las opciones marcadas como 'Ninguna...')
const totalRejectionText = `Respuestas al cuestionario:
1. ¿Cómo se estructurarán los roles? -> Ninguna de las opciones anteriores me parece adecuada
2. ¿Qué arquitectura de datos? -> Ninguna de las opciones anteriores me parece adecuada
3. ¿Cómo se integrará? -> Ninguna de las opciones anteriores me parece adecuada`;

const totalRejectionReply = await mockServices.ai.reply({
  text: totalRejectionText,
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-q-rejection",
  chatPhase: "PHASE_1_DISCOVERY",
});

assert.strictEqual(
  totalRejectionReply.message.action,
  "chat",
  "Un rechazo total de todas las opciones debe abrir consultoría abierta con action='chat'"
);
assert.strictEqual(
  totalRejectionReply.message.readyForStructuring,
  false,
  "readyForStructuring debe ser false cuando se rechazan todas las opciones"
);
assert.ok(
  totalRejectionReply.message.text.includes("Entiendo perfectamente que ninguna de las opciones propuestas se ajusta"),
  "Debe responder amablemente con la apertura de consultoría cuando todas las opciones son rechazadas"
);

// 8.8 Verificación de generación de nodos contextuales para Transporte Público
const transportStructuringReply = await mockServices.ai.reply({
  text: "Estructura el proyecto 'Empresa de transporte publico' (Idea: Hola, quiero crear una empresa de transporte publico) y sus dimensiones estratégicas en el mapa conceptual.",
  map: { nodes: [], relations: [] },
  lang: "es",
  replyTo: "msg-transport-struct",
  chatPhase: "PHASE_2_STRUCTURING",
  messageHistory: [
    {
      id: "msg-user-transport",
      role: "user",
      createdAt: new Date().toISOString(),
      text: "Hola, quiero crear una empresa de transporte publico",
    },
  ],
});

assert.strictEqual(
  transportStructuringReply.newNodes.length,
  4,
  "Debe generar 4 nodos estratégicos para el proyecto de transporte"
);
const transportTitles = transportStructuringReply.newNodes.map((n) => n.title);
assert.ok(
  transportTitles.some((t) => t.includes("Despacho y Telemetría de Flotas GPS")),
  "El nodo técnico central debe ser Despacho y Telemetría de Flotas GPS, no genérico ni restaurante"
);
assert.ok(
  transportTitles.some((t) => t.includes("Recaudo Digital y Tarifas")),
  "El nodo económico debe corresponder al recaudo de transporte"
);
assert.ok(
  transportTitles.some((t) => t.includes("Accesibilidad y Frecuencia")),
  "El nodo social debe corresponder a pasajeros de transporte"
);
assert.ok(
  transportTitles.some((t) => t.includes("Regulación de Tránsito y Seguros")),
  "El nodo legal debe corresponder a la regulación de tránsito"
);

// 8.9 Verificación de persistencia en eliminación de proyectos (mockServices.projects.delete)
const createdProj = await mockServices.projects.create({
  name: "Proyecto para eliminar",
  description: "Prueba de persistencia de eliminación",
});
const listBeforeDelete = await mockServices.projects.list("es");
assert.ok(
  listBeforeDelete.some((p) => p.id === createdProj.id),
  "El proyecto creado debe aparecer en la lista"
);

if (mockServices.projects.delete) {
  await mockServices.projects.delete(createdProj.id);
}
const listAfterDelete = await mockServices.projects.list("es");
assert.ok(
  !listAfterDelete.some((p) => p.id === createdProj.id),
  "El proyecto eliminado NO debe reaparecer en la lista tras services.projects.delete"
);

console.log("✓ Respuestas parciales al cuestionario, nodos hiper-personalizados de transporte y persistencia de eliminación verificados.");

console.log("\n=======================================================");
console.log("✨ ¡TODAS LAS PRUEBAS DE DISCOVERY CHAT PASARON! ✨");
console.log("=======================================================\n");

