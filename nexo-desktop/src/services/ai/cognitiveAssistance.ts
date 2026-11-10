import type {
  CognitiveActionEvent,
  CognitiveAssistanceMode,
  CognitiveInsightUIBlock,
  ConceptMap,
  DiscoveryState,
  PerspectiveEvaluation,
  ProjectFact,
} from "../../domain/types";
import { transitionMemoryFact } from "./semanticMemory";

const HYPOTHESIS_MODES = new Set<CognitiveAssistanceMode>(["blind_spot", "risk", "contradiction", "hypothesis"]);
const SUGGESTION_MODES = new Set<CognitiveAssistanceMode>(["suggestion", "solution", "opportunity", "alternative", "validation_strategy"]);

export function cognitiveMemoryKind(mode: CognitiveAssistanceMode): ProjectFact["kind"] | null {
  if (HYPOTHESIS_MODES.has(mode)) return "hypothesis";
  if (SUGGESTION_MODES.has(mode)) return "suggestion";
  return null;
}

export function canProvideCognitiveValue(discovery: DiscoveryState): boolean {
  const usable = discovery.facts.filter((fact) => fact.memoryState !== "rejected" && fact.kind !== "legacy_unknown");
  const unresolvedBlocking = discovery.requiredTopics.some((topic) => topic.importance === "blocking" && !usable.some((fact) => fact.semanticKey === topic.key || fact.key === topic.key));
  return !unresolvedBlocking && usable.length >= 2;
}

const firstGrounding = (discovery: DiscoveryState): ProjectFact | undefined =>
  discovery.facts.find((fact) => fact.memoryState === "confirmed" || fact.memoryState === "accepted")
  ?? discovery.facts.find((fact) => fact.memoryState !== "rejected" && fact.kind !== "legacy_unknown");

const firstPerspective = (perspectives: PerspectiveEvaluation[] = []): PerspectiveEvaluation | undefined =>
  perspectives.find((item) => item.relevance === "relevant" && item.explorationStatus !== "dismissed" && item.explorationStatus !== "not_relevant")
  ?? perspectives.find((item) => item.relevance === "potentially_relevant" && item.explorationStatus !== "dismissed" && item.explorationStatus !== "not_relevant");

