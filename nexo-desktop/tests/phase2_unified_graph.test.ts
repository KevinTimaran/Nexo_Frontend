import assert from "node:assert/strict";
import type { ConceptMap, ConceptNode, ConceptRelation, ProjectFact, UserMessage, Workspace } from "../src/domain/types";
import { graphSemanticLabels } from "../src/domain/graphSemantics";
import { initialDiscovery, recordUserInput } from "../src/services/ai/discovery";
import { applyGraphOperations, buildGroundedGraph, reconcileGraph } from "../src/services/ai/reconcileGraph";
import { convertMapToFlow, projectSpatialLinks, projectSpatialNodes, useWorkspaceStore } from "../src/store/useWorkspaceStore";

const userMessage = (id: string, text: string): UserMessage => ({
  id,
  role: "user",
  createdAt: "2026-11-09T12:00:00.000Z",
  text,
});

const project = { id: "phase2-hardware", name: "Hardware Store", description: "", status: "draft" as const, icon: "lightbulb" as const, updatedAt: "2026-11-09T12:00:00.000Z", nodeCount: 0 };

let discovery = recordUserInput(
  initialDiscovery(),
  userMessage("hardware-user-1", "I want to open a hardware store in my neighborhood because people often buy the wrong materials for home repairs."),
);
const hardwareIntent = discovery.facts.find((fact) => fact.key === "intent");
assert.equal(hardwareIntent?.memoryState, "confirmed", "User's opening statement is a confirmed source fact");
assert.deepEqual(hardwareIntent?.sourceMessageIds, ["hardware-user-1"]);

const acceptedSuggestion: ProjectFact = {
  key: "suggestion:assistant-1:repair-clinics", semanticKey: "repair-clinics", value: "Offer monthly repair clinics", status: "confirmed",
  sourceMessageIds: ["assistant-1"], kind: "suggestion", memoryState: "accepted", origin: "accepted_suggestion", decisionEventId: "suggestion:assistant-1:repair-clinics:accept",
};
const hypothesis: ProjectFact = {
  key: "ai:assistant-2:local-demand", semanticKey: "local-demand", value: "Residents may want delivery", status: "unconfirmed",
  sourceMessageIds: ["assistant-2"], kind: "hypothesis", memoryState: "proposed", origin: "ai_suggestion",
};
const unknown: ProjectFact = {
  key: "topic:opening-date", semanticKey: "opening-date", value: "", status: "unknown",
  sourceMessageIds: [], kind: "unknown", memoryState: "unknown", origin: "unknown",
};
const rejected: ProjectFact = {
  key: "suggestion:assistant-3:franchise", semanticKey: "franchise", value: "Open a franchise", status: "unconfirmed",
  sourceMessageIds: ["assistant-3"], kind: "suggestion", memoryState: "rejected", origin: "ai_suggestion",
};
const decisionCandidate: ProjectFact = {
  key: "ai:assistant-5:inventory", semanticKey: "inventory-policy", value: "Start with a limited inventory", status: "unconfirmed",
  sourceMessageIds: ["assistant-5"], kind: "decision_candidate", memoryState: "proposed", origin: "ai_suggestion",
};
const decision: ProjectFact = {
  key: "decision:owner:opening", semanticKey: "opening-hours", value: "Open Monday through Saturday", status: "confirmed",
  sourceMessageIds: ["hardware-user-3"], kind: "decision", memoryState: "accepted", origin: "decision_event",
};
const temporaryConcept: ProjectFact = {
  key: "detail:temporary-storage", semanticKey: "temporary-storage", value: "Keep a small storage area for bulky repair materials", status: "confirmed",
  sourceMessageIds: ["hardware-user-delete"], kind: "user_fact", memoryState: "confirmed", origin: "user_message",
};
discovery = {
  ...discovery,
  lifecycle: "generated",
  facts: [...discovery.facts, acceptedSuggestion, hypothesis, unknown, rejected, decisionCandidate, decision, temporaryConcept],
};
const generated = buildGroundedGraph(discovery, project.name);
const byFact = (key: string) => generated.nodes.find((node) => node.sourceFactIds?.includes(key));
assert.equal(byFact(acceptedSuggestion.key)?.semanticState, "accepted");
assert.equal(byFact(acceptedSuggestion.key)?.verification, "confirmed");
assert.equal(byFact(hypothesis.key)?.semanticKind, "hypothesis");
assert.equal(byFact(hypothesis.key)?.verification, "unconfirmed");
assert.equal(byFact(unknown.key)?.verification, "unknown");
assert.equal(byFact(decisionCandidate.key)?.semanticKind, "decision_candidate");
assert.equal(byFact(decisionCandidate.key)?.verification, "unconfirmed");
assert.equal(byFact(decision.key)?.semanticKind, "decision");
assert.equal(byFact(decision.key)?.semanticState, "accepted");
assert.equal(byFact(rejected.key), undefined, "Rejected suggestions are excluded from the graph");
assert.ok(graphSemanticLabels(byFact(hypothesis.key)!).includes("Hipótesis"));
assert.ok(graphSemanticLabels(byFact(unknown.key)!).includes("Por definir"));
assert.ok(graphSemanticLabels(byFact(acceptedSuggestion.key)!).includes("Sugerencia aceptada"));
assert.ok(graphSemanticLabels(byFact(decisionCandidate.key)!).includes("Decisión propuesta"));
assert.ok(graphSemanticLabels(byFact(decision.key)!).includes("Decisión"));

