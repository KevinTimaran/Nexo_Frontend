/**
 * Nexo domain models.
 * These are the shapes the UI consumes. Mock services produce them today;
 * HTTP-backed services will produce the same shapes later.
 */

export type Language = "en" | "es";
export type ThemeMode = "light" | "dark" | "system";

export interface User {
  id: string;
  name: string;
  email: string;
}

export type ProjectStatus = "active" | "draft" | "archived";
export type ProjectIcon = "lightbulb" | "leaf" | "scale" | "rocket" | "book" | "compass";

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  icon: ProjectIcon;
  /** ISO 8601 timestamp */
  updatedAt: string;
  nodeCount: number;
  folderId?: string | null;
}

export interface NewProjectInput {
  name: string;
  description: string;
  icon?: ProjectIcon;
  folderId?: string | null;
}

export type CanvasMode = "notion" | "discovery" | "obsidian" | "spatial";

/**
 * Domain-specific thematic category for research and concept analysis.
 * Explicitly mapped to semantic design tokens.
 */
export type NodeCategory = "legal" | "economic" | "political" | "technical";

/**
 * Strict priority levels for concepts and actionable insights.
 */
export type NodePriority = "high" | "medium" | "low";

/**
 * The three distinct research phases for visualizing concept evolution:
 * - planning (emerald): initial scoping, framing, hypothesis.
 * - execution (blue): implementation, architecture, logistics.
 * - validation (amber): testing, risks, viability metrics.
 */
export type ResearchPhase = "planning" | "execution" | "validation";

/** The three semantic kinds a concept can have on the map. */
export type ConceptKind = "concept" | "viability" | "risk";
export type ConceptStatus = "confirmed" | "exploring" | "review";
export type RelationSemanticType = "related_to" | "supports" | "affects" | "depends_on" | "contradicts" | "validates" | "enables" | "requires" | "impacts" | "solves" | "threatens" | "regulates" | "funds";

export interface ConceptNodeLayout {
  board2d?: { x: number; y: number };
  neural3d?: { x?: number; y?: number; z?: number };
}

export interface ConceptNode {
  id: string;
  kind: ConceptKind;
  category?: NodeCategory;
  priority?: NodePriority;
  title: string;
  /** 3D spatial label alias for title */
  name?: string;
  description: string;
  /** 3D spatial summary alias for description */
  desc?: string;
  /** Short supporting fact, e.g. "3 sources" or "Score 72/100". */
  metadata: string;
  status: ConceptStatus;
  x: number;
  y: number;
  z?: number;
  /** Research phase to organize and color-code the node */
  phase?: ResearchPhase;
  /** Long-form markdown or structured text for deep-dive document view (single source of truth) */
  details?: string;
  tags?: string[];
  relevanceScore?: number;

