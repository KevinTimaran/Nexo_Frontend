import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Settings,
  Sun,
  Moon,
  Globe,
  Folder,
} from "lucide-react";
import { useTheme } from "../../app/providers/ThemeProvider";
import { currentLanguage, setLanguage } from "../../i18n";
import type { Project } from "../../domain/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Project[];
  onOpenNewProject: () => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  projects = [],
  onOpenNewProject,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lang = currentLanguage();

  const handleSelectProject = (id: string) => {
    onClose();
    navigate(`/workspace/${id}`);
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    onClose();
  };

  const handleToggleLang = () => {
    void setLanguage(lang === "en" ? "es" : "en");
    onClose();
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl glass-modal specular-sheen rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-white/20 dark:border-white/10">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-line-soft/80 bg-surface-primary/20 backdrop-blur-xs gap-3">
          <Search className="w-4 h-4 text-concept-fg shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("command.placeholder")}
            className="w-full bg-transparent border-none text-fg text-body placeholder:text-muted focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-surface-secondary/70 border border-line-soft text-muted shadow-2xs shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2.5 space-y-1">
          {/* Quick Actions */}
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted/80 uppercase tracking-wider">
            {t("command.actions")}
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenNewProject();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface-secondary/80 hover:border-line-soft/60 border border-transparent transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center border border-concept-fg/20 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span className="font-medium">{t("command.newProject")}</span>
          </button>

          <button
            onClick={handleToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface-secondary/80 hover:border-line-soft/60 border border-transparent transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </div>
            <span className="font-medium">{t("command.toggleTheme")}</span>
          </button>

          <button
            onClick={handleToggleLang}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface-secondary/80 hover:border-line-soft/60 border border-transparent transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-positive-fg/10 text-positive-fg flex items-center justify-center border border-positive-fg/20 group-hover:scale-105 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
            <span className="font-medium">{t("command.switchLanguage")}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface-secondary/80 hover:border-line-soft/60 border border-transparent transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-surface-secondary text-muted flex items-center justify-center border border-line-soft group-hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
            </div>
            <span className="font-medium">{t("command.openSettings")}</span>
          </button>

          {/* Projects Section */}
          {filteredProjects.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted/80 uppercase tracking-wider">
                {t("command.projects")}
              </div>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body text-fg hover:bg-surface-secondary/80 hover:border-line-soft/60 border border-transparent transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center border border-concept-fg/20 shrink-0 group-hover:scale-105 transition-transform">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-body font-medium truncate group-hover:text-concept-fg transition-colors">
                        {project.name}
                      </p>
                      <p className="text-caption text-muted truncate">{project.description}</p>
                    </div>
                  </div>
                  <span className="glass-pill text-[11px] font-mono text-muted shrink-0 ml-2">
                    {project.nodeCount} conceptos
                  </span>
                </button>
              ))}
            </>
          )}

          {query && filteredProjects.length === 0 && (
            <div className="p-6 text-center text-muted text-caption">
              {t("command.empty", { query })}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-2.5 px-4 border-t border-line-soft/80 text-[11px] text-muted flex items-center justify-between bg-surface-primary/30">
          <span className="font-mono">{t("command.hint")}</span>
          <span className="font-semibold text-muted/60 text-[10px] uppercase tracking-wider">Nexo Spotlight</span>
        </div>
      </div>
    </div>
  );
};
