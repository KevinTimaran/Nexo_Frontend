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
      className={`
        relative h-full sidebar-glass flex flex-col justify-between transition-all duration-300 z-20
        border-r border-line/80 dark:border-white/10
        ${collapsed ? "w-16" : "w-[240px]"}
      `}
    >
      {/* Top Header */}
      <div className="p-3 pt-3.5 flex items-center justify-between">
        {!collapsed && (
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 px-2 py-1 rounded-xl cursor-pointer hover:bg-hover transition-colors"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-concept-fg to-concept-fg/80 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-body font-bold tracking-tight text-fg leading-none">
                {t("app.name")}
              </h1>
            </div>
          </div>
        )}

        {collapsed && (
          <div
            onClick={() => navigate("/")}
            className="w-7 h-7 mx-auto rounded-lg bg-gradient-to-br from-concept-fg to-concept-fg/80 flex items-center justify-center text-white shadow-xs cursor-pointer"
            title={t("app.name")}
          >
            <Sparkles className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`
            text-muted hover:text-fg p-1.5 rounded-lg hover:bg-hover transition-colors cursor-pointer focus-ring
            ${collapsed ? "mx-auto mt-2" : ""}
          `}
          aria-label={collapsed ? t("nav.showSidebar") : t("nav.hideSidebar")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Nav Links */}
      <div className="px-3 py-2 flex-1 overflow-y-auto space-y-4">
        <div className="space-y-1.5">
          <button
            onClick={onOpenNewProject}
            className={`
              w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl
              text-caption font-semibold text-concept-fg
              bg-concept-fg/10 hover:bg-concept-fg/15 border border-concept-fg/20
              backdrop-blur-md shadow-2xs hover:shadow-xs active:scale-[0.98]
              transition-all duration-200 cursor-pointer focus-ring
              ${collapsed ? "justify-center px-0" : ""}
            `}
            title={t("projects.newCard.title")}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{t("projects.newCard.title")}</span>}
          </button>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-body transition-all duration-200 focus-ring cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-concept-fg to-concept-fg/90 text-white font-semibold shadow-[0_4px_14px_-3px_rgba(37,99,235,0.45),inset_0_1px_0_0_rgba(255,255,255,0.3)]"
                  : "text-fg/80 hover:text-fg hover:bg-hover"
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
          <div className="pt-2">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-muted uppercase tracking-wider">
              {t("home.recent")}
            </div>
            <div className="space-y-0.5">
              {recentProjects.slice(0, 5).map((project) => {
                const isActive = location.pathname.includes(project.id) || activeProjectId === project.id;
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className={`
                      w-full text-left px-2.5 py-1.5 rounded-xl text-body truncate
                      transition-all duration-150 flex items-center justify-between cursor-pointer focus-ring
                      ${
                        isActive
                          ? "bg-surface/90 dark:bg-white/[0.08] text-fg font-semibold border border-line-soft dark:border-white/10 shadow-2xs"
                          : "text-muted hover:text-fg hover:bg-hover"
                      }
                    `}
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
      <div className="p-3 space-y-1.5 border-t border-line/60 dark:border-white/10">
        <button
          onClick={onOpenSettings}
          className={`
            w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-body text-fg hover:bg-hover transition-colors cursor-pointer focus-ring
            ${collapsed ? "justify-center px-0" : ""}
          `}
          title={t("nav.settings")}
        >
          <SettingsIcon className="w-4 h-4 text-muted shrink-0" />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </button>

        {!collapsed && user && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface/60 dark:bg-white/[0.03] border border-line-soft dark:border-white/10 shadow-2xs">
            <div className="min-w-0 pr-2">
              <p className="text-caption font-semibold text-fg truncate">{user.name}</p>
              <p className="text-[10px] text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={() => void signOut()}
              className="text-muted hover:text-danger-fg p-1 rounded-lg hover:bg-hover transition-colors cursor-pointer focus-ring"
              title={t("settings.signOut")}
              aria-label={t("settings.signOut")}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
