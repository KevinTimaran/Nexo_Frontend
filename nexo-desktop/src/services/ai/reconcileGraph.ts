import type { ConceptMap, ConceptNode, ConceptRelation, DiscoveryState, ProjectFact, RelationSemanticType } from "../../domain/types";
import { normalizeTitle } from "./prompts";

const labelForFact = (fact: ProjectFact): string => {
  if (fact.memoryState === "unknown" || fact.kind === "unknown") return "Por definir";
  if (fact.kind === "hypothesis") return "Hipótesis";
  if (fact.kind === "decision_candidate") return "Decisión propuesta";
  if (fact.kind === "decision") return "Decisión aceptada";
  if (fact.kind === "suggestion") return fact.memoryState === "accepted" ? "Sugerencia aceptada" : "Propuesta de IA";
  if (fact.kind === "user_fact") return "Hecho aportado por el usuario";
  return "Información por revisar";
};

function isRepresentableFact(fact: ProjectFact): boolean {
  if (fact.memoryState === "rejected" || fact.kind === "legacy_unknown" || fact.memoryState === "legacy_unknown") return false;
  if (fact.kind === "user_fact") return fact.memoryState === "confirmed";
  if (fact.kind === "suggestion") return fact.memoryState === "accepted";
  if (fact.kind === "hypothesis") return fact.memoryState === "proposed" || fact.memoryState === "confirmed";
  if (fact.kind === "unknown") return fact.memoryState === "unknown";
  if (fact.kind === "decision") return fact.memoryState === "accepted";
  if (fact.kind === "decision_candidate") return fact.memoryState === "proposed";
  // Pre-Phase 1 workspaces are admitted only where the legacy discovery key is understood.
  return !fact.kind && fact.status === "confirmed" && (fact.key === "intent" || fact.key.startsWith("detail:") || fact.key.startsWith("answer:") || ["offering", "subject", "problem", "medium", "outcome"].includes(fact.key));
}

export function normalizeRelationType(value?: string): RelationSemanticType {
  const supported: RelationSemanticType[] = ["related_to", "supports", "affects", "depends_on", "contradicts", "validates", "enables", "requires", "impacts", "solves", "threatens", "regulates", "funds"];
  if (value === "related") return "related_to";
  return supported.includes(value as RelationSemanticType) ? value as RelationSemanticType : "related_to";
}

function safeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "item";
}

function stableId(prefix: string, key: string): string {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  return `${prefix}-${safeIdPart(key).slice(0, 48)}-${(hash >>> 0).toString(36)}`;
}

function stateVerification(fact: ProjectFact): NonNullable<ConceptNode["verification"]> {
  if (fact.memoryState === "unknown" || fact.kind === "unknown") return "unknown";
  if (fact.memoryState === "confirmed" || fact.memoryState === "accepted" || fact.status === "confirmed") return "confirmed";
  return "unconfirmed";
}

