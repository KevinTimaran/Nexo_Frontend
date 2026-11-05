import { createContext, useEffect, useState, useContext, ReactNode } from "react";
import type { ThemeMode } from "../../domain/types";

interface ThemeContextProps {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: "system",
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem("theme-mode") as ThemeMode | null;
      return stored ?? "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const apply = (m: ThemeMode) => {
      root.classList.remove("light", "dark");
      let resolved: "light" | "dark";
      if (m === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        resolved = prefersDark ? "dark" : "light";
      } else {
        resolved = m;
      }
      root.classList.add(resolved);
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
    };
    apply(theme);
    try {
      localStorage.setItem("theme-mode", theme);
      localStorage.setItem("nexo.theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const prefersDark = media.matches;
      const resolved = prefersDark ? "dark" : "light";
      document.documentElement.classList.toggle("dark", prefersDark);
      document.documentElement.classList.toggle("light", !prefersDark);
      document.documentElement.setAttribute("data-theme", resolved);
      document.documentElement.style.colorScheme = resolved;
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
