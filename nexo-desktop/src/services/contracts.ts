/**
 * Service contracts.
 * Components and hooks depend on these interfaces only. The preview
 * build wires mock implementations in `./index.ts`; a backend build
 * swaps them for HTTP implementations without touching the UI.
 */
import type {
  AIResponse,
  ConceptMap,
  GeneratedDocument,
  Language,
  Message,
  NewProjectInput,
  Project,
  User,
  Workspace,
} from "../domain/types";

export interface AuthService {
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
}

export interface ProjectService {
  list(lang: Language): Promise<Project[]>;
  create(input: NewProjectInput): Promise<Project>;
}

export interface WorkspaceService {
  /** Resolves `null` when the project does not exist. */
  load(projectId: string, lang: Language): Promise<Workspace | null>;
  save(projectId: string, map: ConceptMap, messages: Message[]): void;
}

export interface AIReplyRequest {
  text: string;
  map: ConceptMap;
  lang: Language;
  replyTo: string;
}

export interface AIService {
  reply(request: AIReplyRequest): Promise<AIResponse>;
}

export interface DocumentService {
  generate(projectId: string, projectName: string, lang: Language): Promise<GeneratedDocument>;
}

export interface Services {
  auth: AuthService;
  projects: ProjectService;
  workspace: WorkspaceService;
  ai: AIService;
  documents: DocumentService;
}
