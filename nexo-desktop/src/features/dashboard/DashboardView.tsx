import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Settings, User, Search, Plus, ArrowUpRight, MoreHorizontal,
  ExternalLink, Copy, Archive, Trash2, X, LogOut, Layers, Lightbulb,
  Leaf, Scale, Rocket, Book, Compass, LayoutGrid, List, Star, Pencil,
  AlertTriangle, Folder as FolderIcon, FolderPlus, FolderCheck, Check
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { currentLanguage } from "../../i18n";
import { services } from "../../services";
import { CreateProjectModal } from "./CreateProjectModal";
import { NexoLogo } from "../../components/brand/NexoLogo";
import { getTimeAwareGreeting } from "./greeting";
import type {
  Project,
  ProjectIcon,
  ProjectStatus,
  NewProjectInput,
  Folder,
} from "../../domain/types";

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

/* ────────────────────────────────────────────────────────────────────────────
 * Helpers de persistencia (localStorage)
 * ──────────────────────────────────────────────────────────────────────────── */
const VIEW_MODE_KEY = "dashboard:viewMode";
const PINNED_KEY = "dashboard:pinned";

const readViewMode = (): "grid" | "list" => {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    if (v === "grid" || v === "list") return v;
  } catch { /* ignore */ }
  return "grid";
};

const readPinned = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === "string"));
    }
  } catch { /* ignore */ }
  return new Set();
};

