/**
 * Dynamic Service Registry.
 * Handles deterministic switching between Mock Mode and Server Mode.
 * Changing modes changes the actual API client adapter, never just a label.
 */
import type { ServiceMode } from "../domain/types";
import type { Services } from "./contracts";
import { httpServices } from "./http";
import { mockServices } from "./mock";

const MODE_STORAGE_KEY = "nexo.service.mode";

function getInitialMode(): ServiceMode {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === "server" || saved === "mock") return saved;
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
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage error
    }
    this.listeners.forEach((listener) => listener(mode));
  }

  /**
   * Returns the actual active services adapter:
   * - When in 'mock' mode: returns deterministic mockServices.
   * - When in 'server' mode: returns real httpServices connecting to the backend.
   */
  getServices(): Services {
    return this.currentMode === "server" ? httpServices : mockServices;
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
