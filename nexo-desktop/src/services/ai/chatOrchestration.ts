import type {
  AssistantMessage,
  ConceptMap,
  DiscoveryState,
  GenerativeUIBlock,
  Message,
  PerspectiveEvaluation,
  PerspectiveId,
  ProjectFact,
  UserMessage,
} from "../../domain/types";
import { classifyTurnIntent } from "./intent";
import { detectMessageLanguage } from "./prompts";
import { isGroundedProjectFact } from "./cognitiveAssistance";

export type PrimaryIntervention =
  | "conversation"
  | "question"
  | "cognitive"
  | "perspectives"
  | "research"
  | "validation"
  | "comparison"
  | "timeline"
  | "ideas"
  | "closing";

export interface ChatOrchestrationPlan {
  primary: PrimaryIntervention;
  maxPrimaryComponents: number;
  minimalContext: boolean;
  explicitIntent: boolean;
  requestedPerspectiveIds: PerspectiveId[];
  targetFactId?: string;
  targetClaim?: string;
  targetKind?: "hypothesis" | "problem" | "assumption";
}

const normalize = (value: string): string =>
  value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const perspectiveMatchers: ReadonlyArray<[PerspectiveId, RegExp]> = [
  ["economic", /\beconom(?:ico|ica|ia)\b|\bfinancier/],
  ["human", /\bsocial\b|\bhumana?\b|\bcomunidad/],
  ["political", /\bpolitic/],
  ["legal", /\blegal\b|\bregulator/],
  ["ethical", /\betic/],
  ["technical", /\btecnic/],
  ["geographic", /\bgeografic|\bterritorial|\blocalizacion/],
  ["environmental", /\bambiental|\bsostenib/],
  ["historical", /\bhistoric/],
  ["market", /\bmercado\b|\bcomercial/],
  ["cultural", /\bcultural/],
  ["operational", /\boperativ|\boperacional/],
  ["educational", /\beducativ|\bacademic/],
  ["institutional", /\binstitucional/],
  ["methodological", /\bmetodolog/],
  ["privacy", /\bprivacidad/],
  ["accessibility", /\baccesibilidad|\binclusion/],
];

export function requestedPerspectives(text: string): PerspectiveId[] {
  const value = normalize(text);
  if (!/(analiz|evalua|examina|perspectiva|enfoque|desde (?:lo|la))/i.test(value)) return [];
  return perspectiveMatchers.filter(([, matcher]) => matcher.test(value)).map(([id]) => id);
}

const usableFact = (fact: ProjectFact): boolean =>
  fact.memoryState !== "rejected" && fact.kind !== "legacy_unknown" && fact.kind !== "evidence" && fact.kind !== "evidence_placeholder";

const latestTargetFact = (discovery: DiscoveryState): ProjectFact | undefined => {
  const facts = discovery.facts.filter(usableFact);
  return [...facts].reverse().find((fact) => fact.kind === "hypothesis")
    ?? [...facts].reverse().find((fact) => fact.key.startsWith("detail:") || fact.key === "problem" || fact.key === "subject")
    ?? [...facts].reverse().find((fact) => fact.key !== "intent");
};

