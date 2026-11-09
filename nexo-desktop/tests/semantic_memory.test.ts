import assert from "node:assert/strict";
import type { AssistantMessage, ProjectFact, UserMessage, Workspace } from "../src/domain/types";
import { initialDiscovery, recordUserInput, syncIdeaFacts, isDiscoveryReady } from "../src/services/ai/discovery";
import { applyAiMemoryPatches, hydrateWorkspaceMemory, memoryPresentationForFact, transitionMemoryFact } from "../src/services/ai/semanticMemory";

const user = (id: string, text: string, answers?: Record<string, string>) => ({
  id, role: "user" as const, createdAt: new Date().toISOString(), text, ...(answers ? { answers } : {}),
});
const assistant = (id: string, ui?: AssistantMessage["ui"]): AssistantMessage => ({
  id, role: "assistant", createdAt: new Date().toISOString(), text: "Propuesta", ui,
});
const suggestionUi = (status: "pending" | "approved" | "discarded" | "mapped") => ({
  type: "idea_cards" as const,
  title: "Idea",
  items: [{ id: "idea-1", title: "Taller comunitario", description: "Enseñar reparaciones", benefits: [], resources: [], relations: [], status }],
});

let discovery = initialDiscovery();
discovery = recordUserInput(discovery, user("user-1", "Quiero crear una aplicación para coordinar voluntarios del barrio"));
const intent = discovery.facts.find((fact) => fact.key === "intent")!;
assert.equal(intent.kind, "user_fact");
assert.equal(intent.memoryState, "confirmed");
assert.deepEqual(intent.sourceMessageIds, ["user-1"]);

discovery = syncIdeaFacts(discovery, suggestionUi("pending"), "assistant-1");
const suggestionKey = "suggestion:assistant-1:idea-1";
assert.equal(discovery.facts.find((fact) => fact.key === suggestionKey)?.memoryState, "proposed");
assert.equal(discovery.facts.find((fact) => fact.key === suggestionKey)?.status, "unconfirmed");
discovery = syncIdeaFacts(discovery, suggestionUi("approved"), "assistant-1");
assert.equal(discovery.facts.find((fact) => fact.key === suggestionKey)?.memoryState, "accepted");
assert.equal(discovery.facts.find((fact) => fact.key === suggestionKey)?.origin, "accepted_suggestion");
const acceptedAgain = syncIdeaFacts(discovery, suggestionUi("approved"), "assistant-1");
assert.equal(acceptedAgain.facts.length, discovery.facts.length, "Repeated generative UI sync must not duplicate memory");
assert.equal(acceptedAgain.facts.find((fact) => fact.key === suggestionKey)?.decisionEventId, `${suggestionKey}:accept`);

const originalSuggestion = syncIdeaFacts(initialDiscovery(), suggestionUi("pending"), "assistant-edit");
const editedSuggestionUi = { ...suggestionUi("pending"), items: [{ ...suggestionUi("pending").items[0], title: "Taller reparado", description: "Nueva descripción" }] };
const editedSuggestionDiscovery = syncIdeaFacts(originalSuggestion, editedSuggestionUi, "assistant-edit");
const editedSuggestion = editedSuggestionDiscovery.facts.find((fact) => fact.key === "suggestion:assistant-edit:idea-1")!;
assert.equal(editedSuggestion.memoryState, "modified");
assert.equal(editedSuggestion.modifiedFrom, "Taller comunitario: Enseñar reparaciones");
assert.deepEqual(editedSuggestion.sourceMessageIds, ["assistant-edit"]);
assert.equal(editedSuggestion.origin, "ai_suggestion");
const acceptedEditedSuggestion = syncIdeaFacts(editedSuggestionDiscovery, { ...editedSuggestionUi, items: [{ ...editedSuggestionUi.items[0], status: "approved" }] }, "assistant-edit").facts.find((fact) => fact.key === editedSuggestion.key)!;
assert.equal(acceptedEditedSuggestion.memoryState, "accepted");