const initialBoard = convertMapToFlow(generated, () => undefined);
const initialSpatialNodes = projectSpatialNodes(generated.nodes);
const initialSpatialLinks = projectSpatialLinks(generated.relations);
assert.deepEqual(initialBoard.nodes.map((node) => node.id).sort(), initialSpatialNodes.map((node) => node.id).sort(), "2D and 3D project the same canonical node IDs");
assert.deepEqual(initialBoard.edges.map((edge) => edge.id).sort(), initialSpatialLinks.map((link) => link.id).sort(), "2D and 3D project the same canonical relation IDs");
assert.equal(initialBoard.nodes.find((node) => node.id === byFact(hypothesis.key)?.id)?.data.semanticState, "proposed");
assert.equal(initialSpatialNodes.find((node) => node.id === byFact(hypothesis.key)?.id)?.semanticKind, "hypothesis");
assert.equal(initialBoard.edges[0]?.data.semanticType, "related_to");

const addedProposal: ConceptNode = {
  id: "model-local-demand", semanticKey: "local-demand-plan", title: "Local delivery for repair materials", description: "Explore neighborhood delivery", kind: "concept",
  status: "confirmed", metadata: "", x: 20, y: 30,
};
const proposalRelation: ConceptRelation = { id: "model-link", from: "model-local-demand", to: generated.nodes[0].id, type: "supports" };
const withProposal = applyGraphOperations(generated, [addedProposal], [proposalRelation], discovery, discovery.candidateDefinitionVersion, discovery.candidateDefinitionVersion, ["hardware-user-1", "assistant-4"]);
const appliedProposal = withProposal.nodes.find((node) => node.semanticKey === "local-demand-plan")!;
assert.equal(appliedProposal.semanticState, "proposed");
assert.equal(appliedProposal.verification, "unconfirmed", "AI graph content cannot promote itself to a confirmed fact");
assert.deepEqual(appliedProposal.sourceMessageIds, ["hardware-user-1", "assistant-4"]);
assert.equal(appliedProposal.definitionVersion, discovery.candidateDefinitionVersion);
assert.equal(withProposal.relations.filter((relation) => relation.semanticType === "supports").length, 1);
const protectedProposalMap = {
  ...withProposal,
  nodes: withProposal.nodes.map((node) => node.id === appliedProposal.id ? { ...node, title: "Owner-approved label", manuallyEditedFields: ["title"] } : node),
};
const updatedProposal = applyGraphOperations(
  protectedProposalMap,
  [{ ...addedProposal, title: "AI revised label", description: "Updated delivery proposal" }],
  [{ ...proposalRelation, label: "Updated support relation" }],
  discovery,
  discovery.candidateDefinitionVersion,
  discovery.candidateDefinitionVersion,
  ["retry-user", "retry-assistant"],
);
assert.equal(updatedProposal.nodes.find((node) => node.id === appliedProposal.id)?.title, "Owner-approved label", "AI updates preserve manually edited fields");
assert.equal(updatedProposal.nodes.find((node) => node.id === appliedProposal.id)?.description, "Updated delivery proposal");
const updatedSupportRelation = updatedProposal.relations.find((relation) => relation.semanticType === "supports")!;
const originalSupportRelation = withProposal.relations.find((relation) => relation.semanticType === "supports")!;
assert.equal(updatedSupportRelation.id, originalSupportRelation.id, "Relation updates preserve stable IDs");
assert.equal(updatedSupportRelation.label, "Updated support relation");
assert.equal(updatedSupportRelation.definitionVersion, discovery.candidateDefinitionVersion);
assert.ok(updatedSupportRelation.sourceMessageIds?.includes("retry-user"), "Updated relation tracks the messages that proposed the update");
const repeatedProposal = applyGraphOperations(withProposal, [{ ...addedProposal, id: "new-model-id" }], [proposalRelation], discovery, discovery.candidateDefinitionVersion, discovery.candidateDefinitionVersion, ["hardware-user-1", "assistant-4"]);
assert.equal(repeatedProposal.nodes.length, withProposal.nodes.length, "Retry does not duplicate a semantic node");
assert.equal(repeatedProposal.relations.length, withProposal.relations.length, "Retry does not duplicate a semantic relation");
assert.equal(repeatedProposal.nodes.find((node) => node.semanticKey === "local-demand-plan")?.id, appliedProposal.id, "Proposal ID is stable across retries");
const differentKeySameTitle = applyGraphOperations(withProposal, [{ ...addedProposal, id: "model-other-id", semanticKey: "other-key" }], [], discovery, discovery.candidateDefinitionVersion, discovery.candidateDefinitionVersion);
assert.equal(differentKeySameTitle.nodes.length, withProposal.nodes.length, "Exact duplicate titles resolve to the existing canonical node");
const stale = applyGraphOperations(withProposal, [addedProposal], [], discovery, "old-version", discovery.candidateDefinitionVersion);
assert.equal(stale, withProposal, "Stale AI operations do not mutate the graph");
const invalidRelations = applyGraphOperations(generated, [addedProposal], [
  { id: "bad-endpoint", from: "missing", to: "model-local-demand", type: "supports" },
  { id: "self-link", from: "model-local-demand", to: "model-local-demand", type: "supports" },
], discovery, discovery.candidateDefinitionVersion, discovery.candidateDefinitionVersion);
assert.equal(invalidRelations.relations.length, generated.relations.length, "Invalid endpoints and self-relations are rejected");

