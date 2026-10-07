/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base palette (monochrome) – using Tailwind defaults but alias for clarity
        backgroundLight: "#FAFAFA", // bg-zinc-50
        backgroundDark: "#0A0A0A",
        surfaceLight: "#FFFFFF",
        surfaceDark: "#141414",
        textPrimaryLight: "#111827", // zinc-900
        textPrimaryDark: "#F4F4F5", // zinc-100
        textSecondaryLight: "#71717A",
        textSecondaryDark: "#A1A1AA",
        // Semantic accents
        concept: "#3B82F6",
        viability: "#10B981",
        risk: "#F59E0B",
      },
      borderRadius: {
        card: "1rem", // rounded-2xl
        pill: "9999px",
        node: "0.75rem", // rounded-xl
      },
      boxShadow: {
        button: "0 1px 2px rgba(0,0,0,0.05)",
        panel: "0 10px 15px rgba(0,0,0,0.1)",
      },
      transitionProperty: {
        "default": "all",
      },
      transitionDuration: {
        default: "400",
      },
      transitionTimingFunction: {
        default: "cubic-bezier(0.23,1,0.32,1)",
      },
    },
  },
  plugins: [],
};