let rejected = syncIdeaFacts(initialDiscovery(), suggestionUi("pending"), "assistant-reject");
rejected = syncIdeaFacts(rejected, suggestionUi("discarded"), "assistant-reject");
const rejectedWorkspace = {
  project: { id: "p", name: "P", description: "", status: "draft", icon: "lightbulb", updatedAt: "", nodeCount: 0 },
  map: { nodes: [], relations: [] },
  messages: [assistant("assistant-reject", suggestionUi("discarded"))],
  discovery: rejected,
} as unknown as Workspace;
const reloadedRejected = hydrateWorkspaceMemory(JSON.parse(JSON.stringify(rejectedWorkspace)) as Workspace);
assert.equal(reloadedRejected.discovery?.facts.find((fact) => fact.key === "suggestion:assistant-reject:idea-1")?.memoryState, "rejected");

const hypothesis: ProjectFact = { key: "hypothesis:market", value: "There is demand", status: "unconfirmed", sourceMessageIds: ["assistant-h"], kind: "hypothesis", memoryState: "proposed", origin: "ai_suggestion" };
const hypothesisProposal = applyAiMemoryPatches([], [{ id: "market", kind: "fact", key: "market-demand", value: "There may be local demand" }], "assistant-h")[0];
assert.equal(hypothesisProposal.kind, "hypothesis");
assert.equal(hypothesisProposal.memoryState, "proposed");
assert.equal(hypothesisProposal.semanticKey, "market-demand");
const repeatedPatch = applyAiMemoryPatches([hypothesisProposal], [{ id: "market", kind: "fact", key: "market-demand", value: "There may be local demand" }], "assistant-retry", "assistant-h");
assert.equal(repeatedPatch.length, 1, "Stable turn IDs must deduplicate AI memory retries");
const afterUserAddsInformation = recordUserInput({ ...initialDiscovery(), facts: [hypothesis] }, user("user-confirm", "Quiero crear una aplicación para coordinar voluntarios del barrio"));
assert.equal(afterUserAddsInformation.facts.find((fact) => fact.key === hypothesis.key)?.memoryState, "proposed", "A related user turn must not silently confirm a hypothesis");
const confirmedHypothesis = transitionMemoryFact(hypothesis, { type: "confirm_hypothesis", eventId: "confirm-1", messageId: "user-confirm" });
assert.equal(confirmedHypothesis.memoryState, "confirmed");
assert.equal(confirmedHypothesis.origin, "user_message");
assert.equal(memoryPresentationForFact(confirmedHypothesis).label, "Hipótesis confirmada");
assert.deepEqual(transitionMemoryFact(hypothesis, { type: "confirm_hypothesis", eventId: "confirm-1", messageId: "user-confirm" }), confirmedHypothesis);
const rejectedHypothesis = transitionMemoryFact(hypothesis, { type: "reject_hypothesis", eventId: "reject-hypothesis-1" });
assert.equal(rejectedHypothesis.memoryState, "rejected");
assert.equal(memoryPresentationForFact(rejectedHypothesis).label, "Hipótesis rechazada");
assert.deepEqual(memoryPresentationForFact(rejectedHypothesis).actions, [], "Rejected hypothesis UI must match its semantic state");

const decisionCandidate: ProjectFact = { key: "ai:turn:decision", semanticKey: "launch-channel", value: "Launch in one district", status: "unconfirmed", sourceMessageIds: ["assistant-decision"], kind: "decision_candidate", memoryState: "proposed", origin: "ai_suggestion" };
const acceptedDecision = transitionMemoryFact(decisionCandidate, { type: "accept_decision_candidate", eventId: "decision-accept-1" });
assert.equal(acceptedDecision.kind, "decision");
assert.equal(acceptedDecision.memoryState, "accepted");
assert.equal(acceptedDecision.origin, "decision_event");
assert.equal(memoryPresentationForFact(acceptedDecision).label, "Decisión");
const rejectedDecision = transitionMemoryFact(decisionCandidate, { type: "reject_decision_candidate", eventId: "decision-reject-1" });
assert.equal(rejectedDecision.kind, "decision_candidate");
assert.equal(rejectedDecision.memoryState, "rejected");
assert.equal(memoryPresentationForFact(rejectedDecision).label, "Decisión propuesta · rechazada");

