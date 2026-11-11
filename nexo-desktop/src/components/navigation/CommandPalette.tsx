import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Settings,
  Globe,
  Folder,
} from "lucide-react";
import { currentLanguage, setLanguage } from "../../i18n";
import type { Project } from "../../domain/types";
import { useDialogFocus } from "../../hooks/useDialogFocus";

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
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, dialogRef, { onEscape: onClose, trap: true });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const lang = currentLanguage();

  const handleSelectProject = (id: string) => {
    onClose();
    navigate(`/workspace/${id}`);
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 font-sans select-none">
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("command.label")}
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-app/35 dark:bg-app/65 backdrop-blur-md cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="
              relative z-10 w-full max-w-xl rounded-3xl overflow-hidden
              bg-surface/70 backdrop-blur-2xl border border-line/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
              dark:bg-app/20 dark:border-line/10 dark:shadow-2xl
              text-fg dark:text-fg select-text
            "
          >
            {/* Search Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-line/60 dark:border-line/10 bg-surface/30 dark:bg-surface/[0.02] backdrop-blur-md gap-3">
              <Search className="w-4 h-4 text-primary dark:text-primary shrink-0" />
              <input
                ref={inputRef}
                data-dialog-initial-focus
                aria-label={t("command.placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("command.placeholder")}
                className="w-full bg-transparent border-none text-fg dark:text-fg text-sm placeholder:text-muted dark:placeholder:text-muted focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-surface/60 dark:bg-surface/10 border border-line/80 dark:border-line/10 text-muted dark:text-muted shadow-2xs shrink-0">
                ESC
              </kbd>
            </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2.5 pb-4 space-y-1">
          {/* Quick Actions */}
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
            {t("command.actions")}
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenNewProject();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-surface/[0.06] hover:border-line-soft dark:hover:border-line/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
          >
            <div className="w-7 h-7 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center border border-concept-fg/20 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span className="font-medium">{t("command.newProject")}</span>
          </button>

          <button
            onClick={handleToggleLang}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-surface/[0.06] hover:border-line-soft dark:hover:border-line/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-surface/[0.06] hover:border-line-soft dark:hover:border-line/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
          >
            <div className="w-7 h-7 rounded-lg bg-surface/80 dark:bg-surface/[0.06] text-muted flex items-center justify-center border border-line-soft dark:border-line/10 group-hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
            </div>
            <span className="font-medium">{t("command.openSettings")}</span>
          </button>

          {/* Projects Section */}
          {filteredProjects.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                {t("command.projects")}
              </div>
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-surface/[0.06] hover:border-line-soft dark:hover:border-line/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
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
                  <span className="bg-surface/60 dark:bg-surface/10 border border-line/80 dark:border-line/10 px-2 py-0.5 rounded-md text-[11px] font-mono text-muted dark:text-muted shrink-0 ml-2 shadow-2xs">
                    {project.nodeCount} conceptos
                  </span>
                </button>
              ))}
            </>
          )}

          {query && filteredProjects.length === 0 && (
            <div className="p-6 text-center text-muted dark:text-muted text-xs">
              {t("command.empty", { query })}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-2.5 px-4 border-t border-line/60 dark:border-line/10 text-[11px] text-muted dark:text-muted flex items-center justify-between bg-surface/30 dark:bg-surface/[0.02]">
          <span className="font-mono">{t("command.hint")}</span>
          <span className="font-semibold text-muted dark:text-muted text-[10px] uppercase tracking-wider">Nexo Spotlight</span>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};
