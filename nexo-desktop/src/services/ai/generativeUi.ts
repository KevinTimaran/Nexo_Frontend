import type {
  ActionableIdea,
  DecisionCriterion,
  DecisionOption,
  GenerativeUIBlock,
  NodeCategory,
  NodePriority,
  ResearchPhase,
  TimelineItem,
} from "../../domain/types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const asText = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const asStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};

const safeId = (value: unknown, prefix: string, index: number): string => {
  const candidate = asText(value);
  return candidate || `${prefix}-${index + 1}`;
};

const normalizeTimeline = (raw: UnknownRecord): GenerativeUIBlock | undefined => {
  if (!Array.isArray(raw.items)) return undefined;

  const items: TimelineItem[] = raw.items
    .map((value, index): TimelineItem | null => {
      const item = asRecord(value);
      if (!item) return null;
      const title = asText(item.title);
      if (!title) return null;
      const status = item.status === "done" || item.status === "in_progress" ? item.status : "planned";
      return {
        id: safeId(item.id, "phase", index),
        title,
        description: asText(item.description) || undefined,
        startDate: asText(item.startDate, asText(item.start, "")),
        endDate: asText(item.endDate, asText(item.end, "")),
        dependencies: asStringList(item.dependencies),
        milestone: Boolean(item.milestone),
        status,
      };
    })
    .filter((item): item is TimelineItem => item !== null)
    .slice(0, 12);

  if (items.length === 0) return undefined;
  return {
    type: "timeline",
    title: asText(raw.title, "Hoja de ruta"),
    description: asText(raw.description) || undefined,
    items,
  };
};

const normalizeComparator = (raw: UnknownRecord): GenerativeUIBlock | undefined => {
  if (!Array.isArray(raw.criteria) || !Array.isArray(raw.options)) return undefined;

  const criteria: DecisionCriterion[] = raw.criteria
    .map((value, index): DecisionCriterion | null => {
      const criterion = asRecord(value);
      if (!criterion) return null;
      const label = asText(criterion.label);
      if (!label) return null;
      return {
        id: safeId(criterion.id, "criterion", index),
        label,
        weight: clamp(criterion.weight, 1, 10, 5),
      };
    })
    .filter((criterion): criterion is DecisionCriterion => criterion !== null)
    .slice(0, 6);

  const options: DecisionOption[] = raw.options
    .map((value, index): DecisionOption | null => {
      const option = asRecord(value);
      if (!option) return null;
      const title = asText(option.title);
      if (!title) return null;
      const rawScores = asRecord(option.scores) ?? {};
      const scores = Object.fromEntries(
        criteria.map((criterion) => [criterion.id, clamp(rawScores[criterion.id], 0, 10, 5)])
      );
      return {
        id: safeId(option.id, "option", index),
        title,
        description: asText(option.description) || undefined,
        scores,
      };
    })
    .filter((option): option is DecisionOption => option !== null)
    .slice(0, 6);

  if (criteria.length === 0 || options.length < 2) return undefined;
  const selectedOptionId = asText(raw.selectedOptionId);
  return {
    type: "decision_comparator",
    title: asText(raw.title, "Comparador de decisiones"),
    description: asText(raw.description) || undefined,
    criteria,
    options,
    selectedOptionId: options.some((option) => option.id === selectedOptionId)
      ? selectedOptionId
      : undefined,
  };
};

const normalizeIdeaCards = (raw: UnknownRecord): GenerativeUIBlock | undefined => {
  if (!Array.isArray(raw.items)) return undefined;
  const validCategories = new Set<NodeCategory>(["legal", "economic", "political", "technical"]);
  const validPriorities = new Set<NodePriority>(["high", "medium", "low"]);
  const validPhases = new Set<ResearchPhase>(["planning", "execution", "validation"]);

  const items: ActionableIdea[] = raw.items
    .map((value, index): ActionableIdea | null => {
      const item = asRecord(value);
      if (!item) return null;
      const title = asText(item.title);
      const description = asText(item.description);
      if (!title || !description) return null;
      const status =
        item.status === "approved" || item.status === "discarded" || item.status === "mapped"
          ? item.status
          : "pending";
      return {
        id: safeId(item.id, "idea", index),
        title,
        description,
        benefits: asStringList(item.benefits),
        resources: asStringList(item.resources),
        relations: asStringList(item.relations),
        status,
        category: validCategories.has(item.category as NodeCategory)
          ? (item.category as NodeCategory)
          : "technical",
        priority: validPriorities.has(item.priority as NodePriority)
          ? (item.priority as NodePriority)
          : "medium",
        phase: validPhases.has(item.phase as ResearchPhase)
          ? (item.phase as ResearchPhase)
          : "planning",
      };
    })
    .filter((item): item is ActionableIdea => item !== null)
    .slice(0, 8);

  if (items.length === 0) return undefined;
  return {
    type: "idea_cards",
    title: asText(raw.title, "Ideas accionables"),
    description: asText(raw.description) || undefined,
    items,
  };
};

export function normalizeGenerativeUIBlock(value: unknown): GenerativeUIBlock | undefined {
  const raw = asRecord(value);
  if (!raw) return undefined;
  if (raw.type === "timeline") return normalizeTimeline(raw);
  if (raw.type === "decision_comparator") return normalizeComparator(raw);
  if (raw.type === "idea_cards") return normalizeIdeaCards(raw);
  return undefined;
}