const editedSemanticKey = generated.nodes.find((node) => node.semanticKey !== hardwareIntent?.semanticKey)?.semanticKey;
const deletedNode = byFact(temporaryConcept.key);
const deletedRelation = generated.relations[generated.relations.length - 1];
const manuallyEditedRelation = generated.relations.find((relation) => relation.id !== deletedRelation?.id && relation.from !== deletedNode?.id && relation.to !== deletedNode?.id);
assert.ok(deletedNode?.semanticKey && deletedRelation?.semanticKey && manuallyEditedRelation?.semanticKey, "Fixture contains deletable and editable generated graph items");
const currentMap: ConceptMap = {
  nodes: [
    ...generated.nodes.filter((node) => node.id !== deletedNode.id).map((node) => node.semanticKey === editedSemanticKey ? {
      ...node,
      title: "Neighborhood Hardware Supply (manual title)",
      description: "Manual description survives refresh",
      x: 910,
      y: 420,
      layout: { board2d: { x: 910, y: 420 }, neural3d: { x: 18, y: 28, z: -4 } },
      manuallyEditedFields: ["title", "description"],
    } : node),
    { id: "manual-node", semanticKey: "user:manual-node", title: "Owner notes", description: "Manual concept", kind: "concept", status: "confirmed", metadata: "", x: 500, y: 500, origin: "user" },
  ],
  relations: [
    ...generated.relations.filter((relation) => relation.id !== deletedRelation.id).map((relation) => relation.id === manuallyEditedRelation.id
      ? { ...relation, label: "Manual relation label", manuallyEditedFields: ["label"] }
      : relation),
    { id: "manual-relation", from: generated.nodes[0].id, to: "manual-node", type: "supports", semanticType: "supports", semanticKey: "manual-relation-key", origin: "user" },
  ],
};
discovery = { ...discovery, tombstones: [...discovery.tombstones, deletedNode.semanticKey, deletedRelation.semanticKey] };
const reconciled = reconcileGraph(currentMap, generated, discovery, discovery.candidateDefinitionVersion!);
const protectedEdit = reconciled.nodes.find((node) => node.semanticKey === editedSemanticKey)!;
assert.equal(protectedEdit.title, "Neighborhood Hardware Supply (manual title)");
assert.equal(protectedEdit.description, "Manual description survives refresh");
assert.deepEqual(protectedEdit.layout, currentMap.nodes.find((node) => node.semanticKey === editedSemanticKey)?.layout, "Manual 2D and 3D layouts survive regeneration");
assert.equal(reconciled.nodes.some((node) => node.semanticKey === deletedNode.semanticKey), false, "Deleted node tombstone blocks regeneration");
assert.equal(reconciled.relations.some((relation) => relation.semanticKey === deletedRelation.semanticKey), false, "Deleted relation tombstone blocks regeneration");
assert.ok(reconciled.nodes.some((node) => node.id === "manual-node"), "Manual node survives regeneration");
assert.ok(reconciled.relations.some((relation) => relation.id === "manual-relation"), "Manual relation survives regeneration");
const retainedManualRelationEdit = reconciled.relations.find((relation) => relation.semanticKey === manuallyEditedRelation.semanticKey);
assert.equal(retainedManualRelationEdit?.label, "Manual relation label", "Manually edited generated relation fields survive reconciliation");
const staleSuggestionMap: ConceptMap = {
  nodes: generated.nodes.map((node) => node.semanticKey === acceptedSuggestion.semanticKey ? {
    ...node, semanticKind: "suggestion", semanticState: "proposed", provenanceOrigin: "ai_suggestion", verification: "unconfirmed",
  } : node),
  relations: generated.relations,
};
const transitioned = reconcileGraph(staleSuggestionMap, generated, discovery, discovery.candidateDefinitionVersion!);
assert.equal(transitioned.nodes.find((node) => node.semanticKey === acceptedSuggestion.semanticKey)?.semanticState, "accepted", "Reconciliation refreshes epistemic state from canonical memory");
assert.equal(reconcileGraph(reconciled, generated, { ...discovery, candidateDefinitionVersion: "newer" }, discovery.candidateDefinitionVersion!), reconciled, "Stale reconciliation cannot overwrite a newer definition");
const sameGeneration = buildGroundedGraph(discovery, project.name);
assert.deepEqual(sameGeneration.nodes.map((node) => node.id), generated.nodes.map((node) => node.id), "Canonical IDs survive regeneration");

