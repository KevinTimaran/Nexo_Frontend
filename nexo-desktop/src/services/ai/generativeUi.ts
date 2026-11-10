import type {
  ActionableIdea,
  CognitiveAssistanceMode,
  CognitiveInsightUIBlock,
  DecisionCriterion,
  DecisionOption,
  EvidenceCardUIBlock,
  EvidenceRecord,
  EvidenceValidationState,
  GenerativeUIBlock,
  NodeCategory,
  NodePriority,
  PerspectiveId,
  ResearchPhase,
  ResearchScope,
  ResearchSummaryUIBlock,
  TimelineItem,
  ValidationStatus,
  ValidationSummaryUIBlock,
  ContextValidationRecord,
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

const normalizeCognitiveInsight = (raw: UnknownRecord): CognitiveInsightUIBlock | undefined => {
  const allowedModes = new Set<CognitiveAssistanceMode>(["explanation", "blind_spot", "suggestion", "solution", "risk", "opportunity", "contradiction", "alternative", "hypothesis", "validation_strategy", "comparison", "question"]);
  const allowedPerspectives = new Set<PerspectiveId>(["economic", "human", "political", "legal", "ethical", "technical", "geographic", "environmental", "historical", "market", "cultural", "operational", "educational", "institutional", "methodological", "privacy", "accessibility"]);
  const mode = typeof raw.mode === "string" && allowedModes.has(raw.mode as CognitiveAssistanceMode) ? raw.mode as CognitiveAssistanceMode : null;
  const title = asText(raw.title).slice(0, 120);
  const statement = asText(raw.statement).slice(0, 1000);
  const rationale = asText(raw.rationale).slice(0, 1000);
  if (!mode || !title || !statement || !rationale) return undefined;
  const perspectiveId = typeof raw.perspectiveId === "string" && allowedPerspectives.has(raw.perspectiveId as PerspectiveId) ? raw.perspectiveId as PerspectiveId : undefined;
  return {
    type: "cognitive_insight",
    id: asText(raw.id).slice(0, 100) || `cognitive-${mode}`,
    version: 1,
    mode,
    title,
    statement,
    rationale,
    whyItMatters: asText(raw.whyItMatters).slice(0, 800) || undefined,
    nextAction: asText(raw.nextAction).slice(0, 500) || undefined,
    mitigation: asText(raw.mitigation).slice(0, 500) || undefined,
    validationOptions: asStringList(raw.validationOptions).slice(0, 4),
    linkedFactIds: asStringList(raw.linkedFactIds).slice(0, 8),
    linkedNodeIds: asStringList(raw.linkedNodeIds).slice(0, 8),
    perspectiveId,
    status: "proposed",
    explorationStatus: "idle",
    actionIds: [],
  };
};


const normalizeEvidenceRecord = (raw: unknown): EvidenceRecord | null => {
  const item = asRecord(raw);
  if (!item) return null;
  const src = asRecord(item.source);
  if (!src) return null;

  const validValidationStates = new Set<EvidenceValidationState>([
    "supports",
    "challenges",
    "mixed",
    "insufficient_evidence",
  ]);
  const validationState: EvidenceValidationState =
    typeof item.validationState === "string" && validValidationStates.has(item.validationState as EvidenceValidationState)
      ? (item.validationState as EvidenceValidationState)
      : "insufficient_evidence";

  const validScopes = new Set<ResearchScope>([
    "national",
    "local",
    "regional",
    "international",
    "academic",
    "general",
  ]);
  const scope: ResearchScope =
    typeof item.scope === "string" && validScopes.has(item.scope as ResearchScope)
      ? (item.scope as ResearchScope)
      : "general";

  return {
    id: asText(item.id, `ev-${Date.now()}`),
    query: asText(item.query, ""),
    source: {
      id: asText(src.id, "src-1"),
      title: asText(src.title, "Fuente externa"),
      url: asText(src.url, "https://nexo.local"),
      domain: asText(src.domain, "nexo.local"),
      author: asText(src.author) || undefined,
      organization: asText(src.organization) || undefined,
      publicationDate: asText(src.publicationDate) || undefined,
      retrievedAt: asText(src.retrievedAt, new Date().toISOString()),
      sourceType: (asText(src.sourceType, "web_article") as any),
      trustScore: clamp(src.trustScore, 0, 100, 50),
      trustRationale: asText(src.trustRationale, "Evaluación general"),
      isPeerReviewed: Boolean(src.isPeerReviewed),
      isPrimarySource: Boolean(src.isPrimarySource),
      rawExcerpt: asText(src.rawExcerpt),
      sanitizedExcerpt: asText(src.sanitizedExcerpt, asText(src.rawExcerpt)),
    },
    claimAddressed: asText(item.claimAddressed, "Afirmación analizada"),
    hypothesesLinkedIds: asStringList(item.hypothesesLinkedIds),
    validationState,
    aiInterpretation: asText(item.aiInterpretation, "Interpretación de evidencia"),
    scope,
    limitations: asText(item.limitations) || undefined,
    localContextWarning: asText(item.localContextWarning) || undefined,
    retrievedAt: asText(item.retrievedAt, new Date().toISOString()),
    status: (item.status === "accepted" || item.status === "discarded" || item.status === "mapped" ? item.status : "suggested"),
    suggestedNextSteps: asStringList(item.suggestedNextSteps),
  };
};

const normalizeEvidenceCard = (raw: UnknownRecord): EvidenceCardUIBlock | undefined => {
  const evidence = normalizeEvidenceRecord(raw.evidence);
  if (!evidence) return undefined;
  return {
    type: "evidence_card",
    id: asText(raw.id, `card-${evidence.id}`),
    version: 1,
    evidence,
    actionIds: asStringList(raw.actionIds),
  };
};

const normalizeResearchSummary = (raw: UnknownRecord): ResearchSummaryUIBlock | undefined => {
  const query = asText(raw.query);
  const overallSynthesis = asText(raw.overallSynthesis);
  if (!query && !overallSynthesis) return undefined;

  const validValidationStates = new Set<EvidenceValidationState>([
    "supports",
    "challenges",
    "mixed",
    "insufficient_evidence",
  ]);
  const validationState: EvidenceValidationState =
    typeof raw.validationState === "string" && validValidationStates.has(raw.validationState as EvidenceValidationState)
      ? (raw.validationState as EvidenceValidationState)
      : "insufficient_evidence";

  const rawRecords = Array.isArray(raw.records) ? raw.records : [];
  const records = rawRecords
    .map(normalizeEvidenceRecord)
    .filter((r): r is EvidenceRecord => r !== null);

  return {
    type: "research_summary",
    id: asText(raw.id, `summary-${Date.now()}`),
    version: 1,
    query,
    overallSynthesis,
    validationState,
    records,
    insufficientEvidenceReason: asText(raw.insufficientEvidenceReason) || undefined,
    suggestedEmpiricalSteps: asStringList(raw.suggestedEmpiricalSteps),
    actionIds: asStringList(raw.actionIds),
  };
};


const normalizeValidationSummary = (raw: UnknownRecord): ValidationSummaryUIBlock | undefined => {
  const val = asRecord(raw.validation);
  if (!val) return undefined;

  const validStatuses = new Set<ValidationStatus>([
    "supported",
    "partially_supported",
    "challenged",
    "mixed",
    "insufficient_evidence",
    "not_applicable",
  ]);
  const validationStatus: ValidationStatus =
    typeof val.validationStatus === "string" && validStatuses.has(val.validationStatus as ValidationStatus)
      ? (val.validationStatus as ValidationStatus)
      : "insufficient_evidence";

  const rawScope = asRecord(val.scope) || {};
  const rawTemporal = asRecord(rawScope.temporal) || {};

  const validation: ContextValidationRecord = {
    id: asText(val.id, `val-${Date.now()}`),
    targetSemanticId: asText(val.targetSemanticId, "target-1"),
    targetClaim: asText(val.targetClaim, "Afirmación evaluada"),
    targetKind: (asText(val.targetKind, "hypothesis") as any),
    validationStatus,
    scope: {
      geographic: asText(rawScope.geographic, "General"),
      geographicMismatch: Boolean(rawScope.geographicMismatch),
      geographicWarning: asText(rawScope.geographicWarning) || undefined,
      temporal: {
        earliestYear: typeof rawTemporal.earliestYear === "number" ? rawTemporal.earliestYear : undefined,
        latestYear: typeof rawTemporal.latestYear === "number" ? rawTemporal.latestYear : undefined,
        isRecent: Boolean(rawTemporal.isRecent),
        temporalWarning: asText(rawTemporal.temporalWarning) || undefined,
        timeRangeDescription: asText(rawTemporal.timeRangeDescription) || undefined,
      },
      population: asText(rawScope.population) || undefined,
      populationMismatch: Boolean(rawScope.populationMismatch),
      populationWarning: asText(rawScope.populationWarning) || undefined,
    },
    supportingEvidenceIds: asStringList(val.supportingEvidenceIds),
    challengingEvidenceIds: asStringList(val.challengingEvidenceIds),
    contextualEvidenceIds: asStringList(val.contextualEvidenceIds),
    evidenceLinks: Array.isArray(val.evidenceLinks) ? (val.evidenceLinks as any) : [],
    alternativeExplanations: asStringList(val.alternativeExplanations),
    previousSolutions: Array.isArray(val.previousSolutions) ? (val.previousSolutions as any) : undefined,
    trendAnalysis: asRecord(val.trendAnalysis) as any,
    unresolvedQuestions: asStringList(val.unresolvedQuestions),
    synthesis: asText(val.synthesis, "Síntesis de validación"),
    limitations: asStringList(val.limitations),
    evidenceConfidence: (asText(val.evidenceConfidence, "medium") as any),
    createdAt: asText(val.createdAt, new Date().toISOString()),
    updatedAt: asText(val.updatedAt, new Date().toISOString()),
    evaluationVersion: asText(val.evaluationVersion, "1.0"),
    status: (asText(val.status, "active") as any),
  };

  return {
    type: "validation_summary",
    id: asText(raw.id, `summary-${validation.id}`),
    version: 1,
    validation,
    actionIds: asStringList(raw.actionIds),
  };
};

export function normalizeGenerativeUIBlock(value: unknown): GenerativeUIBlock | undefined {
  const raw = asRecord(value);
  if (!raw) return undefined;
  if (raw.type === "timeline") return normalizeTimeline(raw);
  if (raw.type === "decision_comparator") return normalizeComparator(raw);
  if (raw.type === "idea_cards") return normalizeIdeaCards(raw);
  if (raw.type === "cognitive_insight") return normalizeCognitiveInsight(raw);
  if (raw.type === "evidence_card") return normalizeEvidenceCard(raw);
  if (raw.type === "research_summary") return normalizeResearchSummary(raw);
  if (raw.type === "validation_summary") return normalizeValidationSummary(raw);
  return undefined;
}

