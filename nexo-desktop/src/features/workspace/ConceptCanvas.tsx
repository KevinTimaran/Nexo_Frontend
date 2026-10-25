import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { ViewModeToggle } from "../../components/ui/ViewModeToggle";
import { NodeCanvasLayout } from "./NodeCanvasLayout";
import { DeepDiveModal } from "./DeepDiveModal";
import type {
  ConceptMap,
  ConceptNode,
  NodeCategory,
  NodePriority,
  ResearchPhase,
} from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface ConceptCanvasProps {
  map: ConceptMap;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
  onOpenAddNode: () => void;
  onOpenDocDetail?: (node: ConceptNode) => void;
}

export const ConceptCanvas: React.FC<ConceptCanvasProps> = ({
  map,
  onOpenAddNode,
}) => {
  const { t } = useTranslation();
  const { canvasMode, setCanvasMode, openDeepDive } = useWorkspaceStore();

  const openDocumentDeepDive = (node: ConceptNode) => {
    openDeepDive(node.id);
  };

  // Filter nodes by research phase for Notion board view
  const resolvePhase = (node: ConceptNode): ResearchPhase => {
    if (node.phase) return node.phase;
    if (node.kind === "concept") return "planning";
    if (node.kind === "viability") return "execution";
    return "validation";
  };

  const planningNodes = useMemo(
    () => map.nodes.filter((n) => resolvePhase(n) === "planning"),
    [map.nodes]
  );
  const executionNodes = useMemo(
    () => map.nodes.filter((n) => resolvePhase(n) === "execution"),
    [map.nodes]
  );
  const validationNodes = useMemo(
    () => map.nodes.filter((n) => resolvePhase(n) === "validation"),
    [map.nodes]
  );

  const kindIcons = {
    concept: <Sparkles className="w-3.5 h-3.5 text-concept-fg" />,
    viability: <CheckCircle2 className="w-3.5 h-3.5 text-positive-fg" />,
    risk: <AlertTriangle className="w-3.5 h-3.5 text-risk-fg" />,
  };

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
    <div className="relative w-full h-full bg-app overflow-hidden select-none">
      {/* Top-Centered Segmented Control: Dual-Mode Switcher */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 animate-rise-in">
        <ViewModeToggle mode={canvasMode} onChange={setCanvasMode} />
      </div>

      {/* ============================================================== */}
      {/* MODE 1: KNOWLEDGE VIEW ('notion') - Structured Editorial Board */}
      {/* ============================================================== */}
      {canvasMode === "notion" && (
        <div className="w-full h-full overflow-y-auto px-6 sm:px-10 pt-20 pb-12 animate-fade-in select-text">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Editorial Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/80 dark:border-white/10">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-concept-fg" />
                  Tablero de Conocimiento
                </h2>
                <p className="text-caption text-muted mt-1">
                  Organización editorial de conceptos clasificados por fase, categoría semántica y prioridad de investigación.
                </p>
              </div>

              <button
                onClick={onOpenAddNode}
                className="
                  inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl
                  bg-gradient-to-b from-concept-fg to-concept-fg/90 text-white text-caption font-semibold
                  shadow-[0_4px_14px_-3px_rgba(37,99,235,0.45),inset_0_1px_0_0_rgba(255,255,255,0.3)]
                  hover:brightness-105 active:scale-95 transition-all self-start sm:self-auto cursor-pointer focus-ring
                "
              >
                <Plus className="w-4 h-4" />
                <span>Añadir concepto</span>
              </button>
            </div>

            {/* 3 Research Phase Columns (Creative Glass Lanes) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Column 1: Planning */}
              <div className="space-y-4 rounded-[28px] p-4.5 border border-line/80 dark:border-white/10 bg-surface/65 dark:bg-zinc-950/65 backdrop-blur-2xl shadow-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-line/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                      {t("phases.planning")}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted bg-surface/90 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-line-soft dark:border-white/10 shadow-2xs">
                    {planningNodes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {planningNodes.length === 0 ? (
                    <div className="p-5 rounded-2xl border border-dashed border-line/80 dark:border-white/15 text-center text-caption text-muted bg-surface/30">
                      Sin conceptos en planificación
                    </div>
                  ) : (
                    planningNodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => openDocumentDeepDive(node)}
                        className={`
                          p-4 rounded-2xl border border-line/80 dark:border-white/10
                          bg-surface/85 dark:bg-zinc-900/85 backdrop-blur-xl
                          shadow-[0_4px_16px_-4px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,0.7)]
                          dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)]
                          hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.9)]
                          dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.12)]
                          hover:border-concept-fg/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer group space-y-2.5
                          ${getCategoryBorderClass(node.category)} ${getPriorityGlowClass(node.priority)}
                        `}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge kind={node.kind} status={node.status}>
                              <span className="flex items-center gap-1">
                                {kindIcons[node.kind]}
                                {t(`kinds.${node.kind}`)}
                              </span>
                            </Badge>
                            {node.category && <Badge category={node.category} size="sm" />}
                            {node.priority && <Badge priority={node.priority} size="sm" />}
                          </div>

                          {node.metadata && (
                            <span className="text-muted font-mono bg-sunken px-1.5 py-0.5 rounded border border-line-soft truncate max-w-[110px]">
                              {node.metadata}
                            </span>
                          )}
                        </div>

                        <h4 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug">
                          {node.title}
                        </h4>

                        {node.description && (
                          <p className="text-caption text-muted line-clamp-2 leading-relaxed font-normal">
                            {node.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-line-soft dark:border-white/5 flex items-center justify-between text-[11px] text-muted">
                          <span>Ref: {node.id.slice(0, 8)}</span>
                          <span className="inline-flex items-center gap-1 text-concept-fg font-medium group-hover:translate-x-0.5 transition-transform">
                            <span>Ver documento</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Execution */}
              <div className="space-y-4 rounded-[28px] p-4.5 border border-line/80 dark:border-white/10 bg-surface/65 dark:bg-zinc-950/65 backdrop-blur-2xl shadow-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-line/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                      {t("phases.execution")}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted bg-surface/90 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-line-soft dark:border-white/10 shadow-2xs">
                    {executionNodes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {executionNodes.length === 0 ? (
                    <div className="p-5 rounded-2xl border border-dashed border-line/80 dark:border-white/15 text-center text-caption text-muted bg-surface/30">
                      Sin conceptos en ejecución
                    </div>
                  ) : (
                    executionNodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => openDocumentDeepDive(node)}
                        className={`
                          p-4 rounded-2xl border border-line/80 dark:border-white/10
                          bg-surface/85 dark:bg-zinc-900/85 backdrop-blur-xl
                          shadow-[0_4px_16px_-4px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,0.7)]
                          dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)]
                          hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.9)]
                          dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.12)]
                          hover:border-concept-fg/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer group space-y-2.5
                          ${getCategoryBorderClass(node.category)} ${getPriorityGlowClass(node.priority)}
                        `}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge kind={node.kind} status={node.status}>
                              <span className="flex items-center gap-1">
                                {kindIcons[node.kind]}
                                {t(`kinds.${node.kind}`)}
                              </span>
                            </Badge>
                            {node.category && <Badge category={node.category} size="sm" />}
                            {node.priority && <Badge priority={node.priority} size="sm" />}
                          </div>

                          {node.metadata && (
                            <span className="text-muted font-mono bg-sunken px-1.5 py-0.5 rounded border border-line-soft truncate max-w-[110px]">
                              {node.metadata}
                            </span>
                          )}
                        </div>

                        <h4 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug">
                          {node.title}
                        </h4>

                        {node.description && (
                          <p className="text-caption text-muted line-clamp-2 leading-relaxed font-normal">
                            {node.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-line-soft dark:border-white/5 flex items-center justify-between text-[11px] text-muted">
                          <span>Ref: {node.id.slice(0, 8)}</span>
                          <span className="inline-flex items-center gap-1 text-concept-fg font-medium group-hover:translate-x-0.5 transition-transform">
                            <span>Ver documento</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Validation */}
              <div className="space-y-4 rounded-[28px] p-4.5 border border-line/80 dark:border-white/10 bg-surface/65 dark:bg-zinc-950/65 backdrop-blur-2xl shadow-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-line/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                      {t("phases.validation")}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted bg-surface/90 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-line-soft dark:border-white/10 shadow-2xs">
                    {validationNodes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {validationNodes.length === 0 ? (
                    <div className="p-5 rounded-2xl border border-dashed border-line/80 dark:border-white/15 text-center text-caption text-muted bg-surface/30">
                      Sin conceptos en validación
                    </div>
                  ) : (
                    validationNodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => openDocumentDeepDive(node)}
                        className={`
                          p-4 rounded-2xl border border-line/80 dark:border-white/10
                          bg-surface/85 dark:bg-zinc-900/85 backdrop-blur-xl
                          shadow-[0_4px_16px_-4px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,0.7)]
                          dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)]
                          hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.9)]
                          dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.12)]
                          hover:border-concept-fg/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer group space-y-2.5
                          ${getCategoryBorderClass(node.category)} ${getPriorityGlowClass(node.priority)}
                        `}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge kind={node.kind} status={node.status}>
                              <span className="flex items-center gap-1">
                                {kindIcons[node.kind]}
                                {t(`kinds.${node.kind}`)}
                              </span>
                            </Badge>
                            {node.category && <Badge category={node.category} size="sm" />}
                            {node.priority && <Badge priority={node.priority} size="sm" />}
                          </div>

                          {node.metadata && (
                            <span className="text-muted font-mono bg-sunken px-1.5 py-0.5 rounded border border-line-soft truncate max-w-[110px]">
                              {node.metadata}
                            </span>
                          )}
                        </div>

                        <h4 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug">
                          {node.title}
                        </h4>

                        {node.description && (
                          <p className="text-caption text-muted line-clamp-2 leading-relaxed font-normal">
                            {node.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-line-soft dark:border-white/5 flex items-center justify-between text-[11px] text-muted">
                          <span>Ref: {node.id.slice(0, 8)}</span>
                          <span className="inline-flex items-center gap-1 text-concept-fg font-medium group-hover:translate-x-0.5 transition-transform">
                            <span>Ver documento</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: SPATIAL VIEW ('obsidian') - Interactive React Flow */}
      {/* ============================================================== */}
      {canvasMode === "obsidian" && (
        <NodeCanvasLayout onOpenAddNode={onOpenAddNode} />
      )}

      {/* Floating Deep-Dive Notion Modal Overlay */}
      <DeepDiveModal />
    </div>
  );
};
