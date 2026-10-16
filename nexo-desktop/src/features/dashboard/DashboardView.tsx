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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { currentLanguage } from "../../i18n";
import { mockServices } from "../../services/mock";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Project, ProjectIcon, ProjectStatus } from "../../domain/types";

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
  const navigate = useNavigate();
  const outlet = useOutletContext<{ onOpenSettings?: () => void; onOpenNewProject?: () => void }>() || {};
  const handleNewProject = onOpenNewProject || outlet.onOpenNewProject || (() => {});
  const handleOpenSettings = onOpenSettings || outlet.onOpenSettings || (() => {});
  const lang = currentLanguage();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await mockServices.projects.list(lang);
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
    <div className="relative h-full w-full p-3 sm:p-5 flex flex-col bg-app overflow-hidden select-none animate-fade-in">
      {/* Luces ambientales suaves para realzar el efecto flotante */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full blur-[140px] opacity-40 bg-concept-fg/20" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[520px] h-[520px] rounded-full blur-[140px] opacity-30 bg-concept-fg/15" />

      {/* Halo difuso detrás de la isla flotante */}
      <div className="pointer-events-none absolute inset-4 rounded-[40px] bg-concept-fg/5 blur-2xl opacity-50" />

      {/* ─── Isla / Contenedor Flotante del Dashboard ─── */}
      <div
        className="
          relative z-10 flex-1 flex flex-col min-h-0
          rounded-[32px] overflow-hidden
          border border-white/50 dark:border-white/10
          bg-surface/85 dark:bg-white/[0.03]
          backdrop-blur-3xl backdrop-saturate-[180%]
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.14),0_8px_24px_-8px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.7)]
          dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.06)]
        "
      >
        {/* Reflejo especular superior de vidrio */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/35 to-transparent dark:from-white/5 opacity-80 z-20"
        />

        {/* Top action bar (Toolbar extension) */}
        <div className="relative z-10 px-7 sm:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-title font-semibold tracking-tight text-fg">
              {t("nav.projects")}
            </h1>
            {user && (
              <p className="text-caption text-muted mt-0.5">
                {t("home.greeting.morning", { name: user.name })} · {t("home.description")}
              </p>
            )}
          </div>

          {/* Esquina superior derecha: Buscador, Nuevo Proyecto, Ajustes y Perfil */}
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

            {/* Separador vertical sutil */}
            <div className="hidden sm:block h-6 w-px bg-line/80 dark:bg-white/10 mx-0.5" />

            {/* Botón de Ajustes */}
            <button
              type="button"
              onClick={handleOpenSettings}
              className="
                h-9 w-9 flex items-center justify-center rounded-xl
                bg-surface/80 dark:bg-white/[0.06]
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

            {/* Píldora de Perfil de Usuario con opción de cerrar sesión */}
            <div
              className="
                flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl
                bg-surface/80 dark:bg-white/[0.06]
                border border-line/80 dark:border-white/10
                shadow-xs text-fg
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
                  text-muted hover:text-risk-fg p-1 rounded-md
                  hover:bg-risk-fg/10 transition-colors focus-ring cursor-pointer
                "
                title={t("settings.signOut")}
                aria-label={t("settings.signOut")}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="relative z-10 px-7 sm:px-8 mb-5 shrink-0">
          <div className="inline-flex bg-sunken/80 border border-line-soft rounded-full p-1 shadow-inner backdrop-blur-md">
            {(["all", "active", "draft", "archived"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-1.5 rounded-full text-caption font-semibold transition-all duration-200 ${
                  statusFilter === st
                    ? "bg-surface text-fg shadow-sm scale-100"
                    : "text-muted hover:text-fg hover:bg-hover scale-95"
                }`}
              >
                {st === "all" ? t("projects.filters.all") : t(`projects.filters.${st}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 sm:px-8 pb-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="min-h-[190px] rounded-[26px] bg-sunken/60 border border-line/60 animate-pulse shadow-sm"
                />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-12 h-12 rounded-xl bg-sunken flex items-center justify-center text-muted mb-3 border border-line">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-body font-semibold text-fg">{t("projects.empty.title")}</h3>
              <p className="text-caption text-muted mt-1 max-w-sm">{t("projects.empty.description")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProjects.map((project) => (
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
                  className="
                    group relative flex flex-col justify-between p-5
                    min-h-[190px] rounded-[26px] cursor-pointer
                    border border-white/60 dark:border-white/10
                    bg-surface/85 dark:bg-surface/60
                    backdrop-blur-2xl backdrop-saturate-150
                    shadow-[0_10px_25px_-5px_rgba(0,0,0,0.07),0_4px_10px_-4px_rgba(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.7)]
                    dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                    hover:shadow-[0_22px_42px_-10px_rgba(0,0,0,0.14),0_8px_16px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.9)]
                    dark:hover:shadow-[0_24px_48px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)]
                    hover:border-concept-fg/40 dark:hover:border-concept-fg/40
                    hover:-translate-y-1.5 active:translate-y-0
                    transition-all duration-300 ease-out focus-ring
                    overflow-hidden
                  "
                >
                  {/* Brillo especular superior para dar sensación de relieve y vidrio flotante */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 opacity-80"
                  />

                  {/* Resplandor ambiental flotante en hover */}
                  <div
                    aria-hidden
                    className="
                      pointer-events-none absolute -inset-px rounded-[26px]
                      bg-gradient-to-br from-concept-fg/15 via-transparent to-concept-fg/5
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10
                    "
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3.5">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="text-muted hover:text-fg p-1.5 rounded-full hover:bg-hover opacity-0 group-hover:opacity-100 transition-all duration-200"
                        aria-label="Más opciones"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
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
                      {project.nodeCount} Concepts
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
