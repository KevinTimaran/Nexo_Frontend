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

/** Facts that describe the project: excludes rejected, legacy and still-unconfirmed AI proposals. */
export const isGroundedProjectFact = (fact: ProjectFact): boolean =>
  fact.memoryState !== "rejected"
  && fact.kind !== "legacy_unknown"
  && !(fact.origin === "ai_suggestion" && (fact.memoryState === "proposed" || fact.memoryState === "modified"));

export function canProvideCognitiveValue(discovery: DiscoveryState): boolean {
  const usable = discovery.facts.filter(isGroundedProjectFact);
  const unresolvedBlocking = discovery.requiredTopics.some((topic) => topic.importance === "blocking" && !usable.some((fact) => fact.semanticKey === topic.key || fact.key === topic.key));
  return !unresolvedBlocking && usable.length >= 2;
}

const firstGrounding = (discovery: DiscoveryState): ProjectFact | undefined =>
  [...discovery.facts].reverse().find((fact) => fact.memoryState === "confirmed" || fact.memoryState === "accepted")
  ?? [...discovery.facts].reverse().find(isGroundedProjectFact);

const firstPerspective = (perspectives: PerspectiveEvaluation[] = []): PerspectiveEvaluation | undefined =>
  perspectives.find((item) => item.relevance === "relevant" && item.explorationStatus !== "dismissed" && item.explorationStatus !== "not_relevant")
  ?? perspectives.find((item) => item.relevance === "potentially_relevant" && item.explorationStatus !== "dismissed" && item.explorationStatus !== "not_relevant");

/** Conservative deterministic insight, only for archetypes where the content is derived from stated facts. Never invents domain content. */
export function selectCognitiveAssistance(discovery: DiscoveryState, map: ConceptMap): CognitiveInsightUIBlock | undefined {
  if (!canProvideCognitiveValue(discovery)) return undefined;
  const intentGrounding = discovery.facts.find((fact) => fact.key === "intent" && (fact.memoryState === "confirmed" || fact.memoryState === "accepted"));
  const grounding = discovery.archetype === "research" || discovery.archetype === "software"
    ? intentGrounding ?? firstGrounding(discovery)
    : firstGrounding(discovery);
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
      statement: "El planteamiento podría privilegiar una explicación antes de contrastar otras posibles.",
      rationale: "Conviene tratar cualquier causa que se sugiera como hipótesis, no como conclusión.",
      whyItMatters: "Partir de una explicación única puede sesgar las preguntas, la muestra y la interpretación.",
      nextAction: "Contrastar explicaciones alternativas antes de fijar el diseño.",
      validationOptions: ["Revisar datos existentes", "Consultar a la población de interés", "Diseñar una encuesta", "Revisar literatura académica"],
    };
  }

  if (discovery.archetype === "business") {
    const contextualFacts = discovery.facts.filter((fact) => fact.key !== "intent" && isGroundedProjectFact(fact));
    const contextualFactsText = contextualFacts.map((fact) => fact.value).join(" ");
    const guidanceFact = discovery.facts.filter(isGroundedProjectFact).find((fact) => /orient|confusi|asesor|guiar|materiales equivocados|no saben|desconoc/i.test(fact.value));
    if (guidanceFact) {
      return {
        ...base,
        linkedFactIds: [guidanceFact.key],
        mode: "blind_spot",
        title: "La causa observada puede no ser la única",
        statement: "La confusión al comprar podría relacionarse con orientación insuficiente, pero también con precio, disponibilidad o conveniencia.",
        rationale: "Lo que comentaste sobre la orientación admite otras explicaciones que todavía no se han descartado.",
        whyItMatters: "La causa principal determina si conviene priorizar asesoría, surtido, ubicación o precio.",
        nextAction: "Contrastar la explicación con residentes antes de ampliar inventario.",
        validationOptions: ["Entrevistar residentes", "Observar problemas de compra frecuentes", "Solicitar cotizaciones de proveedores"],
      };
    }

    const accessPattern = /viaj|otro pueblo|lejos|distancia|acceso|disponib|no hay|falta/i;
    if (accessPattern.test(contextualFactsText)) {
      const accessFact = [...contextualFacts].reverse().find((fact) => accessPattern.test(fact.value)) ?? grounding;
      return {
        ...base,
        linkedFactIds: [accessFact.key],
        mode: "hypothesis",
        title: "Posible problema de acceso local",
        statement: "La necesidad de desplazarse para comprar materiales podría indicar una barrera de acceso, pero todavía falta medir su frecuencia y relevancia.",
        rationale: "Lo que describes sobre el acceso aún no se ha medido, por eso se mantiene como hipótesis.",
        whyItMatters: "La frecuencia de los desplazamientos ayudaría a saber si existe una necesidad recurrente o solo casos aislados.",
        nextAction: "Precisar con qué frecuencia ocurre y qué materiales suelen buscarse fuera del pueblo.",
        validationOptions: ["Conversar con residentes", "Registrar compras realizadas fuera del pueblo", "Identificar los materiales más buscados"],
      };
    }
    return {
      ...base,
      mode: "hypothesis",
      title: "Demanda local todavía desconocida",
      statement: "Aún no hay información confirmada sobre la frecuencia de compra, las alternativas disponibles ni la demanda local.",
      rationale: "La demanda y la viabilidad no se pueden deducir solo de la idea inicial.",
      whyItMatters: "Distinguir lo conocido de lo que falta evita presentar la oportunidad comercial como un hecho.",
      nextAction: "Conocer cómo y dónde compran actualmente las personas de la zona.",
      validationOptions: ["Conversar con residentes", "Identificar comercios existentes", "Registrar necesidades de compra frecuentes"],
    };
  }

  // Software, creative, operational and general projects have no project-independent insight:
  // inventing one here is what produced unrelated cards. Leave those to the model (or plain conversation).
  return undefined;
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
