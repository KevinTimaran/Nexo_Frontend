import type { AssistantMessage, DiscoveryQuestion, DiscoveryState, GenerativeUIBlock, MemoryPatch, Message, ProjectArchetype, ProjectFact, UserMessage } from "../../domain/types";
import { applyAiMemoryPatches, memoryOriginForUserMessage, transitionMemoryFact } from "./semanticMemory";

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
export const questionKey = (text: string) => normalize(text).split(" ").filter((word) => word.length > 3).slice(0, 8).join("-");

export function archetypeFor(text: string): ProjectArchetype {
  const value = normalize(text);
  if (/tesis|investigacion|estudio|hipotesis|academi|research|thesis/.test(value)) return "research";
  if (/app|aplicacion|software|plataforma|sistema|web|saas/.test(value)) return "software";
  if (/ferreteria|tienda|negocio|comercio|restaurante|cafeteria|emprendimiento|ventas|local/.test(value)) return "business";
  if (/pelicula|libro|novela|arte|musica|exposicion|creativo/.test(value)) return "creative";
  if (/proceso|operacion|evento|organizar|logistica|plan/.test(value)) return "operational";
  return "general";
}

const requirements: Record<ProjectArchetype, DiscoveryState["requiredTopics"]> = {
  business: [{ key: "intent", importance: "blocking" }, { key: "offering", importance: "blocking" }, { key: "customers", importance: "helpful" }],
  research: [{ key: "intent", importance: "blocking" }, { key: "subject", importance: "blocking" }, { key: "method", importance: "optional" }],
  software: [{ key: "intent", importance: "blocking" }, { key: "problem", importance: "blocking" }, { key: "users", importance: "helpful" }],
  creative: [{ key: "intent", importance: "blocking" }, { key: "medium", importance: "blocking" }, { key: "audience", importance: "optional" }],
  operational: [{ key: "intent", importance: "blocking" }, { key: "outcome", importance: "blocking" }, { key: "deadline", importance: "optional" }],
  general: [{ key: "intent", importance: "blocking" }, { key: "outcome", importance: "blocking" }],
};

export function initialDiscovery(existingNodes = false): DiscoveryState {
  return { lifecycle: existingNodes ? "generated" : "discovering", archetype: "general", facts: [], requiredTopics: requirements.general, askedQuestionKeys: [], answeredQuestionKeys: [], generationLedger: {}, tombstones: [] };
}

function versionOf(facts: ProjectFact[]): string {
  const payload = facts.filter((fact) => fact.status !== "unconfirmed" && !fact.key.startsWith("suggestion:")).map((fact) => `${fact.key}:${fact.status}:${normalize(fact.value)}`).sort().join("|");
  let hash = 2166136261;
  for (const char of payload) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `v-${(hash >>> 0).toString(36)}`;
}

const GREETING_OR_VAGUE_INTENT = /^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|hey|hello|hi|saludos|ayuda|ay[uú]dame|tengo una idea|quiero crear algo|quiero hacer algo|quiero empezar|empecemos|c[oó]mo funciona|ok|vale|bien|gracias|no|si|sí)[!.,\s]*$/i;

