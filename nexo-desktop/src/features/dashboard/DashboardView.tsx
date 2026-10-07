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
  Layers,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
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
  lightbulb: <Lightbulb className="w-5 h-5" />,
  leaf: <Leaf className="w-5 h-5" />,
  scale: <Scale className="w-5 h-5" />,
  rocket: <Rocket className="w-5 h-5" />,
  book: <Book className="w-5 h-5" />,
  compass: <Compass className="w-5 h-5" />,
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

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-app text-fg">
      {/* Top action bar (Toolbar extension) */}
      <div className="px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-title font-semibold tracking-tight text-fg">
            {t("nav.projects")}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("projects.searchPlaceholder")}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button
            variant="primary"
            onClick={onOpenNewProject}
            icon={<Plus className="w-4 h-4" />}
          >
            {t("projects.newCard.title")}
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-8 mb-6 shrink-0">
        <div className="inline-flex bg-sunken border border-line rounded-md p-0.5">
          {(["all", "active", "draft", "archived"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-1 rounded text-caption font-medium transition-all ${
                statusFilter === st
                  ? "bg-surface text-fg shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              {st === "all" ? t("projects.filters.all") : t(`projects.filters.${st}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-sunken border border-line animate-pulse"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/workspace/${project.id}`)}
                className="group relative bg-surface border border-line rounded-xl p-4 flex flex-col cursor-pointer transition-all hover:shadow-sm hover:border-line-soft"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center">
                    {ICON_MAP[project.icon] || <Layers className="w-5 h-5" />}
                  </div>
                  <button className="text-muted hover:text-fg p-1 rounded hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="text-body font-semibold text-fg line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-caption text-muted mt-1 line-clamp-2 leading-relaxed flex-1">
                  {project.description}
                </p>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-soft">
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
  );
};
