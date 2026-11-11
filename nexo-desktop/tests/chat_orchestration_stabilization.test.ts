import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { AssistantMessage, ConceptMap, DiscoveryState, Message, PerspectiveEvaluation, UserMessage } from "../src/domain/types";
import { initialDiscovery, recordUserInput } from "../src/services/ai/discovery";
import { ensurePerspectiveState } from "../src/services/ai/perspectiveEngine";
import {
  appendUserMessageOnce,
  canonicalizeMessageHistory,
  orchestrateAssistantTurn,
  planChatTurn,
  selectPerspectivesForTurn,
  upsertAssistantTurn,
} from "../src/services/ai/chatOrchestration";

const map: ConceptMap = { nodes: [], relations: [] };
const user = (id: string, text: string, eventId = `event:${id}`): UserMessage => ({ id, eventId, role: "user", text, createdAt: new Date(0).toISOString() });
const assistant = (id: string, replyTo: string, text = "Respuesta"): AssistantMessage => ({ id, role: "assistant", replyTo, requestId: replyTo, text, createdAt: new Date(0).toISOString(), action: "chat" });

const first = user("u1", "Hola, quiero crear una ferretería en mi pueblo.");
const replay = user("u1-replayed", first.text, first.eventId);
let history: Message[] = appendUserMessageOnce([], first);
history = appendUserMessageOnce(history, replay);
assert.strictEqual(history.filter((item) => item.role === "user").length, 1);
history = upsertAssistantTurn(history, assistant("a1", first.id));
history = upsertAssistantTurn(history, assistant("a1-retry", first.id, "Respuesta reintentada"));
assert.strictEqual(history.filter((item) => item.role === "assistant").length, 1);
assert.strictEqual((history.find((item) => item.role === "assistant") as AssistantMessage).text, "Respuesta reintentada");
assert.strictEqual(canonicalizeMessageHistory(JSON.parse(JSON.stringify([...history, replay]))).length, 2, "Reload/replay must not duplicate messages");

let discovery = recordUserInput(initialDiscovery(false), first);
const turn1 = planChatTurn({ text: first.text, discovery, map, history: [] });
assert.strictEqual(turn1.primary, "question");
assert.strictEqual(turn1.minimalContext, true);
const providerFlood: AssistantMessage = {
  ...assistant("provider-1", first.id),
  action: "questionnaire",
  readyForStructuring: true,
  discoveryQuestions: [
    { id: "q1", question: "¿Qué necesidad observaste?", options: ["Otra"], allowCustom: true },
    { id: "q2", question: "¿Cuál es tu presupuesto?", options: ["Otra"], allowCustom: true },
  ],
  ui: {
    type: "cognitive_insight",
    id: "unsupported-blind-spot",
    version: 1,
    mode: "blind_spot",
    title: "Problema inventado",
    statement: "Los clientes compran materiales equivocados.",
    rationale: "No existe soporte suficiente.",
    validationOptions: [],
    linkedFactIds: ["intent"],
    linkedNodeIds: [],
    status: "proposed",
    actionIds: [],
  },
};
const controlledTurn1 = orchestrateAssistantTurn(providerFlood, turn1, []);
assert.strictEqual(controlledTurn1.ui, undefined);
assert.strictEqual(controlledTurn1.readyForStructuring, false);
assert.strictEqual(controlledTurn1.discoveryQuestions?.length, 1);

const preliminaryMap: ConceptMap = { nodes: [{ id: "n1", title: "Ferretería", description: "Idea inicial", kind: "concept", category: "economic", priority: "medium", status: "exploring", phase: "planning", x: 0, y: 0 }], relations: [] };
assert.strictEqual(planChatTurn({ text: first.text, discovery, map: preliminaryMap }).primary, "question");

const second = user("u2", "Las personas de aquí tienen que viajar a otro pueblo para comprar materiales.");
discovery = recordUserInput(discovery, second);
const turn2 = planChatTurn({ text: second.text, discovery, map, history: [first] });
assert.ok(["cognitive", "question", "conversation"].includes(turn2.primary));
assert.ok(turn2.maxPrimaryComponents <= 1);

const third = user("u3", "También creo que muchas personas no saben exactamente qué material necesitan.");
discovery = recordUserInput(discovery, third);
const hypothesis = discovery.facts.find((fact) => fact.sourceMessageIds.includes(third.id));
assert.strictEqual(hypothesis?.kind, "hypothesis");
assert.strictEqual(hypothesis?.memoryState, "proposed");
assert.strictEqual(hypothesis?.status, "unconfirmed");