export function recordUserInput(state: DiscoveryState, message: UserMessage): DiscoveryState {
  const value = message.text.trim();
  const priorIntent = state.facts.find((fact) => fact.key === "intent")?.value ?? "";
  if (!value || (!message.answers && (GREETING_OR_VAGUE_INTENT.test(value) || /[?¿]$/.test(value) || /^(explorar punto de vista|comparar|planifica|prop[oó]n tarjetas)/i.test(value) || (priorIntent && /\b(quiero|necesito)\s+(analizar|comparar|planificar|simular|explorar)\b/i.test(value) && !/\d/.test(value))))) return state;
  const correction = state.lifecycle === "generated"
    ? /^(?:quiero\s+)?(?:cambiar\s+(?:completamente\s+de\s+|de\s+)?idea|reiniciar(?:\s+el)?\s+proyecto|empezar\s+de\s+nuevo|borrar\s+y\s+comenzar\s+de\s+nuevo)|(?:en\s+realidad|mejor)\s+(?:quiero|voy\s+a)\s+(?:crear|hacer|desarrollar)\s+(?:un|una|otro|otra)/i.test(value)
    : /cambiar de idea|en vez de|en lugar de|mejor quiero|en realidad|corrijo/i.test(value);
  const priorArchetype = archetypeFor(priorIntent);
  const archetype = correction ? archetypeFor(value) : priorArchetype === "general" ? archetypeFor(`${priorIntent} ${value}`) : priorArchetype;
  const facts = correction ? [] : [...state.facts];
  const put = (key: string, content: string) => {
    const status = /^(no s[eé]|a[uú]n no lo s[eé]|por definir|desconocido|unknown|ninguna de las opciones)/i.test(content) ? "unknown" : "confirmed";
    const index = facts.findIndex((fact) => fact.key === key);
    const sourceMessageIds = [...new Set([...(index >= 0 ? facts[index].sourceMessageIds : []), message.id])];
    const fact: ProjectFact = {
      key,
      value: content,
      status,
      sourceMessageIds,
      kind: status === "unknown" ? "unknown" : "user_fact",
      memoryState: status === "unknown" ? "unknown" : "confirmed",
      origin: memoryOriginForUserMessage(Boolean(message.answers)),
    };
    if (index < 0) facts.push(fact);
    else {
      const previous = facts[index];
      if (previous.kind === "unknown" && previous.memoryState === "unknown" && status === "confirmed") {
        facts[index] = transitionMemoryFact(previous, { type: "resolve_unknown", eventId: `${key}:${message.id}`, value: content, messageId: message.id });
      } else if (previous.kind === "legacy_unknown") {
        facts[index] = { ...fact, kind: "user_fact", memoryState: "confirmed" };
      } else {
        facts[index] = { ...previous, ...fact };
      }
    }
  };
  if (message.answers) {
    for (const [key, answer] of Object.entries(message.answers)) {
      const content = Array.isArray(answer) ? answer.join(", ") : answer;
      put(`answer:${key}`, content);
      if (key.startsWith("topic:")) put(key.slice(6), content);
    }
  } else if (!GREETING_OR_VAGUE_INTENT.test(value) && (value.split(/\s+/).length >= 5 || (value.split(/\s+/).length >= 2 && (/^(quiero|necesito|abrir|crear|montar|vender|investigar|organizar|no s[eé]|a[uú]n no lo s[eé])/i.test(value) || archetypeFor(value) !== "general")))) {
    if (!priorIntent || correction) put("intent", value);
    else {
      const missing = requirements[archetype].find((topic) => topic.importance === "blocking" && topic.key !== "intent" && !facts.some((fact) => fact.key === topic.key && (fact.status === "confirmed" || fact.status === "unknown")));
      if (missing) put(missing.key, value);
      else put(`detail:${questionKey(value)}`, value);
    }
  }
  const combined = normalize(facts.filter((fact) => fact.status === "confirmed" && (fact.key === "intent" || fact.key.startsWith("detail:") || fact.key.startsWith("answer:"))).map((fact) => fact.value).join(" "));
  const isSubstantiveTurn = value.split(/\s+/).length >= 10;
  const material = combined.length > 0 && (Boolean(priorIntent) ? facts.some((f) => f.key.startsWith("detail:") || f.key.startsWith("answer:")) : isSubstantiveTurn);
  if (material) {
    const has = (key: string) => facts.some((fact) => fact.key === key);
    if (archetype === "business" && !has("offering") && /(?:vend\w*|ofrec\w*|servicio[s]? de|producto[s]? de|sistema[s]? de|plataforma[s]? de|software de|especializad\w* en|men[uú] de|tienda de|comercio de)\s+[a-zñáéíóú]+/i.test(combined)) put("offering", value);
    if (archetype === "research" && !has("subject") && /(?:investig\w*|estudi\w*|analiz\w*|evalu\w*|comprend\w*|sobre|acerca de)\s+[a-zñáéíóú]{4,}/i.test(combined)) put("subject", value);
    if (archetype === "software" && !has("problem") && /(?:resolver|resuelv\w*|solucion\w*|ayud\w*|gestion\w*|permit\w*|automatiz\w*|optimiz\w*|reduc\w*|evit\w*|para que|orientad\w*)\s+[a-zñáéíóú]+/i.test(combined)) put("problem", value);
    if (archetype === "creative" && !has("medium") && /(?:crear|producir|escribir|grabar|componer)\s+(?:un|una|el|la)?\s*(?:libro|novela|musica|pelicula|arte|exposicion|podcast)/i.test(combined)) put("medium", value);
    if (archetype === "operational" && !has("outcome") && /(?:logr\w*|organiz\w*|planific\w*|ejecut\w*|coordin\w*)\s+[a-zñáéíóú]+/i.test(combined)) put("outcome", value);
    if (archetype === "general" && !has("outcome") && /(?:logr\w*|consegu\w*|para|crear|desarroll\w*|organiz\w*)\s+[a-zñáéíóú]{4,}/i.test(combined)) put("outcome", value);
  }
  const requiredTopics = requirements[archetype];
    const ready = requiredTopics.filter((topic) => topic.importance === "blocking").every((topic) => facts.some((fact) => fact.key === topic.key && (fact.status === "confirmed" || fact.status === "unknown")));
  const candidateDefinitionVersion = facts.length ? versionOf(facts) : undefined;
  const changed = candidateDefinitionVersion !== state.candidateDefinitionVersion;

  // Once generated, discovery remains generated (continuous exploration) unless user explicitly corrects/changes their idea
  const isPostGeneration = (state.lifecycle === "generated" || state.lifecycle === "legacy_unknown") && !correction;
  const lifecycle = isPostGeneration
    ? "generated"
    : changed
      ? (ready ? "ready" : "discovering")
      : state.lifecycle;

  // Completion card anchor: set ONCE when discovery becomes ready, never update on subsequent post-generation messages
  const completionAnchorMessageId = isPostGeneration
    ? state.completionAnchorMessageId
    : (state.completionAnchorMessageId ?? (ready ? message.id : undefined));

  return {
    ...state, archetype, facts, requiredTopics,
    answeredQuestionKeys: message.answers ? [...new Set([...state.answeredQuestionKeys, ...Object.keys(message.answers)])] : state.answeredQuestionKeys,
    candidateDefinitionVersion,
    completionAnchorMessageId,
    lifecycle,
  };
}

