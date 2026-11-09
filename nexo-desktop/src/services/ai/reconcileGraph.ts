import type { ConceptMap, ConceptNode, ConceptRelation, DiscoveryState } from "../../domain/types";
import { normalizeTitle } from "./prompts";

export function buildGroundedGraph(state: DiscoveryState, projectName: string): ConceptMap {
  const intentValue = state.facts.find((fact) => fact.key === "intent")?.value;
  const facts = state.facts.filter((fact) =>
    fact.key === "intent" || fact.key.startsWith("detail:") ||
    (fact.key.startsWith("answer:") && !state.facts.some((topic) => topic.key === fact.key.slice(7).replace(/^topic:/, "") && topic.value === fact.value)) ||
    (state.requiredTopics.some((topic) => topic.key === fact.key) && (fact.value !== intentValue || fact.status === "unknown"))
  );
  const topicLabels: Record<string, string> = { offering: "Producto o servicio", problem: "Necesidad", subject: "Tema de investigación", medium: "Tipo de obra", outcome: "Resultado", customers: "Clientes", users: "Usuarios", method: "Método de investigación", audience: "Público", deadline: "Fecha objetivo" };
  const shortTitle = (value: string) => value.replace(/^(quiero|necesito|voy a|mi idea es)\s+/i, "").split(/\s+/).slice(0, 7).join(" ");
  const nodes: ConceptNode[] = facts.map((fact, index) => ({
    id: `fact-${fact.key.replace(/[^a-zA-Z0-9-]/g, "-")}`,
    semanticKey: fact.key,
    kind: "concept", category: state.archetype === "business" ? "economic" : "technical", priority: index === 0 ? "high" : "medium",
    title: index === 0 ? projectName : fact.status === "unknown" ? `Por definir: ${topicLabels[fact.key] ?? "Detalle"}` : shortTitle(fact.value),
    description: fact.status === "unknown" ? "Por definir" : fact.value,
    details: fact.status === "unknown" ? "Información desconocida; pendiente de confirmación." : fact.value,
    metadata: fact.status === "unknown" ? "Desconocido" : "Aportado por el usuario",
    status: fact.status === "unknown" ? "review" : "confirmed",
    verification: fact.status === "unknown" ? "unknown" : "confirmed",
    x: 80 + (index % 3) * 350, y: 160 + Math.floor(index / 3) * 260, phase: "planning",
  }));
  for (const topic of state.requiredTopics.filter((item) => item.importance === "helpful")) {
    if (state.facts.some((fact) => fact.key === topic.key)) continue;
    nodes.push({ id: `unknown-${topic.key}`, semanticKey: `unknown:${topic.key}`, kind: "concept", title: `Por definir: ${topicLabels[topic.key] ?? topic.key}`, description: "Información aún no proporcionada", metadata: "Desconocido", status: "review", verification: "unknown", x: 80 + (nodes.length % 3) * 350, y: 160 + Math.floor(nodes.length / 3) * 260 });
  }
  const relations: ConceptRelation[] = nodes.slice(1).map((node) => ({ id: `rel-${nodes[0]?.id}-${node.id}`, from: nodes[0].id, to: node.id, type: "related", label: "Definición del proyecto" }));
  return { nodes, relations };
}

const keyForNode = (node: ConceptNode) => node.semanticKey || normalizeTitle(node.title);
const keyForRelation = (relation: ConceptRelation, nodes: ConceptNode[]) => relation.semanticKey || `${nodes.find((n) => n.id === relation.from)?.semanticKey ?? relation.from}->${nodes.find((n) => n.id === relation.to)?.semanticKey ?? relation.to}:${relation.type ?? "related"}`;

export function reconcileGraph(current: ConceptMap, generated: ConceptMap, state: DiscoveryState, version: string): ConceptMap {
  const tombstones = new Set(state.tombstones);
  const generatedNodes = generated.nodes.map((node) => ({ ...node, semanticKey: keyForNode(node), origin: "ai_initial" as const, verification: node.verification ?? "unconfirmed" as const, definitionVersion: version, sourceFactIds: node.semanticKey?.startsWith("unknown:") ? [] : [node.semanticKey ?? ""] }));
  const freshKeys = new Set(generatedNodes.map(keyForNode));
  const nodes = current.nodes.filter((node) => node.origin !== "ai_initial" || freshKeys.has(keyForNode(node)) || Boolean(node.manuallyEditedFields?.length));
  for (const candidate of generatedNodes) {
    const key = keyForNode(candidate);
    if (tombstones.has(key)) continue;
    const index = nodes.findIndex((node) => keyForNode(node) === key);
    if (index < 0) { nodes.push(candidate); continue; }
    const existing = nodes[index];
    if (existing.origin !== "ai_initial") continue;
    const protectedFields = new Set(existing.manuallyEditedFields ?? []);
    const next = { ...existing, ...candidate, id: existing.id, x: existing.x, y: existing.y, z: existing.z };
    for (const field of protectedFields) (next as unknown as Record<string, unknown>)[field] = (existing as unknown as Record<string, unknown>)[field];
    nodes[index] = next;
  }
  const idByGeneratedId = new Map(generatedNodes.map((node) => [node.id, nodes.find((n) => keyForNode(n) === keyForNode(node))?.id]));
  const candidateRelations = generated.relations.map((relation) => ({ ...relation, from: idByGeneratedId.get(relation.from) ?? relation.from, to: idByGeneratedId.get(relation.to) ?? relation.to, origin: "ai_initial" as const, definitionVersion: version }));
  const relationKeys = new Set(candidateRelations.map((relation) => keyForRelation(relation, nodes)));
  const relations = current.relations.filter((relation) => relation.origin !== "ai_initial" || relationKeys.has(keyForRelation(relation, nodes)));
  for (const relation of candidateRelations) {
    if (!nodes.some((node) => node.id === relation.from) || !nodes.some((node) => node.id === relation.to)) continue;
    const key = keyForRelation(relation, nodes);
    if (tombstones.has(key) || tombstones.has(relation.id) || relations.some((existing) => keyForRelation(existing, nodes) === key)) continue;
    relations.push({ ...relation, semanticKey: key });
  }
  return { nodes, relations };
}