  // 3D Spatial Physical & Particle Attributes
  group?: string;
  val?: number;        // Relative orb radius (1..25)
  importance?: number; // 0..1; >0.6 emits PointLight in 3D
  semanticKey?: string;
  origin?: "ai_initial" | "ai_expansion" | "user" | "approved";
  verification?: "confirmed" | "unconfirmed" | "unknown";
  sourceFactIds?: string[];
  definitionVersion?: string;
  manuallyEditedFields?: string[];
  /** Semantic provenance copied from canonical Phase 1 memory when available. */
  semanticKind?: ProjectMemoryKind;
  semanticState?: ProjectMemoryState;
  provenanceOrigin?: ProjectMemoryOrigin;
  /** Canonical analytical lens when the node was created from a perspective-aware insight. */
  perspectiveId?: PerspectiveId;
  /** Existing cognitive-assistance type, retained when a chat insight becomes a graph node. */
  cognitiveMode?: CognitiveAssistanceMode;
  /** Evidence result used to derive visual status without persisting computed colors. */
  evidenceValidationState?: EvidenceValidationState;
  /** Context-validation result used to derive visual status without persisting computed colors. */
  contextValidationStatus?: ValidationStatus;
  sourceMessageIds?: string[];
  /** New layout fields are separate; x/y/z remain readable legacy aliases. */
  layout?: ConceptNodeLayout;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConceptRelation {
  id: string;
  from: string;
  to: string;
  /** 3D spatial alias for from */
  source?: string;
  /** 3D spatial alias for to */
  target?: string;
  /** Relationship strength (1..5, drives directional particle count in 3D) */
  value?: number;
  label?: string;
  type?: string;
  semanticType?: RelationSemanticType;
  semanticKey?: string;
  origin?: "ai_initial" | "ai_expansion" | "user" | "approved";
  definitionVersion?: string;
  sourceFactIds?: string[];
  sourceMessageIds?: string[];
  manuallyEditedFields?: string[];
}

export interface ConceptMap {
  nodes: ConceptNode[];
  relations: ConceptRelation[];
}

export interface InsightItem {
  nodeId: string;
  kind: ConceptKind;
  label: string;
}

export interface Insight {
  title: string;
  items: InsightItem[];
}

interface BaseMessage {
  id: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  text: string;
}

export interface UserMessage extends BaseMessage {
  role: "user";
  eventId?: string;
  questionnaireId?: string;
  answers?: Record<string, string | string[]>;
}

export type ChatPhase = "PHASE_1_DISCOVERY" | "PHASE_2_STRUCTURING" | "PHASE_3_EXPANSION";

export type QuestionnaireSelectionType = "single" | "multiple";
/** @deprecated Kept only so legacy chat payloads remain readable. */
export type StrategicDimension = "economic" | "social" | "technical" | "legal";

export type PerspectiveId =
  | "economic"
  | "human"
  | "political"
  | "legal"
  | "ethical"
  | "technical"
  | "geographic"
  | "environmental"
  | "historical"
  | "market"
  | "cultural"
  | "operational"
  | "educational"
  | "institutional"
  | "methodological"
  | "privacy"
  | "accessibility";

export type PerspectiveRelevance = "relevant" | "potentially_relevant" | "unexplored" | "not_applicable";
export type PerspectiveExplorationStatus = "suggested" | "explored" | "dismissed" | "not_relevant";
export type PerspectiveSource = "deterministic" | "ai_assisted";

export interface PerspectiveEvaluation {
  perspectiveId: PerspectiveId;
  label: string;
  relevance: PerspectiveRelevance;
  rationale: string;
  focus: string;
  linkedFactIds: string[];
  linkedNodeIds: string[];
  explorationStatus: PerspectiveExplorationStatus;
  evaluationVersion: string;
  source: PerspectiveSource;
  rank: number;
  actionIds?: string[];
  relevanceBeforeDismissal?: Exclude<PerspectiveRelevance, "not_applicable">;
}

export interface PerspectiveProposal {
  perspectiveId: PerspectiveId;
  relevance: Exclude<PerspectiveRelevance, "not_applicable">;
  rationale: string;
  linkedFactIds?: string[];
  linkedNodeIds?: string[];
}

export interface PerspectiveActionEvent {
  type: "explore" | "dismiss" | "mark_not_relevant" | "restore";
  perspectiveId: PerspectiveId;
  actionId: string;
}

export interface DiscoveryQuestion {
  id: string;
  question: string;
  options: string[];
  type?: QuestionnaireSelectionType;
  allowCustom?: boolean;
}

export type AICardType = "idea" | "explanation" | "recommendation" | "warning";

export type GenerativeUIType =
  | "timeline"
  | "decision_comparator"
  | "idea_cards"
  | "cognitive_insight"
  | "evidence_card"
  | "research_summary"
  | "validation_summary";

/* ----------------------- Phase 5: Research & Evidence Types ----------------------- */

export type EvidenceSourceType =
  | "academic_paper"
  | "government_statistic"
  | "official_regulation"
  | "institutional_report"
  | "industry_report"
  | "news_media"
  | "web_article"
  | "other";

export type EvidenceValidationState =
  | "supports"
  | "challenges"
  | "mixed"
  | "insufficient_evidence";

export type ResearchScope =
  | "national"
  | "local"
  | "regional"
  | "international"
  | "academic"
  | "general";

export interface NormalizedSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  author?: string;
  organization?: string;
  publicationDate?: string;
  retrievedAt: string;
  sourceType: EvidenceSourceType;
  trustScore: number; // 0 - 100
  trustRationale: string;
  isPeerReviewed?: boolean;
  isPrimarySource?: boolean;
  rawExcerpt: string;
  sanitizedExcerpt: string;
}

export interface EvidenceRecord {
  id: string;
  query: string;
  source: NormalizedSource;
  claimAddressed: string;
  hypothesesLinkedIds: string[];
  validationState: EvidenceValidationState;
  aiInterpretation: string;
  scope: ResearchScope;
  limitations?: string;
  localContextWarning?: string;
  retrievedAt: string;
  status: "suggested" | "accepted" | "discarded" | "mapped";
  suggestedNextSteps?: string[];
}

