import assert from "node:assert/strict";
import type { CognitiveInsightUIBlock, ConceptMap, DiscoveryState, ProjectFact, Workspace } from "../src/domain/types";
import { normalizeGenerativeUIBlock } from "../src/services/ai/generativeUi";
import { canProvideCognitiveValue, selectCognitiveAssistance, syncCognitiveFact, transitionCognitiveBlock, validateCognitiveGrounding } from "../src/services/ai/cognitiveAssistance";
import { useWorkspaceStore } from "../src/store/useWorkspaceStore";

const fact = (key: string, value: string, patch: Partial<ProjectFact> = {}): ProjectFact => ({ key, semanticKey: key, value, status: "confirmed", sourceMessageIds: [`user:${key}`], kind: "user_fact", memoryState: "confirmed", origin: "user_message", ...patch });
const discovery = (archetype: DiscoveryState["archetype"], facts: ProjectFact[]): DiscoveryState => ({ lifecycle: "generated", archetype, facts, requiredTopics: [], askedQuestionKeys: [], answeredQuestionKeys: [], candidateDefinitionVersion: `definition:${archetype}`, generatedDefinitionVersion: `definition:${archetype}`, generationLedger: {}, tombstones: [] });
const map: ConceptMap = { nodes: [{ id: "core", title: "Núcleo", description: "Contexto confirmado", kind: "concept", metadata: "", status: "confirmed", x: 0, y: 0, sourceFactIds: ["intent"] }], relations: [] };

const hardware = discovery("business", [fact("intent", "Abrir una ferretería de barrio para orientar compras de materiales"), fact("users", "Los usuarios son residentes del vecindario"), fact("offering", "Se venderán materiales de reparación")]);
const thesis = discovery("research", [fact("intent", "Investigar por qué estudiantes abandonan ingeniería de software"), fact("users", "La población son estudiantes universitarios"), fact("unknown:method", "Método por definir", { kind: "unknown", memoryState: "unknown", status: "unknown", origin: "unknown" })]);
const software = discovery("software", [fact("intent", "Crear una aplicación para organizar tareas universitarias"), fact("users", "Los usuarios son estudiantes"), fact("decision", "La aplicación organizará fechas de entrega", { kind: "decision", memoryState: "accepted", origin: "decision_event" })]);

assert.equal(canProvideCognitiveValue(hardware), true, "Enough context should allow useful help without another question");
assert.equal(canProvideCognitiveValue({ ...hardware, facts: [hardware.facts[0]], requiredTopics: [{ key: "users", importance: "blocking" }] }), false);
const hardwareInsight = selectCognitiveAssistance(hardware, map)!;
const thesisInsight = selectCognitiveAssistance(thesis, map)!;
const softwareInsight = selectCognitiveAssistance(software, map);
assert.equal(hardwareInsight.mode, "blind_spot");
assert.equal(thesisInsight.mode, "risk");
assert.equal(softwareInsight, undefined, "Software projects must never receive a canned domain card");
assert.ok(!hardwareInsight.rationale.includes(hardware.facts[0].value), "Rationale must not quote the user back");
assert.ok(!thesisInsight.rationale.includes(thesis.facts[0].value), "Rationale must not quote the user back");
assert.notDeepEqual(hardwareInsight.validationOptions, thesisInsight.validationOptions);
assert.equal(hardwareInsight.linkedFactIds[0], "intent");

const malformed = normalizeGenerativeUIBlock({ type: "cognitive_insight", mode: "certain_answer", title: "Invalid", statement: "Unsupported", rationale: "Unsupported mode" });
assert.equal(malformed, undefined, "Malformed cognitive blocks must fall back to plain text");
const normalized = normalizeGenerativeUIBlock({ ...hardwareInsight, status: "accepted", actionIds: ["model-action"] }) as CognitiveInsightUIBlock;
assert.equal(normalized.status, "proposed", "AI cannot self-accept its analysis");
assert.deepEqual(normalized.actionIds, []);

