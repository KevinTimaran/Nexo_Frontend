import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Search,
  Plus,
  Lightbulb,
  Leaf,
  Scale,
  Rocket,
  Book,
  Compass,
  Layers,
  MoreHorizontal,
  Settings,
  LogOut,
  ExternalLink,
  Copy,
  Archive,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { currentLanguage } from "../../i18n";
import { services } from "../../services";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { CreateProjectModal } from "./CreateProjectModal";
import type { Project, ProjectIcon, ProjectStatus, NewProjectInput } from "../../domain/types";

interface DashboardViewProps {
  onOpenNewProject?: () => void;
  onOpenSettings?: () => void;
  onProjectsLoaded?: (projects: Project[]) => void;
}

const ICON_MAP: Record<ProjectIcon, React.ReactNode> = {
  lightbulb: <Lightbulb className="w-5 h-5" />,
  leaf: <Leaf className="w-5 h-5" />,
  scale: <Scale className="w-5 h-5" />,
  rocket: <Rocket className="w-5 h-5" />,
  book: <Book className="w-5 h-5" />,
  compass: <Compass className="w-5 h-5" />,
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewProject,
  onOpenSettings,
  onProjectsLoaded,
}) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const outlet = useOutletContext<{ onOpenSettings?: () => void; onOpenNewProject?: () => void }>() || {};
  const [internalCreateModalOpen, setInternalCreateModalOpen] = useState(false);

  const handleNewProject = () => {
    if (onOpenNewProject) {
      onOpenNewProject();
    } else if (outlet.onOpenNewProject) {
      outlet.onOpenNewProject();
    } else {
      setInternalCreateModalOpen(true);
    }
  };

  const handleOpenSettings = onOpenSettings || outlet.onOpenSettings || (() => {});
  const lang = currentLanguage();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleCreateProjectInternal = async (input: NewProjectInput) => {
    const created = await services.projects.create(input);
    setInternalCreateModalOpen(false);
    showToast(t("projects.create.created", { name: created.name }), "success");
    navigate(`/workspace/${created.id}`);
  };

  // Close options menu on global click outside
  useEffect(() => {
    if (!activeMenuProjectId) return;
    const handleGlobalClick = () => setActiveMenuProjectId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [activeMenuProjectId]);

  const handleDuplicateProject = (project: Project) => {
    setActiveMenuProjectId(null);
    const newId = `p-${Math.random().toString(36).slice(2, 9)}`;
    const duplicated: Project = {
      ...project,
      id: newId,
      name: `${project.name} (Copia)`,
      updatedAt: new Date().toISOString(),
    };
    const nextList = [duplicated, ...projects];
    setProjects(nextList);
    try {
      const stored = JSON.parse(localStorage.getItem("nexo.mock.projects") || "[]");
      localStorage.setItem("nexo.mock.projects", JSON.stringify([duplicated, ...stored]));
    } catch {
      /* ignore */
    }
    showToast(`Proyecto "${duplicated.name}" duplicado`, "success");
  };

  const handleToggleArchiveProject = (project: Project) => {
    setActiveMenuProjectId(null);
    const nextStatus: ProjectStatus = project.status === "archived" ? "active" : "archived";
    const nextList = projects.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p));
    setProjects(nextList);
    try {
      const stored = JSON.parse(localStorage.getItem("nexo.mock.projects") || "[]") as Project[];
      const updatedStored = stored.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p));
      localStorage.setItem("nexo.mock.projects", JSON.stringify(updatedStored));
    } catch {
      /* ignore */
    }
    showToast(
      nextStatus === "archived" ? `Proyecto "${project.name}" archivado` : `Proyecto "${project.name}" reactivado`,
      "info"
    );
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    const target = projectToDelete;
    setProjectToDelete(null);
    const nextList = projects.filter((p) => p.id !== target.id);
    setProjects(nextList);
    try {
      const stored = JSON.parse(localStorage.getItem("nexo.mock.projects") || "[]") as Project[];
      const updatedStored = stored.filter((p) => p.id !== target.id);
      localStorage.setItem("nexo.mock.projects", JSON.stringify(updatedStored));
    } catch {
      /* ignore */
    }
    showToast(`Proyecto "${target.name}" eliminado correctamente`, "info");
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await services.projects.list(lang);
      setProjects(data);
      if (onProjectsLoaded) onProjectsLoaded(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [lang]);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="relative h-full w-full p-3 sm:p-5 flex flex-col bg-transparent overflow-hidden select-none animate-fade-in">
      {/* ─── Creative Glass Floating Island ─── */}
      <div
        className="
          relative z-10 flex-1 flex flex-col min-h-0
          rounded-[32px] overflow-hidden
          border border-line/80 dark:border-white/12
          bg-surface/85 dark:bg-zinc-950/85
          backdrop-blur-3xl backdrop-saturate-[180%]
          shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),inset_0_1px_0_0_rgba(255,255,255,0.85)]
          dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.08)]
        "
      >
        {/* Specular hairline top reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-20"
        />

        {/* Top action bar */}
        <div className="relative z-10 px-7 sm:px-8 py-5.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 border-b border-line/60 dark:border-white/10 bg-surface/40 dark:bg-white/[0.02]">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg">
              {t("nav.projects")}
            </h1>
            {user && (
              <p className="text-caption text-muted mt-0.5">
                {t("home.greeting.morning", { name: user.name })} · {t("home.description")}
              </p>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-stretch md:self-auto justify-end">
            <div className="w-48 sm:w-60">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("projects.searchPlaceholder")}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <Button
              variant="primary"
              onClick={handleNewProject}
              icon={<Plus className="w-4 h-4" />}
            >
              {t("projects.newCard.title")}
            </Button>

            <div className="hidden sm:block h-6 w-px bg-line/80 dark:bg-white/10 mx-0.5" />

            <button
              type="button"
              onClick={handleOpenSettings}
              className="
                h-9 w-9 flex items-center justify-center rounded-xl
                bg-surface/85 dark:bg-white/[0.06]
                border border-line/80 dark:border-white/10
                text-muted hover:text-fg hover:bg-hover
                shadow-xs hover:shadow-sm hover:scale-105 active:scale-95
                transition-all duration-200 focus-ring cursor-pointer
              "
              title={t("nav.settings")}
              aria-label={t("nav.settings")}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile Pill */}
            <div
              className="
                flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl
                bg-surface/85 dark:bg-white/[0.06]
                border border-line/80 dark:border-white/10
                shadow-xs text-fg backdrop-blur-md
              "
            >
              <div
                className="
                  w-6 h-6 rounded-lg bg-gradient-to-br from-concept-fg to-concept-fg/80
                  text-white text-[11px] font-bold flex items-center justify-center shadow-xs select-none
                "
              >
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <span className="text-caption font-semibold hidden lg:inline truncate max-w-[100px]">
                {user?.name || "Usuario"}
              </span>

              <button
                type="button"
                onClick={() => void signOut()}
                className="
                  text-muted hover:text-danger-fg p-1 rounded-md
                  hover:bg-danger-fg/10 transition-colors focus-ring cursor-pointer
                "
                title={t("settings.signOut")}
                aria-label={t("settings.signOut")}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter chips (Creative Glass Pill) */}
        <div className="relative z-10 px-7 sm:px-8 pt-4 pb-2 shrink-0">
          <div className="inline-flex glass-pill p-1 rounded-2xl shadow-xs">
            {(["all", "active", "draft", "archived"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`
                  px-4 py-1.5 rounded-xl text-caption font-semibold transition-all duration-200 cursor-pointer focus-ring
                  ${
                    statusFilter === st
                      ? "bg-surface/95 dark:bg-white/[0.1] text-fg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] border border-line-soft dark:border-white/10 scale-100"
                      : "text-muted hover:text-fg hover:bg-hover/50 scale-[0.98]"
                  }
                `}
              >
                {st === "all" ? t("projects.filters.all") : t(`projects.filters.${st}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 sm:px-8 pt-3 pb-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="min-h-[195px] rounded-[26px] bg-sunken/60 border border-line/60 animate-pulse shadow-sm"
                />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-12 h-12 rounded-2xl bg-surface/80 border border-line flex items-center justify-center text-muted mb-3 shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-body font-bold text-fg">{t("projects.empty.title")}</h3>
              <p className="text-caption text-muted mt-1 max-w-sm">{t("projects.empty.description")}</p>
              <div className="mt-4 flex items-center gap-3">
                {search || statusFilter !== "all" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                  >
                    {t("common.clearSearch")}
                  </Button>
                ) : null}
                <Button variant="primary" onClick={handleNewProject} icon={<Plus className="w-4 h-4" />}>
                  {t("projects.newCard.title")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {/* "Nuevo Proyecto" dashed dropzone */}
              <div
                onClick={handleNewProject}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNewProject();
                  }
                }}
                className="
                  group relative flex flex-col justify-center items-center text-center p-6
                  min-h-[195px] rounded-[26px] cursor-pointer
                  border-2 border-dashed border-line/80 hover:border-concept-fg/60 dark:border-white/15 dark:hover:border-concept-fg/60
                  bg-surface/50 hover:bg-surface/85 dark:bg-white/[0.02] dark:hover:bg-white/[0.06]
                  backdrop-blur-xl
                  shadow-[0_8px_20px_-6px_rgba(15,23,42,0.04)]
                  hover:shadow-[0_18px_36px_-8px_rgba(15,23,42,0.1)]
                  hover:-translate-y-1 active:translate-y-0
                  transition-all duration-300 ease-out focus-ring
                "
              >
                <div
                  className="
                    w-12 h-12 rounded-2xl mb-3
                    bg-concept-fg/10 text-concept-fg
                    flex items-center justify-center
                    border border-concept-fg/20
                    group-hover:scale-110 group-hover:bg-concept-fg group-hover:text-white
                    transition-all duration-300 shadow-xs
                  "
                >
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors">
                  {t("projects.newCard.title")}
                </h3>
                <p className="text-caption text-muted mt-1 max-w-[180px] leading-relaxed">
                  {t("projects.newCard.hint")}
                </p>
              </div>

              {/* Project Cards (Creative Glass) */}
              {filteredProjects.map((project) => {
                const isMenuOpen = activeMenuProjectId === project.id;
                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/workspace/${project.id}`);
                      }
                    }}
                    className={`
                      group relative flex flex-col justify-between p-5
                      min-h-[195px] rounded-[26px] cursor-pointer
                      border border-line/80 dark:border-white/10
                      bg-surface/80 dark:bg-surface/50
                      backdrop-blur-2xl backdrop-saturate-150
                      shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),inset_0_1px_0_0_rgba(255,255,255,0.8)]
                      dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                      hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.12),inset_0_1px_0_0_rgba(255,255,255,0.95)]
                      dark:hover:shadow-[0_22px_45px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.14)]
                      hover:border-concept-fg/40 dark:hover:border-concept-fg/40
                      hover:-translate-y-1 active:translate-y-0
                      transition-all duration-300 ease-out focus-ring
                      ${isMenuOpen ? "z-30 !translate-y-0 shadow-lg" : "z-10"}
                    `}
                  >
                    {/* Top specular hairline sheen */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-[25px] bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 opacity-80"
                    />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3 relative">
                        <div
                          className="
                            w-11 h-11 rounded-2xl
                            bg-gradient-to-b from-concept-fg/15 to-concept-fg/5
                            text-concept-fg flex items-center justify-center
                            border border-concept-fg/20 shadow-xs
                            group-hover:scale-105 group-hover:shadow-sm
                            transition-transform duration-300
                          "
                        >
                          {ICON_MAP[project.icon] || <Layers className="w-5 h-5" />}
                        </div>

                        {/* 3-dots Menu Button */}
                        <div
                          className="relative"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuProjectId(isMenuOpen ? null : project.id);
                            }}
                            className={`
                              p-2 rounded-xl hover:bg-hover transition-all duration-200 cursor-pointer focus-ring
                              ${isMenuOpen ? "opacity-100 bg-hover text-fg" : "text-muted hover:text-fg opacity-0 group-hover:opacity-100"}
                            `}
                            aria-label="Más opciones"
                            title="Opciones del proyecto"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Creative Glass Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="
                                absolute right-0 top-10 z-50 w-56
                                rounded-2xl p-2
                                border border-line/80 dark:border-white/12
                                bg-surface/96 dark:bg-zinc-950/96
                                backdrop-blur-3xl backdrop-saturate-[180%]
                                shadow-[0_20px_45px_-8px_rgba(15,23,42,0.22),inset_0_1px_0_0_rgba(255,255,255,0.8)]
                                dark:shadow-[0_24px_50px_-8px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                                animate-scale-in text-fg select-none
                              "
                            >
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuProjectId(null);
                                  navigate(`/workspace/${project.id}`);
                                }}
                                className="
                                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body font-medium
                                  hover:bg-hover active:bg-selected transition-colors text-left cursor-pointer
                                "
                              >
                                <ExternalLink className="w-4 h-4 text-concept-fg shrink-0" />
                                <span>Abrir diseño</span>
                              </button>

                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateProject(project);
                                }}
                                className="
                                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body font-medium
                                  hover:bg-hover active:bg-selected transition-colors text-left cursor-pointer
                                "
                              >
                                <Copy className="w-4 h-4 text-concept-fg shrink-0" />
                                <span>Duplicar diseño</span>
                              </button>

                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleArchiveProject(project);
                                }}
                                className="
                                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body font-medium
                                  hover:bg-hover active:bg-selected transition-colors text-left cursor-pointer
                                "
                              >
                                <Archive className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>
                                  {project.status === "archived" ? "Restaurar a Activo" : "Archivar proyecto"}
                                </span>
                              </button>

                              <div className="my-1.5 h-px bg-line/60 dark:bg-white/10" />

                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuProjectId(null);
                                  setProjectToDelete(project);
                                }}
                                className="
                                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body font-semibold
                                  text-danger-fg hover:bg-danger-fg/15 active:bg-danger-fg/25 transition-colors text-left cursor-pointer
                                "
                              >
                                <Trash2 className="w-4 h-4 shrink-0 text-danger-fg" />
                                <span>Eliminar proyecto</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors duration-200 line-clamp-1">
                        {project.name}
                      </h3>
                      <p className="text-caption text-muted mt-1.5 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between mt-5 pt-3.5 border-t border-line/60 dark:border-white/5">
                      <span className="text-[11px] font-medium text-muted">
                        {project.nodeCount} {project.nodeCount === 1 ? "concepto" : "conceptos"}
                      </span>
                      <Badge
                        kind={
                          project.status === "active"
                            ? "concept"
                            : project.status === "draft"
                            ? "viability"
                            : "default"
                        }
                      >
                        {t(`projects.status.${project.status}`)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="¿Eliminar proyecto?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-muted leading-relaxed">
            ¿Estás seguro de que deseas eliminar{" "}
            <strong className="text-fg font-semibold">«{projectToDelete?.name}»</strong>?
            Esta acción borrará el diseño y todos sus conceptos de forma permanente.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line-soft">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setProjectToDelete(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={confirmDeleteProject}
            >
              Eliminar proyecto
            </Button>
          </div>
        </div>
      </Modal>

      {/* Internal Create Project Modal */}
      <CreateProjectModal
        isOpen={internalCreateModalOpen}
        onClose={() => setInternalCreateModalOpen(false)}
        onSubmit={handleCreateProjectInternal}
      />
    </div>
  );
};
