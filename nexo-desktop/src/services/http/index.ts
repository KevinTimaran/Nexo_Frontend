/**
 * HTTP Client and Server Adapter for Nexo Desktop.
 * Communicates with the Java/Spring Boot backend REST API.
 * Adheres strictly to CONTRATO_API_NEXO.md.
 */
import {
  ServiceError,
  type AIResponse,
  type BackendStatus,
  type ConceptMap,
  type GeneratedDocument,
  type Language,
  type Message,
  type Neo4jStatus,
  type NewProjectInput,
  type Project,
  type User,
  type Workspace,
} from "../../domain/types";
import type {
  AIReplyRequest,
  AIService,
  AITutorRequest,
  AuthService,
  DocumentService,
  ProjectService,
  Services,
  WorkspaceService,
} from "../contracts";

export const DEFAULT_API_URL = "http://localhost:8000/api/v1";
const API_URL_STORAGE_KEY = "nexo.api.url";

export function getStoredApiUrl(): string {
  try {
    return localStorage.getItem(API_URL_STORAGE_KEY) || DEFAULT_API_URL;
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
 * Applies a strict timeout to prevent hanging or overlapping requests.
 */
export async function checkBackendHealth(apiUrl: string, timeoutMs = 3000): Promise<HealthCheckResult> {
  const start = performance.now();
  const timestamp = new Date().toISOString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Normalize baseUrl (strip trailing slashes)
  const cleanUrl = apiUrl.trim().replace(/\/+$/, "");

  // Candidate health endpoints
  const healthUrl = `${cleanUrl}/health`;

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
      let neo4jStatus: Neo4jStatus = "unknown";
      try {
        const body = await res.json();
        // Only report Neo4j as connected if the backend response explicitly confirms it
        if (body?.components?.neo4j?.status === "UP" || body?.neo4j === "UP" || body?.neo4j === "connected") {
          neo4jStatus = "connected";
        } else if (body?.neo4j === "error" || body?.components?.neo4j?.status === "DOWN") {
          neo4jStatus = "error";
        } else {
          neo4jStatus = "unknown";
        }
      } catch {
        // Response wasn't json, but server is alive
        neo4jStatus = "unknown";
      }

      return {
        connected: true,
        status: "connected",
        latencyMs,
        neo4jStatus,
        timestamp,
      };
    } else {
      return {
        connected: false,
        status: "error",
        latencyMs,
        neo4jStatus: "disconnected",
        errorMessage: `Respuesta HTTP ${res.status}: ${res.statusText}`,
        timestamp,
      };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    const isTimeout = err instanceof Error && err.name === "AbortError";

    return {
      connected: false,
      status: "disconnected",
      latencyMs,
      neo4jStatus: "disconnected",
      errorMessage: isTimeout
        ? `Tiempo de espera agotado tras ${timeoutMs}ms al conectar a ${cleanUrl}`
        : `Servidor inaccesible en ${cleanUrl}. Verifica que el backend Spring Boot esté ejecutándose.`,
      timestamp,
    };
  }
}

/* ----------------- Real HTTP API Service Implementation ----------------- */

async function httpFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getStoredApiUrl().replace(/\/+$/, "");
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Platform": "tauri-desktop",
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) throw new ServiceError("invalid-credentials", "Credenciales inválidas.");
      let errorMsg = `Error del servidor HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) errorMsg = errorData.error.message;
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

const httpAuth: AuthService = {
  async signIn(email: string, password: string): Promise<User> {
    return httpFetch<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async signOut(): Promise<void> {
    try {
      await httpFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // Ignore cleanup error
    }
  },
};

const httpProjects: ProjectService = {
  async list(lang: Language): Promise<Project[]> {
    return httpFetch<Project[]>(`/projects?lang=${lang}`, { method: "GET" });
  },
  async create(input: NewProjectInput): Promise<Project> {
    return httpFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

const httpWorkspace: WorkspaceService = {
  async load(projectId: string, lang: Language): Promise<Workspace | null> {
    return httpFetch<Workspace | null>(`/projects/${projectId}/workspace?lang=${lang}`, {
      method: "GET",
    });
  },
  save(projectId: string, map: ConceptMap, messages: Message[]): void {
    // Fire-and-forget background synchronization
    void httpFetch<void>(`/projects/${projectId}/workspace`, {
      method: "PUT",
      body: JSON.stringify({ map, messages }),
    }).catch((err) => {
      console.warn("Fallo de sincronización con servidor backend:", err);
    });
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

export const httpServices: Services = {
  auth: httpAuth,
  projects: httpProjects,
  workspace: httpWorkspace,
  ai: httpAI,
  documents: httpDocuments,
};