export function syncIdeaFacts(state: DiscoveryState, ui: GenerativeUIBlock | undefined, messageId: string, patches?: MemoryPatch[], stableTurnId = messageId): DiscoveryState {
  if (ui?.type !== "idea_cards") return { ...state, facts: applyAiMemoryPatches(state.facts, patches, messageId, stableTurnId) };
  const facts = [...state.facts];
  for (const idea of ui.items) {
    const key = `suggestion:${messageId}:${idea.id}`;
    const index = facts.findIndex((item) => item.key === key);
    const value = `${idea.title}: ${idea.description}`;
    const sourceMessageIds = [...new Set([...(index >= 0 ? facts[index].sourceMessageIds : []), messageId])];
    if (index < 0) {
      const accepted = idea.status === "approved" || idea.status === "mapped";
      facts.push({
        key, value, status: accepted ? "confirmed" : "unconfirmed", sourceMessageIds,
        kind: "suggestion", memoryState: accepted ? "accepted" : idea.status === "discarded" ? "rejected" : "proposed",
        origin: accepted ? "accepted_suggestion" : "ai_suggestion", sourceSuggestionId: idea.id,
        ...(accepted ? { decisionEventId: `${key}:accept` } : idea.status === "discarded" ? { decisionEventId: `${key}:reject` } : {}),
      });
    } else {
      const existing = facts[index];
      const candidate = { ...existing, value, sourceMessageIds, sourceSuggestionId: idea.id };
      if (idea.status === "approved" || idea.status === "mapped") {
        facts[index] = existing.memoryState === "accepted" ? candidate : transitionMemoryFact(candidate, { type: "accept_suggestion", eventId: `${key}:accept` });
      } else if (idea.status === "discarded") {
        facts[index] = existing.memoryState === "rejected" ? candidate : transitionMemoryFact(candidate, { type: "reject_suggestion", eventId: `${key}:reject` });
      } else if (existing.memoryState === "rejected") {
        facts[index] = transitionMemoryFact(candidate, { type: "restore_suggestion", eventId: `${key}:restore` });
      } else if (existing.memoryState === "accepted") {
        facts[index] = candidate;
      } else if (["proposed", "modified"].includes(existing.memoryState ?? "legacy_unknown") && value !== existing.value) {
        facts[index] = transitionMemoryFact(existing, { type: "modify_suggestion", eventId: `${key}:modify:${value}`, value });
      } else if (existing.memoryState === "modified") {
        facts[index] = { ...existing, sourceMessageIds, sourceSuggestionId: idea.id };
      } else {
        facts[index] = { ...candidate, status: "unconfirmed", kind: "suggestion", memoryState: "proposed", origin: "ai_suggestion" };
      }
    }
  }
  return { ...state, facts: applyAiMemoryPatches(facts, patches, messageId, stableTurnId) };
}