// Hardware-store integration fixture: accept a new user detail, regenerate, edit/move, delete, then reload.
const followUp = userMessage("hardware-user-2", "Our customers are nearby homeowners who need reliable advice and the right materials for repairs.");
const discoveryAfterFollowUp = recordUserInput(discovery, followUp);
assert.notEqual(discoveryAfterFollowUp.candidateDefinitionVersion, discovery.candidateDefinitionVersion, "Confirmed user input creates a new graph definition version");
const afterFollowUp = reconcileGraph(reconciled, buildGroundedGraph(discoveryAfterFollowUp, project.name), discoveryAfterFollowUp, discoveryAfterFollowUp.candidateDefinitionVersion!);
assert.ok(afterFollowUp.nodes.some((node) => node.sourceMessageIds?.includes(followUp.id)), "New confirmed user information appears with its source message");
assert.equal(afterFollowUp.nodes.find((node) => node.semanticKey === editedSemanticKey)?.title, "Neighborhood Hardware Supply (manual title)");
assert.equal(afterFollowUp.nodes.some((node) => node.semanticKey === deletedNode.semanticKey), false, "Deleted node remains absent after a later graph version");
assert.equal(afterFollowUp.relations.some((relation) => relation.semanticKey === deletedRelation.semanticKey), false, "Deleted relation remains absent after a later graph version");

