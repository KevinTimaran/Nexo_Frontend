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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl glass border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-line-soft">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("command.placeholder")}
            className="w-full h-12 bg-transparent border-none text-fg text-body placeholder:text-muted focus:outline-none px-3"
          />
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {/* Quick Actions */}
          <div className="px-3 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
            {t("command.actions")}
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenNewProject();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-hover transition-colors text-left"
          >
            <Plus className="w-4 h-4 text-concept-fg" />
            <span>{t("command.newProject")}</span>
          </button>

          <button
            onClick={handleToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-hover transition-colors text-left"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-concept-fg" />}
            <span>{t("command.toggleTheme")}</span>
          </button>

          <button
            onClick={handleToggleLang}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-hover transition-colors text-left"
          >
            <Globe className="w-4 h-4 text-positive-fg" />
            <span>{t("command.switchLanguage")}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-hover transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-muted" />
            <span>{t("command.openSettings")}</span>
          </button>

          {/* Projects Section */}
          {filteredProjects.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                {t("command.projects")}
              </div>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body text-fg hover:bg-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Folder className="w-4 h-4 text-concept-fg shrink-0" />
                    <div className="truncate">
                      <p className="text-body font-medium truncate">{project.name}</p>
                      <p className="text-caption text-muted truncate">{project.description}</p>
                    </div>
                  </div>
                  <span className="text-caption text-muted shrink-0">{project.nodeCount} concepts</span>
                </button>
              ))}
            </>
          )}

          {query && filteredProjects.length === 0 && (
            <div className="p-4 text-center text-muted text-caption">
              {t("command.empty", { query })}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-2.5 border-t border-line-soft text-caption text-muted text-center bg-elevated/50 font-mono text-[11px]">
          {t("command.hint")}
        </div>
      </div>
    </div>
  );
};
