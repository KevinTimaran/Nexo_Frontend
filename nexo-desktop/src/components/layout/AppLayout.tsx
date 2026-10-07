import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Titlebar } from "./Titlebar";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../navigation/CommandPalette";
import { SettingsModal } from "../../features/settings/SettingsModal";
import { CreateProjectModal } from "../../features/dashboard/CreateProjectModal";
import { mockServices } from "../../services/mock";
import { useToast } from "../../context/ToastContext";
import { currentLanguage } from "../../i18n";
import type { NewProjectInput, Project } from "../../domain/types";

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const lang = currentLanguage();
  const { showToast } = useToast();

  const isWorkspace = location.pathname.startsWith("/workspace");
  const activeProjectId = isWorkspace ? location.pathname.split("/")[2] : undefined;

  useEffect(() => {
    mockServices.projects
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
    const created = await mockServices.projects.create(input);
    showToast(`Project "${created.name}" created!`, "success");
    setRecentProjects((prev) => [created, ...prev]);
    navigate(`/workspace/${created.id}`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden select-none">
      {/* Native Desktop Titlebar */}
      <Titlebar
        onOpenCommand={() => setCommandPaletteOpen(true)}
        statusText="Nexo Engine Ready"
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenNewProject={() => setCreateProjectOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          recentProjects={recentProjects}
          activeProjectId={activeProjectId}
        />

        {/* View Content Area */}
        <main className="flex-1 h-full overflow-y-auto relative bg-app">
          <Outlet />
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
