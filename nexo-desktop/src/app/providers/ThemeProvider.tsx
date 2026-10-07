import React, { createContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  mode: 'system',
  setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Hydrate from localStorage or default to system
    const stored = localStorage.getItem('theme-mode') as ThemeMode | null;
    return stored ?? 'system';
  });

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement;
    const apply = (m: ThemeMode) => {
      root.classList.remove('light', 'dark');
      if (m === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(prefersDark ? 'dark' : 'light');
      } else {
        root.classList.add(m);
      }
    };
    apply(mode);
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  // Listen to system changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const prefersDark = media.matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      document.documentElement.classList.toggle('light', !prefersDark);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
