import type {
  ConceptMap,
  DiscoveryState,
  PerspectiveActionEvent,
  PerspectiveEvaluation,
  PerspectiveId,
  PerspectiveProposal,
  PerspectiveRelevance,
  ProjectFact,
} from "../../domain/types";

interface PerspectiveDefinition {
  id: PerspectiveId;
  label: string;
  focus: string;
  keywords: string[];
  archetypes: Partial<Record<DiscoveryState["archetype"], number>>;
}

export const PERSPECTIVE_CATALOG: readonly PerspectiveDefinition[] = [
  { id: "economic", label: "Económica", focus: "costos, sostenibilidad financiera y recursos", keywords: ["costo", "precio", "ingreso", "venta", "comprar", "presupuesto", "inventario", "negocio", "ferretería", "rentabilidad"], archetypes: { business: 7, operational: 4 } },
  { id: "human", label: "Social / humana", focus: "necesidades, adopción y efectos sobre las personas", keywords: ["usuario", "cliente", "pasajero", "persona", "comunidad", "estudiante", "docente", "trabajador"], archetypes: { software: 4, research: 4, creative: 4, business: 3 } },
  { id: "political", label: "Política", focus: "gobernanza, actores públicos y decisiones colectivas", keywords: ["gobierno", "política", "público", "municipal", "estado", "regulación", "stakeholder"], archetypes: { research: 2, operational: 2 } },
  { id: "legal", label: "Legal", focus: "obligaciones, permisos, contratos y cumplimiento", keywords: ["ley", "legal", "contrato", "licencia", "permiso", "norma", "cumplimiento", "datos personales"], archetypes: { business: 3, software: 2 } },
  { id: "ethical", label: "Ética", focus: "riesgos, equidad, daños y criterios responsables", keywords: ["ética", "sesgo", "equidad", "vulnerable", "riesgo", "inteligencia artificial", "privacidad"], archetypes: { research: 4, software: 2 } },
  { id: "technical", label: "Técnica", focus: "viabilidad, arquitectura, integración y restricciones técnicas", keywords: ["software", "app", "aplicación", "sensor", "hardware", "api", "sistema", "algoritmo", "plataforma"], archetypes: { software: 8, operational: 3 } },
  { id: "geographic", label: "Geográfica", focus: "ubicación, cobertura, movilidad y diferencias territoriales", keywords: ["aeropuerto", "ubicación", "barrio", "vecindario", "cercanía", "zona", "territorio", "ruta", "movilidad", "regional", "localización"], archetypes: { business: 2, operational: 3 } },
  { id: "environmental", label: "Ambiental", focus: "consumo, residuos, impacto material y sostenibilidad", keywords: ["ambiente", "residuo", "energía", "emisión", "reciclaje", "sostenible", "material"], archetypes: { operational: 2, business: 1 } },
  { id: "historical", label: "Histórica", focus: "antecedentes, evolución y cambios en el tiempo", keywords: ["historia", "histórico", "evolución", "archivo", "memoria", "periodo", "siglo"], archetypes: { research: 5 } },
  { id: "market", label: "Mercado", focus: "segmentos, alternativas, demanda y adopción comercial", keywords: ["mercado", "competencia", "cliente", "venta", "comprar", "demanda", "segmento", "comercial", "ferretería", "restaurante"], archetypes: { business: 8 } },
  { id: "cultural", label: "Cultural", focus: "prácticas, valores, lenguaje y contexto social", keywords: ["cultura", "tradición", "identidad", "comunidad", "lengua", "costumbre"], archetypes: { research: 4, creative: 5 } },
  { id: "operational", label: "Operativa", focus: "procesos, responsables, capacidad y continuidad", keywords: ["operación", "proceso", "inventario", "logística", "turno", "flujo", "mantenimiento", "material", "ferretería", "carrito"], archetypes: { operational: 8, business: 4 } },
  { id: "educational", label: "Educativa", focus: "aprendizaje, evaluación y experiencia formativa", keywords: ["estudiante", "docente", "universidad", "escuela", "tesis", "curso", "tarea", "aprendizaje"], archetypes: { research: 6, software: 2 } },
  { id: "institutional", label: "Institucional", focus: "reglas, roles, capacidades y actores organizacionales", keywords: ["universidad", "institución", "facultad", "empresa", "autoridad", "organización", "tesis"], archetypes: { research: 6, operational: 3 } },
  { id: "methodological", label: "Metodológica", focus: "preguntas, método, muestra, validación y límites", keywords: ["tesis", "investigación", "método", "muestra", "hipótesis", "estudio", "evidencia", "encuesta"], archetypes: { research: 9 } },
  { id: "privacy", label: "Privacidad", focus: "datos personales, acceso, retención y consentimiento", keywords: ["dato", "privacidad", "cuenta", "perfil", "estudiante", "usuario", "registro"], archetypes: { software: 4 } },
  { id: "accessibility", label: "Accesibilidad", focus: "barreras de uso, inclusión y distintos modos de acceso", keywords: ["accesibilidad", "discapacidad", "inclusión", "estudiante", "usuario", "móvil", "interfaz"], archetypes: { software: 3 } },
] as const;

