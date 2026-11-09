import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, FileText } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import type {
  ConceptMap,
  ConceptNode,
  NodeCategory,
  NodePriority,
} from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { playNodeSelectSound } from "../../services/audio/soundEffects";
import { normalizeCategory } from "../../domain/constants";

interface ConceptCanvasProps {
  map: ConceptMap;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
  onOpenDocDetail?: (node: ConceptNode) => void;
  isChatOpen?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Categorías canónicas (orden fijo de columnas)
 * ──────────────────────────────────────────────────────────────────────────── */
const CATEGORIES: Array<{
  key: NodeCategory;
  labelKey: string;
  fallback: string;
  dotClass: string;
}> = [
  {
    key: "legal",
    labelKey: "categories.legal",
    fallback: "Legal",
    dotClass: "bg-category-legal shadow-[0_0_8px_rgba(168,85,247,0.5)]",
  },
  {
    key: "economic",
    labelKey: "categories.economic",
    fallback: "Económico",
    dotClass: "bg-category-economic shadow-[0_0_8px_rgba(16,185,129,0.5)]",
  },
  {
    key: "political",
    labelKey: "categories.political",
    fallback: "Político",
    dotClass: "bg-category-political shadow-[0_0_8px_rgba(59,130,246,0.5)]",
  },
  {
    key: "technical",
    labelKey: "categories.technical",
    fallback: "Técnico",
    dotClass: "bg-category-technical shadow-[0_0_8px_rgba(100,116,139,0.5)]",
  },
];

export const ConceptCanvas: React.FC<ConceptCanvasProps> = ({
  map,
  isChatOpen = false,
}) => {
  const { t } = useTranslation();
  const { canvasMode, setCanvasMode, setSelectedNode, setDocViewMode, isThinking } = useWorkspaceStore();

  const safeNodes = map?.nodes || [];

  /* Agrupación por categoría (fallback seguro: technical) */
  const nodesByCategory = useMemo(() => {
    const grouped: Record<NodeCategory, ConceptNode[]> = {
      legal: [],
      economic: [],
      political: [],
      technical: [],
    };
    for (const n of safeNodes) {
      const cat = normalizeCategory(n.category);
      if (grouped[cat]) {
        grouped[cat].push(n);
      } else {
        grouped.technical.push(n);
      }
    }
    return grouped;
  }, [safeNodes]);

  const getCategoryBorderClass = (category?: NodeCategory) => {
    switch (category) {
      case "legal":
        return "border-l-4 border-l-category-legal";
      case "economic":
        return "border-l-4 border-l-category-economic";
      case "political":
        return "border-l-4 border-l-category-political";
      case "technical":
      default:
        return "border-l-4 border-l-category-technical";
    }
  };

  const getPriorityGlowClass = (priority?: NodePriority) => {
    if (priority === "high") {
      return "shadow-[0_0_20px_-3px_rgba(239,68,68,0.25)] dark:shadow-[0_0_24px_-2px_rgba(239,68,68,0.4)] ring-1 ring-priority-high/35";
    }
    return "shadow-xs";
  };

  return (
    <div className="relative w-full h-full bg-transparent overflow-hidden select-none">
      {/* ============================================================== */}
      {/* MODE 1: KNOWLEDGE VIEW - Board por categoría                   */}
      {/* ============================================================== */}
      {canvasMode === "notion" && (
        <div
          className={`w-full h-full overflow-y-auto px-6 sm:px-10 pt-4 pb-12 animate-fade-in select-text transition-all duration-300 ease-out ${
            isChatOpen ? "xl:pr-[460px] lg:pr-[420px]" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Editorial Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/80 dark:border-line/10">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-concept-fg" />
                  Tablero de Conocimiento
                </h2>
                <p className="text-caption text-muted mt-1">
                  Conceptos organizados por categoría semántica.
                </p>
              </div>

              <button
                onClick={() => setCanvasMode("discovery")}
                className="
                  inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl
                  bg-surface/80 hover:bg-elevated text-fg border border-line/80 dark:border-line/10
                  shadow-sm hover:border-concept-fg/50 transition-all cursor-pointer text-caption font-semibold focus-ring
                "
              >
                <Sparkles className="w-4 h-4 text-concept-fg" />
                <span>Idear con IA</span>
              </button>
            </div>

            {/* Structuring Loading Banner */}
            {isThinking && (
              <div className="flex items-center gap-3 p-4 rounded-2xl glass-card border border-primary/30 bg-surface/50 text-fg animate-pulse">
                <Sparkles className="w-5 h-5 animate-spin text-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-fg">Estructurando conceptos y arquitectura con IA...</p>
                  <p className="text-[11px] text-muted">Mapeando dimensiones estratégicas y relaciones causales en tiempo real.</p>
                </div>
              </div>
            )}

            {/* Category Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {CATEGORIES.map((cat) => {
                const nodes = nodesByCategory[cat.key] || [];
                return (
                  <div
                    key={cat.key}
                    className="space-y-3 rounded-[24px] p-3.5 border border-line/80 dark:border-line/10 bg-surface/65 dark:bg-app/65 backdrop-blur-2xl shadow-xs"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-line/60 dark:border-line/10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${cat.dotClass}`} />
                        <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                          {t(cat.labelKey, { defaultValue: cat.fallback })}
                        </h3>
                      </div>
                      <span className="text-[11px] font-semibold text-muted bg-surface/90 dark:bg-surface/[0.06] px-2 py-0.5 rounded-full border border-line-soft dark:border-line/10">
                        {nodes.length}
                      </span>
                    </div>

                    {/* Minimal Cards */}
                    <div className="space-y-2">
                      {nodes.length === 0 ? (
                        <div
                          onClick={() => setCanvasMode("discovery")}
                          className="
                            p-4 rounded-xl border border-dashed border-line/80 dark:border-line/15
                            text-center text-[11px] text-muted bg-surface/30 space-y-1.5
                            cursor-pointer hover:border-concept-fg/40 hover:bg-surface/50 transition-all group
                          "
                          role="button"
                          tabIndex={0}
                          title="Ir a Ideación IA"
                        >
                          <p className="font-semibold text-fg/80 group-hover:text-concept-fg transition-colors">
                            Sin conceptos en esta categoría
                          </p>
                          <p className="text-[10px] text-muted leading-relaxed">
                            Genera conceptos explorando tu idea con la IA
                          </p>
                        </div>
                      ) : (
                        nodes.map((node) => (
                          <div
                            key={node.id}
                            onClick={() => {
                              playNodeSelectSound();
                              setSelectedNode(node.id);
                              setCanvasMode("spatial");
                              setDocViewMode("fullscreen");
                            }}
                            className={`
                              p-3 rounded-xl border border-line/80 dark:border-line/10
                              bg-surface/85 dark:bg-surface/85 backdrop-blur-xl
                              hover:border-concept-fg/40 hover:-translate-y-0.5
                              transition-all duration-200 cursor-pointer group
                              flex items-start justify-between gap-2
                              ${getCategoryBorderClass(node.category)}
                              ${getPriorityGlowClass(node.priority)}
                            `}
                          >
                            <h4 className="text-[12px] font-semibold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug flex-1 min-w-0">
                              {node.title}
                            </h4>
                            {node.priority && (
                              <Badge priority={node.priority} size="sm" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};