let memory = syncCognitiveFact(hardware, normalized, "assistant:blind-spot");
const blindFact = memory.facts.find((item) => item.key === `cognitive:${normalized.id}`)!;
assert.equal(blindFact.kind, "hypothesis");
assert.equal(blindFact.memoryState, "proposed");
assert.equal(blindFact.status, "unconfirmed");
assert.equal(memory.facts.find((item) => item.key === "intent")?.value, hardware.facts[0].value);

const explored = transitionCognitiveBlock(normalized, { type: "explore", blockId: normalized.id, actionId: "explore:1" });
assert.equal(explored.explorationStatus, "explored");
assert.strictEqual(transitionCognitiveBlock(explored, { type: "explore", blockId: normalized.id, actionId: "explore:1" }), explored);
assert.strictEqual(transitionCognitiveBlock(explored, { type: "explore", blockId: normalized.id, actionId: "explore:2" }), explored, "Repeated semantic clicks must remain idempotent");

const rejectedBlock = transitionCognitiveBlock(explored, { type: "reject", blockId: normalized.id, actionId: "reject:1" });
memory = syncCognitiveFact(memory, rejectedBlock, "assistant:blind-spot");
assert.equal(memory.facts.find((item) => item.key === blindFact.key)?.memoryState, "rejected");
assert.equal(selectCognitiveAssistance(memory, map), undefined, "Dismissed deterministic insight must not immediately reappear");

const suggestion = normalizeGenerativeUIBlock({ type: "cognitive_insight", id: "solution:guides", mode: "solution", title: "Guías rápidas", statement: "Crear guías simples para reparaciones frecuentes", rationale: "La orientación está vinculada al hecho intent", linkedFactIds: ["intent"], linkedNodeIds: [], validationOptions: ["Probar una guía con residentes"] }) as CognitiveInsightUIBlock;
let suggestionMemory = syncCognitiveFact(hardware, suggestion, "assistant:solution");
const modified = transitionCognitiveBlock(suggestion, { type: "modify", blockId: suggestion.id, actionId: "modify:1", value: "Crear guías breves y kits para reparaciones frecuentes" });
suggestionMemory = syncCognitiveFact(suggestionMemory, modified, "assistant:solution");
const modifiedFact = suggestionMemory.facts.find((item) => item.key === `cognitive:${suggestion.id}`)!;
assert.equal(modifiedFact.memoryState, "modified");
assert.ok(modifiedFact.modifiedFrom?.includes("Crear guías simples"));
assert.deepEqual(modifiedFact.sourceMessageIds, ["assistant:solution"]);
const acceptedSuggestion = transitionCognitiveBlock(modified, { type: "accept", blockId: suggestion.id, actionId: "accept:1" });
suggestionMemory = syncCognitiveFact(suggestionMemory, acceptedSuggestion, "assistant:solution");
assert.equal(suggestionMemory.facts.find((item) => item.key === modifiedFact.key)?.memoryState, "accepted");

const rejectedSuggestion = transitionCognitiveBlock(suggestion, { type: "reject", blockId: suggestion.id, actionId: "reject:suggestion" });
const rejectedSuggestionMemory = syncCognitiveFact(syncCognitiveFact(hardware, suggestion, "assistant:solution"), rejectedSuggestion, "assistant:solution");
assert.equal((JSON.parse(JSON.stringify(rejectedSuggestionMemory)) as DiscoveryState).facts.find((item) => item.key === `cognitive:${suggestion.id}`)?.memoryState, "rejected");

const riskAccepted = transitionCognitiveBlock(thesisInsight, { type: "accept", blockId: thesisInsight.id, actionId: "keep:risk" });
const riskMemory = syncCognitiveFact(syncCognitiveFact(thesis, thesisInsight, "assistant:risk"), riskAccepted, "assistant:risk");
assert.equal(riskMemory.facts.find((item) => item.key === `cognitive:${thesisInsight.id}`)?.memoryState, "proposed", "Keeping a risk must not confirm it as truth");