export function buildGroundedGraph(state: DiscoveryState, projectName: string): ConceptMap {
  const selectedFacts = state.facts.filter(isRepresentableFact).sort((left, right) => {
    if (left.key === "intent") return -1;
    if (right.key === "intent") return 1;
    return left.key.localeCompare(right.key);
  });
  const facts = selectedFacts.filter((fact) =>
    fact.key === "intent" || fact.key.startsWith("detail:") || fact.key.startsWith("answer:") ||
    state.requiredTopics.some((topic) => topic.key === fact.key) ||
    fact.kind === "suggestion" || fact.kind === "hypothesis" || fact.kind === "unknown" || fact.kind === "decision" || fact.kind === "decision_candidate"
  ).filter((fact) => !fact.key.startsWith("answer:") || !state.facts.some((topic) => topic.key === fact.key.slice(7).replace(/^topic:/, "") && topic.value === fact.value));
  const topicLabels: Record<string, string> = { offering: "Producto o servicio", subject: "Tema de investigación", problem: "Necesidad", medium: "Tipo de obra", outcome: "Resultado", customers: "Clientes", users: "Usuarios", method: "Método de investigación", audience: "Público", deadline: "Fecha objetivo" };
  const shortTitle = (value: string) => value.replace(/^(quiero|necesito|voy a|mi idea es)\s+/i, "").split(/\s+/).slice(0, 7).join(" ");
  const nodes: ConceptNode[] = facts.map((fact, index) => {
    const semanticKey = fact.semanticKey ?? fact.key;
    const verification = stateVerification(fact);
    const memoryState = fact.memoryState ?? (fact.status === "unknown" ? "unknown" : "legacy_unknown");
    const title = verification === "unknown" ? `Por definir: ${topicLabels[fact.key] ?? fact.semanticKey ?? "Detalle"}` : fact.key === "intent" ? projectName : shortTitle(fact.value);
    const x = 80 + (index % 3) * 350;
    const y = 160 + Math.floor(index / 3) * 260;
    return {
      id: stableId("fact", semanticKey),
      semanticKey,
      kind: fact.kind === "decision" ? "viability" : "concept",
      category: state.archetype === "business" ? "economic" : "technical",
      priority: index === 0 ? "high" : "medium",
      title,
      description: verification === "unknown" ? "Información aún por definir" : fact.value,
      details: verification === "unknown" ? "Información desconocida; pendiente de que el usuario aporte un valor real." : fact.value,
      metadata: labelForFact(fact),
      status: verification === "unknown" ? "review" : verification === "confirmed" ? "confirmed" : "exploring",
      verification,
      origin: "ai_initial",
      semanticKind: fact.kind ?? "legacy_unknown",
      semanticState: memoryState,
      provenanceOrigin: fact.origin ?? "unknown",
      sourceFactIds: [fact.key],
      sourceMessageIds: [...(fact.sourceMessageIds ?? [])],
      layout: { board2d: { x, y } },
      x,
      y,
      phase: "planning",
    };
  });
  for (const topic of state.requiredTopics.filter((item) => item.importance === "helpful")) {
    if (state.facts.some((fact) => fact.key === topic.key)) continue;
    const semanticKey = `unknown:${topic.key}`;
    const x = 80 + (nodes.length % 3) * 350;
    const y = 160 + Math.floor(nodes.length / 3) * 260;
    nodes.push({
      id: stableId("unknown", semanticKey),
      semanticKey,
      kind: "concept",
      title: `Por definir: ${topicLabels[topic.key] ?? topic.key}`,
      description: "Información aún no proporcionada",
      metadata: "Por definir",
      status: "review",
      verification: "unknown",
      origin: "ai_initial",
      semanticKind: "unknown",
      semanticState: "unknown",
      provenanceOrigin: "unknown",
      sourceFactIds: [],
      sourceMessageIds: [],
      layout: { board2d: { x, y } },
      x,
      y,
    });
  }
  const root = nodes[0];
  const relations: ConceptRelation[] = root ? nodes.slice(1).map((node) => {
    const semanticType = "related_to" as const;
    const semanticKey = `${root.semanticKey ?? root.id}->${node.semanticKey ?? node.id}:${semanticType}`;
    return {
      id: stableId("rel", semanticKey),
      from: root.id,
      to: node.id,
      type: "related",
      semanticType,
      label: "Definición del proyecto",
      semanticKey,
      origin: "ai_initial",
      sourceFactIds: [...new Set([...(root.sourceFactIds ?? []), ...(node.sourceFactIds ?? [])])],
      sourceMessageIds: [...new Set([...(root.sourceMessageIds ?? []), ...(node.sourceMessageIds ?? [])])],
    };
  }) : [];
  return { nodes, relations };
}

const keyForNode = (node: ConceptNode) => node.semanticKey || normalizeTitle(node.title);
const keyForRelation = (relation: ConceptRelation, nodes: ConceptNode[]) => relation.semanticKey || `${nodes.find((node) => node.id === relation.from)?.semanticKey ?? relation.from}->${nodes.find((node) => node.id === relation.to)?.semanticKey ?? relation.to}:${normalizeRelationType(relation.semanticType ?? relation.type)}`;

