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
      className={`relative h-full sidebar-glass flex flex-col justify-between transition-all duration-300 z-20 ${
        collapsed ? "w-16" : "w-[240px]"
      }`}
    >
      {/* Top Header */}
      <div className="p-3 pt-4 flex items-center justify-between">
        {!collapsed && (
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 px-2 py-1 rounded-md cursor-pointer hover:bg-hover transition-colors"
          >
            <div className="w-6 h-6 rounded bg-concept-fg flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-body font-semibold tracking-tight text-fg leading-none">{t("app.name")}</h1>
            </div>
          </div>
        )}

        {collapsed && (
          <div
            onClick={() => navigate("/")}
            className="w-7 h-7 mx-auto rounded bg-concept-fg flex items-center justify-center text-white shadow-sm cursor-pointer"
            title={t("app.name")}
          >
            <Sparkles className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`text-muted hover:text-fg p-1 rounded-md hover:bg-hover transition-colors ${
            collapsed ? "mx-auto mt-2" : ""
          }`}
          aria-label={collapsed ? t("nav.showSidebar") : t("nav.hideSidebar")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Nav Links */}
      <div className="px-3 py-2 flex-1 overflow-y-auto space-y-4">
        <div>
          <button
            onClick={onOpenNewProject}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-caption font-medium text-concept-fg hover:bg-concept-fg/10 transition-colors ${
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
              `flex items-center gap-2 px-2 py-1.5 rounded-md text-body transition-colors ${
                isActive
                  ? "bg-concept-fg text-white shadow-sm font-medium"
                  : "text-fg hover:bg-hover"
              } ${collapsed ? "justify-center px-0" : ""}`
            }
            title={t("nav.projects")}
          >
            {({ isActive }) => (
              <>
                <FolderKanban className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-concept-fg"}`} />
                {!collapsed && <span>{t("nav.projects")}</span>}
              </>
            )}
          </NavLink>
        </div>

        {/* Recent Projects sub-list */}
        {!collapsed && recentProjects.length > 0 && (
          <div>
            <div className="px-2 pb-1 text-[11px] font-semibold text-muted tracking-wide">
              {t("home.recent")}
            </div>
            <div className="space-y-0.5">
              {recentProjects.slice(0, 5).map((project) => {
                const isActive = location.pathname.includes(project.id) || activeProjectId === project.id;
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-body truncate transition-colors flex items-center justify-between ${
                      isActive
                        ? "bg-selected text-fg font-medium"
                        : "text-fg hover:bg-hover"
                    }`}
                  >
                    <span className="truncate">{project.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer / User Settings */}
      <div className="p-3 space-y-1">
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-body text-fg hover:bg-hover transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={t("nav.settings")}
        >
          <SettingsIcon className="w-4 h-4 text-muted shrink-0" />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </button>

        {!collapsed && user && (
          <div className="mt-2 flex items-center justify-between px-2 pt-2 border-t border-line-soft">
            <div className="min-w-0 pr-2">
              <p className="text-caption font-medium text-fg truncate">{user.name}</p>
            </div>
            <button
              onClick={() => void signOut()}
              className="text-muted hover:text-risk-fg p-1 rounded-md hover:bg-hover transition-colors"
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
