import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Titlebar } from "./Titlebar";
import { CommandPalette } from "../navigation/CommandPalette";
import { SettingsModal } from "../../features/settings/SettingsModal";
import { CreateProjectModal } from "../../features/dashboard/CreateProjectModal";
import { services } from "../../services";
import { useToast } from "../../context/ToastContext";
import { currentLanguage } from "../../i18n";
import type { NewProjectInput, Project } from "../../domain/types";

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  const navigate = useNavigate();
  const lang = currentLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    services.projects
      .list(lang)
      .then(setRecentProjects)
      .catch(() => {});
  }, [lang, location.pathname]);

  // Global Cmd+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateProject = async (input: NewProjectInput) => {
    const created = await services.projects.create(input);
    showToast(t("projects.create.created", { name: created.name }), "success");
    setRecentProjects((prev) => [created, ...prev]);
    navigate(`/workspace/${created.id}`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden select-none">
      {/* Native Desktop Titlebar */}
      <Titlebar
        onOpenCommand={() => setCommandPaletteOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* View Content Area */}
        <main className="flex-1 h-full overflow-hidden relative bg-app">
          <Outlet
            context={{
              onOpenSettings: () => setSettingsOpen(true),
              onOpenNewProject: () => setCreateProjectOpen(true),
            }}
          />
        </main>
      </div>

      {/* Global Modals & Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        projects={recentProjects}
        onOpenNewProject={() => setCreateProjectOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};