const modifiableSuggestion: ProjectFact = { key: "ai:turn:suggestion", semanticKey: "community-workshops", value: "Offer workshops", status: "unconfirmed", sourceMessageIds: ["assistant-suggestion"], kind: "suggestion", memoryState: "proposed", origin: "ai_suggestion" };
const modifiedSuggestion = transitionMemoryFact(modifiableSuggestion, { type: "modify_suggestion", eventId: "suggestion-modify-1", value: "Offer free monthly workshops" });
assert.equal(modifiedSuggestion.value, "Offer free monthly workshops");
assert.equal(modifiedSuggestion.modifiedFrom, "Offer workshops");
assert.equal(modifiedSuggestion.origin, "ai_suggestion");
assert.deepEqual(modifiedSuggestion.sourceMessageIds, ["assistant-suggestion"]);
assert.equal(modifiedSuggestion.memoryState, "modified");
const acceptedModifiedSuggestion = transitionMemoryFact(modifiedSuggestion, { type: "accept_suggestion", eventId: "suggestion-accept-modified" });
assert.equal(acceptedModifiedSuggestion.memoryState, "accepted");
assert.equal(memoryPresentationForFact(modifiedSuggestion).label, "Sugerencia modificada");
assert.strictEqual(transitionMemoryFact(acceptedModifiedSuggestion, { type: "accept_suggestion", eventId: "suggestion-accept-modified" }), acceptedModifiedSuggestion, "Duplicate action/event must be idempotent");
assert.equal(memoryPresentationForFact(hypothesis).label, "Hipótesis · por validar");
assert.deepEqual(memoryPresentationForFact(hypothesis).actions, ["accept", "reject", "explore"]);

let unknown = { ...initialDiscovery(), archetype: "software" as const, requiredTopics: [{ key: "intent", importance: "blocking" as const }, { key: "problem", importance: "blocking" as const }], facts: [
  { key: "intent", value: "Coordinar voluntarios", status: "confirmed" as const, sourceMessageIds: ["user-u"], kind: "user_fact" as const, memoryState: "confirmed" as const, origin: "user_message" as const },
  { key: "problem", value: "Aún no lo sé", status: "unknown" as const, sourceMessageIds: ["user-u"], kind: "unknown" as const, memoryState: "unknown" as const, origin: "user_message" as const },
] };
assert.equal(isDiscoveryReady(unknown), true, "An explicit unknown answer may complete discovery without becoming a confirmed fact");
unknown = recordUserInput(unknown, user("user-resolve", "Los vecinos no encuentran ayuda para arreglos domésticos", { "topic:problem": "Los vecinos no encuentran ayuda para arreglos domésticos" }));
const resolved = unknown.facts.find((fact) => fact.key === "problem");
assert.equal(resolved?.memoryState, "confirmed");
assert.ok(resolved?.sourceMessageIds.includes("user-resolve"));
assert.equal(isDiscoveryReady(unknown), true);

assert.throws(() => transitionMemoryFact(hypothesis, { type: "accept_suggestion", eventId: "invalid" }), /Invalid project memory transition/);

const legacyWorkspace = {
  project: { id: "legacy", name: "Legacy", description: "", status: "draft", icon: "lightbulb", updatedAt: "", nodeCount: 0 },
  map: { nodes: [], relations: [] },
  messages: [],
  discovery: { ...initialDiscovery(), facts: [{ key: "old", value: "Meaning unclear", status: "confirmed", sourceMessageIds: [] }] },
} as unknown as Workspace;
const migratedOnce = hydrateWorkspaceMemory(legacyWorkspace);
const migratedTwice = hydrateWorkspaceMemory(migratedOnce);
assert.equal(migratedOnce.discovery?.facts[0].memoryState, "legacy_unknown");
assert.deepEqual(migratedTwice.discovery, migratedOnce.discovery, "Migration must be idempotent");

const serialized = JSON.parse(JSON.stringify({ ...rejectedWorkspace, discovery: reloadedRejected.discovery })) as Workspace;
const restored = hydrateWorkspaceMemory(serialized);
assert.deepEqual(restored.discovery?.facts, reloadedRejected.discovery?.facts);
console.log("Canonical memory transitions, provenance, safe legacy hydration, and serialization passed.");
