import React from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor, Command, Globe, Check } from "lucide-react";
import { useTheme } from "../../app/providers/ThemeProvider";
import { currentLanguage, setLanguage } from "../../i18n";
import type { Language } from "../../domain/types";

interface TitlebarProps {
  onOpenCommand: () => void;
  statusText?: string;
}

export const Titlebar: React.FC<TitlebarProps> = ({ onOpenCommand, statusText }) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const lang = currentLanguage();

  const toggleLanguage = () => {
    const nextLang: Language = lang === "en" ? "es" : "en";
    void setLanguage(nextLang);
  };

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";

  return (
    <header
      data-tauri-drag-region
      className="h-12 shrink-0 sidebar-glass flex items-center justify-between px-4 select-none z-30"
    >
      {/* Left section: Native traffic lights spacing on macOS */}
      <div className="flex items-center gap-3 pl-[72px]">
        <span className="text-body font-semibold text-fg tracking-tight">
          {t("app.name")}
        </span>
        {statusText && (
          <>
            <div className="h-3 w-px bg-line mx-1" />
            <span className="text-caption text-muted flex items-center gap-1.5 bg-sunken px-2 py-0.5 rounded-full border border-line">
              <Check className="w-3 h-3 text-positive-fg" />
              {statusText}
            </span>
          </>
        )}
      </div>

      {/* Center section: Global Command trigger */}
      <button
        onClick={onOpenCommand}
        className="flex items-center gap-2 h-7 px-3 bg-sunken hover:bg-hover border border-line rounded text-caption text-muted hover:text-fg transition-all"
      >
        <Command className="w-3.5 h-3.5" />
        <span>{t("chrome.command")}</span>
        <kbd className="hidden sm:inline-block px-1 text-[10px] bg-surface border border-line rounded font-mono ml-1">
          ⌘K
        </kbd>
      </button>

      {/* Right section: Theme & Language quick toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLanguage}
          className="h-7 px-2 flex items-center gap-1.5 rounded text-caption font-medium text-muted hover:text-fg hover:bg-hover transition-colors"
          title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="uppercase">{lang}</span>
        </button>

        <button
          onClick={() => setTheme(nextTheme)}
          className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-fg hover:bg-hover transition-colors"
          title={`Theme: ${theme}`}
        >
          {theme === "light" && <Sun className="w-3.5 h-3.5" />}
          {theme === "dark" && <Moon className="w-3.5 h-3.5" />}
          {theme === "system" && <Monitor className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