const PERSPECTIVE_IDS = new Set(PERSPECTIVE_CATALOG.map((item) => item.id));
const VALID_RELEVANCE = new Set<PerspectiveProposal["relevance"]>(["relevant", "potentially_relevant", "unexplored"]);

const normalize = (value: string): string => value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Unconfirmed AI proposals must not steer which perspectives look relevant to the project.
const isUsableFact = (fact: ProjectFact): boolean => fact.memoryState !== "rejected" && fact.kind !== "evidence_placeholder" && !(fact.origin === "ai_suggestion" && (fact.memoryState === "proposed" || fact.memoryState === "modified"));

const contextLabel = (fact: ProjectFact): string => {
  if (fact.kind === "hypothesis" && fact.memoryState !== "confirmed") return "Como hipótesis pendiente";
  if (fact.kind === "unknown" || fact.memoryState === "unknown") return "Como dato aún desconocido";
  if (fact.kind === "suggestion" && fact.memoryState !== "accepted") return "Como sugerencia todavía no aceptada";
  return "A partir de lo que comentaste";
};

const short = (value: string): string => value.trim().replace(/\s+/g, " ").slice(0, 150);

const hashContext = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export function perspectiveEvaluationVersion(discovery: DiscoveryState, map: ConceptMap): string {
  const facts = discovery.facts.map((fact) => `${fact.key}:${fact.value}:${fact.memoryState ?? fact.status}`).sort().join("|");
  const graph = map.nodes.map((node) => `${node.id}:${node.title}:${node.description}`).sort().join("|");
  return `p3:${discovery.candidateDefinitionVersion ?? "legacy"}:${hashContext(`${facts}#${graph}`)}`;
}

function relevanceForScore(score: number): Exclude<PerspectiveRelevance, "not_applicable"> {
  if (score >= 8) return "relevant";
  if (score >= 4) return "potentially_relevant";
  return "unexplored";
}

export function evaluatePerspectives(discovery: DiscoveryState, map: ConceptMap, projectName = "Proyecto"): PerspectiveEvaluation[] {
  const facts = discovery.facts.filter(isUsableFact);
  const version = perspectiveEvaluationVersion(discovery, map);
  const nodeText = map.nodes.map((node) => `${node.title} ${node.description}`).join(" ");
  const allText = normalize(`${projectName} ${facts.map((fact) => fact.value).join(" ")} ${nodeText}`);

  return PERSPECTIVE_CATALOG
    .map((definition) => {
      const normalizedKeywords = definition.keywords.map(normalize);
      const matches = normalizedKeywords.filter((keyword) => allText.includes(keyword));
      const linkedFacts = facts.filter((fact) => normalizedKeywords.some((keyword) => normalize(fact.value).includes(keyword))).slice(0, 3);
      const linkedNodes = map.nodes.filter((node) => normalizedKeywords.some((keyword) => normalize(`${node.title} ${node.description}`).includes(keyword))).slice(0, 3);
      const score = (definition.archetypes[discovery.archetype] ?? 0) + Math.min(matches.length * 3, 12);
      const grounding = linkedFacts[0];
      const rationale = grounding
        ? `${contextLabel(grounding)} «${short(grounding.value)}». Esta perspectiva ayudaría a examinar ${definition.focus}; es una línea de análisis, no un hecho nuevo.`
        : linkedNodes[0]
          ? `El mapa incluye «${short(linkedNodes[0].title)}». Esta perspectiva ayudaría a examinar ${definition.focus}; es una línea de análisis, no un hecho nuevo.`
          : `Por el tipo de proyecto «${short(projectName)}», podría ser útil examinar ${definition.focus}. La pertinencia todavía debe validarse.`;
      return {
        perspectiveId: definition.id,
        label: definition.label,
        relevance: relevanceForScore(score),
        rationale,
        focus: definition.focus,
        linkedFactIds: linkedFacts.map((fact) => fact.key),
        linkedNodeIds: linkedNodes.map((node) => node.id),
        explorationStatus: "suggested" as const,
        evaluationVersion: version,
        source: "deterministic" as const,
        rank: score,
      };
    })
    .sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label, "es"));
}

