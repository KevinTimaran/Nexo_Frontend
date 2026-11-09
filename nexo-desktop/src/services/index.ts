import type { Services } from "./contracts";
import {
  getServices,
  getActiveServiceMode,
  setActiveServiceMode,
  getAiProvider,
  setAiProvider,
  type AIProvider,
  registry,
} from "./registry";
import { checkBackendHealth, getStoredApiUrl, setStoredApiUrl, DEFAULT_API_URL } from "./http";

/**
 * Dynamic Services Proxy.
 * Resolves calls to either `mockServices` or `httpServices` depending on the active mode in `registry`,
 * and transparently routes to either OpenAI GPT or Google Gemini depending on active provider.
 * Switching modes or providers updates the actual API client in real time.
 */
export const services: Services = new Proxy({} as Services, {
  get(_target, prop) {
    const active = getServices();
    return active[prop as keyof Services];
  },
});

export {
  getServices,
  getActiveServiceMode,
  setActiveServiceMode,
  getAiProvider,
  setAiProvider,
  type AIProvider,
  registry,
  checkBackendHealth,
  getStoredApiUrl,
  setStoredApiUrl,
  DEFAULT_API_URL,
};

export {
  getGeminiApiKey,
  getGeminiModel,
  setGeminiConfig,
  isGeminiConfigured,
  isGeminiEnabled,
  setGeminiEnabled,
  testGeminiConnection,
  DEFAULT_GEMINI_MODEL,
} from "./gemini";

export {
  getOpenAIApiKey,
  getOpenAIModel,
  setOpenAIConfig,
  isOpenAIConfigured,
  isOpenAIEnabled,
  setOpenAIEnabled,
  testOpenAIConnection,
  DEFAULT_OPENAI_MODEL,
} from "./openai";

export type * from "./contracts";
