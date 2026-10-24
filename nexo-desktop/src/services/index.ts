import type { Services } from "./contracts";
import { getServices, getActiveServiceMode, setActiveServiceMode } from "./registry";
import { checkBackendHealth, getStoredApiUrl, setStoredApiUrl, DEFAULT_API_URL } from "./http";

/**
 * Dynamic Services Proxy.
 * Resolves calls to either `mockServices` or `httpServices` depending on the active mode in `registry`.
 * Switching modes updates the actual API client in real time.
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
  checkBackendHealth,
  getStoredApiUrl,
  setStoredApiUrl,
  DEFAULT_API_URL,
};

export type * from "./contracts";
