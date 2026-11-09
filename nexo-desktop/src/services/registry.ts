/**
 * Dynamic Service Registry.
 * Handles deterministic switching between Mock Mode and Server Mode,
 * as well as routing between OpenAI GPT and Google Gemini AI providers.
 * Changing modes changes the actual API client adapter, never just a label.
 */
import type { ServiceMode } from "../domain/types";
import type { Services } from "./contracts";
import { geminiAiService, isGeminiConfigured, isGeminiEnabled } from "./gemini";
import { openaiAiService, isOpenAIConfigured, isOpenAIEnabled } from "./openai";
import { httpServices } from "./http";
import { mockServices } from "./mock";

const MODE_STORAGE_KEY = "nexo.service.mode";
export const AI_PROVIDER_STORAGE_KEY = "nexo.ai.provider";

export type AIProvider = "openai" | "gemini";

let inMemoryProvider: AIProvider | null = null;

export function getAiProvider(): AIProvider {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(AI_PROVIDER_STORAGE_KEY);
      if (saved === "openai" || saved === "gemini") return saved;
    }
  } catch {
    // Ignore storage issues
  }
  if (inMemoryProvider === "openai" || inMemoryProvider === "gemini") {
    return inMemoryProvider;
  }
  const envProvider = (import.meta as unknown as { env?: { VITE_AI_PROVIDER?: string } })?.env?.VITE_AI_PROVIDER;
  if (envProvider === "openai" || envProvider === "gemini") return envProvider;

  if (typeof process !== "undefined" && process.env?.VITE_AI_PROVIDER) {
    const p = process.env.VITE_AI_PROVIDER;
    if (p === "openai" || p === "gemini") return p;
  }

  if (isOpenAIConfigured()) return "openai";
  if (isGeminiConfigured()) return "gemini";
  return "openai";
}

export function setAiProvider(provider: AIProvider): void {
  inMemoryProvider = provider;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
    }
  } catch {
    // Ignore storage issues
  }
  registry.notify();
}

function getInitialMode(): ServiceMode {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === "server" || saved === "mock") return saved;
    }
  } catch {
    // Default to mock in development if storage is unreadable
  }
  return "mock";
}

class ServiceRegistry {
  private currentMode: ServiceMode = getInitialMode();
  private listeners = new Set<(mode: ServiceMode) => void>();

  getMode(): ServiceMode {
    return this.currentMode;
  }

  setMode(mode: ServiceMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(MODE_STORAGE_KEY, mode);
      }
    } catch {
      // Ignore storage error
    }
    this.notify();
  }

  notify(): void {
    this.listeners.forEach((listener) => listener(this.currentMode));
  }

  /**
   * Returns the actual active services adapter:
   * - When in 'mock' mode: returns deterministic mockServices, upgraded with active AI provider.
   * - When in 'server' mode: returns real httpServices connecting to the backend.
   */
  getServices(): Services {
    const base = this.currentMode === "server" ? httpServices : mockServices;
    const provider = getAiProvider();

    if (provider === "gemini") {
      if (isGeminiEnabled()) {
        return {
          ...base,
          ai: geminiAiService,
        };
      }
      return base;
    }

    if (provider === "openai") {
      if (isOpenAIEnabled()) {
        return {
          ...base,
          ai: openaiAiService,
        };
      }
      return base;
    }

    if (isOpenAIEnabled()) {
      return {
        ...base,
        ai: openaiAiService,
      };
    }

    if (isGeminiEnabled()) {
      return {
        ...base,
        ai: geminiAiService,
      };
    }

    return base;
  }

  subscribe(listener: (mode: ServiceMode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const registry = new ServiceRegistry();

export function getServices(): Services {
  return registry.getServices();
}

export function getActiveServiceMode(): ServiceMode {
  return registry.getMode();
}

export function setActiveServiceMode(mode: ServiceMode): void {
  registry.setMode(mode);
}
