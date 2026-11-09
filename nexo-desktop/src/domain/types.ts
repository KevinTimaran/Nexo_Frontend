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
  semanticKey?: string;
  origin?: "ai_initial" | "ai_expansion" | "user" | "approved";
  definitionVersion?: string;
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
export type StrategicDimension = "economic" | "social" | "technical" | "legal";

export interface DiscoveryQuestion {
  id: string;
  question: string;
  options: string[];
  type?: QuestionnaireSelectionType;
  allowCustom?: boolean;
}

export type AICardType = "idea" | "explanation" | "recommendation" | "warning";

export type GenerativeUIType = "timeline" | "decision_comparator" | "idea_cards";

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
  | IdeaCardsUIBlock;

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
}

export type ProjectArchetype = "business" | "research" | "software" | "creative" | "operational" | "general";
export interface ProjectFact {
  key: string;
  value: string;
  status: "confirmed" | "unconfirmed" | "unknown";
  sourceMessageIds: string[];
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
