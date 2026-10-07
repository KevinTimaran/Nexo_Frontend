import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Lightbulb,
  Leaf,
  Scale,
  Rocket,
  Book,
  Compass,
  Sparkles,
  Layers,
  Activity,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { currentLanguage } from "../../i18n";
import { mockServices } from "../../services/mock";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { Project, ProjectIcon, ProjectStatus } from "../../domain/types";

interface DashboardViewProps {
  onOpenNewProject: () => void;
  onProjectsLoaded?: (projects: Project[]) => void;
}

const ICON_MAP: Record<ProjectIcon, React.ReactNode> = {
  lightbulb: <Lightbulb className="w-5 h-5 text-amber-500" />,
  leaf: <Leaf className="w-5 h-5 text-emerald-500" />,
  scale: <Scale className="w-5 h-5 text-indigo-500" />,
  rocket: <Rocket className="w-5 h-5 text-rose-500" />,
  book: <Book className="w-5 h-5 text-blue-500" />,
  compass: <Compass className="w-5 h-5 text-cyan-500" />,
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewProject,
  onProjectsLoaded,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name || "Explorer";
    if (hour < 12) return t("home.greeting.morning", { name });
    if (hour < 18) return t("home.greeting.afternoon", { name });
    return t("home.greeting.evening", { name });
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalConcepts = projects.reduce((acc, p) => acc + p.nodeCount, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Banner / Hero Header */}
      <div className="relative glass border border-line rounded-3xl p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-concept-fg/10 text-concept-fg text-caption font-semibold border border-concept-fg/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Nexo Spatial Workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-fg">{getGreeting()}</h1>
            <p className="text-body text-muted mt-1 max-w-xl">{t("home.description")}</p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={onOpenNewProject}
            icon={<Plus className="w-5 h-5" />}
            className="shadow-lg shadow-blue-500/20 shrink-0"
          >
            {t("projects.newCard.title")}
          </Button>
        </div>

        {/* Quick Stats overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-line-soft">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-elevated/50 border border-line-soft">
            <div className="w-10 h-10 rounded-xl bg-concept-fg/10 text-concept-fg flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-caption font-medium text-muted">{t("projects.title")}</p>
              <p className="text-xl font-bold text-fg">{projects.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-elevated/50 border border-line-soft">
            <div className="w-10 h-10 rounded-xl bg-positive-fg/10 text-positive-fg flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-caption font-medium text-muted">Mapped Concepts</p>
              <p className="text-xl font-bold text-fg">{totalConcepts}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-elevated/50 border border-line-soft">
            <div className="w-10 h-10 rounded-xl bg-risk-fg/10 text-risk-fg flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-caption font-medium text-muted">AI Workspace Engine</p>
              <p className="text-caption font-bold text-positive-fg flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-positive-fg animate-pulse" />
                Active & Ready
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("projects.searchPlaceholder")}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "active", "draft", "archived"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-caption font-medium transition-all ${
                statusFilter === st
                  ? "bg-concept-fg text-white shadow-sm"
                  : "bg-elevated text-muted hover:text-fg hover:bg-hover border border-line"
              }`}
            >
              {st === "all" ? t("projects.filters.all") : t(`projects.filters.${st}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl glass border border-line p-5 animate-pulse bg-elevated/30"
            />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass border border-line rounded-3xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-elevated flex items-center justify-center text-muted mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-body font-semibold text-fg">{t("projects.empty.title")}</h3>
          <p className="text-caption text-muted mt-1 max-w-sm">{t("projects.empty.description")}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenNewProject}
            icon={<Plus className="w-4 h-4" />}
            className="mt-4"
          >
            {t("projects.newCard.title")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* New Project Card */}
          <div
            onClick={onOpenNewProject}
            className="group relative border-2 border-dashed border-line hover:border-concept-fg rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 hover:bg-concept-fg/5 min-h-[190px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-concept-fg/10 text-concept-fg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-body font-semibold text-fg">{t("projects.newCard.title")}</h3>
            <p className="text-caption text-muted mt-1">{t("projects.newCard.hint")}</p>
          </div>

          {/* Existing Project Cards */}
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/workspace/${project.id}`)}
              className="group glass border border-line hover:border-ring-soft rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="p-2.5 rounded-2xl bg-elevated border border-line-soft">
                    {ICON_MAP[project.icon] || <Sparkles className="w-5 h-5 text-concept-fg" />}
                  </div>
                  <div className="flex items-center gap-2">
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
                    <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-concept-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </div>

                <h3 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-caption text-muted mt-1 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-line-soft text-caption text-muted">
                <span>{project.nodeCount} concepts</span>
                <span>
                  {new Date(project.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
