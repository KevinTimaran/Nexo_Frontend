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

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  icon: ProjectIcon;
  /** ISO 8601 timestamp */
  updatedAt: string;
  nodeCount: number;
}

export interface NewProjectInput {
  name: string;
  description: string;
}

export type CanvasMode = "notion" | "obsidian";

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
  description: string;
  /** Short supporting fact, e.g. "3 sources" or "Score 72/100". */
  metadata: string;
  status: ConceptStatus;
  x: number;
  y: number;
  /** Research phase to organize and color-code the node */
  phase?: ResearchPhase;
  /** Long-form markdown or structured text for deep-dive document view */
  details?: string;
  tags?: string[];
}

export interface ConceptRelation {
  id: string;
  from: string;
  to: string;
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
}

export interface AssistantMessage extends BaseMessage {
  role: "assistant";
  insight?: Insight;
  /** The user message this answers; used for Retry. */
  replyTo?: string;
  /** Presentation card type for distinct AI responses */
  cardType?: "idea" | "explanation" | "recommendation";
  /** Simplified contextual explanation in Spanish when requested */
  simplifiedExplanation?: string;
  /** Whether the simplified explanation is toggled open */
  showExplanation?: boolean;
  /** Whether a tutor explanation is currently being generated */
  isExplaining?: boolean;
  /** Error occurred while generating explanation, if any */
  explanationError?: string | null;
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

export interface AIResponse {
  message: AssistantMessage;
  newNodes: ConceptNode[];
  newRelations: ConceptRelation[];
}

export interface Workspace {
  project: Project;
  map: ConceptMap;
  messages: Message[];
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