/* Variantes de animación */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } }
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
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Folders State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);

  // Drag and Drop & Accessible Move State
  const [projectToMove, setProjectToMove] = useState<Project | null>(null);
  const [selectedMoveTargetFolderId, setSelectedMoveTargetFolderId] = useState<string | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Persistencia de vista y fijados
  const [viewMode, setViewMode] = useState<"grid" | "list">(readViewMode);
  const [pinnedProjects, setPinnedProjects] = useState<Set<string>>(readPinned);

  const gridRef = useRef<HTMLDivElement>(null);
  const lang = currentLanguage();
  const handleOpenSettings = onOpenSettings || outlet.onOpenSettings || (() => { });

  /* Persistir cambios */
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  useEffect(() => {
    try { localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(pinnedProjects))); } catch { /* ignore */ }
  }, [pinnedProjects]);

  const handleNewProject = () => {
    if (onOpenNewProject) onOpenNewProject();
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

  const handleDuplicateProject = async (project: Project) => {
    setActiveMenuProjectId(null);
    try {
      const duplicated = await services.projects.create({
        name: `${project.name} (Copia)`,
        description: project.description,
        icon: project.icon,
        folderId: project.folderId ?? undefined,
      });
      setProjects((prev) => [duplicated, ...prev]);
      showToast(`Proyecto "${duplicated.name}" duplicado`, "success");
    } catch {
      showToast("Error al duplicar el proyecto", "error");
    }
  };

  const handleToggleArchiveProject = async (project: Project) => {
    setActiveMenuProjectId(null);
    const nextStatus: ProjectStatus = project.status === "archived" ? "active" : "archived";
    try {
      if (services.projects.update) {
        await services.projects.update(project.id, { status: nextStatus });
      }
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p)));
      showToast(nextStatus === "archived" ? `Proyecto "${project.name}" archivado` : `Proyecto "${project.name}" reactivado`, "info");
    } catch {
      showToast("Error al actualizar el estado del proyecto", "error");
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const target = projectToDelete;
    try {
      if (services.projects.delete) {
        await services.projects.delete(target.id);
      }
      setProjects((prev) => prev.filter((p) => p.id !== target.id));
      showToast(`Proyecto "${target.name}" eliminado correctamente`, "info");
    } catch {
      showToast("Error al eliminar el proyecto", "error");
    } finally {
      setProjectToDelete(null);
    }
  };

  const handleOpenRename = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveMenuProjectId(null);
    setProjectToRename(project);
    setRenameValue(project.name);
  };

  const confirmRename = async () => {
    if (!projectToRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const target = projectToRename;
    try {
      if (services.projects.update) {
        await services.projects.update(target.id, { name: trimmed });
      }
      setProjects((prev) => prev.map((p) => (p.id === target.id ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p)));
      showToast(`Proyecto renombrado a "${trimmed}"`, "success");
    } catch {
      showToast("Error al renombrar el proyecto", "error");
    } finally {
      setProjectToRename(null);
    }
  };

  const togglePin = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await services.projects.list(lang);
      setProjects(data);
      if (onProjectsLoaded) onProjectsLoaded(data);
    } catch { } finally { setLoading(false); }
  };

  const loadFolders = async () => {
    try {
      const list = await services.folders.list();
      setFolders(list);
    } catch { }
  };

  useEffect(() => {
    void loadProjects();
    void loadFolders();
  }, [lang]);

  /* ────────────────────────────────────────────────────────────────────────────
   * Folder Operations
   * ──────────────────────────────────────────────────────────────────────────── */
  const handleOpenCreateFolder = () => {
    setFolderToEdit(null);
    setFolderNameInput("");
    setFolderError(null);
    setFolderModalOpen(true);
  };

  const handleOpenEditFolder = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToEdit(folder);
    setFolderNameInput(folder.name);
    setFolderError(null);
    setFolderModalOpen(true);
  };

  const handleSaveFolder = async () => {
    const trimmed = folderNameInput.trim();
    setFolderError(null);
    if (!trimmed) {
      setFolderError("El nombre de la carpeta no puede estar vacío");
      return;
    }
    if ([...trimmed].length > 50) {
      setFolderError("El nombre de la carpeta no puede superar los 50 caracteres");
      return;
    }
    const normalized = trimmed.normalize("NFC").toLowerCase();
    const isDuplicate = folders.some(
      (f) =>
        (!folderToEdit || f.id !== folderToEdit.id) &&
        f.name.trim().normalize("NFC").toLowerCase() === normalized
    );
    if (isDuplicate) {
      setFolderError(`Ya existe una carpeta con el nombre "${trimmed}"`);
      return;
    }

    try {
      if (folderToEdit) {
        const updated = await services.folders.rename(folderToEdit.id, trimmed);
        setFolders(folders.map((f) => (f.id === updated.id ? updated : f)));
        showToast(`Carpeta renombrada a "${trimmed}"`, "success");
      } else {
        const created = await services.folders.create(trimmed);
        setFolders([...folders, created]);
        showToast(`Carpeta "${trimmed}" creada`, "success");
      }
      setFolderModalOpen(false);
      setFolderToEdit(null);
      setFolderNameInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar la carpeta";
      setFolderError(msg);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await services.folders.delete(folderToDelete.id);
      setFolders(folders.filter((f) => f.id !== folderToDelete.id));
      // Non-destructive: preserve projects and reset folderId to null
      setProjects((prev) =>
        prev.map((p) => (p.folderId === folderToDelete.id ? { ...p, folderId: null } : p))
      );
      if (selectedFolderId === folderToDelete.id) {
        setSelectedFolderId("all");
      }
      showToast(
        `Carpeta "${folderToDelete.name}" eliminada. Los proyectos fueron preservados.`,
        "info"
      );
      setFolderToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar carpeta";
      showToast(msg, "error");
    }
  };

  const handleMoveProject = async (projectId: string, targetFolderId: string | null) => {
    try {
      await services.folders.moveProject(projectId, targetFolderId);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, folderId: targetFolderId } : p))
      );
      const targetFolder = folders.find((f) => f.id === targetFolderId);
      const targetName = targetFolder ? targetFolder.name : "Sin carpeta";
      const targetProj = projects.find((p) => p.id === projectId);
      showToast(
        `Proyecto "${targetProj?.name || ""}" movido a "${targetName}"`,
        "success"
      );
      setProjectToMove(null);
      setActiveMenuProjectId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al mover el proyecto";
      showToast(msg, "error");
    }
  };

  /* ────────────────────────────────────────────────────────────────────────────
   * Drag and Drop Handlers
   * ──────────────────────────────────────────────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, project: Project) => {
    e.dataTransfer.setData("text/plain", project.id);
    e.dataTransfer.setData("application/json", JSON.stringify({ projectId: project.id }));
    e.dataTransfer.effectAllowed = "move";
    setDraggingProjectId(project.id);
  };

  const handleDragEnd = () => {
    setDraggingProjectId(null);
    setDragOverFolderId(null);
  };

  const handleDragOverFolder = (e: React.DragEvent, folderKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverFolderId !== folderKey) {
      setDragOverFolderId(folderKey);
    }
  };

  const handleDragLeaveFolder = (_e: React.DragEvent, folderKey: string) => {
    if (dragOverFolderId === folderKey) {
      setDragOverFolderId(null);
    }
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    setDraggingProjectId(null);
    let projectId: string | null = null;
    try {
      const text = e.dataTransfer.getData("text/plain");
      if (text && text.trim()) {
        projectId = text.trim();
      } else {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        projectId = data?.projectId;
      }
    } catch {
      projectId = draggingProjectId;
    }
    if (!projectId) projectId = draggingProjectId;
    if (!projectId) return;
    await handleMoveProject(projectId, targetFolderId);
  };

  const getFolderProjectCount = (folderId: string | null) => {
    if (folderId === null) {
      return projects.filter((p) => !p.folderId).length;
    }
    return projects.filter((p) => p.folderId === folderId).length;
  };

  /* Filtrado + ordenamiento (fijados primero) */
  const filteredProjects = useMemo(() => {
    const filtered = projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesFolder =
        selectedFolderId === "all" ||
        (selectedFolderId === "root" && !p.folderId) ||
        p.folderId === selectedFolderId;
      return matchesSearch && matchesStatus && matchesFolder;
    });
    return [...filtered].sort((a, b) => {
      const aPin = pinnedProjects.has(a.id) ? 1 : 0;
      const bPin = pinnedProjects.has(b.id) ? 1 : 0;
      return bPin - aPin;
    });
  }, [projects, search, statusFilter, selectedFolderId, pinnedProjects]);

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

  const greeting = getTimeAwareGreeting(t, user?.name);

  return (
    <div className="relative h-full w-full flex bg-[var(--app)] text-[var(--fg)] overflow-hidden font-sans select-none">

      {/* Ambient Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[var(--olive-600)]/20 blur-[120px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[var(--floral-50)]/5 blur-[120px] z-0" />

      {/* Sidebar */}
      <aside className="relative z-20 m-4 w-16 flex flex-col items-center justify-between py-6 rounded-3xl bg-[var(--surface)] backdrop-blur-2xl border border-[var(--line)] shrink-0">
        <div className="flex flex-col items-center gap-4">
          {/* Nexo Logo in Sidebar */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--surface-primary)] border border-[var(--line)] shadow-xs"
            title="NEXO"
          >
            <NexoLogo size={24} />
          </div>

          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setSelectedFolderId("all"); gridRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--olive-800)] text-[var(--bone-100)] border border-[var(--line)] hover:bg-[var(--olive-700)] active:scale-95 transition-all shadow-md"
            title="Inicio"
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

        {/* Dashboard Header with Nexo Branding & Time-Aware Greeting */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <NexoLogo size={26} showText textClassName="text-xs font-bold tracking-widest text-[var(--muted)]" />
              <div className="h-3 w-px bg-[var(--line)] mx-1" />
              <span className="text-[11px] font-medium text-[var(--muted)] bg-[var(--surface)] px-2.5 py-0.5 rounded-full border border-[var(--line)]">
                Espacio de Trabajo
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-[var(--fg)]">
              {greeting}
            </h1>
            <p className="text-xs sm:text-sm font-light text-[var(--muted)] mt-1.5">
              {t("home.description", "Retoma donde lo dejaste o empieza a dar forma a una nueva idea.")}
            </p>
          </div>

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

        <div className="flex-1 flex flex-col min-h-0 bg-[var(--surface)] backdrop-blur-xl border border-[var(--line)] rounded-[2.5rem] shadow-lg p-6 lg:p-8">

          {/* Top Controls: Status, Folders & View Mode */}
          <div className="flex flex-col gap-4 mb-6 shrink-0">
            {/* Row 1: Status Filters + View Mode + Project Count */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
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

                <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shrink-0">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-xl transition-all duration-200 ${viewMode === "grid" ? "bg-[var(--selected)] text-[var(--floral-50)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)]"}`}
                    title="Vista de cuadrícula"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-xl transition-all duration-200 ${viewMode === "list" ? "bg-[var(--selected)] text-[var(--floral-50)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)]"}`}
                    title="Vista de lista"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <span className="text-xs font-medium text-[var(--muted)] hidden sm:inline">
                {filteredProjects.length} proyectos
              </span>
            </div>

            {/* Row 2: Folder Bar with Drag-and-Drop Drop Targets */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none" role="tablist" aria-label="Carpetas">
              {/* All Folder Pill */}
              <button
                type="button"
                role="tab"
                aria-selected={selectedFolderId === "all"}
                onClick={() => setSelectedFolderId("all")}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 shrink-0 cursor-pointer
                  ${selectedFolderId === "all"
                    ? "bg-[var(--selected)] text-[var(--floral-50)] font-semibold shadow-xs"
                    : "bg-[var(--elevated)]/60 text-[var(--muted)] hover:text-[var(--fg)] border border-[var(--line)]"
                  }
                `}
              >
                <FolderIcon className="w-3.5 h-3.5" />
                <span>Todas</span>
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
                  {projects.length}
                </span>
              </button>

              {/* Unorganized / Root Folder Drop Target */}
              <div
                onDragOver={(e) => handleDragOverFolder(e, "root")}
                onDragLeave={(e) => handleDragLeaveFolder(e, "root")}
                onDrop={(e) => void handleDropOnFolder(e, null)}
                className={`
                  flex items-center rounded-xl transition-all duration-200 shrink-0
                  ${dragOverFolderId === "root" ? "ring-2 ring-accent-primary bg-accent-primary/20 scale-105" : ""}
                `}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedFolderId === "root"}
                  onClick={() => setSelectedFolderId("root")}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer
                    ${selectedFolderId === "root"
                      ? "bg-[var(--selected)] text-[var(--floral-50)] font-semibold shadow-xs"
                      : "bg-[var(--elevated)]/60 text-[var(--muted)] hover:text-[var(--fg)] border border-[var(--line)]"
                    }
                  `}
                >
                  <span>Sin carpeta</span>
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
                    {getFolderProjectCount(null)}
                  </span>
                </button>
              </div>

              {/* User Folders Drop Targets */}
              {folders.map((folder) => {
                const isSelected = selectedFolderId === folder.id;
                const isDragOver = dragOverFolderId === folder.id;
                const count = getFolderProjectCount(folder.id);
                return (
                  <div
                    key={folder.id}
                    onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                    onDragLeave={(e) => handleDragLeaveFolder(e, folder.id)}
                    onDrop={(e) => void handleDropOnFolder(e, folder.id)}
                    className={`
                      group relative flex items-center rounded-xl transition-all duration-200 shrink-0
                      ${isDragOver ? "ring-2 ring-accent-primary bg-accent-primary/20 scale-105" : ""}
                    `}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer
                        ${isSelected
                          ? "bg-[var(--selected)] text-[var(--floral-50)] font-semibold shadow-xs"
                          : "bg-[var(--elevated)]/60 text-[var(--muted)] hover:text-[var(--fg)] border border-[var(--line)]"
                        }
                      `}
                    >
                      <FolderCheck className="w-3.5 h-3.5 text-accent-primary" />
                      <span className="max-w-[120px] truncate">{folder.name}</span>
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
                        {count}
                      </span>
                    </button>

                    {/* Folder Quick Actions (Rename / Delete) */}
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditFolder(folder, e)}
                        className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)] transition-colors"
                        title="Renombrar carpeta"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}
                        className="p-1 rounded-md text-[var(--danger-fg)] hover:bg-[var(--danger-fg)]/10 transition-colors"
                        title="Eliminar carpeta (no destructivo)"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Folder Button */}
              <button
                type="button"
                onClick={handleOpenCreateFolder}
                className="
                  flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium
                  text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)]
                  border border-dashed border-[var(--line)] transition-all cursor-pointer shrink-0
                "
                title="Crear nueva carpeta"
              >
                <FolderPlus className="w-3.5 h-3.5 text-accent-primary" />
                <span>Nueva carpeta</span>
              </button>
            </div>
          </div>

          <div ref={gridRef} className="flex-1 overflow-y-auto -mx-4 px-4 pb-4">

            {/* Animación al alternar entre grid y list */}
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }}
              >

                {/* ============================== */}
                {/* VISTA 1: CUADRÍCULA (GRID)     */}
                {/* ============================== */}
                {viewMode === "grid" && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4"
                  >

                    <motion.div
                      variants={itemVariants}
                      whileHover={{ y: -4, scale: 1.01, zIndex: 50 }}
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

                    {filteredProjects.map((project) => {
                      const isMenuOpen = activeMenuProjectId === project.id;
                      const isPinned = pinnedProjects.has(project.id);
                      const projectFolder = folders.find((f) => f.id === project.folderId);
                      return (
                        <motion.div
                          key={project.id}
                          variants={itemVariants}
                          whileHover={{ y: -4, scale: 1.01, zIndex: 50 }}
                          onClick={() => navigate(`/workspace/${project.id}`)}
                          draggable
                          onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, project)}
                          onDragEnd={handleDragEnd}
                          className={`
                            group relative p-2 min-h-[220px] rounded-[2rem] cursor-pointer
                            bg-[var(--elevated)] border border-[var(--line)]
                            hover:border-[var(--floral-50)]/50 hover:shadow-xl transition-all duration-300 transform-gpu
                            ${draggingProjectId === project.id ? "opacity-50 ring-2 ring-accent-primary" : ""}
                          `}
                        >
                          <div className="flex flex-col justify-between h-full p-5 rounded-3xl bg-[var(--elevated)] transition-colors duration-200">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-4">

                                <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--bone-400)] group-hover:text-[var(--floral-50)] group-hover:border-[var(--floral-50)]/50 flex items-center justify-center transition-all duration-300">
                                  {ICON_MAP[project.icon] || <Layers className="w-5 h-5" />}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => togglePin(project.id, e)}
                                    className={`p-1.5 rounded-xl transition-all ${isPinned ? "text-amber-400 opacity-100" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--hover)] opacity-0 group-hover:opacity-100"}`}
                                    title={isPinned ? "Quitar de fijados" : "Fijar proyecto"}
                                  >
                                    <Star className={`w-4 h-4 ${isPinned ? "fill-amber-400" : "fill-transparent"}`} />
                                  </button>

                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)]">
                                    {formatLastModified(project.updatedAt)}
                                  </span>

                                  <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuProjectId(isMenuOpen ? null : project.id); }}
                                      className={`p-1.5 rounded-xl hover:bg-[var(--hover)] transition-all ${isMenuOpen ? "opacity-100 bg-[var(--hover)] text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)] opacity-0 group-hover:opacity-100"}`}
                                      aria-label="Acciones de proyecto"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>

                                    {isMenuOpen && (
                                      <div className="absolute right-0 top-9 z-[100] w-52 rounded-2xl p-2 bg-[var(--elevated)] backdrop-blur-3xl border border-[var(--line)] shadow-2xl text-[var(--fg)] animate-scale-in">
                                        <button onClick={() => navigate(`/workspace/${project.id}`)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--surface)] text-left">
                                          <ExternalLink className="w-3.5 h-3.5 text-[var(--floral-50)]" /> Abrir diseño
                                        </button>
                                        <button
                                          onClick={() => {
                                            setActiveMenuProjectId(null);
                                            setProjectToMove(project);
                                            setSelectedMoveTargetFolderId(project.folderId ?? null);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--surface)] text-left"
                                        >
                                          <FolderIcon className="w-3.5 h-3.5 text-accent-primary" /> Mover a carpeta...
                                        </button>
                                        <button onClick={() => handleOpenRename(project)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[var(--surface)] text-left">
                                          <Pencil className="w-3.5 h-3.5 text-[var(--floral-50)]" /> Renombrar
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

                              <div className="flex items-center gap-2 mb-1">
                                {projectFolder && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent-primary/15 text-accent-primary border border-accent-primary/30">
                                    <FolderCheck className="w-3 h-3" />
                                    {projectFolder.name}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-bold text-[var(--fg)] group-hover:text-[var(--floral-50)] transition-colors line-clamp-1">
                                {project.name}
                              </h3>
                              <p className="text-xs text-[var(--muted)] mt-1.5 line-clamp-2 leading-relaxed">
                                {project.description || "Sin descripción"}
                              </p>
                            </div>

                            {/* Footer minimalista: solo el botón de abrir */}
                            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[var(--line)]">
                              <span className="text-[11px] text-[var(--muted)]">
                                {project.nodeCount || 0} nodos
                              </span>
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
                  </motion.div>
                )}

                {/* ============================== */}
                {/* VISTA 2: LISTA                 */}
                {/* ============================== */}
                {viewMode === "list" && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="w-full flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)]/30 overflow-hidden"
                  >

                    <div className="flex items-center px-4 py-3 text-[11px] font-bold text-[var(--muted)] border-b border-[var(--line)] uppercase tracking-wider bg-[var(--surface)]/50">
                      <div className="flex-1">Nombre</div>
                      <div className="w-28 hidden md:block">Carpeta</div>
                      <div className="w-24 hidden sm:block">Nodos</div>
                      <div className="w-32">Modificado</div>
                      <div className="w-36 text-center">Acciones</div>
                    </div>

                    <motion.div
                      variants={itemVariants}
                      onClick={handleNewProject}
                      className="group flex items-center px-4 py-3 border-b border-[var(--line)] cursor-pointer hover:bg-[var(--hover)] transition-colors"
                    >
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[var(--floral-50)]/10 border border-[var(--floral-50)]/30 flex items-center justify-center text-[var(--floral-50)] shrink-0 group-hover:scale-105 transition-transform">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-[var(--floral-50)] truncate">
                          Nuevo proyecto
                        </span>
                      </div>
                      <div className="w-28 hidden md:block text-xs text-[var(--muted)]">—</div>
                      <div className="w-24 hidden sm:block text-xs text-[var(--muted)]">—</div>
                      <div className="w-32 text-xs text-[var(--muted)]">—</div>
                      <div className="w-36"></div>
                    </motion.div>

                    {filteredProjects.map((project) => {
                      const isPinned = pinnedProjects.has(project.id);
                      const projectFolder = folders.find((f) => f.id === project.folderId);
                      return (
                        <motion.div
                          key={project.id}
                          variants={itemVariants}
                          onClick={() => navigate(`/workspace/${project.id}`)}
                          draggable
                          onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, project)}
                          onDragEnd={handleDragEnd}
                          className={`
                            group flex items-center px-4 py-3 border-b border-[var(--line)] last:border-b-0 cursor-pointer
                            hover:bg-[var(--hover)] transition-colors
                            ${draggingProjectId === project.id ? "opacity-50" : ""}
                          `}
                        >
                          <div className="flex-1 flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[var(--elevated)] border border-[var(--line)] text-[var(--bone-400)] group-hover:text-[var(--floral-50)] group-hover:border-[var(--floral-50)]/30 flex items-center justify-center shrink-0 transition-colors">
                              {ICON_MAP[project.icon] || <Layers className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-[var(--fg)] group-hover:text-[var(--floral-50)] transition-colors truncate">
                                {project.name}
                              </span>
                              <span className="text-[11px] text-[var(--muted)] truncate sm:hidden">
                                {formatLastModified(project.updatedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="w-28 hidden md:block text-xs text-[var(--muted)] truncate">
                            {projectFolder ? (
                              <span className="inline-flex items-center gap-1 text-accent-primary">
                                <FolderIcon className="w-3 h-3" />
                                {projectFolder.name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </div>

                          <div className="w-24 hidden sm:block text-xs text-[var(--muted)]">
                            {project.nodeCount > 0 ? project.nodeCount : 0} nodos
                          </div>

                          <div className="w-32 text-xs text-[var(--muted)]">
                            {formatLastModified(project.updatedAt)}
                          </div>

                          <div className="w-36 flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToMove(project);
                                setSelectedMoveTargetFolderId(project.folderId ?? null);
                              }}
                              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-accent-primary hover:bg-[var(--elevated)] transition-colors"
                              title="Mover a carpeta..."
                            >
                              <FolderIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleOpenRename(project, e)}
                              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--elevated)] transition-colors"
                              title="Renombrar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicateProject(project); }}
                              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--elevated)] transition-colors"
                              title="Duplicar"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                              className="p-1.5 rounded-lg text-[var(--danger-fg)] hover:bg-[var(--danger-fg)]/10 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => togglePin(project.id, e)}
                              className={`p-1.5 rounded-lg transition-colors hover:bg-[var(--elevated)] ${isPinned ? "text-amber-400" : "text-[var(--muted)] hover:text-[var(--fg)] opacity-50 group-hover:opacity-100"}`}
                              title={isPinned ? "Quitar de fijados" : "Fijar proyecto"}
                            >
                              <Star className={`w-4 h-4 ${isPinned ? "fill-amber-400" : "fill-transparent"}`} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Empty State */}
                {filteredProjects.length === 0 && (
                  <div className="text-center py-20 text-[var(--muted)] text-sm">
                    No se encontraron proyectos en esta vista o carpeta.
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modal de Eliminación de Proyecto Animado */}
      <AnimatePresence>
        {projectToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setProjectToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--elevated)] rounded-2xl p-6 max-w-md w-full border border-[var(--line)] shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--danger-fg)]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[var(--danger-fg)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--fg)]">¿Eliminar proyecto?</h3>
              </div>
              <p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">
                ¿Estás seguro de que deseas eliminar <strong className="text-[var(--fg)]">«{projectToDelete.name}»</strong>?
                Esta acción borrará el diseño y todos sus conceptos de forma permanente.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setProjectToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteProject}
                  className="px-4 py-2 rounded-xl bg-[var(--danger-fg)] text-white text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Renombrar Proyecto Animado */}
      <AnimatePresence>
        {projectToRename && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setProjectToRename(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--elevated)] rounded-2xl p-6 max-w-md w-full border border-[var(--line)] shadow-2xl"
            >
              <h3 className="text-lg font-bold text-[var(--fg)] mb-4">Renombrar proyecto</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={60}
                placeholder="Nombre del proyecto"
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]/20 focus:border-[var(--focus)]"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); }}
              />
              <p className="text-[10px] text-[var(--muted)] mt-1 text-right">{renameValue.length}/60</p>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setProjectToRename(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRename}
                  disabled={!renameValue.trim()}
                  className="px-4 py-2 rounded-xl bg-[var(--selected)] text-[var(--floral-50)] text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Crear / Renombrar Carpeta */}
      <AnimatePresence>
        {folderModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setFolderModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--elevated)] rounded-2xl p-6 max-w-md w-full border border-[var(--line)] shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-accent-primary/20 text-accent-primary flex items-center justify-center">
                  <FolderIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--fg)]">
                    {folderToEdit ? "Renombrar carpeta" : "Nueva carpeta"}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Organiza tus proyectos conceptuales en categorías
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--fg)]">
                  Nombre de la carpeta
                </label>
                <input
                  type="text"
                  value={folderNameInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if ([...val].length <= 50) {
                      setFolderNameInput(val);
                      if (folderError) setFolderError(null);
                    } else {
                      setFolderError("El nombre de la carpeta no puede superar los 50 caracteres");
                    }
                  }}
                  placeholder="Ej. Investigación de Mercado"
                  className={`
                    w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border text-sm text-[var(--fg)]
                    focus:outline-none focus:ring-2 transition-all
                    ${folderError
                      ? "border-[var(--danger-fg)] focus:ring-[var(--danger-fg)]/20"
                      : "border-[var(--line)] focus:ring-accent-primary/20 focus:border-accent-primary"
                    }
                  `}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSaveFolder(); }}
                />
                <div className="flex items-center justify-between text-[11px] pt-1">
                  {folderError ? (
                    <span className="text-[var(--danger-fg)] font-medium">{folderError}</span>
                  ) : (
                    <span className="text-[var(--muted)]">Máximo 50 caracteres</span>
                  )}
                  <span className={`font-mono ${[...folderNameInput].length > 50 ? "text-[var(--danger-fg)]" : "text-[var(--muted)]"}`}>
                    {[...folderNameInput].length}/50
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveFolder()}
                  disabled={!folderNameInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[var(--button-primary)] text-[var(--button-primary-fg)] text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {folderToEdit ? "Guardar cambios" : "Crear carpeta"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Eliminación de Carpeta (No Destructivo) */}
      <AnimatePresence>
        {folderToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setFolderToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--elevated)] rounded-2xl p-6 max-w-md w-full border border-[var(--line)] shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--danger-fg)]/10 flex items-center justify-center text-[var(--danger-fg)]">
                  <FolderIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[var(--fg)]">¿Eliminar carpeta?</h3>
              </div>
              <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
                ¿Estás seguro de que deseas eliminar la carpeta <strong className="text-[var(--fg)]">«{folderToDelete.name}»</strong>?
              </p>
              <div className="p-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-xs text-accent-primary mb-6">
                <strong>Eliminación no destructiva:</strong> Los proyectos dentro de esta carpeta no se eliminarán y se conservarán en «Sin carpeta».
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void confirmDeleteFolder()}
                  className="px-4 py-2 rounded-xl bg-[var(--danger-fg)] text-white text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Eliminar carpeta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Accesible: Mover Proyecto a Carpeta */}
      <AnimatePresence>
        {projectToMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setProjectToMove(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--elevated)] rounded-2xl p-6 max-w-md w-full border border-[var(--line)] shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-accent-primary/20 text-accent-primary flex items-center justify-center">
                  <FolderIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--fg)]">Mover a carpeta</h3>
                  <p className="text-xs text-[var(--muted)] truncate max-w-[280px]">
                    Proyecto: <strong>«{projectToMove.name}»</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto my-4 pr-1" role="radiogroup" aria-label="Seleccionar carpeta de destino">
                {/* Sin carpeta option */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedMoveTargetFolderId === null}
                  onClick={() => setSelectedMoveTargetFolderId(null)}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium text-left transition-all cursor-pointer
                    ${selectedMoveTargetFolderId === null
                      ? "bg-accent-primary/20 text-accent-primary border border-accent-primary"
                      : "bg-[var(--surface)] text-[var(--fg)] border border-[var(--line)] hover:bg-[var(--hover)]"
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <FolderIcon className="w-4 h-4 text-[var(--muted)]" />
                    <span>Sin carpeta (Raíz)</span>
                  </div>
                  {selectedMoveTargetFolderId === null && <Check className="w-4 h-4 text-accent-primary" />}
                </button>

                {/* Available Folders */}
                {folders.map((folder) => {
                  const isTarget = selectedMoveTargetFolderId === folder.id;
                  const isCurrent = projectToMove.folderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      role="radio"
                      aria-checked={isTarget}
                      onClick={() => setSelectedMoveTargetFolderId(folder.id)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium text-left transition-all cursor-pointer
                        ${isTarget
                          ? "bg-accent-primary/20 text-accent-primary border border-accent-primary"
                          : "bg-[var(--surface)] text-[var(--fg)] border border-[var(--line)] hover:bg-[var(--hover)]"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FolderCheck className="w-4 h-4 text-accent-primary shrink-0" />
                        <span className="truncate">{folder.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-[var(--muted)] bg-black/20 px-1.5 py-0.5 rounded-full shrink-0">
                            Actual
                          </span>
                        )}
                      </div>
                      {isTarget && <Check className="w-4 h-4 text-accent-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setProjectToMove(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleMoveProject(projectToMove.id, selectedMoveTargetFolderId)}
                  className="px-4 py-2 rounded-xl bg-[var(--button-primary)] text-[var(--button-primary-fg)] text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  Mover proyecto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateProjectModal
        isOpen={internalCreateModalOpen}
        onClose={() => setInternalCreateModalOpen(false)}
        onSubmit={handleCreateProjectInternal}
        folders={folders}
        initialFolderId={selectedFolderId !== "all" && selectedFolderId !== "root" ? selectedFolderId : null}
      />
    </div>
  );
};