const fourth = user("u4", "Analiza la idea desde lo económico y social.");
const turn4 = planChatTurn({ text: fourth.text, discovery, map, history: [first, second, third] });
assert.strictEqual(turn4.primary, "perspectives");
assert.deepStrictEqual(new Set(turn4.requestedPerspectiveIds), new Set(["economic", "human"]));
const perspective = (perspectiveId: PerspectiveEvaluation["perspectiveId"]): PerspectiveEvaluation => ({
  perspectiveId,
  label: perspectiveId,
  relevance: "relevant",
  rationale: "Análisis contextual",
  focus: "Implicaciones",
  linkedFactIds: ["intent"],
  linkedNodeIds: [],
  explorationStatus: "suggested",
  evaluationVersion: "v1",
  source: "deterministic",
  rank: 10,
});
assert.deepStrictEqual(selectPerspectivesForTurn([perspective("economic"), perspective("human"), perspective("legal")], turn4).map((item) => item.perspectiveId), ["economic", "human"]);
const evaluatedWithoutGraph = ensurePerspectiveState(discovery, map, "Ferretería local");
assert.deepStrictEqual(
  selectPerspectivesForTurn(evaluatedWithoutGraph.perspectives, turn4).map((item) => item.perspectiveId),
  ["economic", "human"],
  "An explicit perspective request must work while discovery continues with an empty graph",
);
assert.strictEqual(selectPerspectivesForTurn([perspective("economic")], turn2).length, 0);

const fifth = user("u5", "Quiero saber si de verdad estos problemas existen.");
const turn5 = planChatTurn({ text: fifth.text, discovery, map, history: [first, second, third, fourth] });
assert.strictEqual(turn5.primary, "research");
assert.strictEqual(turn5.targetFactId, hypothesis?.key);
const genericResearch = planChatTurn({ text: "Busca evidencia", discovery: initialDiscovery(false), map });
assert.notStrictEqual(genericResearch.primary, "research", "Research requires a grounded target");

const withEvidence: DiscoveryState = {
  ...discovery,
  evidence: [{
    id: "ev1",
    query: hypothesis?.value ?? "problema",
    source: { id: "s1", title: "Fuente", url: "https://example.edu/source", domain: "example.edu", retrievedAt: new Date(0).toISOString(), sourceType: "academic_paper", trustScore: 80, trustRationale: "Fuente académica", rawExcerpt: "Dato", sanitizedExcerpt: "Dato" },
    claimAddressed: hypothesis?.value ?? "problema",
    hypothesesLinkedIds: hypothesis ? [hypothesis.key] : [],
    validationState: "supports",
    aiInterpretation: "Contexto",
    scope: "academic",
    retrievedAt: new Date(0).toISOString(),
    status: "suggested",
  }],
};
const sixth = user("u6", "¿Qué significa esa evidencia para mi idea?");
const turn6 = planChatTurn({ text: sixth.text, discovery: withEvidence, map, history: [first, second, third, fourth, fifth] });
assert.strictEqual(turn6.primary, "validation");

const cognitive = providerFlood.ui!;
const priorUiMessage: AssistantMessage = { ...assistant("prior", "u0"), ui: cognitive };
const repeated = orchestrateAssistantTurn({ ...assistant("next", "u7"), ui: cognitive }, { ...turn2, primary: "cognitive" }, [priorUiMessage]);
assert.strictEqual(repeated.ui, undefined);

assert.strictEqual(planChatTurn({ text: "Compara tres ubicaciones", discovery, map }).primary, "comparison");
assert.strictEqual(planChatTurn({ text: "Planifica los primeros 90 días", discovery, map }).primary, "timeline");
assert.strictEqual(planChatTurn({ text: "Propón ideas accionables", discovery, map }).primary, "ideas");

for (const [id, text] of [
  ["academic", "Quiero investigar por qué estudiantes abandonan ingeniería de software."],
  ["software", "Quiero crear una aplicación para ayudar a estudiantes a organizar tareas."],
] as const) {
  const state = recordUserInput(initialDiscovery(false), user(id, text));
  const plan = planChatTurn({ text, discovery: state, map });
  assert.notStrictEqual(plan.primary, "research");
  assert.notStrictEqual(plan.primary, "validation");
  assert.strictEqual(plan.maxPrimaryComponents <= 1, true);
}

const storeSource = fs.readFileSync(path.resolve(process.cwd(), "src/store/useWorkspaceStore.ts"), "utf8");
const perspectiveSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/workspace/PerspectivePanel.tsx"), "utf8");
assert.ok(!storeSource.includes("generation-status-"), "The store must not synthesize project-completed chat cards");
assert.ok(perspectiveSource.includes("naturalRationale(item.rationale)"), "Persisted legacy rationale must be naturalized before rendering");

console.log("✓ Chat orchestration, lifecycle idempotency, capability gating and six-turn scenario passed");