export function reconcileGraph(current: ConceptMap, generated: ConceptMap, state: DiscoveryState, version: string): ConceptMap {
  if (state.candidateDefinitionVersion && state.candidateDefinitionVersion !== version) return current;
  const tombstones = new Set(state.tombstones);
  for (const relation of current.relations) if (tombstones.has(relation.id)) tombstones.add(keyForRelation(relation, current.nodes));
  const generatedNodes = generated.nodes.map((node) => ({
    ...node,
    semanticKey: keyForNode(node),
    origin: "ai_initial" as const,
    verification: node.verification ?? "unconfirmed" as const,
    definitionVersion: version,
    // Never infer provenance for pre-existing graph items.
    sourceFactIds: node.sourceFactIds ?? [],
    sourceMessageIds: node.sourceMessageIds ?? [],
    layout: node.layout ?? { board2d: { x: node.x, y: node.y }, ...(node.z === undefined ? {} : { neural3d: { x: node.x, y: node.y, z: node.z } }) },
  }));
  const freshKeys = new Set(generatedNodes.map(keyForNode));
  const nodes = current.nodes.filter((node) => {
    const key = keyForNode(node);
    if (tombstones.has(key) || tombstones.has(node.id)) return false;
    return node.origin !== "ai_initial" || freshKeys.has(key) || Boolean(node.manuallyEditedFields?.length);
  });
  for (const candidate of generatedNodes) {
    const key = keyForNode(candidate);
    if (tombstones.has(key) || tombstones.has(candidate.id)) continue;
    const index = nodes.findIndex((node) => keyForNode(node) === key);
    if (index < 0) { nodes.push(candidate); continue; }
    const existing = nodes[index];
    if (existing.origin !== "ai_initial") continue;
    const protectedFields = new Set(existing.manuallyEditedFields ?? []);
    const next: ConceptNode = {
      ...existing,
      ...candidate,
      id: existing.id,
      x: existing.x,
      y: existing.y,
      z: existing.z,
      layout: existing.layout ?? candidate.layout,
      // Phase 1 memory is authoritative for epistemic state and provenance.
      semanticKind: candidate.semanticKind ?? existing.semanticKind,
      semanticState: candidate.semanticState ?? existing.semanticState,
      provenanceOrigin: candidate.provenanceOrigin ?? existing.provenanceOrigin,
      verification: candidate.verification ?? existing.verification,
      sourceFactIds: [...new Set([...(existing.sourceFactIds ?? []), ...(candidate.sourceFactIds ?? [])])],
      sourceMessageIds: [...new Set([...(existing.sourceMessageIds ?? []), ...(candidate.sourceMessageIds ?? [])])],
    };
    for (const field of protectedFields) (next as unknown as Record<string, unknown>)[field] = (existing as unknown as Record<string, unknown>)[field];
    nodes[index] = next;
  }
  const idByGeneratedId = new Map(generatedNodes.map((node) => [node.id, nodes.find((item) => keyForNode(item) === keyForNode(node))?.id]));
  const candidateRelations = generated.relations.map((relation) => ({
    ...relation,
    from: idByGeneratedId.get(relation.from) ?? relation.from,
    to: idByGeneratedId.get(relation.to) ?? relation.to,
    semanticType: normalizeRelationType(relation.semanticType ?? relation.type),
    origin: "ai_initial" as const,
    definitionVersion: version,
  })).filter((relation) => relation.from !== relation.to && nodes.some((node) => node.id === relation.from) && nodes.some((node) => node.id === relation.to));
  const relationKeys = new Set(candidateRelations.map((relation) => keyForRelation(relation, nodes)));
  const relations = current.relations.filter((relation) => {
    const key = keyForRelation(relation, nodes);
    const hasEndpoints = nodes.some((node) => node.id === relation.from) && nodes.some((node) => node.id === relation.to);
    if (!hasEndpoints || tombstones.has(key) || tombstones.has(relation.id)) return false;
    return relation.origin !== "ai_initial" || relationKeys.has(key) || Boolean(relation.manuallyEditedFields?.length);
  });
  for (const relation of candidateRelations) {
    const key = keyForRelation(relation, nodes);
    if (tombstones.has(key) || tombstones.has(relation.id)) continue;
    const existingIndex = relations.findIndex((existing) => keyForRelation(existing, nodes) === key);
    if (existingIndex >= 0) {
      const existing = relations[existingIndex];
      if (existing.origin !== "ai_initial") continue;
      const next = {
        ...existing,
        ...relation,
        id: existing.id,
        semanticKey: key,
        manuallyEditedFields: existing.manuallyEditedFields,
        sourceFactIds: [...new Set([...(existing.sourceFactIds ?? []), ...(relation.sourceFactIds ?? [])])],
        sourceMessageIds: [...new Set([...(existing.sourceMessageIds ?? []), ...(relation.sourceMessageIds ?? [])])],
      };
      for (const field of existing.manuallyEditedFields ?? []) (next as unknown as Record<string, unknown>)[field] = (existing as unknown as Record<string, unknown>)[field];
      relations[existingIndex] = next;
      continue;
    }
    relations.push({ ...relation, semanticKey: key });
  }
  return { nodes, relations };
}

