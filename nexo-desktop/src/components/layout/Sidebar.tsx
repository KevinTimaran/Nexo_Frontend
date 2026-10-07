import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FolderKanban,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { Project } from "../../domain/types";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenNewProject: () => void;
  onOpenSettings: () => void;
  recentProjects?: Project[];
  activeProjectId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  onOpenNewProject,
  onOpenSettings,
  recentProjects = [],
  activeProjectId,
}) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`relative h-full glass border-r border-line flex flex-col justify-between transition-all duration-300 z-20 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Top Header */}
      <div className="p-3 border-b border-line-soft flex items-center justify-between">
        {!collapsed && (
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 px-2 py-1 rounded-xl cursor-pointer hover:bg-hover transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-body font-bold tracking-tight text-fg">{t("app.name")}</h1>
              <p className="text-[10px] text-muted leading-tight">{t("app.tagline")}</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div
            onClick={() => navigate("/")}
            className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md cursor-pointer"
            title={t("app.name")}
          >
            <Sparkles className="w-4.5 h-4.5" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`text-muted hover:text-fg p-1.5 rounded-lg hover:bg-hover transition-colors ${
            collapsed ? "mx-auto mt-2" : ""
          }`}
          aria-label={collapsed ? t("nav.showSidebar") : t("nav.hideSidebar")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Nav Links */}
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
        <button
          onClick={onOpenNewProject}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-caption font-semibold bg-concept-fg/10 text-concept-fg hover:bg-concept-fg/20 border border-concept-fg/20 transition-all ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t("projects.newCard.title")}</span>}
        </button>

        <div className="h-2" />

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-body transition-colors ${
              isActive
                ? "bg-selected text-fg font-medium"
                : "text-muted hover:text-fg hover:bg-hover"
            } ${collapsed ? "justify-center px-0" : ""}`
          }
          title={t("nav.projects")}
        >
          <FolderKanban className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t("nav.projects")}</span>}
        </NavLink>

        {/* Recent Projects sub-list */}
        {!collapsed && recentProjects.length > 0 && (
          <div className="pt-3 pb-1">
            <div className="px-3 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
              {t("home.recent")}
            </div>
            <div className="space-y-0.5">
              {recentProjects.slice(0, 5).map((project) => {
                const isActive = location.pathname.includes(project.id) || activeProjectId === project.id;
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-caption truncate transition-colors flex items-center justify-between ${
                      isActive
                        ? "bg-selected text-fg font-medium"
                        : "text-muted hover:text-fg hover:bg-hover"
                    }`}
                  >
                    <span className="truncate">{project.name}</span>
                    <span className="text-[10px] text-muted shrink-0 ml-1">{project.nodeCount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer / User Settings */}
      <div className="p-2 border-t border-line-soft space-y-1">
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-body text-muted hover:text-fg hover:bg-hover transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={t("nav.settings")}
        >
          <SettingsIcon className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </button>

        {!collapsed && user && (
          <div className="pt-2 border-t border-line-soft px-2 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-caption font-semibold text-fg truncate">{user.name}</p>
              <p className="text-[10px] text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={() => void signOut()}
              className="text-muted hover:text-risk-fg p-1.5 rounded-lg hover:bg-hover transition-colors"
              title={t("settings.signOut")}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
