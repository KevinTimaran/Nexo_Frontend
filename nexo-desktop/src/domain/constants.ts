/**
 * Centralized Domain Constants & Validation Limits for Nexo Desktop.
 * Enforces character length budgets and text-only content guardrails.
 */

export const MAX_AI_PROMPT_CHARS = 20_000;
export const AI_CHAT_WARNING_THRESHOLD = 18_000;
export const AI_PROMPT_WARNING_THRESHOLD = 18_000;
export const MAX_NODE_NAME_CHARS = 80;

export const IMAGE_REJECTION_MESSAGE = "Nexo solo procesa texto; no se admiten imágenes";

export const LIMITS = {
  PROJECT_NAME: 60,
  PROJECT_DESCRIPTION: 500,
  CANVAS_NAME: 60,
  AI_CHAT_MESSAGE: 20_000,
  AI_CHAT_WARNING_THRESHOLD: 18_000,
  NODE_NAME: 80,
  FOLDER_NAME: 50,
} as const;

/**
 * Counts the exact number of Unicode code points in a string.
 * Accurately handles multi-byte surrogate pairs (emojis, complex scripts).
 */
export function countCodePoints(str: string): number {
  return Array.from(str || "").length;
}

/**
 * Detects base64 image data URIs, raw base64 image magic bytes,
 * or embedded image references within text strings.
 */
export function containsImageData(text: string): boolean {
  if (!text) return false;
  return (
    text.includes("data:image/") ||
    /(?:data:image\/[a-zA-Z0-9+.-]+;base64,|\[image:|<img\s+[^>]*src=)/i.test(text) ||
    /(?:iVBORw0KGgo|\/9j\/4|R0lGODlh|R0lGODdh|UklGR)[A-Za-z0-9+/=]{40,}/m.test(text)
  );
}

export const containsImagePayload = containsImageData;

import type { NodeCategory } from "./types";

/**
 * Normalizes any category string (including AI outputs, legacy groups, etc.)
 * to one of the 4 canonical NodeCategory values: "legal" | "economic" | "political" | "technical".
 */
export function normalizeCategory(category?: string | null): NodeCategory {
  if (!category) return "technical";
  const lower = String(category).toLowerCase().trim();
  if (lower === "legal" || lower.includes("legal") || lower.includes("regulat") || lower.includes("juridic")) {
    return "legal";
  }
  if (
    lower === "economic" ||
    lower.includes("econ") ||
    lower.includes("financ") ||
    lower.includes("monet") ||
    lower.includes("business") ||
    lower.includes("negocio") ||
    lower.includes("comercial")
  ) {
    return "economic";
  }
  if (
    lower === "political" ||
    lower.includes("politic") ||
    lower.includes("social") ||
    lower.includes("human") ||
    lower.includes("comunit")
  ) {
    return "political";
  }
  return "technical";
}