/** Deterministic fallback for question avoidance and controlled scenario verification. */
export function selectCognitiveAssistance(discovery: DiscoveryState, map: ConceptMap): CognitiveInsightUIBlock | undefined {
  if (!canProvideCognitiveValue(discovery)) return undefined;
  const grounding = firstGrounding(discovery);
  if (!grounding) return undefined;
  const perspective = firstPerspective(discovery.perspectives);
  const candidateId = `cognitive:${discovery.candidateDefinitionVersion ?? discovery.archetype}:${discovery.archetype}`;
  if (discovery.facts.some((fact) => fact.key === `cognitive:${candidateId}` && (fact.memoryState === "rejected" || fact.memoryState === "accepted"))) return undefined;
  const base = {
    type: "cognitive_insight" as const,
    id: candidateId,
    version: 1 as const,
    linkedFactIds: [grounding.key],
    linkedNodeIds: map.nodes.filter((node) => node.sourceFactIds?.includes(grounding.key)).slice(0, 2).map((node) => node.id),
    perspectiveId: perspective?.perspectiveId,
    status: "proposed" as const,
    explorationStatus: "idle" as const,
    actionIds: [],
  };

  if (discovery.archetype === "research") {
    return {
      ...base,
      mode: "risk",
      title: "Supuesto inicial del estudio",
      statement: "El diseño podría privilegiar una causa antes de contrastar explicaciones alternativas.",
      rationale: `La memoria del proyecto plantea «${grounding.value}». Conviene tratar cualquier causa sugerida como hipótesis, no como conclusión.`,
      whyItMatters: "Partir de una explicación única puede sesgar las preguntas, la muestra y la interpretación.",
      nextAction: "Contrastar factores académicos, económicos, motivacionales e institucionales.",
      validationOptions: ["Revisar datos institucionales existentes", "Entrevistar estudiantes", "Diseñar una encuesta", "Revisar literatura académica"],
    };
  }

  if (discovery.archetype === "software") {
    return {
      ...base,
      mode: "blind_spot",
      title: "El problema puede no ser la falta de herramientas",
      statement: "Los usuarios podrían disponer ya de calendarios o gestores de tareas; la dificultad puede estar en convertir requisitos académicos en acciones claras.",
      rationale: `La memoria confirma «${grounding.value}». La existencia y suficiencia de herramientas actuales todavía no están confirmadas.`,
      whyItMatters: "Distinguir ambos problemas cambia el alcance del producto y evita duplicar soluciones existentes.",
      nextAction: "Observar cómo los estudiantes transforman hoy una guía de curso en tareas y fechas.",
      validationOptions: ["Probar un prototipo pequeño", "Entrevistar estudiantes", "Comparar el flujo con calendarios existentes"],
    };
  }

  if (discovery.archetype === "business") {
    const allFactsText = discovery.facts.map((f) => f.value).join(" ");
    const mentionsGuidanceOrConfusion = /orientaci|confusi|asesor|guiar|materiales equivocados|no saben|desconoc/i.test(allFactsText);
    if (mentionsGuidanceOrConfusion) {
      return {
        ...base,
        mode: "blind_spot",
        title: "La causa observada puede no ser la única",
        statement: "La confusión al comprar podría relacionarse con orientación insuficiente, pero también con precio, disponibilidad o conveniencia.",
        rationale: `La memoria confirma «${grounding.value}». Las causas alternativas aún no se han validado y se presentan solo como posibilidades.`,
        whyItMatters: "La causa principal determina si conviene priorizar asesoría, surtido, ubicación o precio.",
        nextAction: "Contrastar la explicación con residentes antes de ampliar inventario.",
        validationOptions: ["Entrevistar residentes", "Observar problemas de compra frecuentes", "Solicitar cotizaciones de proveedores"],
      };
    }

    return {
      ...base,
      mode: "blind_spot",
      title: "Demanda local y hábitos sin validar",
      statement: "La existencia de demanda insatisfecha, las alternativas actuales de los residentes y la viabilidad del negocio en la zona aún no han sido contrastadas.",
      rationale: `La memoria registra «${grounding.value}». No se asume una problemática comunitaria preexistente ni viabilidad garantizada sin evidencia.`,
      whyItMatters: "Verificar si los vecinos ya resuelven sus compras en otros comercios o si existen necesidades desatendidas evita invertir en inventario o servicios sin contrastar.",
      nextAction: "Indagar hábitos de compra locales y alternativas actuales antes de asumir una necesidad específica.",
      validationOptions: ["Entrevistar residentes", "Mapear comercios o ferreterías existentes en la zona", "Consultar cotizaciones de proveedores"],
    };
  }

  return {
    ...base,
    mode: "suggestion",
    title: "Próximo avance posible",
    statement: "Conviene convertir el objetivo actual en una prueba pequeña y observable antes de ampliar el alcance.",
    rationale: `Esta propuesta parte de «${grounding.value}» y permanece sin confirmar hasta que decidas incorporarla.`,
    whyItMatters: "Una prueba acotada puede revelar restricciones sin exigir una definición completa del proyecto.",
    nextAction: "Definir el resultado mínimo que permitiría aprender algo útil.",
    validationOptions: ["Crear un prototipo", "Observar una prueba manual"],
  };
}

