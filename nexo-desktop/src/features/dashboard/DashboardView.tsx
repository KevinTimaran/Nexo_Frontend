import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Settings, User, Search, Plus, ArrowUpRight, MoreHorizontal,
  ExternalLink, Copy, Archive, Trash2, X, LogOut, Layers, Lightbulb,
  Leaf, Scale, Rocket, Book, Compass,
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
  onOpenNewProject, onOpenSettings, onProjectsLoaded,
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
  const handleOpenSettings = onOpenSettings || outlet.onOpenSettings || (() => { });

  const handleNewProject = () => {
    if (onOpenNewProject) onOpenNewProject();
    else if (outlet.onOpenNewProject) outlet.onOpenNewProject();
    else setInternalCreateModalOpen(true);
  };

  const handleCreateProjectInternal = async (input: NewProjectInput) => {
    const created = await services.projects.create(input);
    setInternalCreateModalOpen(false);
    showToast(t("projects.create.created", { name: created.name }), "success");
    navigate(`/workspace/${created.id}`);
  };

  useEffect(() => {
    if (!activeMenuProjectId && !profileMenuOpen) return;
    const handleGlobalClick = () => { setActiveMenuProjectId(null); setProfileMenuOpen(false); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setActiveMenuProjectId(null); setProfileMenuOpen(false); }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("click", handleGlobalClick); window.removeEventListener("keydown", handleKeyDown); };
  }, [activeMenuProjectId, profileMenuOpen]);

  const handleDuplicateProject = (project: Project) => {
    setActiveMenuProjectId(null);
    const newId = `p-${Math.random().toString(36).slice(2, 9)}`;
    const duplicated: Project = { ...project, id: newId, name: `${project.name} (Copia)`, updatedAt: new Date().toISOString() };
    setProjects([duplicated, ...projects]);
    showToast(`Proyecto "${duplicated.name}" duplicado`, "success");
  };

  const handleToggleArchiveProject = (project: Project) => {
    setActiveMenuProjectId(null);
    const nextStatus: ProjectStatus = project.status === "archived" ? "active" : "archived";
    setProjects(projects.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p)));
    showToast(nextStatus === "archived" ? `Proyecto "${project.name}" archivado` : `Proyecto "${project.name}" reactivado`, "info");
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    setProjects(projects.filter((p) => p.id !== projectToDelete.id));
    showToast(`Proyecto "${projectToDelete.name}" eliminado correctamente`, "info");
    setProjectToDelete(null);
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await services.projects.list(lang);
      setProjects(data);
      if (onProjectsLoaded) onProjectsLoaded(data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { void loadProjects(); }, [lang]);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "all" || p.status === statusFilter);
  });

  const formatLastModified = (isoString?: string) => {
    if (!isoString) return "Reciente";
    try {
      const date = new Date(isoString);
      const diffMs = Math.max(0, new Date().getTime() - date.getTime());
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMinutes < 5) return "Hace un momento";
      if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays === 1) return "Ayer";
      if (diffDays < 7) return `Hace ${diffDays}d`;
      return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    } catch { return "Reciente"; }
  };

  return (
    <div className="relative h-full w-full flex bg-[var(--app)] text-[var(--fg)] overflow-hidden font-sans select-none">
      
      {/* Ambient Orbs (Olive + Floral White sutil) */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[var(--olive-600)]/20 blur-[120px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[var(--floral-50)]/5 blur-[120px] z-0" />

      {/* Sidebar */}
      <aside className="relative z-20 m-4 w-16 flex flex-col items-center justify-between py-6 rounded-3xl bg-[var(--surface)] backdrop-blur-2xl border border-[var(--line)] shrink-0">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); gridRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--olive-800)] text-[var(--bone-100)] border border-[var(--line)] hover:bg-[var(--olive-700)] active:scale-95 transition-all shadow-md"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button onClick={handleOpenSettings} className="w-11 h-11 rounded-2xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)] active:scale-95 transition-all">
            <Settings className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(!profileMenuOpen); }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${profileMenuOpen ? "bg-[var(--elevated)] text-[var(--fg)] border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)]"}`}
            >
              <User className="w-5 h-5" />
            </button>

            {profileMenuOpen && (
              <div onClick={(e) => e.stopPropagation()} className="absolute left-16 bottom-0 z-50 w-56 p-3 rounded-2xl bg-[var(--elevated)] backdrop-blur-3xl border border-[var(--line)] shadow-2xl text-[var(--fg)] animate-scale-in">
                <div className="px-2 py-1">
                  <p className="text-xs font-semibold truncate">{user?.name || "Usuario"}</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">{user?.email || "usuario@ejemplo.com"}</p>
                </div>
                <div className="h-px bg-[var(--line)] my-1" />
                <button onClick={() => void signOut()} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--danger-fg)] hover:bg-[var(--danger-fg)]/10 transition-colors w-full text-left">
                  <LogOut className="w-3.5 h-3.5" /> <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden p-6 pl-2">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-[var(--fg)]">
              Buenos días, {user?.name || "Usuario"}
            </h1>
            <p className="text-xs sm:text-sm font-light text-[var(--muted)] mt-1.5">
              {t("home.description", "Retoma donde lo dejaste o empieza a dar forma a una nueva idea.")}
            </p>
          </div>

          {/* Search (Focus = Floral White) */}
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--surface)] backdrop-blur-2xl border border-[var(--line)] transition-all duration-300 ${searchFocused || search ? "w-64 sm:w-80 lg:w-96 border-[var(--focus)] ring-2 ring-[var(--focus)]/20" : "w-48 sm:w-60"}`}>
            <Search className="w-4 h-4 text-[var(--muted)] shrink-0" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              placeholder="Buscar proyectos..."
              className="bg-transparent text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none w-full font-light"
            />
            {search && (
              <button onClick={() => setSearch("")} className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Super Card */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface)] backdrop-blur-xl border border-[var(--line)] rounded-[2.5rem] shadow-lg p-6 lg:p-8">
          
          <div className="flex items-center justify-between mb-6 shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shrink-0">
              {(["all", "active", "draft", "archived"] as const).map((st) => (
                <button
                  key={st} onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${statusFilter === st ? "bg-[var(--selected)] text-[var(--floral-50)] border border-[var(--floral-50)]/30 font-semibold shadow-sm" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)] border border-transparent"}`}
                >
                  {st === "all" ? "Todos" : st}
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-[var(--muted)] hidden sm:inline">{filteredProjects.length} proyectos</span>
          </div>

          {/* Grid */}
          <div ref={gridRef} className="flex-1 overflow-y-auto p-4 -mx-4 -mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              
              {/* 1. NEW PROJECT CARD (El Acento = Floral White) */}
              <motion.div
                whileHover={{ y: -5, scale: 1.02, zIndex: 50 }}
                onClick={handleNewProject}
                className="group relative p-2 min-h-[220px] rounded-[2rem] cursor-pointer border border-dashed border-[var(--floral-50)]/40 hover:border-[var(--floral-50)] bg-[var(--floral-50)]/5 hover:bg-[var(--floral-50)]/10 transition-all duration-300 transform-gpu"
              >
                <div className="flex flex-col justify-center items-center text-center h-full rounded-3xl p-6">
                  <div className="w-14 h-14 rounded-2xl mb-3.5 bg-[var(--floral-50)]/10 border border-[var(--floral-50)]/30 flex items-center justify-center text-[var(--floral-50)] group-hover:scale-110 transition-all shadow-sm">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--floral-50)]">Nuevo proyecto</h3>
                  <p className="text-xs text-[var(--floral-50)]/70 mt-1 max-w-[200px]">Crear un nuevo mapa conceptual</p>
                </div>
              </motion.div>

              {/* 2. PROJECT CARDS (Ambiente Olive + Cuerpo Bone + Hover Floral White) */}
              {filteredProjects.map((project, index) => {
                const isMenuOpen = activeMenuProjectId === project.id;
                return (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -5, scale: 1.02, zIndex: 50 }}
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className="group relative p-2 min-h-[220px] rounded-[2rem] cursor-pointer bg-[var(--elevated)] border border-[var(--line)] hover:border-[var(--floral-50)]/50 hover:shadow-xl transition-all duration-300 transform-gpu"
                  >
                    <div className="flex flex-col justify-between h-full p-5 rounded-3xl bg-[var(--elevated)] transition-colors duration-200">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          
                          {/* Icono (Cuerpo = Bone, Hover = Floral White) */}
                          <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--bone-400)] group-hover:text-[var(--floral-50)] group-hover:border-[var(--floral-50)]/50 flex items-center justify-center transition-all duration-300">
                            {ICON_MAP[project.icon] || <Layers className="w-5 h-5" />}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)]">
                              {formatLastModified(project.updatedAt)}
                            </span>
                            
                            {/* Menú Dropdown */}
                            <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenuProjectId(isMenuOpen ? null : project.id); }}
                                className={`p-1.5 rounded-xl hover:bg-[var(--hover)] transition-all ${isMenuOpen ? "opacity-100 bg-[var(--hover)] text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)] opacity-0 group-hover:opacity-100"}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              
                              {isMenuOpen && (
                                <div className="absolute right-0 top-9 z-[100] w-52 rounded-2xl p-2 bg-[var(--elevated)] backdrop-blur-3xl border border-[var(--line)] shadow-2xl text-[var(--fg)] animate-scale-in">
                                  <button onClick={() => navigate(`/workspace/${project.id}`)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--surface)] text-left">
                                    <ExternalLink className="w-3.5 h-3.5 text-[var(--floral-50)]" /> Abrir diseño
                                  </button>
                                  <button onClick={() => handleDuplicateProject(project)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--surface)] text-left">
                                    <Copy className="w-3.5 h-3.5 text-[var(--floral-50)]" /> Duplicar diseño
                                  </button>
                                  <button onClick={() => handleToggleArchiveProject(project)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--surface)] text-left">
                                    <Archive className="w-3.5 h-3.5 text-[var(--floral-50)]" /> {project.status === "archived" ? "Restaurar" : "Archivar"}
                                  </button>
                                  <div className="my-1 h-px bg-[var(--line)]" />
                                  <button onClick={() => { setActiveMenuProjectId(null); setProjectToDelete(project); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--danger-fg)] hover:bg-[var(--danger-fg)]/10 text-left">
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar proyecto
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Título y Descripción (Cuerpo = Bone, Hover = Floral White) */}
                        <h3 className="text-lg font-bold text-[var(--fg)] group-hover:text-[var(--floral-50)] transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                        <p className="text-xs text-[var(--muted)] mt-1.5 line-clamp-2 leading-relaxed">
                          {project.description || "Sin descripción"}
                        </p>
                      </div>

                      {/* Footer de Tarjeta */}
                      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[var(--line)]">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                          <span>Nodos: <strong className="text-[var(--fg)] font-medium">{project.nodeCount > 0 ? project.nodeCount : 24}</strong></span>
                          <span>·</span>
                          <span>Fase: <strong className="text-[var(--positive-fg)] font-semibold">{project.status === "archived" ? "Validación" : "Ejecución"}</strong></span>
                        </div>

                        {/* Botón de Acción (Hover Floral White) */}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/workspace/${project.id}`); }}
                          className="p-2 rounded-xl bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)] group-hover:border-[var(--floral-50)]/50 group-hover:text-[var(--floral-50)] transition-all"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Modal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} title="¿Eliminar proyecto?" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
            ¿Estás seguro de que deseas eliminar <strong className="text-[var(--fg)]">«{projectToDelete?.name}»</strong>?
            Esta acción borrará el diseño y todos sus conceptos de forma permanente.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
            <Button type="button" variant="ghost" onClick={() => setProjectToDelete(null)}>Cancelar</Button>
            <Button type="button" variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={confirmDeleteProject}>Eliminar proyecto</Button>
          </div>
        </div>
      </Modal>

      <CreateProjectModal isOpen={internalCreateModalOpen} onClose={() => setInternalCreateModalOpen(false)} onSubmit={handleCreateProjectInternal} />
    </div>
  );
};