export interface ResearchIntent {
  id: string;
  query: string;
  targetHypothesisId?: string;
  targetPerspectiveId?: PerspectiveId;
  rationale: string;
  preferredSourceTypes?: EvidenceSourceType[];
  geographicScope?: ResearchScope;
  status: "idle" | "in_progress" | "completed" | "failed";
}

export interface EvidenceCardUIBlock {
  type: "evidence_card";
  id: string;
  version: 1;
  evidence: EvidenceRecord;
  actionIds: string[];
}

export interface ResearchSummaryUIBlock {
  type: "research_summary";
  id: string;
  version: 1;
  query: string;
  overallSynthesis: string;
  validationState: EvidenceValidationState;
  records: EvidenceRecord[];
  insufficientEvidenceReason?: string;
  suggestedEmpiricalSteps?: string[];
  actionIds: string[];
}

export interface ResearchActionEvent {
  type: "investigate" | "open_source" | "save_to_project" | "link_hypothesis" | "discard" | "map";
  evidenceId?: string;
  intentId?: string;
  actionId: string;
  hypothesisId?: string;
}

/* ----------------------- Phase 6: Historical & Context Validation Types ----------------------- */

export type ValidationStatus =
  | "supported"
  | "partially_supported"
  | "challenged"
  | "mixed"
  | "insufficient_evidence"
  | "not_applicable";

export type EvidenceRelationType =
  | "supports"
  | "challenges"
  | "contextualizes"
  | "inconclusive";

export interface ValidationEvidenceLink {
  evidenceId: string;
  sourceId: string;
  relationType: EvidenceRelationType;
  rationale: string;
}

export interface ValidationScope {
  geographic: string;
  geographicMismatch?: boolean;
  geographicWarning?: string;
  temporal: {
    earliestYear?: number;
    latestYear?: number;
    isRecent: boolean;
    temporalWarning?: string;
    timeRangeDescription?: string;
  };
  population?: string;
  populationMismatch?: boolean;
  populationWarning?: string;
}

export interface ValidationTrend {
  hasComparableDataPoints: boolean;
  direction?: "increasing" | "decreasing" | "stable" | "inconclusive";
  dataPointsCount: number;
  explanation: string;
}

export interface PreviousSolution {
  solution: string;
  context: string;
  outcome: string;
  limitations: string;
  keyDifferenceFromTarget?: string;
}

export interface ContextValidationRecord {
  id: string;
  targetSemanticId: string;
  targetClaim: string;
  targetKind: "hypothesis" | "problem" | "assumption" | "opportunity" | "risk" | "claim";
  validationStatus: ValidationStatus;
  scope: ValidationScope;
  supportingEvidenceIds: string[];
  challengingEvidenceIds: string[];
  contextualEvidenceIds: string[];
  evidenceLinks: ValidationEvidenceLink[];
  alternativeExplanations?: string[];
  previousSolutions?: PreviousSolution[];
  trendAnalysis?: ValidationTrend;
  unresolvedQuestions: string[];
  synthesis: string;
  limitations: string[];
  evidenceConfidence: "high" | "medium" | "low" | "insufficient";
  createdAt: string;
  updatedAt: string;
  evaluationVersion: string;
  status: "active" | "archived" | "mapped";
}

export interface ValidationSummaryUIBlock {
  type: "validation_summary";
  id: string;
  version: 1;
  validation: ContextValidationRecord;
  actionIds: string[];
}

export interface ValidationActionEvent {
  type: "view_evidence" | "investigate_further" | "keep_hypothesis" | "update_assumption" | "map_to_canvas" | "dismiss";
  validationId: string;
  actionId: string;
  targetSemanticId?: string;
}

export type CognitiveAssistanceMode =
  | "explanation"
  | "blind_spot"
  | "suggestion"
  | "solution"
  | "risk"
  | "opportunity"
  | "contradiction"
  | "alternative"
  | "hypothesis"
  | "validation_strategy"
  | "comparison"
  | "question";

export type CognitiveProposalStatus = "proposed" | "modified" | "accepted" | "rejected" | "mapped";

