import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { buildUserPrompt } from "../src/services/ai/prompts";
import { mockServices } from "../src/services/mock";

console.log("=== GENERATIVE CHAT TOOLS ===");

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
const { FullScreenDiscoveryChat } = loadTsxComponent<{
  FullScreenDiscoveryChat: React.FC<Record<string, unknown>>;
}>(chatPath);

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

