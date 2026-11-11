/**
 * HTTP Client and Server Adapter for Nexo Desktop.
 * Communicates with the Java/Spring Boot backend REST API.
 * Adheres strictly to CONTRATO_API_NEXO.md.
 */
import { buildApiUrl } from "../../config/env";
import { isTauri } from "../../utils/platform";
import { getAccessToken, getSupabase, toUser } from "../supabase";
import {
  ServiceError,
  type AIResponse,
  type BackendStatus,
  type ConceptMap,
  type Folder,
  type GeneratedDocument,
  type Language,
  type Message,
  type Neo4jStatus,
  type NewProjectInput,
  type Project,
  type User,
  type Workspace,
  type DiscoveryState,
} from "../../domain/types";
import type {
  AIReplyRequest,
  AIService,
  AITutorRequest,
  AuthService,
  DocumentService,
  FolderService,
  ProjectService,
  ResearchSearchRequest,
  ResearchSearchResponse,
  ResearchService,
  Services,
  WorkspaceService,
} from "../contracts";

export const LOCAL_API_URL = "http://localhost:8080/api/v1";
// A build can point at a hosted API (VITE_API_URL); otherwise the local backend is the default.
export const DEFAULT_API_URL = buildApiUrl() ?? LOCAL_API_URL;
const API_URL_STORAGE_KEY = "nexo.api.url";

export function getStoredApiUrl(): string {
  try {
    const saved = localStorage.getItem(API_URL_STORAGE_KEY);
    // A hosted build must not stay stuck on a localhost URL saved by an older version.
    const staleLocal = Boolean(buildApiUrl()) && Boolean(saved) && /\/\/(localhost|127\.0\.0\.1)[:/]/.test(saved ?? "");
    if (!saved || saved.includes(":8000") || staleLocal) {
      // Migración automática: puerto estándar de Spring Boot es 8080
      localStorage.setItem(API_URL_STORAGE_KEY, DEFAULT_API_URL);
      return DEFAULT_API_URL;
    }
    return saved;
  } catch {
    return DEFAULT_API_URL;
  }
}

export function setStoredApiUrl(url: string): void {
  try {
    localStorage.setItem(API_URL_STORAGE_KEY, url);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export interface HealthCheckResult {
  connected: boolean;
  status: BackendStatus;
  latencyMs: number;
  neo4jStatus: Neo4jStatus;
  errorMessage?: string;
  timestamp: string;
}

/**
 * Performs a real health check against the configured backend URL.
 * Applies a strict timeout and checks ports 8080 / 8000 automatically.
 */
export async function checkBackendHealth(apiUrl: string, timeoutMs = buildApiUrl() ? 20000 : 3000): Promise<HealthCheckResult> {
  const start = performance.now();
  const timestamp = new Date().toISOString();

  // Normalize baseUrl candidates: check primary URL, plus port 8080/8000 fallback
  const cleanUrl = apiUrl.trim().replace(/\/+$/, "");
  const candidates = [cleanUrl];
  if (cleanUrl.includes(":8000")) {
    candidates.push(cleanUrl.replace(":8000", ":8080"));
  } else if (cleanUrl.includes(":8080")) {
    candidates.push(cleanUrl.replace(":8080", ":8000"));
  }

  let lastError = `Servidor inaccesible en ${cleanUrl}.`;

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const healthUrl = `${candidate}/health`;

    try {
      const res = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        // If candidate succeeded on 8080 instead of 8000, save the working URL
        if (candidate !== cleanUrl) {
          setStoredApiUrl(candidate);
        }

        let neo4jStatus: Neo4jStatus = "unknown";
        try {
          const body = await res.json();
          if (body?.components?.neo4j?.status === "NOT_CONFIGURED" || body?.neo4j === "NOT_CONFIGURED") {
            neo4jStatus = "not_configured";
          } else if (body?.components?.neo4j?.status === "UP" || body?.neo4j === "UP" || body?.neo4j === "connected") {
            neo4jStatus = "connected";
          } else if (body?.neo4j === "error" || body?.components?.neo4j?.status === "DOWN") {
            neo4jStatus = "error";
          }
        } catch {
          // Response wasn't json, but server is alive
        }

        return {
          connected: true,
          status: "connected",
          latencyMs,
          neo4jStatus,
          timestamp,
        };
      } else {
        // Check if response is from Spring Boot itself (even if 404 on missing routes)
        let isSpringBoot = false;
        try {
          const body = await res.json();
          if (body?.status || body?.error || body?.timestamp) {
            isSpringBoot = true;
          }
        } catch {
          // not json
        }

        if (isSpringBoot) {
          if (candidate !== cleanUrl) {
            setStoredApiUrl(candidate);
          }
          return {
            connected: true,
            status: "connected",
            latencyMs,
            neo4jStatus: "unknown",
            errorMessage: undefined,
            timestamp,
          };
        }

        lastError = `Respuesta HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      lastError = isTimeout
        ? `Tiempo de espera agotado tras ${timeoutMs}ms al conectar a ${candidate}`
        : `Servidor inaccesible en ${candidate}. Verifica que el backend Spring Boot esté ejecutándose.`;
    }
  }

  const latencyMs = Math.round(performance.now() - start);
  return {
    connected: false,
    status: "disconnected",
    latencyMs,
    neo4jStatus: "disconnected",
    errorMessage: lastError,
    timestamp,
  };
}

/* ----------------- Real HTTP API Service Implementation ----------------- */

async function httpFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getStoredApiUrl().replace(/\/+$/, "");
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  // Free hosting can take a while to wake up after being idle.
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const token = await getAccessToken();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Platform": isTauri() ? "tauri-desktop" : "web",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        if (token && typeof window !== "undefined") window.dispatchEvent(new Event("nexo:session-expired"));
        throw new ServiceError("invalid-credentials", token ? "Tu sesión expiró. Inicia sesión de nuevo." : "Credenciales inválidas.");
      }
      let errorMsg = `Error del servidor HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData?.error === "string") {
          errorMsg = errorData.error;
        } else if (errorData?.error?.message) {
          errorMsg = errorData.error.message;
        } else if (typeof errorData?.message === "string") {
          errorMsg = errorData.message;
        }
      } catch {
        // Fallback to status text
      }
      throw new ServiceError("unknown", errorMsg);
    }

    return (await response.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ServiceError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ServiceError("offline", `Tiempo de espera agotado al conectar con el servidor en ${baseUrl}.`);
    }
    throw new ServiceError("offline", `No se pudo conectar con el servidor en ${baseUrl}.`);
  }
}