export function planChatTurn(input: {
  text: string;
  discovery: DiscoveryState;
  map: ConceptMap;
  history?: Message[];
}): ChatOrchestrationPlan {
  const value = normalize(input.text);
  const facts = input.discovery.facts.filter(usableFact);
  // Unconfirmed AI proposals are not project context: they must not unlock cards or analyses.
  const groundedFacts = facts.filter((fact) => isGroundedProjectFact(fact) && (fact.memoryState === "confirmed" || fact.memoryState === "accepted" || fact.memoryState === "proposed"));
  const missingBlocking = input.discovery.requiredTopics.some((topic) =>
    topic.importance === "blocking" && !facts.some((fact) => fact.key === topic.key && (fact.status === "confirmed" || fact.status === "unknown"))
  );
  const minimalContext = groundedFacts.length < 2 || missingBlocking;
  const perspectives = requestedPerspectives(value);
  const target = latestTargetFact(input.discovery);
  const hasEvidence = Boolean(input.discovery.evidence?.length);

  const asksValidation = hasEvidence && /(?:que|qué) significa (?:esa|esta|la) evidencia|contextualiz|interpreta (?:esa|esta|la) evidencia|evidencia.*(?:para|sobre) (?:mi|el) (?:idea|proyecto)/i.test(value);
  const asksResearch = /investig|busca(?:r)? (?:evidencia|fuentes|datos)|verific|comprueba|comprobar|de verdad .*existen|fuentes externas|evidencia de que|\b(?:research|investigate) (?:this|that|it|the claim|whether)\b|find (?:evidence|sources|data)|verify (?:this|that|it)\b|fact.?check/i.test(value);
  const asksComparison = /compar(?:a|ar|acion)|contrasta .* opciones|\bcompare\b/i.test(value);
  const asksTimeline = /planifica|hoja de ruta|cronograma|hitos|primeros \d+ dias|\b(?:roadmap|timeline|milestones)\b|first \d+ days/i.test(value);
  const asksIdeas = /prop(?:on|ón|oner)|sugiere .* ideas|ideas accionables|alternativas? para|\b(?:suggest|propose|give me) (?:some )?(?:ideas|alternatives)\b|actionable ideas/i.test(value);
  const asksCognitive = /(?:que|qué) riesgos?|(?:que|qué) oportunidades|(?:como|cómo) (?:puedo )?mejorar|(?:que|qué) podr[ií]a salir mal|punto ciego|what (?:are the )?(?:risks?|opportunities)|what could go wrong|blind spot|how (?:can|could) i improve/i.test(value);
  const continueOnly = /solo quiero (?:seguir )?(?:explicando|contando)|no (?:analices|investigues|preguntes) todavia|solo escucha/i.test(value);
  const directQuestion = /[?¿]/.test(input.text);

  // Explicit closing ("estructúrame esto", "ya tenemos lo básico, ¿qué sigue?"): no more questions or topics.
  if (input.discovery.lifecycle !== "generated" && input.discovery.lifecycle !== "legacy_unknown"
    && classifyTurnIntent(input.text, input.discovery.facts.some((fact) => fact.key === "intent")) === "close") {
    return { primary: "closing", maxPrimaryComponents: 0, minimalContext, explicitIntent: true, requestedPerspectiveIds: [] };
  }

  // "Help me define my idea" is a request for conversation: no card, no validation, no analysis.
  if (classifyTurnIntent(input.text, input.discovery.facts.some((fact) => fact.key === "intent")) === "define_idea") {
    return { primary: "conversation", maxPrimaryComponents: 0, minimalContext, explicitIntent: true, requestedPerspectiveIds: [] };
  }

  if (asksValidation && target) {
    return { primary: "validation", maxPrimaryComponents: 1, minimalContext, explicitIntent: true, requestedPerspectiveIds: [], targetFactId: target.key, targetClaim: target.value, targetKind: target.kind === "hypothesis" ? "hypothesis" : target.key === "problem" ? "problem" : "assumption" };
  }
  if (asksResearch && target) {
    return { primary: "research", maxPrimaryComponents: 1, minimalContext, explicitIntent: true, requestedPerspectiveIds: [], targetFactId: target.key, targetClaim: target.value, targetKind: target.kind === "hypothesis" ? "hypothesis" : target.key === "problem" ? "problem" : "assumption" };
  }
  if (perspectives.length > 0) {
    return { primary: "perspectives", maxPrimaryComponents: 1, minimalContext, explicitIntent: true, requestedPerspectiveIds: perspectives, targetFactId: target?.key, targetClaim: target?.value };
  }
  if (asksComparison) return { primary: "comparison", maxPrimaryComponents: 1, minimalContext, explicitIntent: true, requestedPerspectiveIds: [] };
  if (asksTimeline) return { primary: "timeline", maxPrimaryComponents: 1, minimalContext, explicitIntent: true, requestedPerspectiveIds: [] };
  if (asksIdeas) return { primary: "ideas", maxPrimaryComponents: 1, minimalContext, explicitIntent: true, requestedPerspectiveIds: [] };
  if (continueOnly) return { primary: "conversation", maxPrimaryComponents: 0, minimalContext, explicitIntent: true, requestedPerspectiveIds: [] };
  if (asksCognitive && target) return { primary: "cognitive", maxPrimaryComponents: 1, minimalContext, explicitIntent: true, requestedPerspectiveIds: [], targetFactId: target.key, targetClaim: target.value };
  if (directQuestion) return { primary: "conversation", maxPrimaryComponents: 0, minimalContext, explicitIntent: true, requestedPerspectiveIds: [] };
  if (minimalContext) return { primary: "question", maxPrimaryComponents: 1, minimalContext: true, explicitIntent: false, requestedPerspectiveIds: [] };

  const cognitiveAlreadyShown = (input.history ?? []).some((message) => message.role === "assistant" && message.ui?.type === "cognitive_insight");
  return {
    primary: cognitiveAlreadyShown ? "conversation" : "cognitive",
    maxPrimaryComponents: cognitiveAlreadyShown ? 0 : 1,
    minimalContext: false,
    explicitIntent: false,
    requestedPerspectiveIds: [],
    targetFactId: target?.key,
    targetClaim: target?.value,
  };
}

function uiAllowedForPlan(ui: GenerativeUIBlock, plan: ChatOrchestrationPlan): boolean {
  if (plan.primary === "cognitive") return ui.type === "cognitive_insight";
  if (plan.primary === "comparison") return ui.type === "decision_comparator";
  if (plan.primary === "timeline") return ui.type === "timeline";
  if (plan.primary === "ideas") return ui.type === "idea_cards";
  if (plan.primary === "research") return ui.type === "research_summary" || ui.type === "evidence_card";
  if (plan.primary === "validation") return ui.type === "validation_summary";
  return false;
}

