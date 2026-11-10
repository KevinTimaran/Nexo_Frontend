import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { buildUserPrompt } from "../src/services/ai/prompts";
import { mockServices } from "../src/services/mock";
import type { ProjectFact } from "../src/domain/types";

console.log("=== GENERATIVE CHAT TOOLS ===");

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

const chatPath = path.resolve(process.cwd(), "src/features/workspace/FullScreenDiscoveryChat.tsx");
const { FullScreenDiscoveryChat, getChatInputHeight, CHAT_INPUT_MIN_HEIGHT_PX, CHAT_INPUT_MAX_HEIGHT_PX } = loadTsxComponent<{
  FullScreenDiscoveryChat: React.FC<Record<string, unknown>>;
  getChatInputHeight: (scrollHeight: number) => number;
  CHAT_INPUT_MIN_HEIGHT_PX: number;
  CHAT_INPUT_MAX_HEIGHT_PX: number;
}>(chatPath);

assert.strictEqual(getChatInputHeight(12), CHAT_INPUT_MIN_HEIGHT_PX);
assert.strictEqual(getChatInputHeight(108), 108);
assert.strictEqual(getChatInputHeight(600), CHAT_INPUT_MAX_HEIGHT_PX);

const emptyMap = { nodes: [], relations: [] };

const timelineReply = await mockServices.ai.reply({
  text: "Planifica los primeros 90 días para inaugurar mi ferretería",
  map: emptyMap,
  lang: "es",
  replyTo: "user-timeline",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(timelineReply.message.ui?.type, "timeline");
assert.strictEqual(timelineReply.newNodes.length, 0, "Una hoja de ruta no debe crear nodos automáticamente");

const comparisonReply = await mockServices.ai.reply({
  text: "Compara tres ubicaciones para abrir el negocio",
  map: emptyMap,
  lang: "es",
  replyTo: "user-comparison",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(comparisonReply.message.ui?.type, "decision_comparator");

const ideasReply = await mockServices.ai.reply({
  text: "Propón tarjetas de ideas accionables para mi ferretería",
  map: emptyMap,
  lang: "es",
  replyTo: "user-ideas",
  chatPhase: "PHASE_1_DISCOVERY",
});
assert.strictEqual(ideasReply.message.ui?.type, "idea_cards");
assert.strictEqual(ideasReply.newNodes.length, 0, "Las ideas deben esperar aprobación antes de llegar al tablero");

const messages = [timelineReply, comparisonReply, ideasReply].map((reply) => ({
  id: reply.message.id,
  role: "assistant" as const,
  content: reply.message.text,
  type: "text" as const,
  ui: reply.message.ui,
}));
const html = renderToStaticMarkup(React.createElement(FullScreenDiscoveryChat, { messages }));
assert.ok(html.includes("Ruta de apertura · 90 días"));
assert.ok(html.includes("Comparación de ubicaciones"));
assert.ok(html.includes("Enviar al tablero"));
assert.ok(html.includes("Recomendada"));

const actionableMemoryFact: ProjectFact = {
  key: "ai:turn:workshop", semanticKey: "community-workshops", value: "Offer monthly community workshops",
  status: "unconfirmed", sourceMessageIds: ["assistant-memory"], kind: "suggestion", memoryState: "proposed", origin: "ai_suggestion",
};
const memoryHtml = renderToStaticMarkup(React.createElement(FullScreenDiscoveryChat, {
  messages: [{ id: "assistant-memory", role: "assistant", content: "Una posibilidad:", type: "text", memoryPatches: [{ id: "workshop", kind: "suggestion", key: "community-workshops", value: actionableMemoryFact.value }] }],
  memoryFacts: [actionableMemoryFact],
}));
assert.ok(memoryHtml.includes('data-memory-state="proposed"'), "The UI state marker must match canonical memory state");
assert.ok(memoryHtml.includes("Sugerencia"));
assert.ok(memoryHtml.includes("Aceptar") && memoryHtml.includes("Rechazar") && memoryHtml.includes("Modificar") && memoryHtml.includes("Explorar"));

const unknownHtml = renderToStaticMarkup(React.createElement(FullScreenDiscoveryChat, {
  messages: [{ id: "user-unknown", role: "user", content: "Aún no lo sé", type: "text" }],
  memoryFacts: [{ key: "market-size", semanticKey: "market-size", value: "Aún no lo sé", status: "unknown", sourceMessageIds: ["user-unknown"], kind: "unknown", memoryState: "unknown", origin: "user_message" }],
}));
assert.ok(unknownHtml.includes('data-memory-state="unknown"'));
assert.ok(unknownHtml.includes("Por definir") && unknownHtml.includes("Completar") && unknownHtml.includes("Explorar"));

const cognitiveHtml = renderToStaticMarkup(React.createElement(FullScreenDiscoveryChat, {
  messages: [{
    id: "assistant-cognitive",
    role: "assistant",
    content: "Hay un punto que conviene revisar.",
    type: "text",
    ui: {
      type: "cognitive_insight",
      id: "cognitive:hardware:validation",
      mode: "blind_spot",
      title: "Validación de la demanda local",
      statement: "La demanda de los residentes aún no está validada.",
      rationale: "La memoria contiene la oferta y el público, pero no una señal de demanda confirmada.",
      linkedFactIds: ["audience", "offering"],
      linkedNodeIds: [],
      perspectiveIds: ["business"],
      validationOptions: ["Entrevistar a residentes", "Probar una preventa pequeña"],
      status: "proposed",
      actionIds: [],
    },
  }],
}));
assert.ok(cognitiveHtml.includes("Punto ciego") && cognitiveHtml.includes("Por qué aparece"));
assert.ok(cognitiveHtml.includes("Explorar") && cognitiveHtml.includes("Conservar como hipótesis"));
assert.ok(!cognitiveHtml.includes("Enviar al tablero"), "Un hallazgo no aceptado no debe poder mapearse");

const missingKeyHtml = renderToStaticMarkup(React.createElement(FullScreenDiscoveryChat, {
  messages: [],
  error: "No se ha configurado ninguna clave API de OpenAI para este dispositivo.",
  onRetry: () => undefined,
  onOpenSettings: () => undefined,
}));
assert.ok(missingKeyHtml.includes("Configura el motor de IA en este dispositivo"));
assert.ok(missingKeyHtml.includes("Abrir Motor de IA"));
assert.ok(!missingKeyHtml.includes("VITE_OPENAI_API_KEY") && !missingKeyHtml.includes(".env.local"));
assert.ok(!missingKeyHtml.includes("Reintentar ahora"), "Reintentar sin una clave seguiría fallando");
assert.ok(missingKeyHtml.includes("min-h-[44px]") && missingKeyHtml.includes("max-h-48"));

if (!timelineReply.message.ui || timelineReply.message.ui.type !== "timeline") {
  throw new Error("Timeline mock inválido");
}
const updatedTimeline = {
  ...timelineReply.message,
  ui: {
    ...timelineReply.message.ui,
    items: timelineReply.message.ui.items.map((item, index) =>
      index === 0 ? { ...item, status: "done" as const } : item
    ),
  },
};
const prompt = buildUserPrompt({
  phase: "PHASE_1_DISCOVERY",
  lang: "es",
  userMessage: "¿Qué sigue ahora?",
  messageHistory: [updatedTimeline],
});
assert.ok(prompt.includes("Estado interactivo guardado"));
assert.ok(prompt.includes('"status":"done"'));

console.log("✓ Timeline, comparador, tarjetas, renderizado y memoria interactiva verificados.");