export function validateCognitiveGrounding(block: CognitiveInsightUIBlock, discovery: DiscoveryState, map: ConceptMap): CognitiveInsightUIBlock | undefined {
  const knownFacts = new Map(discovery.facts.map((fact) => [fact.key, fact]));
  const knownNodes = new Set(map.nodes.map((node) => node.id));
  const linkedFactIds = [...new Set(block.linkedFactIds)].filter((id) => knownFacts.has(id));
  const linkedNodeIds = [...new Set(block.linkedNodeIds)].filter((id) => knownNodes.has(id));
  const linkedConfirmedFacts = linkedFactIds.map((id) => knownFacts.get(id)!).filter((fact) => fact.memoryState === "confirmed" || fact.memoryState === "accepted");
  if (block.mode === "contradiction" && linkedConfirmedFacts.length < 2) return undefined;
  if (!["explanation", "question", "comparison"].includes(block.mode) && linkedFactIds.length === 0 && linkedNodeIds.length === 0) return undefined;
  const existing = discovery.facts.find((fact) => fact.key === `cognitive:${block.id}`);
  const status = existing?.memoryState === "rejected" ? "rejected" : existing?.memoryState === "accepted" ? "accepted" : block.status;
  return { ...block, linkedFactIds, linkedNodeIds, status };
}

export function transitionCognitiveBlock(block: CognitiveInsightUIBlock, event: CognitiveActionEvent): CognitiveInsightUIBlock {
  if (event.blockId !== block.id || block.actionIds.includes(event.actionId)) return block;
  if (event.type === "explore") {
    if (block.explorationStatus === "explored") return block;
    return { ...block, explorationStatus: "explored", actionIds: [...block.actionIds, event.actionId] };
  }
  if (event.type === "modify") {
    const value = event.value?.trim();
    if (!value || block.status === "accepted" || block.status === "mapped" || block.status === "rejected") return block;
    return { ...block, statement: value, status: "modified", modifiedFrom: block.modifiedFrom ?? block.statement, actionIds: [...block.actionIds, event.actionId] };
  }
  if (event.type === "accept") {
    if (!['proposed', 'modified'].includes(block.status)) return block;
    return { ...block, status: "accepted", actionIds: [...block.actionIds, event.actionId] };
  }
  if (event.type === "reject") {
    if (block.status === "rejected" || block.status === "mapped") return block;
    return { ...block, status: "rejected", actionIds: [...block.actionIds, event.actionId] };
  }
  if (event.type === "map") {
    if (block.status !== "accepted") return block;
    return { ...block, status: "mapped", actionIds: [...block.actionIds, event.actionId] };
  }
  return block;
}

export function syncCognitiveFact(state: DiscoveryState, block: CognitiveInsightUIBlock, messageId: string): DiscoveryState {
  const kind = cognitiveMemoryKind(block.mode);
  if (!kind) return state;
  const key = `cognitive:${block.id}`;
  const index = state.facts.findIndex((fact) => fact.key === key);
  const value = `${block.title}: ${block.statement}`;
  let facts = [...state.facts];
  if (index < 0) {
    facts.push({ key, semanticKey: block.id, value, status: "unconfirmed", sourceMessageIds: [messageId], kind, memoryState: "proposed", origin: "ai_suggestion", sourceSuggestionId: block.id });
  } else {
    const existing = facts[index];
    const eventId = block.actionIds[block.actionIds.length - 1];
    if (existing.memoryState === "rejected" || existing.memoryState === "accepted") return state;
    if (block.status === "rejected") {
      facts[index] = kind === "hypothesis"
        ? transitionMemoryFact(existing, { type: "reject_hypothesis", eventId: eventId ?? `${key}:reject` })
        : transitionMemoryFact(existing, { type: "reject_suggestion", eventId: eventId ?? `${key}:reject` });
    } else if (block.status === "accepted" || block.status === "mapped") {
      facts[index] = kind === "suggestion"
        ? transitionMemoryFact(existing, { type: "accept_suggestion", eventId: eventId ?? `${key}:accept` })
        : { ...existing, value, modifiedFrom: block.modifiedFrom ?? existing.modifiedFrom };
    } else if (block.status === "modified" && value !== existing.value) {
      facts[index] = kind === "suggestion"
        ? transitionMemoryFact(existing, { type: "modify_suggestion", eventId: eventId ?? `${key}:modify`, value })
        : { ...existing, value, modifiedFrom: existing.modifiedFrom ?? existing.value };
    }
  }
  return { ...state, facts };
}
