import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 font-sans select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-md cursor-pointer"
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
              bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
              dark:bg-black/20 dark:border-white/10 dark:shadow-2xl
              text-slate-800 dark:text-zinc-100 select-text
            "
          >
            {/* Search Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-white/60 dark:border-white/10 bg-white/30 dark:bg-white/[0.02] backdrop-blur-md gap-3">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("command.placeholder")}
                className="w-full bg-transparent border-none text-slate-800 dark:text-zinc-100 text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10 text-slate-500 dark:text-zinc-400 shadow-2xs shrink-0">
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-white/[0.06] hover:border-line-soft dark:hover:border-white/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
          >
            <div className="w-7 h-7 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center border border-concept-fg/20 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span className="font-medium">{t("command.newProject")}</span>
          </button>

          <button
            onClick={handleToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-white/[0.06] hover:border-line-soft dark:hover:border-white/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </div>
            <span className="font-medium">{t("command.toggleTheme")}</span>
          </button>

          <button
            onClick={handleToggleLang}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-white/[0.06] hover:border-line-soft dark:hover:border-white/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-white/[0.06] hover:border-line-soft dark:hover:border-white/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
          >
            <div className="w-7 h-7 rounded-lg bg-surface/80 dark:bg-white/[0.06] text-muted flex items-center justify-center border border-line-soft dark:border-white/10 group-hover:scale-105 transition-transform">
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
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-body text-fg hover:bg-surface/85 dark:hover:bg-white/[0.06] hover:border-line-soft dark:hover:border-white/10 border border-transparent transition-all text-left group cursor-pointer focus-ring"
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
                  <span className="bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-500 dark:text-zinc-400 shrink-0 ml-2 shadow-2xs">
                    {project.nodeCount} conceptos
                  </span>
                </button>
              ))}
            </>
          )}

          {query && filteredProjects.length === 0 && (
            <div className="p-6 text-center text-slate-500 dark:text-zinc-400 text-xs">
              {t("command.empty", { query })}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-2.5 px-4 border-t border-white/60 dark:border-white/10 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between bg-white/30 dark:bg-white/[0.02]">
          <span className="font-mono">{t("command.hint")}</span>
          <span className="font-semibold text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">Nexo Spotlight</span>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};
