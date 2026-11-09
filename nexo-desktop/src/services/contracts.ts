/**
 * Service contracts.
 * Components and hooks depend on these interfaces only. The preview
 * build wires mock implementations in `./index.ts`; a backend build
 * swaps them for HTTP implementations without touching the UI.
 */
import type {
  AIResponse,
  ChatPhase,
  ConceptMap,
  GeneratedDocument,
  Language,
  Message,
  NewProjectInput,
  Folder,
  Project,
  User,
  Workspace,
  DiscoveryState,
} from "../domain/types";

export interface AuthService {
  signIn(email: string, password: string): Promise<User>;
  signUp(name: string, email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
}

export interface ProjectService {
  list(lang: Language, folderId?: string): Promise<Project[]>;
  create(input: NewProjectInput): Promise<Project>;
  update?(id: string, updates: Partial<Project>): Promise<Project>;
  delete?(id: string): Promise<void>;
}

export interface FolderService {
  list(): Promise<Folder[]>;
  create(name: string, color?: string): Promise<Folder>;
  rename(id: string, name: string): Promise<Folder>;
  delete(id: string): Promise<void>;
  moveProject(projectId: string, folderId: string | null): Promise<Project>;
}

export interface WorkspaceService {
  /** Resolves `null` when the project does not exist. */
  load(projectId: string, lang: Language): Promise<Workspace | null>;
  save(projectId: string, map: ConceptMap, messages: Message[], discovery?: DiscoveryState): Promise<void>;
}

export interface AIReplyRequest {
  text: string;
  map: ConceptMap;
  lang: Language;
  replyTo: string;
  chatPhase?: ChatPhase;
  messageHistory?: Message[];
}

export interface AITutorRequest {
  messageText: string;
  conceptTitle?: string;
  conceptDescription?: string;
  lang: Language;
}

export interface AIService {
  reply(request: AIReplyRequest): Promise<AIResponse>;
  explain(request: AITutorRequest): Promise<string>;
}

export interface DocumentService {
  generate(projectId: string, projectName: string, lang: Language): Promise<GeneratedDocument>;
}

export interface Services {
  auth: AuthService;
  projects: ProjectService;
  folders: FolderService;
  workspace: WorkspaceService;
  ai: AIService;
  documents: DocumentService;
}