export interface CognitiveInsightUIBlock {
  type: "cognitive_insight";
  id: string;
  version: 1;
  mode: CognitiveAssistanceMode;
  title: string;
  statement: string;
  rationale: string;
  whyItMatters?: string;
  nextAction?: string;
  mitigation?: string;
  validationOptions: string[];
  linkedFactIds: string[];
  linkedNodeIds: string[];
  perspectiveId?: PerspectiveId;
  status: CognitiveProposalStatus;
  explorationStatus: "idle" | "explored";
  modifiedFrom?: string;
  actionIds: string[];
}

export interface CognitiveActionEvent {
  type: "accept" | "reject" | "modify" | "explore" | "map";
  blockId: string;
  actionId: string;
  value?: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  dependencies: string[];
  milestone?: boolean;
  status: "planned" | "in_progress" | "done";
}

export interface TimelineUIBlock {
  type: "timeline";
  title: string;
  description?: string;
  items: TimelineItem[];
}

export interface DecisionCriterion {
  id: string;
  label: string;
  weight: number;
}

export interface DecisionOption {
  id: string;
  title: string;
  description?: string;
  scores: Record<string, number>;
}

export interface DecisionComparatorUIBlock {
  type: "decision_comparator";
  title: string;
  description?: string;
  criteria: DecisionCriterion[];
  options: DecisionOption[];
  selectedOptionId?: string;
}

export interface ActionableIdea {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  resources: string[];
  relations: string[];
  status: "pending" | "approved" | "discarded" | "mapped";
  category?: NodeCategory;
  priority?: NodePriority;
  phase?: ResearchPhase;
}

export interface IdeaCardsUIBlock {
  type: "idea_cards";
  title: string;
  description?: string;
  items: ActionableIdea[];
}

export type GenerativeUIBlock =
  | TimelineUIBlock
  | DecisionComparatorUIBlock
  | IdeaCardsUIBlock
  | CognitiveInsightUIBlock
  | EvidenceCardUIBlock
  | ResearchSummaryUIBlock
  | ValidationSummaryUIBlock;

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  requestId?: string;
  insight?: Insight;
  /** The user message this answers; used for Retry. */
  replyTo?: string;
  /** Presentation card type for distinct AI responses */
  cardType?: AICardType;
  /** Simplified contextual explanation in Spanish when requested */
  simplifiedExplanation?: string;
  /** Whether the simplified explanation is toggled open */
  showExplanation?: boolean;
  /** Whether a tutor explanation is currently being generated */
  isExplaining?: boolean;
  /** Error occurred while generating explanation, if any */
  explanationError?: string | null;
  /** Phase in which this message was generated */
  chatPhase?: ChatPhase;
  /** Primary assistance behavior selected for this turn. */
  assistanceMode?: CognitiveAssistanceMode;
  /** Socratic multiple-choice questions for Phase 1 Discovery */
  discoveryQuestions?: DiscoveryQuestion[];
  /** Strategic dimensions suggested by AI */
  dimensions?: StrategicDimension[];
  /** Whether the AI believes the idea core is solid enough to generate the base map */
  readyForStructuring?: boolean;
  /** Strict router action returned by AI in discovery phase */
  action?: "chat" | "questionnaire" | "ready" | "dimensions";
  /** Contextual interactive interface generated for this conversational turn. */
  ui?: GenerativeUIBlock;
  /** Actionable node candidate that can be mapped directly to canvas */
  actionableNode?: {
    title: string;
    description: string;
    kind: ConceptKind;
    category?: NodeCategory;
    priority?: NodePriority;
    phase: ResearchPhase;
    metadata?: string;
    details?: string;
  };
  /** Untrusted AI proposals. The application must validate before adding them to project memory. */
  memoryPatches?: MemoryPatch[];
}

export type Message = UserMessage | AssistantMessage;

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  options: string[];
  type?: QuestionnaireSelectionType;
  allowCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "assistant";
  content: string;
  type: "text" | "questionnaire" | "ready" | "dimensions";
  options?: string[];
  questions?: QuestionnaireQuestion[];
  dimensions?: StrategicDimension[];
  ui?: GenerativeUIBlock;
  memoryPatches?: MemoryPatch[];
  questionnaireId?: string;
}

export const INITIAL_DISCOVERY_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    type: "text",
    content: "¡Hola! Cuéntame, ¿qué tipo de proyecto o aplicación tienes en mente?",
  },
];

