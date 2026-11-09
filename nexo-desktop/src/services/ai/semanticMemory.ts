import type {
  AssistantMessage,
  MemoryPatch,
  ProjectFact,
  ProjectMemoryOrigin,
  ProjectMemoryState,
  Workspace,
} from "../../domain/types";

export type MemoryTransition =
  | { type: "accept_suggestion"; eventId: string }
  | { type: "accept_decision_candidate"; eventId: string }
  | { type: "reject_suggestion"; eventId: string }
  | { type: "reject_hypothesis"; eventId: string }
  | { type: "reject_decision_candidate"; eventId: string }
  | { type: "restore_suggestion"; eventId: string }
  | { type: "modify_suggestion"; eventId: string; value: string }
  | { type: "confirm_hypothesis"; eventId: string; messageId?: string }
  | { type: "resolve_unknown"; eventId: string; value: string; messageId: string };

export function normalizeAiMemoryPatches(raw: unknown): MemoryPatch[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<MemoryPatch["kind"]>(["fact", "hypothesis", "unknown", "suggestion", "decision_candidate"]);
  return raw.slice(0, 8).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const patch = item as Record<string, unknown>;
    const kind = typeof patch.kind === "string" && allowed.has(patch.kind as MemoryPatch["kind"]) ? patch.kind as MemoryPatch["kind"] : null;
    const id = typeof patch.id === "string" ? patch.id.trim().slice(0, 80) : `patch-${index + 1}`;
    const key = typeof patch.key === "string" ? patch.key.trim().slice(0, 100) : "";
    const value = typeof patch.value === "string" ? patch.value.trim().slice(0, 1000) : "";
    return kind && id && key && value ? [{ id, kind, key, value }] : [];
  });
}

const invalidTransition = (from: ProjectMemoryState | undefined, to: string): never => {
  throw new Error(`Invalid project memory transition: ${from ?? "legacy_unknown"} -> ${to}`);
};

/** Applies only explicit user actions; AI output cannot invoke this as confirmation. */
export function transitionMemoryFact(fact: ProjectFact, event: MemoryTransition): ProjectFact {
  const state = fact.memoryState ?? "legacy_unknown";
  if (fact.decisionEventId === event.eventId) return fact;
  const sourceMessageIds = [...new Set(fact.sourceMessageIds ?? [])];
  switch (event.type) {
    case "accept_suggestion":
      if (fact.kind !== "suggestion" || !["proposed", "modified"].includes(state)) return invalidTransition(state, "accepted");
      return { ...fact, status: "confirmed", memoryState: "accepted", origin: "accepted_suggestion", decisionEventId: event.eventId };
    case "accept_decision_candidate":
      if (fact.kind !== "decision_candidate" || state !== "proposed") return invalidTransition(state, "accepted");
      return { ...fact, kind: "decision", status: "confirmed", memoryState: "accepted", origin: "decision_event", decisionEventId: event.eventId };
    case "reject_suggestion":
      if (fact.kind !== "suggestion" || !["proposed", "modified"].includes(state)) return invalidTransition(state, "rejected");
      return { ...fact, status: "unconfirmed", memoryState: "rejected", decisionEventId: event.eventId };
    case "reject_hypothesis":
      if (fact.kind !== "hypothesis" || state !== "proposed") return invalidTransition(state, "rejected");
      return { ...fact, status: "unconfirmed", memoryState: "rejected", decisionEventId: event.eventId };
    case "reject_decision_candidate":
      if (fact.kind !== "decision_candidate" || state !== "proposed") return invalidTransition(state, "rejected");
      return { ...fact, status: "unconfirmed", memoryState: "rejected", decisionEventId: event.eventId };
    case "restore_suggestion":
      if (fact.kind !== "suggestion" || state !== "rejected") return invalidTransition(state, "proposed");
      return { ...fact, status: "unconfirmed", memoryState: "proposed", origin: "ai_suggestion", decisionEventId: event.eventId };
    case "modify_suggestion":
      if (fact.kind !== "suggestion" || !["proposed", "modified"].includes(state) || !event.value.trim()) return invalidTransition(state, "modified");
      return { ...fact, value: event.value, status: "unconfirmed", memoryState: "modified", modifiedFrom: fact.modifiedFrom ?? fact.value, decisionEventId: event.eventId };
    case "confirm_hypothesis":
      if (fact.kind !== "hypothesis" || state !== "proposed") return invalidTransition(state, "confirmed");
      if (event.messageId) sourceMessageIds.push(event.messageId);
      return { ...fact, status: "confirmed", memoryState: "confirmed", origin: event.messageId ? "user_message" : "decision_event", sourceMessageIds: [...new Set(sourceMessageIds)], decisionEventId: event.eventId };
    case "resolve_unknown":
      if (fact.kind !== "unknown" || state !== "unknown" || !event.value.trim()) return invalidTransition(state, "confirmed");
      sourceMessageIds.push(event.messageId);
      return { ...fact, value: event.value, kind: "user_fact", status: "confirmed", memoryState: "confirmed", origin: "user_message", sourceMessageIds: [...new Set(sourceMessageIds)], decisionEventId: event.eventId };
  }
}

export type MemoryAction = "accept" | "reject" | "modify" | "resolve" | "explore";

