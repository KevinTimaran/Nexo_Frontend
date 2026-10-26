import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Settings,
  User,
  Search,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Archive,
  Trash2,
  X,
  LogOut,
  Layers,
  Lightbulb,
  Leaf,
  Scale,
  Rocket,
  Book,
  Compass,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { currentLanguage } from "../../i18n";
import { services } from "../../services";
import { Button } from "../../components/ui/Button";
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const lang = currentLanguage();
  const handleOpenSettings = onOpenSettings || outlet.onOpenSettings || (() => {});

  const handleNewProject = () => {
    if (onOpenNewProject) {
      onOpenNewProject();
    } else if (outlet.onOpenNewProject) {
      outlet.onOpenNewProject();
    } else {
      setInternalCreateModalOpen(true);
    }
  };

  const handleCreateProjectInternal = async (input: NewProjectInput) => {
    const created = await services.projects.create(input);
    setInternalCreateModalOpen(false);
    showToast(t("projects.create.created", { name: created.name }), "success");
    navigate(`/workspace/${created.id}`);
  };

  // Close menus on outside click and Escape key
  useEffect(() => {
    if (!activeMenuProjectId && !profileMenuOpen) return;
    const handleGlobalClick = () => {
      setActiveMenuProjectId(null);
      setProfileMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuProjectId(null);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenuProjectId, profileMenuOpen]);

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

  const formatLastModified = (isoString?: string) => {
    if (!isoString) return "Reciente";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - date.getTime());
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 5) return "Hace un momento";
      if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays === 1) return "Ayer";
      if (diffDays < 7) return `Hace ${diffDays}d`;
      return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    } catch {
      return "Reciente";
    }
  };

  return (
    <div className="relative h-full w-full flex bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ─── 1. Ambient VisionOS Light Orbs ─── */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] lg:w-[650px] lg:h-[650px] rounded-full bg-indigo-900/50 blur-[100px] z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] lg:w-[650px] lg:h-[650px] rounded-full bg-emerald-900/30 blur-[100px] z-0"
        aria-hidden="true"
      />

      {/* ─── 2 & 3. Sidebar (Izquierda - Barra lateral flotante estilo Isla) ─── */}
      <aside
        className="
          relative z-20 m-4 w-16 flex flex-col items-center justify-between py-6 rounded-3xl
          bg-white/5 dark:bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl shrink-0
        "
        aria-label="Navegación lateral"
      >
        {/* Top: Inicio */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              gridRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="
              w-11 h-11 rounded-2xl flex items-center justify-center
              bg-white/15 text-white border border-white/20 shadow-lg
              hover:bg-white/25 active:scale-95 cursor-pointer transition-all duration-200
            "
            title="Inicio"
            aria-label="Inicio"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom: Ajustes & Perfil */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleOpenSettings}
            className="
              w-11 h-11 rounded-2xl flex items-center justify-center
              text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 border border-transparent hover:border-white/10
              cursor-pointer transition-all duration-200
            "
            title="Ajustes"
            aria-label="Ajustes"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setProfileMenuOpen((prev) => !prev);
              }}
              className={`
                w-11 h-11 rounded-2xl flex items-center justify-center
                active:scale-95 transition-all duration-200 cursor-pointer
                ${
                  profileMenuOpen
                    ? "bg-white/20 text-white border border-white/25 shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10"
                }
              `}
              title={user?.name || "Perfil"}
              aria-label="Perfil de usuario"
            >
              <User className="w-5 h-5" />
            </button>

            {/* Glass Profile Popover */}
            {profileMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="
                  absolute left-16 bottom-0 z-50 w-56 p-3 rounded-2xl
                  bg-slate-900/95 backdrop-blur-3xl border border-white/15 shadow-2xl
                  text-slate-100 flex flex-col gap-2 animate-scale-in
                "
              >
                <div className="px-2 py-1">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || "Usuario"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || "usuario@ejemplo.com"}</p>
                </div>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="
                    flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-rose-400
                    hover:bg-rose-500/15 transition-colors w-full cursor-pointer text-left
                  "
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <main className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden p-6 pl-2">
        {/* ─── 3. Header (Arriba) ─── */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-white">
              Buenos días, {user?.name || "Usuario"}
            </h1>
            <p className="text-xs sm:text-sm font-light text-slate-400 mt-1.5">
              {t("home.description", "Retoma donde lo dejaste o empieza a dar forma a una nueva idea.")}
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            {/* Buscador expansible con fondo de cristal */}
            <div
              className={`
                flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl
                bg-white/5 dark:bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl
                transition-all duration-300 ease-out
                ${searchFocused || search ? "w-64 sm:w-80 lg:w-96 border-white/25 ring-1 ring-white/15" : "w-48 sm:w-60"}
              `}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={t("projects.searchPlaceholder", "Buscar proyectos...")}
                className="bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none w-full font-light"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ─── Filter Pills Bar ─── */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 dark:bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl shrink-0">
            {(["all", "active", "draft", "archived"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`
                  px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer
                  ${
                    statusFilter === st
                      ? "bg-white/15 text-white border border-white/20 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }
                `}
              >
                {st === "all" ? t("projects.filters.all", "Todos") : t(`projects.filters.${st}`)}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            {filteredProjects.length} {filteredProjects.length === 1 ? "proyecto" : "proyectos"}
          </span>
        </div>

        {/* ─── Grid de Proyectos (Centro) ─── */}
        <div ref={gridRef} className="flex-1 overflow-y-auto pr-2 pb-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="
                    min-h-[220px] rounded-3xl p-6
                    bg-white/5 dark:bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl
                    animate-pulse flex flex-col justify-between
                  "
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white/10" />
                    <div className="w-20 h-5 rounded-full bg-white/10" />
                  </div>
                  <div className="space-y-2 my-4">
                    <div className="w-3/4 h-5 rounded-md bg-white/10" />
                    <div className="w-full h-3.5 rounded-md bg-white/5" />
                  </div>
                  <div className="h-6 w-1/2 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 && (search || statusFilter !== "all") ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white">
                {t("projects.noResults.title", "No hay proyectos coincidentes")}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {t("projects.noResults.description", "Prueba con otro término o limpia los filtros.")}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer"
                >
                  {t("common.clearSearch", "Borrar búsqueda")}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* ─── 5. TARJETA DE "NUEVO PROYECTO" ─── */}
              <motion.div
                whileHover={{ y: -5, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
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
                  min-h-[220px] rounded-3xl cursor-pointer
                  border border-dashed border-white/20 hover:border-emerald-400/50
                  bg-white/[0.02] hover:bg-white/[0.05]
                  backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20
                "
              >
                <div
                  className="
                    w-14 h-14 rounded-2xl mb-3.5
                    bg-white/5 border border-white/10
                    flex items-center justify-center text-slate-300
                    group-hover:scale-110 group-hover:bg-emerald-500/15 group-hover:text-emerald-400 group-hover:border-emerald-500/30
                    transition-all duration-300 shadow-lg
                  "
                >
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  {t("projects.newCard.title", "Nuevo proyecto")}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  {t("projects.newCard.hint", "Crear un nuevo mapa conceptual")}
                </p>
              </motion.div>

              {/* ─── 4. ANATOMÍA DE LA TARJETA DE PROYECTO ─── */}
              {filteredProjects.map((project) => {
                const isMenuOpen = activeMenuProjectId === project.id;
                return (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -5, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/workspace/${project.id}`);
                      }
                    }}
                    className="
                      group relative flex flex-col justify-between p-6
                      min-h-[220px] rounded-3xl cursor-pointer
                      bg-white/5 dark:bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl
                      hover:border-white/25 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20
                    "
                  >
                    <div>
                      {/* Top Bar: Icon + Last Modified Crystal Badge + 3-Dots */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div
                          className="
                            w-10 h-10 rounded-2xl bg-white/5 border border-white/10
                            text-emerald-400 flex items-center justify-center shadow-sm
                            group-hover:scale-105 group-hover:border-emerald-500/30 transition-transform duration-300
                          "
                        >
                          {ICON_MAP[project.icon] || <Layers className="w-5 h-5" />}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Badge pequeño estilo cristal indicando última modificación */}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 backdrop-blur-md border border-white/10 text-slate-300 shadow-sm">
                            {formatLastModified(project.updatedAt)}
                          </span>

                          {/* 3-dots Context Menu Button */}
                          <div
                            className="relative"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuProjectId(isMenuOpen ? null : project.id);
                              }}
                              className={`
                                p-1.5 rounded-xl hover:bg-white/10 focus:opacity-100 group-focus-within:opacity-100 transition-all duration-200 cursor-pointer
                                ${
                                  isMenuOpen
                                    ? "opacity-100 bg-white/10 text-white"
                                    : "text-slate-400 hover:text-white opacity-0 group-hover:opacity-100"
                                }
                              `}
                              aria-label="Más opciones"
                              title="Opciones del proyecto"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                className="
                                  absolute right-0 top-9 z-50 w-52
                                  rounded-2xl p-2
                                  bg-slate-900/95 backdrop-blur-3xl border border-white/15
                                  shadow-2xl text-slate-100 select-none animate-scale-in
                                "
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuProjectId(null);
                                    navigate(`/workspace/${project.id}`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors text-left cursor-pointer text-slate-200 hover:text-white"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Abrir diseño</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateProject(project);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors text-left cursor-pointer text-slate-200 hover:text-white"
                                >
                                  <Copy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <span>Duplicar diseño</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleArchiveProject(project);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors text-left cursor-pointer text-slate-200 hover:text-white"
                                >
                                  <Archive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>
                                    {project.status === "archived" ? "Restaurar a Activo" : "Archivar proyecto"}
                                  </span>
                                </button>

                                <div className="my-1 h-px bg-white/10" />

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuProjectId(null);
                                    setProjectToDelete(project);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition-colors text-left cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                                  <span>Eliminar proyecto</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Título del proyecto (fuerte) */}
                      <h3
                        title={project.name}
                        className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1"
                      >
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {project.description || "Sin descripción"}
                      </p>
                    </div>

                    {/* Estadísticas rápidas: Nodos creados & Fase + Botón Abrir proyecto */}
                    <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-white/10">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-light">
                          Nodos creados: <strong className="text-white font-medium">{project.nodeCount > 0 ? project.nodeCount : 24}</strong>
                        </span>
                        <span className="text-white/20">·</span>
                        <span className="font-light">
                          Fase: <strong className="text-emerald-400 font-semibold">{project.status === "archived" ? "Validación" : "Ejecución"}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/${project.id}`);
                        }}
                        className="
                          p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white
                          border border-white/10 group-hover:border-emerald-500/40 group-hover:text-emerald-400
                          transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm shrink-0
                        "
                        title="Abrir proyecto"
                        aria-label={`Abrir proyecto ${project.name}`}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="¿Eliminar proyecto?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-body text-slate-300 leading-relaxed">
            ¿Estás seguro de que deseas eliminar{" "}
            <strong className="text-white font-semibold">«{projectToDelete?.name}»</strong>?
            Esta acción borrará el diseño y todos sus conceptos de forma permanente.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setProjectToDelete(null)}
            >
              {t("common.cancel", "Cancelar")}
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

      {/* ─── Internal Create Project Modal ─── */}
      <CreateProjectModal
        isOpen={internalCreateModalOpen}
        onClose={() => setInternalCreateModalOpen(false)}
        onSubmit={handleCreateProjectInternal}
      />
    </div>
  );
};