const workspace: Workspace = {
  project,
  map: afterFollowUp,
  messages: [userMessage("hardware-user-1", "I want to open a hardware store in my neighborhood because people often buy the wrong materials for home repairs."), followUp, userMessage("hardware-user-delete", "We will keep a small storage area for bulky repair materials.")],
  discovery: discoveryAfterFollowUp,
};
useWorkspaceStore.getState().setWorkspace(JSON.parse(JSON.stringify(workspace)) as Workspace);
const persistedNode = useWorkspaceStore.getState().workspace!.map.nodes.find((node) => node.semanticKey === editedSemanticKey)!;
useWorkspaceStore.getState().updateNodeContent(persistedNode.id, { title: "Hardware supply for homeowners" });
useWorkspaceStore.getState().moveNode(persistedNode.id, 960, 440);
useWorkspaceStore.getState().onConnect({ source: persistedNode.id, target: "manual-node" });
const relationCountAfterConnect = useWorkspaceStore.getState().workspace!.map.relations.length;
useWorkspaceStore.getState().onConnect({ source: persistedNode.id, target: "manual-node" });
useWorkspaceStore.getState().onConnect({ source: persistedNode.id, target: persistedNode.id });
assert.equal(useWorkspaceStore.getState().workspace!.map.relations.length, relationCountAfterConnect, "Repeated/manual self-connect actions do not create duplicate or invalid relations");
const storeState = useWorkspaceStore.getState();
const canonicalNode = storeState.workspace!.map.nodes.find((node) => node.id === persistedNode.id)!;
const projected3dNode = storeState.spatialNodes.find((node) => node.id === persistedNode.id)!;
assert.equal(canonicalNode.title, "Hardware supply for homeowners");
assert.equal(projected3dNode.title, canonicalNode.title, "2D semantic edits are projected to Neural 3D");
assert.deepEqual(canonicalNode.layout?.board2d, { x: 960, y: 440 }, "2D movement updates only canonical layout data");
const connectedEdge = storeState.edges.find((edge) => edge.data?.origin === "user");
assert.ok(connectedEdge && storeState.spatialLinks.some((link) => link.id === connectedEdge.id), "A manual 2D relation immediately projects to Neural 3D with the same ID");
const reloadedWorkspace = JSON.parse(JSON.stringify(storeState.workspace)) as Workspace;
useWorkspaceStore.getState().setWorkspace(reloadedWorkspace);
const reloadedState = useWorkspaceStore.getState();
assert.deepEqual(reloadedState.nodes.map((node) => node.id).sort(), reloadedState.spatialNodes.map((node) => node.id).sort());
assert.deepEqual(reloadedState.edges.map((edge) => edge.id).sort(), reloadedState.spatialLinks.map((link) => link.id).sort());
assert.equal(reloadedState.workspace!.map.nodes.find((node) => node.id === persistedNode.id)?.semanticState, canonicalNode.semanticState);
assert.deepEqual(reloadedState.workspace!.map.nodes.find((node) => node.id === persistedNode.id)?.layout?.board2d, { x: 960, y: 440 });
assert.deepEqual(reloadedState.workspace!.map.nodes.find((node) => node.id === persistedNode.id)?.layout?.neural3d, { x: 18, y: 28, z: -4 });
assert.equal(reloadedState.workspace!.map.nodes.some((node) => node.semanticKey === deletedNode.semanticKey), false, "Deleted node stays absent after reload");
assert.equal(reloadedState.workspace!.map.relations.some((relation) => relation.semanticKey === deletedRelation.semanticKey), false, "Deleted relation stays absent after reload");
assert.equal(reloadedState.workspace!.map.nodes.find((node) => node.sourceFactIds?.includes(acceptedSuggestion.key))?.semanticState, "accepted");
assert.equal(reloadedState.workspace!.map.nodes.find((node) => node.sourceFactIds?.includes(hypothesis.key))?.semanticKind, "hypothesis");
assert.equal(reloadedState.workspace!.map.nodes.find((node) => node.sourceFactIds?.includes(decisionCandidate.key))?.semanticState, "proposed");
assert.equal(reloadedState.workspace!.map.nodes.find((node) => node.sourceFactIds?.includes(decision.key))?.semanticState, "accepted");
assert.ok(reloadedState.workspace!.discovery?.tombstones.includes(deletedNode.semanticKey!));

const legacyNode = { id: "legacy-node", title: "Legacy note", description: "Old workspace", kind: "concept" as const, status: "confirmed" as const, metadata: "", x: 120, y: 240, legacyExtension: { retained: true } } as ConceptNode & { legacyExtension: { retained: boolean } };
const legacyWorkspace = { ...workspace, map: { nodes: [legacyNode], relations: [] }, discovery: undefined } as Workspace;
useWorkspaceStore.getState().setWorkspace(legacyWorkspace);
const migratedLegacyNode = useWorkspaceStore.getState().workspace!.map.nodes[0] as ConceptNode & { legacyExtension: { retained: boolean } };
assert.deepEqual(migratedLegacyNode.layout?.board2d, { x: 120, y: 240 }, "Legacy x/y fields hydrate to an additive board layout");
assert.deepEqual(migratedLegacyNode.legacyExtension, { retained: true }, "Unknown legacy fields are not dropped");
assert.equal(migratedLegacyNode.sourceFactIds, undefined, "Legacy items do not receive invented provenance");
console.log("Phase 2 canonical graph, 2D/3D parity, status, provenance, idempotency, reconciliation and reload passed.");