const topicQuestions: Record<string, string> = {
  intent: "¿Qué quieres crear o lograr?",
  offering: "¿Qué producto o servicio ofrecerá tu proyecto?",
  subject: "¿Qué tema quieres investigar?",
  problem: "¿Qué necesidad resolverá tu aplicación?",
  medium: "¿Qué tipo de obra quieres crear?",
  outcome: "¿Qué resultado concreto quieres conseguir?",
};

export function nextDiscoveryQuestion(state: DiscoveryState): DiscoveryQuestion[] {
  const missing = state.requiredTopics.find((topic) => topic.importance === "blocking" && !state.facts.some((fact) => fact.key === topic.key && (fact.status === "confirmed" || fact.status === "unknown")));
  if (!missing) return [];
  const id = `topic:${missing.key}`;
  if (state.answeredQuestionKeys.includes(id)) return [];
  return [{ id, question: topicQuestions[missing.key] ?? "¿Qué detalle falta por definir?", options: ["Aún no lo sé"], type: "single", allowCustom: true }];
}

export function filterRepeatedQuestions(state: DiscoveryState, history: Message[], questions: DiscoveryQuestion[]): DiscoveryQuestion[] {
  const priorQuestions = history.filter((m): m is AssistantMessage => m.role === "assistant").flatMap((m) => m.discoveryQuestions ?? []);
  const answered = new Set(history.filter((m): m is UserMessage => m.role === "user").flatMap((m) => Object.keys(m.answers ?? {})));
  const seen = new Set<string>();
  return questions.filter((question) => {
    const key = questionKey(question.question);
    if (seen.has(key) || state.askedQuestionKeys.includes(key) || answered.has(question.id) || state.answeredQuestionKeys.includes(question.id)) return false;
    seen.add(key);
    return !priorQuestions.some((prior) => (prior.id === question.id || questionKey(prior.question) === key) && answered.has(prior.id));
  }).slice(0, 3);
}

export function isDiscoveryReady(state: DiscoveryState): boolean {
  const blockingTopics = state.requiredTopics.filter((topic) => topic.importance === "blocking");
  if (blockingTopics.length === 0) return false;
  return blockingTopics.every((topic) =>
    state.facts.some(
      (fact) => fact.key === topic.key && (fact.status === "confirmed" || fact.status === "unknown")
    )
  );
}