function uiIdentity(ui: GenerativeUIBlock): string {
  const value = ui as unknown as Record<string, unknown>;
  const identity = typeof value.id === "string"
    ? value.id
    : typeof value.title === "string"
      ? value.title
      : typeof value.query === "string"
        ? value.query
        : "primary";
  return `${ui.type}:${identity}`;
}

/** Last sentence announcing questions ("responde las siguientes preguntas:") that may no longer have any attached. */
const QUESTION_LEAD = /(?:siguientes?\s+preguntas?|preguntas?\s+a\s+continuaci[o\u00f3]n|following\s+questions?|questions?\s+below)[^.?!\u00bf]*[:.]?\s*$|:\s*$/i;

/**
 * The model may announce questions that orchestration or repetition filtering then removes.
 * Never leave that promise dangling: continue with the model's own first question as plain text,
 * or drop the announcement when there is nothing to ask.
 */
export function resolveQuestionLead(text: string, question?: string): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return text;
  const sentences = trimmed.split(/(?<=[.!?:])\s+/);
  const last = sentences[sentences.length - 1];
  if (!QUESTION_LEAD.test(last)) return text;
  const rest = sentences.slice(0, -1);
  const q = question?.trim();
  if (q) return [...rest, q].join(" ");
  return rest.length ? rest.join(" ") : text;
}

export function orchestrateAssistantTurn(
  message: AssistantMessage,
  plan: ChatOrchestrationPlan,
  history: Message[] = [],
): AssistantMessage {
  const next: AssistantMessage = { ...message };
  const repeatedUi = next.ui && history.some((item) => item.role === "assistant" && item.ui && uiIdentity(item.ui) === uiIdentity(next.ui!));
  if (next.ui && (!uiAllowedForPlan(next.ui, plan) || repeatedUi)) next.ui = undefined;

  if (plan.primary === "closing") {
    // Kill switch: no new questions, topics or components. The only valid answer is a short confirmation.
    const lang = detectMessageLanguage(`${message.text} ${plan.targetClaim ?? ""}`, "es");
    const askedAgain = /[?¿]/.test(next.text ?? "") || !next.text?.trim();
    next.text = askedAgain
      ? (lang === "en"
        ? "Perfect, I have everything I need. I will now generate your project board."
        : "Perfecto, tengo toda la información. Procedo a generar el tablero de tu proyecto.")
      : next.text;
    next.ui = undefined;
    next.dimensions = undefined;
    next.discoveryQuestions = [];
    next.readyForStructuring = true;
    next.action = "ready";
    return next;
  }

  if (plan.primary === "question") {
    next.ui = undefined;
    next.dimensions = undefined;
    next.readyForStructuring = false;
    const firstQuestion = next.discoveryQuestions?.[0];
    next.discoveryQuestions = firstQuestion ? [firstQuestion] : [];
    next.action = firstQuestion ? "questionnaire" : "chat";
    if (!firstQuestion) next.text = resolveQuestionLead(next.text);
  } else {
    next.text = resolveQuestionLead(next.text, next.discoveryQuestions?.[0]?.question);
    next.discoveryQuestions = [];
    next.dimensions = undefined;
    next.readyForStructuring = false;
    next.action = "chat";
  }

  return next;
}

export function selectPerspectivesForTurn(
  perspectives: PerspectiveEvaluation[] = [],
  plan: ChatOrchestrationPlan,
): PerspectiveEvaluation[] {
  if (plan.primary !== "perspectives") return [];
  const requested = new Set(plan.requestedPerspectiveIds);
  return perspectives.filter((item) => requested.has(item.perspectiveId) && item.explorationStatus !== "dismissed" && item.explorationStatus !== "not_relevant");
}

export function canonicalizeMessageHistory(messages: Message[] = []): Message[] {
  const output: Message[] = [];
  const ids = new Set<string>();
  const userEvents = new Set<string>();
  const assistantRequests = new Map<string, number>();

  for (const message of messages) {
    if (ids.has(message.id)) continue;
    ids.add(message.id);
    if (message.role === "user") {
      if (message.eventId && userEvents.has(message.eventId)) continue;
      if (message.eventId) userEvents.add(message.eventId);
      output.push(message);
      continue;
    }
    const requestKey = message.requestId ?? message.replyTo;
    if (requestKey && assistantRequests.has(requestKey)) {
      output[assistantRequests.get(requestKey)!] = message;
      continue;
    }
    if (requestKey) assistantRequests.set(requestKey, output.length);
    output.push(message);
  }
  return output;
}

export function appendUserMessageOnce(messages: Message[], message: UserMessage): Message[] {
  return canonicalizeMessageHistory([...messages, message]);
}

export function upsertAssistantTurn(messages: Message[], message: AssistantMessage): Message[] {
  const withoutPrevious = messages.filter((item) => item.id !== message.id && !(item.role === "assistant" && message.replyTo && (item.replyTo === message.replyTo || item.requestId === message.replyTo)));
  return canonicalizeMessageHistory([...withoutPrevious, message]);
}