export const httpAuth: AuthService = {
  async signIn(email: string, password: string): Promise<User> {
    const supabase = getSupabase();
    if (!supabase) return localUser(email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new ServiceError("invalid-credentials", error?.message ?? "Credenciales inválidas.");
    return toUser(data.user);
  },
  async signUp(name: string, email: string, password: string): Promise<User> {
    const supabase = getSupabase();
    if (!supabase) return localUser(email, name);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw new ServiceError("unknown", error.message);
    // With email confirmation enabled Supabase creates the account but returns no session yet.
    if (!data.session || !data.user) throw new ServiceError("email-confirmation", "Revisa tu correo para confirmar la cuenta.");
    return toUser(data.user);
  },
  async signOut(): Promise<void> {
    try {
      await getSupabase()?.auth.signOut();
    } catch {
      // Ignore cleanup error
    }
  },
};

/** Only used when the build has no Supabase settings (local development against NEXO_AUTH_DISABLED=true). */
function localUser(email: string, name?: string): User {
  return { id: "local-user", email, name: name || email.split("@")[0] || "Usuario" };
}

const httpProjects: ProjectService = {
  async list(lang: Language, folderId?: string): Promise<Project[]> {
    const params = new URLSearchParams({ lang });
    if (folderId && folderId !== "all") {
      params.set("folderId", folderId);
    }
    return httpFetch<Project[]>(`/projects?${params.toString()}`, { method: "GET" });
  },
  async create(input: NewProjectInput): Promise<Project> {
    return httpFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    return httpFetch<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },
  async delete(id: string): Promise<void> {
    await httpFetch<void>(`/projects/${id}`, { method: "DELETE" });
  },
};

const httpFolders: FolderService = {
  async list(): Promise<Folder[]> {
    return httpFetch<Folder[]>("/folders", { method: "GET" });
  },
  async create(name: string, color?: string): Promise<Folder> {
    return httpFetch<Folder>("/folders", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  },
  async rename(id: string, name: string): Promise<Folder> {
    return httpFetch<Folder>(`/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  },
  async delete(id: string): Promise<void> {
    await httpFetch<void>(`/folders/${id}`, { method: "DELETE" });
  },
  async moveProject(projectId: string, folderId: string | null): Promise<Project> {
    return httpFetch<Project>(`/folders/projects/${projectId}/move`, {
      method: "PUT",
      body: JSON.stringify({ folderId }),
    });
  },
};

interface PendingWorkspace { map: ConceptMap; messages: Message[]; discovery?: DiscoveryState; operationId: string; baseRevision: number }
const workspaceRevisions = new Map<string, number>();
const workspaceQueues = new Map<string, Promise<unknown>>();
const pendingKey = (projectId: string) => `nexo.pending.workspace.${projectId}`;
const operationsKey = (projectId: string) => `nexo.workspace.operations.${projectId}`;
function acknowledgedOperations(projectId: string): string[] {
  try { return JSON.parse(localStorage.getItem(operationsKey(projectId)) ?? "[]") as string[]; } catch { return []; }
}
function acknowledgeOperation(projectId: string, operationId: string): void {
  try { localStorage.setItem(operationsKey(projectId), JSON.stringify([...new Set([...acknowledgedOperations(projectId), operationId])].slice(-64))); } catch { /* Server ledger remains authoritative. */ }
}
function readPending(projectId: string): PendingWorkspace | null {
  try { const raw = localStorage.getItem(pendingKey(projectId)); return raw ? JSON.parse(raw) as PendingWorkspace : null; } catch { return null; }
}
function writePending(projectId: string, pending: PendingWorkspace): void {
  try {
    const previous = readPending(projectId);
    if (previous && (previous.baseRevision ?? 0) > pending.baseRevision) return;
    localStorage.setItem(pendingKey(projectId), JSON.stringify(pending));
  } catch { /* In-memory request still proceeds. */ }
}
function clearPending(projectId: string): void {
  try { localStorage.removeItem(pendingKey(projectId)); } catch { /* Ignore unavailable storage. */ }
}
async function sendWorkspaceSnapshot(projectId: string, pending: PendingWorkspace, expectedRevision: number): Promise<Workspace> {
  const url = `${getStoredApiUrl().replace(/\/+$/, "")}/projects/${projectId}/workspace`;
  const send = (revision: number, draft: PendingWorkspace) => fetch(url, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, expectedRevision: revision }),
  });
  let response = await send(expectedRevision, pending);
  if (response.status === 409) {
    const current = await response.json() as Workspace;
    const tombstones = new Set(pending.discovery?.tombstones ?? []);
    const nodeIds = new Set(pending.map.nodes.map((node) => node.id));
    const nodes = [...pending.map.nodes, ...current.map.nodes.filter((node) => !nodeIds.has(node.id) && !tombstones.has(node.semanticKey ?? node.id))];
    const relationIds = new Set(pending.map.relations.map((relation) => relation.id));
    const relations = [...pending.map.relations, ...current.map.relations.filter((relation) => !relationIds.has(relation.id) && nodes.some((node) => node.id === relation.from) && nodes.some((node) => node.id === relation.to))];
    const messageIds = new Set(pending.messages.map((message) => message.id));
    const messages = [...current.messages.filter((message) => !messageIds.has(message.id)), ...pending.messages];
    response = await send(current.revision ?? 0, { ...pending, map: { nodes, relations }, messages });
  }
  if (!response.ok) throw new Error(`No se pudo guardar el workspace: HTTP ${response.status}`);
  const saved = await response.json() as Workspace;
  workspaceRevisions.set(projectId, saved.revision ?? 0);
  return saved;
}

const httpWorkspace: WorkspaceService = {
  async load(projectId: string, lang: Language): Promise<Workspace | null> {
    const current = await httpFetch<Workspace | null>(`/projects/${projectId}/workspace?lang=${lang}`, {
      method: "GET",
    });
    if (!current) return null;
    workspaceRevisions.set(projectId, current.revision ?? 0);
    const pending = readPending(projectId);
    if (!pending) return current;
    if (acknowledgedOperations(projectId).includes(pending.operationId)) { clearPending(projectId); return current; }
    try {
      const saved = await sendWorkspaceSnapshot(projectId, pending, current.revision ?? 0);
      acknowledgeOperation(projectId, pending.operationId);
      clearPending(projectId);
      return saved;
    }
    catch { return { ...current, map: pending.map, messages: pending.messages, discovery: pending.discovery }; }
  },
  save(projectId: string, map: ConceptMap, messages: Message[], discovery?: DiscoveryState): Promise<void> {
    const pending: PendingWorkspace = { map, messages, discovery, operationId: crypto.randomUUID(), baseRevision: workspaceRevisions.get(projectId) ?? 0 };
    writePending(projectId, pending);
    const prior = workspaceQueues.get(projectId) ?? Promise.resolve();
    const next = prior.catch(() => undefined).then(async () => {
      const latest = readPending(projectId);
      if (!latest) return;
      const saved = await sendWorkspaceSnapshot(projectId, latest, workspaceRevisions.get(projectId) ?? 0);
      acknowledgeOperation(projectId, latest.operationId);
      if (readPending(projectId)?.operationId === latest.operationId) clearPending(projectId);
      workspaceRevisions.set(projectId, saved.revision ?? 0);
    });
    workspaceQueues.set(projectId, next);
    return next.then(() => undefined);
  },
};

const httpAI: AIService = {
  async reply(request: AIReplyRequest): Promise<AIResponse> {
    return httpFetch<AIResponse>(`/ai/reply`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
  async explain(request: AITutorRequest): Promise<string> {
    const res = await httpFetch<{ explanation: string }>(`/ai/explain`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    return res.explanation;
  },
};

const httpDocuments: DocumentService = {
  async generate(projectId: string, projectName: string, lang: Language): Promise<GeneratedDocument> {
    return httpFetch<GeneratedDocument>(`/projects/${projectId}/documents/generate`, {
      method: "POST",
      body: JSON.stringify({ projectName, lang }),
    });
  },
};

const httpResearch: ResearchService = {
  async search(request: ResearchSearchRequest): Promise<ResearchSearchResponse> {
    return httpFetch<ResearchSearchResponse>(`/research/search`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
};

export const httpServices: Services = {
  auth: httpAuth,
  projects: httpProjects,
  folders: httpFolders,
  workspace: httpWorkspace,
  ai: httpAI,
  documents: httpDocuments,
  research: httpResearch,
};
