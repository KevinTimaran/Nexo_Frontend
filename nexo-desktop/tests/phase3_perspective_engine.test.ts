import assert from "node:assert/strict";
import type { ConceptMap, DiscoveryState, ProjectFact } from "../src/domain/types";
import { ensurePerspectiveState, evaluatePerspectives, normalizePerspectiveProposals, perspectiveEvaluationVersion, transitionPerspective, visiblePerspectives } from "../src/services/ai/perspectiveEngine";

const fact = (key: string, value: string, patch: Partial<ProjectFact> = {}): ProjectFact => ({ key, semanticKey: key, value, status: "confirmed", sourceMessageIds: [`message:${key}`], kind: "user_fact", memoryState: "confirmed", origin: "user_message", ...patch });
const discovery = (archetype: DiscoveryState["archetype"], facts: ProjectFact[]): DiscoveryState => ({ lifecycle: "generated", archetype, facts, requiredTopics: [], askedQuestionKeys: [], answeredQuestionKeys: [], candidateDefinitionVersion: `definition:${archetype}`, generatedDefinitionVersion: `definition:${archetype}`, generationLedger: {}, tombstones: [] });
const map = (id: string, title: string, description: string): ConceptMap => ({ nodes: [{ id, title, description, kind: "concept", metadata: "", status: "confirmed", x: 0, y: 0, sourceFactIds: [id] }], relations: [] });

const hardware = discovery("business", [
  fact("intent", "Quiero abrir una ferretería en mi barrio porque las personas suelen comprar materiales equivocados para reparar sus casas"),
  fact("unknown:budget", "Presupuesto para inventario inicial", { kind: "unknown", memoryState: "unknown", status: "unknown", origin: "unknown" }),
]);
const hardwareMap = map("guidance-node", "Orientación de materiales", "Ayudar a vecinos a elegir materiales de reparación en la ferretería");
const hardwareEvaluation = evaluatePerspectives(hardware, hardwareMap, "Ferretería del barrio");
const hardwareVisible = visiblePerspectives(hardwareEvaluation);
assert.ok(hardwareVisible.length >= 1 && hardwareVisible.length <= 3, "The default view must contain one to three perspectives");
assert.ok(hardwareVisible.some((item) => ["economic", "market", "operational", "geographic"].includes(item.perspectiveId)), "Hardware scenario should foreground business, operational, or geographic context");
for (const expected of ["economic", "human", "geographic", "market", "operational"] as const) assert.notEqual(hardwareEvaluation.find((item) => item.perspectiveId === expected)?.relevance, "unexplored");

const thesis = discovery("research", [
  fact("intent", "Quiero investigar por qué los estudiantes universitarios abandonan los programas de ingeniería de software"),
  fact("method", "El método de investigación todavía debe definirse", { kind: "unknown", memoryState: "unknown", status: "unknown", origin: "unknown" }),
]);
const thesisVisible = visiblePerspectives(evaluatePerspectives(thesis, map("method-node", "Abandono universitario", "Investigación sobre estudiantes de ingeniería de software"), "Tesis sobre abandono universitario"));
assert.ok(thesisVisible.some((item) => ["methodological", "educational", "institutional", "historical"].includes(item.perspectiveId)));
assert.notDeepEqual(thesisVisible.map((item) => item.perspectiveId), hardwareVisible.map((item) => item.perspectiveId), "Different projects must not receive a universal lens set");

const studentApp = discovery("software", [
  fact("intent", "Aplicación para que estudiantes organicen tareas y entregas"),
  fact("users", "Los usuarios son estudiantes y docentes"),
  fact("hypothesis:alerts", "Las alertas podrían reducir entregas tardías", { kind: "hypothesis", memoryState: "proposed", status: "unconfirmed", origin: "ai_suggestion" }),
  fact("suggestion:gamification", "Añadir puntos y recompensas", { kind: "suggestion", memoryState: "rejected", status: "unconfirmed", origin: "ai_suggestion" }),
]);
const appMap = map("app-node", "Agenda de tareas", "Interfaz móvil con cuentas de estudiantes");
const appVisible = visiblePerspectives(evaluatePerspectives(studentApp, appMap, "Agenda estudiantil"));
assert.ok(appVisible.some((item) => ["technical", "educational", "privacy", "accessibility", "human"].includes(item.perspectiveId)));
assert.notDeepEqual(appVisible.map((item) => item.perspectiveId), thesisVisible.map((item) => item.perspectiveId));

for (const item of [...hardwareVisible, ...thesisVisible, ...appVisible]) {
  assert.ok(item.rationale.includes("no un hecho nuevo") || item.rationale.includes("debe validarse"), "Rationales must distinguish lenses from project truth");
}