export interface AIResponse {
  message: AssistantMessage;
  newNodes: ConceptNode[];
  newRelations: ConceptRelation[];
  /** Optional, untrusted analytical-lens proposals. The application validates all references. */
  perspectiveProposals?: PerspectiveProposal[];
}

export type ProjectArchetype = "business" | "research" | "software" | "creative" | "operational" | "general";
export type ProjectMemoryKind = "user_fact" | "suggestion" | "hypothesis" | "unknown" | "decision_candidate" | "decision" | "evidence_placeholder" | "evidence" | "legacy_unknown";
export type ProjectMemoryState = "confirmed" | "proposed" | "accepted" | "rejected" | "unknown" | "modified" | "legacy_unknown";
export type ProjectMemoryOrigin = "user_message" | "questionnaire_answer" | "ai_suggestion" | "accepted_suggestion" | "decision_event" | "research_evidence" | "unknown";
export interface MemoryPatch {
  id: string;
  kind: "fact" | "hypothesis" | "unknown" | "suggestion" | "decision_candidate";
  key: string;
  value: string;
}
export interface ProjectFact {
  /** Domain key proposed by the model; `key` remains the stable persisted record ID. */
  semanticKey?: string;
  key: string;
  value: string;
  /** Compatibility field retained for existing discovery/readiness logic. */
  status: "confirmed" | "unconfirmed" | "unknown";
  sourceMessageIds: string[];
  /** Missing on old serialized workspaces; hydration assigns a safe legacy state. */
  kind?: ProjectMemoryKind;
  memoryState?: ProjectMemoryState;
  origin?: ProjectMemoryOrigin;
  sourceSuggestionId?: string;
  decisionEventId?: string;
  researchEvidenceId?: string;
  modifiedFrom?: string;
}
export interface DiscoveryState {
  lifecycle: "discovering" | "ready" | "generating" | "generated" | "generation_error" | "legacy_unknown";
  archetype: ProjectArchetype;
  facts: ProjectFact[];
  requiredTopics: Array<{ key: string; importance: "blocking" | "helpful" | "optional" }>;
  askedQuestionKeys: string[];
  answeredQuestionKeys: string[];
  candidateDefinitionVersion?: string;
  stableDefinitionVersion?: string;
  generatedDefinitionVersion?: string;
  completionAnchorMessageId?: string;
  generationLedger: Record<string, { status: "pending" | "applied" | "failed"; requestId: string }>;
  tombstones: string[];
  /** Additive Phase 3 state. Missing on legacy workspaces and never treated as project truth. */
  perspectives?: PerspectiveEvaluation[];
  perspectiveEvaluationVersion?: string;
  evidence?: EvidenceRecord[];
  researchIntents?: ResearchIntent[];
  validations?: ContextValidationRecord[];
}

export interface Workspace {
  project: Project;
  map: ConceptMap;
  messages: Message[];
  discovery?: DiscoveryState;
  revision?: number;
}

export interface GeneratedDocument {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
}

export interface Preferences {
  reduceMotion: boolean;
  desktopNotifications: boolean;
  sound: boolean;
}

/** Errors the UI knows how to explain. */
export type ServiceErrorCode = "offline" | "invalid-credentials" | "unknown";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  constructor(code: ServiceErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "ServiceError";
  }
}

/* ----------------------- Connectivity & Health Types ----------------------- */

export type BackendStatus = "connected" | "disconnected" | "checking" | "error" | "mock";
export type AIServiceStatus =
  | "ready"
  | "processing"
  | "waiting"
  | "unavailable"
  | "error"
  | "simulated";
export type Neo4jStatus =
  | "connected"
  | "synchronizing"
  | "synchronized"
  | "disconnected"
  | "error"
  | "not_configured"
  | "unknown";
export type ServiceMode = "mock" | "server";

export interface BackendHealthState {
  status: BackendStatus;
  mode: ServiceMode;
  apiUrl: string;
  lastChecked?: string;
  latencyMs?: number;
  errorMessage?: string;
}

export interface AIHealthState {
  status: AIServiceStatus;
  provider: string;
  lastActivity?: string;
  errorMessage?: string;
}

export interface Neo4jHealthState {
  status: Neo4jStatus;
  lastSync?: string;
  errorMessage?: string;
}

export interface SystemConnectivityState {
  backend: BackendHealthState;
  ai: AIHealthState;
  neo4j: Neo4jHealthState;
}
