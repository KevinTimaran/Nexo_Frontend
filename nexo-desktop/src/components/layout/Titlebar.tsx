import React from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor, Command, Globe, Check } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
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
      className="h-11 shrink-0 glass border-b border-line flex items-center justify-between px-3 select-none z-30"
    >
      {/* Left section: Tauri window control placeholder or app title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pl-1">
          <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors" />
        </div>
        <div className="h-4 w-px bg-line mx-1" />
        <span className="text-caption font-semibold tracking-wide text-fg uppercase flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-concept-fg" />
          {t("app.name")}
        </span>
        {statusText && (
          <span className="text-caption text-muted flex items-center gap-1.5 bg-elevated px-2 py-0.5 rounded-full border border-line">
            <Check className="w-3 h-3 text-positive-fg" />
            {statusText}
          </span>
        )}
      </div>

      {/* Center section: Global Command trigger */}
      <button
        onClick={onOpenCommand}
        className="flex items-center gap-2 h-7 px-3 bg-elevated hover:bg-hover border border-line rounded-lg text-caption text-muted hover:text-fg transition-all"
      >
        <Command className="w-3.5 h-3.5" />
        <span>{t("chrome.command")}</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] bg-surface border border-line rounded font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Right section: Theme & Language quick toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLanguage}
          className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-caption font-medium text-muted hover:text-fg hover:bg-hover transition-colors"
          title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="uppercase">{lang}</span>
        </button>

        <button
          onClick={() => setTheme(nextTheme)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-hover transition-colors"
          title={`Theme: ${theme}`}
        >
          {theme === "light" && <Sun className="w-3.5 h-3.5 text-amber-500" />}
          {theme === "dark" && <Moon className="w-3.5 h-3.5 text-concept-fg" />}
          {theme === "system" && <Monitor className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
