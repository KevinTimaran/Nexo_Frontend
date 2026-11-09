/**
 * Master Centralized Validation Limits for NEXO Desktop.
 * Single source of truth for character length budgets, thresholds, and guardrails.
 * Matches docs/implementation/README.md Section 8 and Phase 03/09 requirements.
 */

export const LIMITS = {
  PROJECT_NAME: 60,
  PROJECT_DESCRIPTION: 500,
  CANVAS_NAME: 60,
  AI_CHAT_MESSAGE: 20_000,
  AI_CHAT_WARNING_THRESHOLD: 18_000,
  NODE_NAME: 80,
  FOLDER_NAME: 50,
} as const;

export const MAX_PROJECT_NAME_CHARS = LIMITS.PROJECT_NAME;
export const MAX_PROJECT_DESC_CHARS = LIMITS.PROJECT_DESCRIPTION;
export const MAX_CANVAS_NAME_CHARS = LIMITS.CANVAS_NAME;
export const MAX_AI_PROMPT_CHARS = LIMITS.AI_CHAT_MESSAGE;
export const AI_CHAT_WARNING_THRESHOLD = LIMITS.AI_CHAT_WARNING_THRESHOLD;
export const MAX_NODE_NAME_CHARS = LIMITS.NODE_NAME;
export const MAX_FOLDER_NAME_CHARS = LIMITS.FOLDER_NAME;

export const IMAGE_REJECTION_MESSAGE = "Nexo solo procesa texto; no se admiten imágenes";

/**
 * Counts the exact number of Unicode code points in a string.
 * Accurately handles multi-byte surrogate pairs (emojis, complex scripts).
 */
export function countCodePoints(str: string): number {
  return Array.from(str || "").length;
}

/**
 * Reusable validation helper for form inputs and pasted payloads.
 */
export function validateLength(
  value: string,
  limit: number,
  fieldName = "Campo"
): { valid: boolean; length: number; limit: number; error?: string } {
  const length = countCodePoints(value);
  if (length > limit) {
    return {
      valid: false,
      length,
      limit,
      error: `${fieldName} excede el límite máximo de ${limit} caracteres (${length}/${limit})`,
    };
  }
  return { valid: true, length, limit };
}