export function memoryPresentationForFact(fact: ProjectFact): { label: string; actions: MemoryAction[] } {
  if (fact.kind === "suggestion") {
    if (fact.memoryState === "rejected") return { label: "Rechazada", actions: [] };
    if (fact.memoryState === "accepted") return { label: "Sugerencia aceptada", actions: [] };
    return { label: fact.memoryState === "modified" ? "Sugerencia modificada" : "Sugerencia", actions: ["accept", "reject", "modify", "explore"] };
  }
  if (fact.kind === "hypothesis") {
    if (fact.memoryState === "rejected") return { label: "Hipótesis rechazada", actions: [] };
    if (fact.memoryState === "confirmed") return { label: "Hipótesis confirmada", actions: [] };
    return { label: "Hipótesis · por validar", actions: ["accept", "reject", "explore"] };
  }
  if (fact.kind === "decision_candidate") {
    if (fact.memoryState === "rejected") return { label: "Decisión propuesta · rechazada", actions: [] };
    return { label: "Decisión propuesta", actions: ["accept", "reject", "explore"] };
  }
  if (fact.kind === "decision") return { label: "Decisión", actions: [] };
  if (fact.kind === "unknown" && fact.memoryState === "unknown") return { label: "Por definir", actions: ["resolve", "explore"] };
  if (fact.kind === "user_fact" && fact.memoryState === "confirmed") return { label: "Confirmado por ti", actions: [] };
  return { label: "Significado por revisar", actions: [] };
}

const compatibilityStatus = (state: ProjectMemoryState): ProjectFact["status"] =>
  state === "confirmed" || state === "accepted" ? "confirmed" : state === "unknown" ? "unknown" : "unconfirmed";

/** Converts model proposals into unconfirmed memory records with stable turn-scoped keys. */
export function applyAiMemoryPatches(
  facts: ProjectFact[],
  patches: MemoryPatch[] | undefined,
  assistantMessageId: string,
  stableTurnId = assistantMessageId,
): ProjectFact[] {
  if (!patches?.length) return facts;
  const next = [...facts];
  for (const patch of patches) {
    const id = patch.id.trim();
    const keyPart = patch.key.trim();
    const value = patch.value.trim();
    if (!id || !keyPart || !value) continue;
    const key = `ai:${stableTurnId}:${id}`;
    if (next.some((fact) => fact.key === key)) continue;
    const kind: ProjectFact["kind"] = patch.kind === "fact" || patch.kind === "hypothesis"
      ? "hypothesis"
      : patch.kind;
    const memoryState: ProjectMemoryState = kind === "unknown" ? "unknown" : "proposed";
    next.push({
      key,
      semanticKey: keyPart,
      value,
      status: compatibilityStatus(memoryState),
      sourceMessageIds: [assistantMessageId],
      kind,
      memoryState,
      origin: "ai_suggestion",
    });
  }
  return next;
}

function assistantForFact(workspace: Workspace, fact: ProjectFact): AssistantMessage | undefined {
  const sourceId = fact.sourceMessageIds?.find((id) => workspace.messages.some((message) => message.id === id));
  const keyMessageId = fact.key.startsWith("suggestion:") ? fact.key.split(":")[1] : undefined;
  const message = workspace.messages.find((item) => item.role === "assistant" && (item.id === sourceId || item.id === keyMessageId));
  return message?.role === "assistant" ? message : undefined;
}

/** Idempotent additive migration. Unknown legacy meaning is preserved as legacy_unknown. */
export function hydrateWorkspaceMemory<T extends Workspace>(workspace: T): T {
  if (!workspace.discovery) return workspace;
  const facts = workspace.discovery.facts.map((fact) => {
    if (fact.kind && fact.memoryState && fact.origin) return fact;
    if (fact.key.startsWith("suggestion:")) {
      const message = assistantForFact(workspace, fact);
      const suggestionId = fact.key.split(":").slice(2).join(":");
      const idea = message?.ui?.type === "idea_cards" ? message.ui.items.find((item) => item.id === suggestionId) : undefined;
      if (idea) {
        const memoryState: ProjectMemoryState = idea.status === "discarded" ? "rejected" : idea.status === "approved" || idea.status === "mapped" ? "accepted" : "proposed";
        return { ...fact, kind: "suggestion" as const, memoryState, status: compatibilityStatus(memoryState), origin: memoryState === "accepted" ? "accepted_suggestion" as const : "ai_suggestion" as const, sourceSuggestionId: suggestionId };
      }
    }
    const userSource = fact.sourceMessageIds?.some((id) => workspace.messages.some((message) => message.id === id && message.role === "user"));
    if (userSource && (fact.status === "confirmed" || fact.status === "unknown")) {
      const kind = fact.status === "unknown" ? "unknown" as const : "user_fact" as const;
      return { ...fact, kind, memoryState: fact.status === "unknown" ? "unknown" as const : "confirmed" as const, origin: "user_message" as const };
    }
    return { ...fact, kind: "legacy_unknown" as const, memoryState: "legacy_unknown" as const, origin: "unknown" as const };
  });
  return { ...workspace, discovery: { ...workspace.discovery, facts } };
}

export function transitionDiscoveryFact<T extends { facts: ProjectFact[] }>(
  discovery: T,
  key: string,
  event: MemoryTransition,
): T {
  const index = discovery.facts.findIndex((fact) => fact.key === key);
  if (index < 0) throw new Error("Project memory item was not found");
  const facts = [...discovery.facts];
  facts[index] = transitionMemoryFact(facts[index], event);
  return { ...discovery, facts };
}

export function memoryOriginForUserMessage(hasAnswers: boolean): ProjectMemoryOrigin {
  return hasAnswers ? "questionnaire_answer" : "user_message";
}
