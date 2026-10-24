// src/theme/tokens.ts
import type { NodeCategory, NodePriority } from "../domain/types";

/**
 * Premium semantic color tokens for Nexo Desktop.
 * Strictly adheres to the design specification:
 * - Primary: Light #1E293B, Dark #0F172A
 * - High priority: Light #991B1B, Dark #EF4444
 * - Medium priority: Light #B45309, Dark #F59E0B
 * - Low priority: Light #475569, Dark #94A3B8
 * - Legal / regulatory: Light #6B21A8, Dark #A855F7
 * - Economic / financial: Light #065F46, Dark #10B981
 * - Political / social: Light #1E3A8A, Dark #3B82F6
 * - Technical / operational: Light #0F766E, Dark #14B8A6
 */

export const semanticColors = {
  primary: {
    light: "#1E293B",
    dark: "#0F172A",
  },
  priority: {
    high: {
      light: "#991B1B",
      dark: "#EF4444",
      bgLight: "rgba(153, 27, 27, 0.08)",
      bgDark: "rgba(239, 68, 68, 0.15)",
      borderLight: "rgba(153, 27, 27, 0.25)",
      borderDark: "rgba(239, 68, 68, 0.35)",
      glowLight: "0 0 16px -2px rgba(153, 27, 27, 0.18)",
      glowDark: "0 0 20px -2px rgba(239, 68, 68, 0.3)",
    },
    medium: {
      light: "#B45309",
      dark: "#F59E0B",
      bgLight: "rgba(180, 83, 9, 0.08)",
      bgDark: "rgba(245, 158, 11, 0.15)",
      borderLight: "rgba(180, 83, 9, 0.25)",
      borderDark: "rgba(245, 158, 11, 0.35)",
      glowLight: "none",
      glowDark: "none",
    },
    low: {
      light: "#475569",
      dark: "#94A3B8",
      bgLight: "rgba(71, 85, 105, 0.08)",
      bgDark: "rgba(148, 163, 184, 0.15)",
      borderLight: "rgba(71, 85, 105, 0.25)",
      borderDark: "rgba(148, 163, 184, 0.3)",
      glowLight: "none",
      glowDark: "none",
    },
  },
  category: {
    legal: {
      name: "Legal / Regulatorio",
      light: "#6B21A8",
      dark: "#A855F7",
      bgLight: "rgba(107, 33, 168, 0.08)",
      bgDark: "rgba(168, 85, 247, 0.15)",
      borderLight: "rgba(107, 33, 168, 0.3)",
      borderDark: "rgba(168, 85, 247, 0.35)",
    },
    economic: {
      name: "Económico / Financiero",
      light: "#065F46",
      dark: "#10B981",
      bgLight: "rgba(6, 95, 70, 0.08)",
      bgDark: "rgba(16, 185, 129, 0.15)",
      borderLight: "rgba(6, 95, 70, 0.3)",
      borderDark: "rgba(16, 185, 129, 0.35)",
    },
    political: {
      name: "Político / Social",
      light: "#1E3A8A",
      dark: "#3B82F6",
      bgLight: "rgba(30, 58, 138, 0.08)",
      bgDark: "rgba(59, 130, 246, 0.15)",
      borderLight: "rgba(30, 58, 138, 0.3)",
      borderDark: "rgba(59, 130, 246, 0.35)",
    },
    technical: {
      name: "Técnico / Operacional",
      light: "#0F766E",
      dark: "#14B8A6",
      bgLight: "rgba(15, 118, 110, 0.08)",
      bgDark: "rgba(20, 184, 166, 0.15)",
      borderLight: "rgba(15, 118, 110, 0.3)",
      borderDark: "rgba(20, 184, 166, 0.35)",
    },
  },
};

export const colors = {
  // Base palette (monochrome)
  backgroundLight: "#FAFAFA",
  backgroundDark: "#0A0A0A",
  surfaceLight: "#FFFFFF",
  surfaceDark: "#141414",
  textPrimaryLight: "#111827",
  textPrimaryDark: "#F4F4F5",
  textSecondaryLight: "#71717A",
  textSecondaryDark: "#A1A1AA",
  // Legacy & general semantic accents
  concept: "#3B82F6",
  viability: "#10B981",
  risk: "#F59E0B",
  ...semanticColors,
};

export const radii = {
  card: "1rem", // rounded-2xl (16px)
  pill: "9999px", // rounded-full
  node: "0.75rem", // rounded-xl (12px)
};

export const shadows = {
  button: "0 1px 2px rgba(0,0,0,0.05)",
  panel: "0 10px 15px rgba(0,0,0,0.1)",
  cardLight: "0 8px 30px rgb(0,0,0,0.04)",
  cardDark: "0 12px 32px rgb(0,0,0,0.4)",
  none: "none",
};

export const transitions = {
  default: "all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
  fast: "all 0.15s ease-out",
};

/** Helper to get category color token depending on active dark mode */
export function getCategoryColor(category: NodeCategory | undefined, isDark: boolean): string {
  if (!category || !semanticColors.category[category]) {
    return isDark ? semanticColors.category.technical.dark : semanticColors.category.technical.light;
  }
  return isDark ? semanticColors.category[category].dark : semanticColors.category[category].light;
}

/** Helper to get priority color token */
export function getPriorityColor(priority: NodePriority | undefined, isDark: boolean): string {
  if (!priority || !semanticColors.priority[priority]) {
    return isDark ? semanticColors.priority.low.dark : semanticColors.priority.low.light;
  }
  return isDark ? semanticColors.priority[priority].dark : semanticColors.priority[priority].light;
}
