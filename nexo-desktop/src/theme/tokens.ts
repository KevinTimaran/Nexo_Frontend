// src/theme/tokens.ts
export const colors = {
  // Base palette (monochrome)
  backgroundLight: "#FAFAFA", // bg-zinc-50
  backgroundDark: "#0A0A0A",
  surfaceLight: "#FFFFFF",
  surfaceDark: "#141414",
  textPrimaryLight: "#111827", // zinc-900
  textPrimaryDark: "#F4F4F5", // zinc-100
  textSecondaryLight: "#71717A", // zinc-500
  textSecondaryDark: "#A1A1AA", // zinc-400
  // Semantic accents
  concept: "#3B82F6", // blue-500
  viability: "#10B981", // emerald-500
  risk: "#F59E0B", // amber-500
};

export const radii = {
  card: "1rem", // rounded-2xl (16px)
  pill: "9999px", // rounded-full
  node: "0.75rem", // rounded-xl (12px)
};

export const shadows = {
  button: "0 1px 2px rgba(0,0,0,0.05)", // shadow-sm
  panel: "0 10px 15px rgba(0,0,0,0.1)", // shadow-xl
  none: "none",
};

export const transitions = {
  default: "all 0.4s cubic-bezier(0.23,1,0.32,1)",
};
