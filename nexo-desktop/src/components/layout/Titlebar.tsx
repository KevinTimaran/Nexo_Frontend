import React from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor, Command, Globe, Settings, Sparkles } from "lucide-react";
import { useTheme } from "../../app/providers/ThemeProvider";
import { currentLanguage, setLanguage } from "../../i18n";
import type { Language } from "../../domain/types";
import { ConnectivityStatus } from "../connectivity/ConnectivityStatus";

interface TitlebarProps {
  onOpenCommand: () => void;
  onOpenSettings?: () => void;
  statusText?: string;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  onOpenCommand,
  onOpenSettings,
}) => {
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
      className="
        h-12 shrink-0 titlebar-glass
        flex items-center justify-between px-4 select-none z-30 relative
        border-b border-line/80 dark:border-white/10
      "
    >
      {/* Specular bottom hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
      />

      {/* Left section: Native traffic lights spacing on macOS */}
      <div className="flex items-center gap-3 pl-[72px]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-concept-fg to-concept-fg/80 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="text-body font-bold text-fg tracking-tight">
            {t("app.name")}
          </span>
        </div>
        <div className="h-3.5 w-px bg-line/80 dark:bg-white/10 mx-0.5" />
        <ConnectivityStatus />
      </div>

      {/* Center section: Global Command trigger (Spotlight-style Glass Pill) */}
      <button
        onClick={onOpenCommand}
        className="
          flex items-center gap-2.5 h-7.5 px-3.5
          glass-pill hover:border-concept-fg/40 hover:bg-surface/90
          text-caption text-muted hover:text-fg
          transition-all duration-200 cursor-pointer shadow-xs focus-ring
        "
        title="Buscar comandos y proyectos (⌘K)"
      >
        <Command className="w-3.5 h-3.5 text-concept-fg" />
        <span className="font-medium">{t("chrome.command")}</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-surface/90 dark:bg-white/10 border border-line dark:border-white/10 rounded-md font-mono text-muted/90 shadow-2xs ml-0.5">
          ⌘K
        </kbd>
      </button>

      {/* Right section: Theme & Language quick toggles */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleLanguage}
          className="
            h-7 px-2.5 flex items-center gap-1.5 rounded-lg
            text-[11px] font-semibold text-muted hover:text-fg hover:bg-hover
            border border-transparent hover:border-line/60 dark:hover:border-white/10
            transition-all cursor-pointer focus-ring
          "
          title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
        >
          <Globe className="w-3.5 h-3.5 text-concept-fg" />
          <span className="uppercase">{lang}</span>
        </button>

        <button
          onClick={() => setTheme(nextTheme)}
          className="
            w-7 h-7 flex items-center justify-center rounded-lg
            text-muted hover:text-fg hover:bg-hover
            border border-transparent hover:border-line/60 dark:hover:border-white/10
            transition-all cursor-pointer focus-ring
          "
          title={`Tema: ${theme}`}
          aria-label={`Tema: ${theme}`}
        >
          {theme === "light" && <Sun className="w-3.5 h-3.5 text-amber-500" />}
          {theme === "dark" && <Moon className="w-3.5 h-3.5 text-concept-fg" />}
          {theme === "system" && <Monitor className="w-3.5 h-3.5 text-muted" />}
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="
              w-7 h-7 flex items-center justify-center rounded-lg
              text-muted hover:text-fg hover:bg-hover
              border border-transparent hover:border-line/60 dark:hover:border-white/10
              transition-all cursor-pointer focus-ring
            "
            title={t("nav.settings")}
            aria-label={t("nav.settings")}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
