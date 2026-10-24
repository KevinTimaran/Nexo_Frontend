import { create } from "zustand";
import type {
  AIServiceStatus,
  BackendStatus,
  Neo4jStatus,
  ServiceMode,
} from "../domain/types";
import {
  checkBackendHealth,
  getActiveServiceMode,
  getStoredApiUrl,
  setActiveServiceMode,
  setStoredApiUrl,
} from "../services";

interface ConnectivityState {
  // Service mode ('mock' | 'server')
  mode: ServiceMode;
  apiUrl: string;

  // 1. Backend (Java/Spring Boot)
  backendStatus: BackendStatus;
  backendLatencyMs: number | null;
  backendLastChecked: string | null;
  backendError: string | null;

  // 2. AI Service
  aiStatus: AIServiceStatus;
  aiProvider: string;
  aiLastActivity: string | null;

  // 3. Neo4j Sync
  neo4jStatus: Neo4jStatus;
  neo4jLastSync: string | null;

  // UI state
  isChecking: boolean;
  isManagerOpen: boolean;

  // Actions
  setMode: (mode: ServiceMode) => Promise<void>;
  setApiUrl: (url: string) => void;
  testConnection: () => Promise<void>;
  setAiStatus: (status: AIServiceStatus) => void;
  setNeo4jStatus: (status: Neo4jStatus) => void;
  setManagerOpen: (open: boolean) => void;
  toggleManager: () => void;
}

const initialMode = getActiveServiceMode();
const initialApiUrl = getStoredApiUrl();

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  mode: initialMode,
  apiUrl: initialApiUrl,

  backendStatus: initialMode === "mock" ? "mock" : "disconnected",
  backendLatencyMs: null,
  backendLastChecked: null,
  backendError: null,

  aiStatus: initialMode === "mock" ? "simulated" : "ready",
  aiProvider: initialMode === "mock" ? "Simulador de Desarrollo" : "Nexo LLM Engine",
  aiLastActivity: null,

  neo4jStatus: "unknown",
  neo4jLastSync: null,

  isChecking: false,
  isManagerOpen: false,

  setMode: async (mode: ServiceMode) => {
    setActiveServiceMode(mode);
    set({ mode });

    if (mode === "mock") {
      set({
        backendStatus: "mock",
        backendError: null,
        aiStatus: "simulated",
        aiProvider: "Simulador de Desarrollo",
        neo4jStatus: "unknown",
      });
    } else {
      set({
        backendStatus: "checking",
        aiProvider: "Nexo LLM Engine",
      });
      await get().testConnection();
    }
  },

  setApiUrl: (apiUrl: string) => {
    setStoredApiUrl(apiUrl);
    set({ apiUrl });
  },

  testConnection: async () => {
    const { apiUrl, mode, isChecking } = get();
    if (isChecking) return; // Prevent overlapping checks

    set({ isChecking: true, backendStatus: "checking" });

    try {
      const result = await checkBackendHealth(apiUrl);

      if (mode === "mock") {
        // If user tested while in mock mode, record check without leaving mock mode
        set({
          isChecking: false,
          backendLastChecked: result.timestamp,
          backendLatencyMs: result.connected ? result.latencyMs : null,
          backendStatus: "mock",
        });
        return;
      }

      set({
        isChecking: false,
        backendStatus: result.status,
        backendLatencyMs: result.latencyMs,
        backendLastChecked: result.timestamp,
        backendError: result.errorMessage ?? null,
        neo4jStatus: result.neo4jStatus,
        aiStatus: result.connected ? "ready" : "unavailable",
      });
    } catch {
      set({
        isChecking: false,
        backendStatus: "error",
        backendError: "Excepción imprevista al comprobar la conectividad.",
        neo4jStatus: "disconnected",
        aiStatus: "unavailable",
      });
    }
  },

  setAiStatus: (aiStatus: AIServiceStatus) => {
    set({
      aiStatus,
      aiLastActivity: new Date().toLocaleTimeString(),
    });
  },

  setNeo4jStatus: (neo4jStatus: Neo4jStatus) => {
    set({
      neo4jStatus,
      neo4jLastSync: new Date().toLocaleTimeString(),
    });
  },

  setManagerOpen: (isManagerOpen: boolean) => set({ isManagerOpen }),
  toggleManager: () => set((state) => ({ isManagerOpen: !state.isManagerOpen })),
}));