const malformed = normalizePerspectiveProposals([
  { perspectiveId: "made-up", relevance: "relevant", rationale: "A long but invalid perspective", linkedNodeIds: ["app-node"] },
  { perspectiveId: "technical", relevance: "certain", rationale: "Invalid relevance value", linkedNodeIds: ["app-node"] },
  { perspectiveId: "technical", relevance: "relevant", rationale: "Uses a node that does not exist", linkedNodeIds: ["missing"] },
  { perspectiveId: "technical", relevance: "relevant", rationale: "Grounded in the existing application node", linkedNodeIds: ["app-node"] },
  { perspectiveId: "technical", relevance: "relevant", rationale: "Duplicate must be discarded", linkedNodeIds: ["app-node"] },
], studentApp, appMap);
assert.equal(malformed.length, 1);
assert.equal(malformed[0].perspectiveId, "technical");
assert.deepEqual(malformed[0].linkedNodeIds, ["app-node"]);

let state = ensurePerspectiveState(studentApp, appMap, "Agenda estudiantil");
const target = visiblePerspectives(state.perspectives)[0];
const factsBefore = JSON.stringify(state.facts);
const graphBefore = JSON.stringify(appMap);
const explored = transitionPerspective(state, { type: "explore", perspectiveId: target.perspectiveId, actionId: "explore:1" });
assert.equal(explored.perspectives?.find((item) => item.perspectiveId === target.perspectiveId)?.explorationStatus, "explored");
assert.equal(JSON.stringify(explored.facts), factsBefore, "Exploring a lens must not modify semantic memory");
assert.equal(JSON.stringify(appMap), graphBefore, "Exploring a lens must not modify the graph");
assert.strictEqual(transitionPerspective(explored, { type: "explore", perspectiveId: target.perspectiveId, actionId: "explore:1" }), explored, "Repeated action IDs must be idempotent");
assert.strictEqual(transitionPerspective(explored, { type: "explore", perspectiveId: target.perspectiveId, actionId: "explore:2" }), explored, "Repeated semantic actions must also be idempotent");
const reloadedExplored = JSON.parse(JSON.stringify(explored)) as DiscoveryState;
assert.equal(reloadedExplored.perspectives?.find((item) => item.perspectiveId === target.perspectiveId)?.explorationStatus, "explored");
assert.equal(reloadedExplored.facts.find((item) => item.key === "suggestion:gamification")?.memoryState, "rejected");
assert.equal(reloadedExplored.facts.find((item) => item.key === "hypothesis:alerts")?.memoryState, "proposed");

const dismissed = transitionPerspective(explored, { type: "dismiss", perspectiveId: target.perspectiveId, actionId: "dismiss:1" });
const reloaded = JSON.parse(JSON.stringify(dismissed)) as DiscoveryState;
assert.equal(reloaded.perspectives?.find((item) => item.perspectiveId === target.perspectiveId)?.explorationStatus, "dismissed", "Dismissal must survive serialization");
const updatedMap = map("app-node", "Agenda de tareas renovada", "Interfaz móvil para estudiantes y docentes");
const reevaluated = ensurePerspectiveState(reloaded, updatedMap, "Agenda estudiantil");
assert.equal(reevaluated.perspectives?.find((item) => item.perspectiveId === target.perspectiveId)?.explorationStatus, "dismissed", "Re-evaluation must preserve dismissal");
assert.notEqual(reevaluated.perspectiveEvaluationVersion, state.perspectiveEvaluationVersion);
const restored = transitionPerspective(reevaluated, { type: "restore", perspectiveId: target.perspectiveId, actionId: "restore:1" });
assert.equal(restored.perspectives?.find((item) => item.perspectiveId === target.perspectiveId)?.explorationStatus, "suggested");
const notRelevant = transitionPerspective(restored, { type: "mark_not_relevant", perspectiveId: target.perspectiveId, actionId: "not-relevant:1" });
assert.equal(notRelevant.perspectives?.find((item) => item.perspectiveId === target.perspectiveId)?.relevance, "not_applicable");
assert.equal((JSON.parse(JSON.stringify(notRelevant)) as DiscoveryState).perspectives?.find((item) => item.perspectiveId === target.perspectiveId)?.relevance, "not_applicable", "Not-applicable must survive serialization");
assert.ok(!visiblePerspectives(notRelevant.perspectives).some((item) => item.perspectiveId === target.perspectiveId));
assert.equal(perspectiveEvaluationVersion(studentApp, appMap), state.perspectiveEvaluationVersion);
console.log("✓ Phase 3 adaptive perspective engine scenarios, validation, persistence, and idempotency passed");