/** Applies AI expansion output as validated create/update proposals against the current graph. */
export function applyGraphOperations(
  current: ConceptMap,
  proposedNodes: ConceptNode[],
  proposedRelations: ConceptRelation[],
  discovery: DiscoveryState | undefined,
  requestDefinitionVersion: string | undefined,
  currentDefinitionVersion: string | undefined,
  sourceMessageIds: string[] = [],
): ConceptMap {
  if (requestDefinitionVersion !== currentDefinitionVersion) return current;
  const tombstones = new Set(discovery?.tombstones ?? []);
  for (const relation of current.relations) if (tombstones.has(relation.id)) tombstones.add(keyForRelation(relation, current.nodes));
  const nodes = current.nodes.filter((node) => !tombstones.has(keyForNode(node)) && !tombstones.has(node.id));
  const proposedIdMap = new Map<string, string>();
  const seenKeys = new Set<string>();
  for (const proposed of proposedNodes) {
    const semanticKey = proposed.semanticKey || normalizeTitle(proposed.title);
    if (!semanticKey || seenKeys.has(semanticKey)) continue;
    seenKeys.add(semanticKey);
    const normalizedTitle = normalizeTitle(proposed.title);
    const existingIndex = nodes.findIndex((node) =>
      keyForNode(node) === semanticKey || normalizeTitle(node.title) === normalizedTitle
    );
    const existing = existingIndex >= 0 ? nodes[existingIndex] : undefined;
    const stableNodeId = existing?.id ?? stableId("ai", semanticKey);
    proposedIdMap.set(proposed.id, stableNodeId);
    if (tombstones.has(semanticKey) || tombstones.has(proposed.id) || tombstones.has(stableNodeId)) continue;
    if (existing && keyForNode(existing) !== semanticKey) continue;
    if (existing && (existing.origin !== "ai_initial" && existing.origin !== "ai_expansion")) continue;
    if (existing && (existing.semanticKind !== "suggestion" || !["proposed", "modified"].includes(existing.semanticState ?? "legacy_unknown"))) continue;
    if (existing) {
      const next: ConceptNode = {
        ...existing,
        ...proposed,
        id: existing.id,
        semanticKey,
        origin: existing.origin,
        definitionVersion: currentDefinitionVersion,
        verification: existing.verification,
        semanticKind: existing.semanticKind,
        semanticState: existing.semanticState,
        provenanceOrigin: existing.provenanceOrigin,
        sourceFactIds: existing.sourceFactIds,
        sourceMessageIds: existing.sourceMessageIds,
        layout: existing.layout,
        x: existing.x,
        y: existing.y,
        z: existing.z,
      };
      const protectedFields = new Set(existing.manuallyEditedFields ?? []);
      for (const field of protectedFields) (next as unknown as Record<string, unknown>)[field] = (existing as unknown as Record<string, unknown>)[field];
      nodes[existingIndex] = next;
      continue;
    }
    nodes.push({
      ...proposed,
      id: stableNodeId,
      semanticKey,
      origin: "ai_expansion",
      definitionVersion: currentDefinitionVersion,
      verification: "unconfirmed",
      status: "exploring",
      semanticKind: "suggestion",
      semanticState: "proposed",
      provenanceOrigin: "ai_suggestion",
      sourceFactIds: (proposed.sourceFactIds ?? []).filter((key) => discovery?.facts.some((fact) => fact.key === key)),
      sourceMessageIds: [...new Set([...(proposed.sourceMessageIds ?? []), ...sourceMessageIds])],
      layout: proposed.layout ?? { board2d: { x: proposed.x, y: proposed.y } },
    });
  }
  const semanticById = new Map(nodes.map((node) => [node.id, node.semanticKey ?? node.id]));
  for (const [proposedId, canonicalId] of proposedIdMap) semanticById.set(proposedId, semanticById.get(canonicalId) ?? canonicalId);
  const relations = current.relations.filter((relation) =>
    !tombstones.has(relation.semanticKey ?? relation.id) && !tombstones.has(relation.id) &&
    nodes.some((node) => node.id === relation.from) && nodes.some((node) => node.id === relation.to)
  );
  const seenRelationKeys = new Set<string>();
  for (const proposed of proposedRelations) {
    const from = proposedIdMap.get(proposed.from) ?? proposed.from;
    const to = proposedIdMap.get(proposed.to) ?? proposed.to;
    if (!from || !to || from === to || !nodes.some((node) => node.id === from) || !nodes.some((node) => node.id === to)) continue;
    const semanticType = normalizeRelationType(proposed.semanticType ?? proposed.type);
    const semanticKey = `${semanticById.get(from) ?? from}->${semanticById.get(to) ?? to}:${semanticType}`;
    if (seenRelationKeys.has(semanticKey) || tombstones.has(semanticKey) || tombstones.has(proposed.id)) continue;
    seenRelationKeys.add(semanticKey);
    const existingIndex = relations.findIndex((relation) => keyForRelation(relation, nodes) === semanticKey);
    if (existingIndex >= 0) {
      const existing = relations[existingIndex];
      if (existing.origin !== "ai_expansion") continue;
      const next: ConceptRelation = {
        ...existing,
        ...proposed,
        id: existing.id,
        from,
        to,
        type: semanticType,
        semanticType,
        semanticKey,
        origin: existing.origin,
        definitionVersion: currentDefinitionVersion,
        sourceFactIds: [
          ...new Set([
            ...(existing.sourceFactIds ?? []),
            ...(proposed.sourceFactIds ?? []).filter((key) => discovery?.facts.some((fact) => fact.key === key)),
          ]),
        ],
        sourceMessageIds: [...new Set([...(existing.sourceMessageIds ?? []), ...(proposed.sourceMessageIds ?? []), ...sourceMessageIds])],
        manuallyEditedFields: existing.manuallyEditedFields,
      };
      for (const field of existing.manuallyEditedFields ?? []) (next as unknown as Record<string, unknown>)[field] = (existing as unknown as Record<string, unknown>)[field];
      relations[existingIndex] = next;
      continue;
    }
    relations.push({
      ...proposed,
      id: stableId("rel", semanticKey),
      from,
      to,
      type: semanticType,
      semanticType,
      semanticKey,
      origin: "ai_expansion",
      definitionVersion: currentDefinitionVersion,
      sourceFactIds: (proposed.sourceFactIds ?? []).filter((key) => discovery?.facts.some((fact) => fact.key === key)),
      sourceMessageIds: [...new Set([...(proposed.sourceMessageIds ?? []), ...sourceMessageIds])],
    });
  }
  return { nodes, relations };
}