export function normalizePerspectiveProposals(
  raw: unknown,
  discovery?: DiscoveryState,
  map?: ConceptMap,
): PerspectiveProposal[] {
  if (!Array.isArray(raw)) return [];
  const factIds = new Set(discovery?.facts.map((fact) => fact.key) ?? []);
  const nodeIds = new Set(map?.nodes.map((node) => node.id) ?? []);
  const seen = new Set<PerspectiveId>();
  const normalized: PerspectiveProposal[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") continue;
    const value = candidate as Record<string, unknown>;
    const id = value.perspectiveId;
    const relevance = value.relevance;
    const rationale = typeof value.rationale === "string" ? value.rationale.trim().slice(0, 500) : "";
    if (typeof id !== "string" || !PERSPECTIVE_IDS.has(id as PerspectiveId) || seen.has(id as PerspectiveId)) continue;
    if (typeof relevance !== "string" || !VALID_RELEVANCE.has(relevance as PerspectiveProposal["relevance"]) || rationale.length < 12) continue;
    const linkedFactIds = Array.isArray(value.linkedFactIds) ? value.linkedFactIds.filter((item): item is string => typeof item === "string" && (!discovery || factIds.has(item))) : [];
    const linkedNodeIds = Array.isArray(value.linkedNodeIds) ? value.linkedNodeIds.filter((item): item is string => typeof item === "string" && (!map || nodeIds.has(item))) : [];
    // Once project context is available, an AI rationale must point to real memory or graph context.
    if ((discovery || map) && linkedFactIds.length === 0 && linkedNodeIds.length === 0) continue;
    seen.add(id as PerspectiveId);
    normalized.push({ perspectiveId: id as PerspectiveId, relevance: relevance as PerspectiveProposal["relevance"], rationale, linkedFactIds, linkedNodeIds });
    if (normalized.length === 5) break;
  }
  return normalized;
}

export function mergePerspectiveEvaluations(
  deterministic: PerspectiveEvaluation[],
  previous: PerspectiveEvaluation[] = [],
  proposals: PerspectiveProposal[] = [],
): PerspectiveEvaluation[] {
  const priorById = new Map(previous.map((item) => [item.perspectiveId, item]));
  const proposalById = new Map(proposals.map((item) => [item.perspectiveId, item]));
  return deterministic.map((item) => {
    const prior = priorById.get(item.perspectiveId);
    const proposal = proposalById.get(item.perspectiveId);
    const withProposal: PerspectiveEvaluation = proposal
      ? { ...item, relevance: proposal.relevance, rationale: proposal.rationale, linkedFactIds: proposal.linkedFactIds ?? item.linkedFactIds, linkedNodeIds: proposal.linkedNodeIds ?? item.linkedNodeIds, source: "ai_assisted", rank: item.rank + 1 }
      : item;
    if (!prior) return withProposal;
    return {
      ...withProposal,
      explorationStatus: prior.explorationStatus,
      relevance: prior.explorationStatus === "not_relevant" ? "not_applicable" : withProposal.relevance,
      actionIds: prior.actionIds,
      relevanceBeforeDismissal: prior.relevanceBeforeDismissal,
    };
  }).sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label, "es"));
}

export function ensurePerspectiveState(
  discovery: DiscoveryState,
  map: ConceptMap,
  projectName: string,
  rawProposals?: unknown,
): DiscoveryState {
  const version = perspectiveEvaluationVersion(discovery, map);
  const proposals = normalizePerspectiveProposals(rawProposals, discovery, map);
  if (discovery.perspectiveEvaluationVersion === version && proposals.length === 0 && discovery.perspectives?.length) return discovery;
  const evaluated = evaluatePerspectives(discovery, map, projectName);
  return {
    ...discovery,
    perspectives: mergePerspectiveEvaluations(evaluated, discovery.perspectives, proposals),
    perspectiveEvaluationVersion: version,
  };
}

export function transitionPerspective(discovery: DiscoveryState, event: PerspectiveActionEvent): DiscoveryState {
  const current = discovery.perspectives?.find((item) => item.perspectiveId === event.perspectiveId);
  if (!current || current.actionIds?.includes(event.actionId)) return discovery;
  let patch: Partial<PerspectiveEvaluation> | undefined;
  if (event.type === "explore" && current.explorationStatus === "suggested") patch = { explorationStatus: "explored" };
  if (event.type === "dismiss" && current.explorationStatus !== "dismissed") patch = { explorationStatus: "dismissed" };
  if (event.type === "mark_not_relevant" && current.explorationStatus !== "not_relevant") patch = { explorationStatus: "not_relevant", relevanceBeforeDismissal: current.relevance === "not_applicable" ? "unexplored" : current.relevance, relevance: "not_applicable" };
  if (event.type === "restore" && (current.explorationStatus === "dismissed" || current.explorationStatus === "not_relevant")) patch = { explorationStatus: "suggested", relevance: current.relevanceBeforeDismissal ?? (current.relevance === "not_applicable" ? "unexplored" : current.relevance) };
  if (!patch) return discovery;
  const next = { ...current, ...patch, actionIds: [...(current.actionIds ?? []), event.actionId].slice(-50) };
  return { ...discovery, perspectives: discovery.perspectives?.map((item) => item.perspectiveId === event.perspectiveId ? next : item) };
}

export function visiblePerspectives(perspectives: PerspectiveEvaluation[] = [], limit = 3): PerspectiveEvaluation[] {
  return perspectives
    .filter((item) => item.explorationStatus === "suggested" || item.explorationStatus === "explored")
    .filter((item) => item.relevance === "relevant" || item.relevance === "potentially_relevant")
    .slice(0, Math.max(1, Math.min(limit, 3)));
}
