// src/theme/tokens.ts
import type { NodeCategory, NodePriority } from "../domain/types";
import { perspectiveVisuals } from "./semanticVisuals";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEXO DESIGN SYSTEM TOKENS (Single Source of Truth)
 * ═══════════════════════════════════════════════════════════════════════════
 * Warm Luxury Dark (Champagne Gold) & Warm Editorial Light (Crimson Terracotta)
 * 60-30-10 color distribution with native system typography hierarchy.
 */

export const warmLuxuryDark = {
  // 60% Base Surface Palette
  bgMain: "#170704", // Deep warm roasted umber
  bgDeep: "#120503", // Sunken viewport background
  bgSoft: "#1A0906", // Sidebar and secondary layout containers

  // 30% Content Containers & Surfaces
  surfacePrimary: "#2A1412", // Card and modal frosted glass base
  surfaceSecondary: "#301413", // Hovered surfaces, popovers, drawers
  surfaceDeep: "#200F0A", // Recessed input containers and code blocks

  // Borders & Dividers
  borderBase: "#594836",
  borderMinOpacity: 0.4,
  borderMaxOpacity: 0.6,
  borderPrimary: "rgba(89, 72, 54, 0.5)",
  borderSecondary: "rgba(89, 72, 54, 0.4)",

  // 10% Focal Accents & Illuminations
  accentPrimary: "#E5C158", // Champagne Gold (buttons, active tabs, primary badges)
  accentSecondary: "#D4AF37", // Metallic Gold (focus rings, icons, glow halos)
  accentAmber: "#F59E0B", // Amber warning / thinking pulse
  accentTint: "rgba(229, 193, 88, 0.15)",

  // Typography & Foreground
  textPrimary: "#F3EBE1", // Soft warm cream (100% contrast)
  textSecondary: "#A1937E", // Muted parchment gold (75% contrast)
  textMuted: "#8C7D6D", // Subtle metadata, disabled indicators
} as const;

export const warmEditorialLight = {
  // 60% Base Surface Palette
  bgMain: "#F7F3ED", // Warm architectural linen
  bgLight: "#FAF6F0", // Soft bright page tone
  bgDeep: "#FAF6F0",
  bgSoft: "#F7F3ED",

  // 30% Content Containers & Surfaces
  surfacePrimary: "#FFFFFF", // Pure white card surfaces
  surfaceSecondary: "#F5E8E7", // Tinted card highlights and selected rows
  surfaceDeep: "#FAF6F0",

  // Borders & Dividers
  borderPrimary: "#E8DFD5", // Warm parchment line
  borderSecondary: "#E6DFD6", // Subtle separator lines
  borderBase: "#E8DFD5",

  // 10% Focal Accents & Illuminations
  accentPrimary: "#9E2A2B", // Crimson Terracotta (active states, primary actions)
  accentSecondary: "#9E2A2B",
  accentTint: "rgba(158, 42, 43, 0.12)", // Pill badges, subtle active backgrounds
  accentAmber: "#F59E0B",

  // Typography & Foreground
  textPrimary: "#2D1512", // Deep warm espresso ink
  textSecondary: "#7A6E65", // Warm editorial stone
  textMuted: "#8F7568", // Warm taupe caption text
} as const;

export const typographyTokens = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif',
  scale: {
    titleXl: {
      fontSize: "32px",
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
    },
    titleMd: {
      fontSize: "16px",
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: "-0.01em",
    },
    body: {
      fontSize: "14px",
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0",
    },
    caption: {
      fontSize: "12px",
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: "+0.01em",
    },
  },
} as const;

export const semanticColors = {
  primary: {
    light: warmEditorialLight.accentPrimary,
    dark: warmLuxuryDark.accentPrimary,
  },
  priority: {
    high: {
      light: "#9E2A2B",
      dark: "#EF4444",
      bgLight: "rgba(158, 42, 43, 0.08)",
      bgDark: "rgba(239, 68, 68, 0.15)",
      borderLight: "rgba(158, 42, 43, 0.25)",
      borderDark: "rgba(239, 68, 68, 0.35)",
      glowLight: "0 0 16px -2px rgba(158, 42, 43, 0.18)",
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
      light: "#7A6E65",
      dark: "#A1937E",
      bgLight: "rgba(122, 110, 101, 0.08)",
      bgDark: "rgba(161, 147, 126, 0.15)",
      borderLight: "rgba(122, 110, 101, 0.25)",
      borderDark: "rgba(161, 147, 126, 0.3)",
      glowLight: "none",
      glowDark: "none",
    },
  },
  category: {
    legal: {
      name: "Legal / Regulatorio",
      light: perspectiveVisuals.legal.light,
      dark: perspectiveVisuals.legal.dark,
      bgLight: "rgba(107, 33, 168, 0.08)",
      bgDark: "rgba(168, 85, 247, 0.15)",
      borderLight: "rgba(107, 33, 168, 0.3)",
      borderDark: "rgba(168, 85, 247, 0.35)",
    },
    economic: {
      name: "Económico / Financiero",
      light: perspectiveVisuals.economic.light,
      dark: perspectiveVisuals.economic.dark,
      bgLight: "rgba(6, 95, 70, 0.08)",
      bgDark: "rgba(16, 185, 129, 0.15)",
      borderLight: "rgba(6, 95, 70, 0.3)",
      borderDark: "rgba(16, 185, 129, 0.35)",
    },
    political: {
      name: "Político / Social",
      light: perspectiveVisuals.political.light,
      dark: perspectiveVisuals.political.dark,
      bgLight: "rgba(30, 58, 138, 0.08)",
      bgDark: "rgba(59, 130, 246, 0.15)",
      borderLight: "rgba(30, 58, 138, 0.3)",
      borderDark: "rgba(59, 130, 246, 0.35)",
    },
    technical: {
      name: "Técnico / Operacional",
      light: perspectiveVisuals.technical.light,
      dark: perspectiveVisuals.technical.dark,
      bgLight: "rgba(15, 118, 110, 0.08)",
      bgDark: "rgba(20, 184, 166, 0.15)",
      borderLight: "rgba(15, 118, 110, 0.3)",
      borderDark: "rgba(20, 184, 166, 0.35)",
    },
  },
};

export const colors = {
  // Base palette (Warm Editorial Light & Warm Luxury Dark)
  backgroundLight: warmEditorialLight.bgMain,
  backgroundDark: warmLuxuryDark.bgMain,
  surfaceLight: warmEditorialLight.surfacePrimary,
  surfaceDark: warmLuxuryDark.surfacePrimary,
  textPrimaryLight: warmEditorialLight.textPrimary,
  textPrimaryDark: warmLuxuryDark.textPrimary,
  textSecondaryLight: warmEditorialLight.textSecondary,
  textSecondaryDark: warmLuxuryDark.textSecondary,
  // Semantic accents
  concept: warmLuxuryDark.accentPrimary,
  viability: "#10B981",
  risk: "#F59E0B",
  ...semanticColors,
};

export const radii = {
  card: "var(--radius-card, 1rem)", // dynamic card radius
  button: "var(--radius-button, 0.75rem)", // dynamic button radius
  pill: "9999px", // rounded-full
  node: "0.75rem", // rounded-xl (12px)
};

export const shadows = {
  button: "var(--shadow-button, 0 1px 2px rgba(0,0,0,0.05))",
  panel: "0 10px 15px rgba(0,0,0,0.1)",
  card: "var(--shadow-card, 0 12px 32px rgb(0,0,0,0.4))",
  cardLight: "0 8px 30px rgba(45,21,18,0.04)",
  cardDark: "0 12px 32px rgba(0,0,0,0.7)",
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