const opportunity = normalizeGenerativeUIBlock({ type: "cognitive_insight", id: "opportunity:guidance", mode: "opportunity", title: "Diferenciación por orientación", statement: "La orientación podría diferenciar la tienda", rationale: "La propuesta se enlaza con la orientación confirmada", linkedFactIds: ["intent"], linkedNodeIds: ["core"], validationOptions: [] }) as CognitiveInsightUIBlock;
let opportunityMemory = syncCognitiveFact(hardware, opportunity, "assistant:opportunity");
const acceptedOpportunity = transitionCognitiveBlock(opportunity, { type: "accept", blockId: opportunity.id, actionId: "accept:opportunity" });
opportunityMemory = syncCognitiveFact(opportunityMemory, acceptedOpportunity, "assistant:opportunity");
const opportunityFact = opportunityMemory.facts.find((item) => item.key === `cognitive:${opportunity.id}`)!;
assert.equal(opportunityFact.memoryState, "accepted");

const unsupportedContradiction = { ...normalized, id: "contradiction:bad", mode: "contradiction" as const, linkedFactIds: ["intent"] };
assert.equal(validateCognitiveGrounding(unsupportedContradiction, hardware, map), undefined);
const supportedContradiction = { ...unsupportedContradiction, linkedFactIds: ["intent", "users"] };
assert.ok(validateCognitiveGrounding(supportedContradiction, hardware, map), "Contradiction with two real confirmed facts should be accepted for review");

const messages = [{ id: "assistant:opportunity", role: "assistant" as const, createdAt: "2026-11-09T00:00:00Z", text: "Análisis", ui: acceptedOpportunity }];
const persisted = JSON.parse(JSON.stringify({ messages, discovery: opportunityMemory }));
assert.equal(persisted.messages[0].ui.status, "accepted");
assert.equal(persisted.discovery.facts.find((item: ProjectFact) => item.key === opportunityFact.key).origin, "accepted_suggestion");
const messageCount = messages.length;
transitionCognitiveBlock(acceptedOpportunity, { type: "explore", blockId: acceptedOpportunity.id, actionId: "explore:opportunity" });
assert.equal(messages.length, messageCount, "Typed cognitive actions must not append synthetic chat messages");
assert.ok(thesisInsight.validationOptions.includes("Revisar literatura académica"));
assert.ok(!JSON.stringify(thesisInsight).includes("http"), "Validation suggestions must not execute research or fabricate citations");

const workspace: Workspace = { project: { id: "phase4", name: "Ferretería", description: "", status: "active", icon: "lightbulb", updatedAt: "", nodeCount: 0 }, map: { nodes: [], relations: [] }, messages: [], discovery: opportunityMemory };
useWorkspaceStore.getState().setWorkspace(workspace);
const mappedOpportunity = useWorkspaceStore.getState().addNodeFromChat({ title: opportunity.title, description: opportunity.statement, kind: "viability", category: "economic", phase: "planning", semanticKey: opportunityFact.semanticKey, semanticKind: opportunityFact.kind, semanticState: opportunityFact.memoryState, provenanceOrigin: opportunityFact.origin, sourceFactIds: [opportunityFact.key], sourceMessageIds: opportunityFact.sourceMessageIds });
assert.equal(mappedOpportunity?.verification, "confirmed", "Accepted opportunity can enter the canonical graph");
const riskFact = riskMemory.facts.find((item) => item.key === `cognitive:${thesisInsight.id}`)!;
const mappedRisk = useWorkspaceStore.getState().addNodeFromChat({ title: thesisInsight.title, description: thesisInsight.statement, kind: "risk", category: "technical", phase: "validation", semanticKey: riskFact.semanticKey, semanticKind: riskFact.kind, semanticState: riskFact.memoryState, provenanceOrigin: riskFact.origin, sourceFactIds: [riskFact.key], sourceMessageIds: riskFact.sourceMessageIds });
assert.equal(mappedRisk?.verification, "unconfirmed");
assert.equal(mappedRisk?.status, "review");

console.log("✓ Phase 4 cognitive selection, grounding, actions, persistence, and graph semantics passed");
