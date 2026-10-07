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

/** The three semantic kinds a concept can have on the map. */
export type ConceptKind = "concept" | "viability" | "risk";
export type ConceptStatus = "confirmed" | "exploring" | "review";

export interface ConceptNode {
  id: string;
  kind: ConceptKind;
  title: string;
  description: string;
  /** Short supporting fact, e.g. "3 sources" or "Score 72/100". */
  metadata: string;
  status: ConceptStatus;
  x: number;
  y: number;
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
