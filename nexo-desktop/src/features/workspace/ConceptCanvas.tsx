import React, { useMemo } from "react";
import { Sparkles, FileText } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { SemanticNodeBadges } from "../../components/semantic/SemanticBadges";
import { SemanticIcon } from "../../components/semantic/SemanticIcon";
import { SemanticLegend } from "../../components/semantic/SemanticLegend";
import type {
  ConceptMap,
  ConceptNode,
  NodePriority,
} from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { playNodeSelectSound } from "../../services/audio/soundEffects";
import {
  perspectiveVisuals,
  resolvePerspectiveVisual,
  type PerspectiveVisualToken,
} from "../../theme/semanticVisuals";

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
const BASE_PERSPECTIVES: PerspectiveVisualToken[] = [
  perspectiveVisuals.legal,
  perspectiveVisuals.economic,
  perspectiveVisuals.political,
  perspectiveVisuals.technical,
];

export const ConceptCanvas: React.FC<ConceptCanvasProps> = ({
  map,
  isChatOpen = false,
}) => {
  const { canvasMode, setCanvasMode, setSelectedNode, setDocViewMode, isThinking } = useWorkspaceStore();

  const safeNodes = map?.nodes || [];

  /* Agrupación por perspectiva usando el registro semántico compartido. */
  const perspectiveGroups = useMemo(() => {
    const grouped = new Map<string, { visual: PerspectiveVisualToken; nodes: ConceptNode[] }>();
    BASE_PERSPECTIVES.forEach((visual) => grouped.set(visual.id, { visual, nodes: [] }));
    for (const n of safeNodes) {
      const visual = resolvePerspectiveVisual(n);
      const current = grouped.get(visual.id) ?? { visual, nodes: [] };
      current.nodes.push(n);
      grouped.set(visual.id, current);
    }
    return [...grouped.values()];
  }, [safeNodes]);

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

            <SemanticLegend perspectives={perspectiveGroups.map((group) => group.visual)} />

            {/* Perspective Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {perspectiveGroups.map(({ visual, nodes }) => {
                return (
                  <div
                    key={visual.id}
                    className="space-y-3 rounded-[24px] p-3.5 border border-line/80 dark:border-line/10 bg-surface/65 dark:bg-app/65 backdrop-blur-2xl shadow-xs"
                    style={{ borderTopColor: `color-mix(in srgb, ${visual.dark} 62%, var(--line))` }}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-line/60 dark:border-line/10">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center border" style={{ color: visual.dark, borderColor: `color-mix(in srgb, ${visual.dark} 45%, var(--line))`, backgroundColor: `color-mix(in srgb, ${visual.dark} 10%, transparent)` }}>
                          <SemanticIcon name={visual.icon} className="w-3.5 h-3.5" />
                        </span>
                        <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                          {visual.label}
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
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                playNodeSelectSound();
                                setSelectedNode(node.id);
                                setCanvasMode("spatial");
                                setDocViewMode("fullscreen");
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`${node.title}. ${resolvePerspectiveVisual(node).label}`}
                            className={`
                              p-3 rounded-xl border border-line/80 dark:border-line/10
                              bg-surface/85 dark:bg-surface/85 backdrop-blur-xl
                              hover:border-concept-fg/40 hover:-translate-y-0.5
                              transition-all duration-200 cursor-pointer group
                              space-y-2 border-l-4 focus-ring
                              ${getPriorityGlowClass(node.priority)}
                            `}
                            style={{ borderLeftColor: resolvePerspectiveVisual(node).dark }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-[12px] font-semibold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug flex-1 min-w-0">
                                {node.title}
                              </h4>
                              {node.priority && <Badge priority={node.priority} size="sm" />}
                            </div>
                            <SemanticNodeBadges node={node} showPerspective={false} showOrigin compact max={3} />
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
