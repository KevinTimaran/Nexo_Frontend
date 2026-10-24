import React, { useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { ViewModeToggle } from "../../components/ui/ViewModeToggle";
import type { ConceptMap, ConceptNode, NodeCategory, NodePriority, ResearchPhase } from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { semanticColors } from "../../theme/tokens";

interface ConceptCanvasProps {
  map: ConceptMap;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onOpenAddNode: () => void;
  onOpenDocDetail?: (node: ConceptNode) => void;
}

export const ConceptCanvas: React.FC<ConceptCanvasProps> = ({
  map,
  selectedNodeId,
  onSelectNode,
  onNodeMove,
  onOpenAddNode,
  onOpenDocDetail,
}) => {
  const { t } = useTranslation();
  const { canvasMode, setCanvasMode, setExpandedDocNodeId } = useWorkspaceStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transformation state (for spatial graph mode)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Pan dragging state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Obsidian Constellation: Hovered Node Tooltip State
  const [hoveredNode, setHoveredNode] = useState<{
    node: ConceptNode;
    screenX: number;
    screenY: number;
  } | null>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.0));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.4));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFit = useCallback(() => {
    if (map.nodes.length === 0) {
      handleReset();
      return;
    }
    const minX = Math.min(...map.nodes.map((n) => n.x));
    const maxX = Math.max(...map.nodes.map((n) => n.x)) + 120;
    const minY = Math.min(...map.nodes.map((n) => n.y));
    const maxY = Math.max(...map.nodes.map((n) => n.y)) + 120;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const scaleX = (width - 160) / (maxX - minX || 1);
    const scaleY = (height - 160) / (maxY - minY || 1);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.45), 1.25);

    setZoom(newZoom);
    setPan({
      x: (width - (maxX + minX) * newZoom) / 2,
      y: (height - (maxY + minY) * newZoom) / 2,
    });
  }, [map.nodes]);

  // Handle Mouse Pan / Drag
  const handleMouseDownContainer = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
      onSelectNode(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingNodeId) {
      const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
      const newY = (e.clientY - pan.y) / zoom - dragOffset.y;
      onNodeMove(draggingNodeId, Math.round(newX), Math.round(newY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: ConceptNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    setDraggingNodeId(node.id);
    const nodeScreenX = node.x * zoom + pan.x;
    const nodeScreenY = node.y * zoom + pan.y;
    setDragOffset({
      x: (e.clientX - nodeScreenX) / zoom,
      y: (e.clientY - nodeScreenY) / zoom,
    });
  };

  // Node Map for relations
  const nodeMap = useMemo(() => new Map(map.nodes.map((n) => [n.id, n])), [map.nodes]);

  // Connected nodes set for selective highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    map.relations.forEach((rel) => {
      if (rel.from === selectedNodeId) ids.add(rel.to);
      if (rel.to === selectedNodeId) ids.add(rel.from);
    });
    return ids;
  }, [selectedNodeId, map.relations]);

  const openDocumentDeepDive = (node: ConceptNode) => {
    if (onOpenDocDetail) {
      onOpenDocDetail(node);
    } else {
      setExpandedDocNodeId(node.id);
    }
  };

  // Filter nodes by research phase for Notion board view
  const resolvePhase = (node: ConceptNode): ResearchPhase => {
    if (node.phase) return node.phase;
    if (node.kind === "concept") return "planning";
    if (node.kind === "viability") return "execution";
    return "validation";
  };

  const planningNodes = map.nodes.filter((n) => resolvePhase(n) === "planning");
  const executionNodes = map.nodes.filter((n) => resolvePhase(n) === "execution");
  const validationNodes = map.nodes.filter((n) => resolvePhase(n) === "validation");

  const kindIcons = {
    concept: <Sparkles className="w-3.5 h-3.5 text-concept-fg" />,
    viability: <CheckCircle2 className="w-3.5 h-3.5 text-positive-fg" />,
    risk: <AlertTriangle className="w-3.5 h-3.5 text-risk-fg" />,
  };

  // Helper for Category Border Styles in Notion Cards
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

  // Helper for High Priority Subtle Glow
  const getPriorityGlowClass = (priority?: NodePriority) => {
    if (priority === "high") {
      return "shadow-[0_0_20px_-3px_rgba(239,68,68,0.2)] dark:shadow-[0_0_24px_-2px_rgba(239,68,68,0.35)] ring-1 ring-priority-high/30";
    }
    return "shadow-xs";
  };

  // Helper for Obsidian Node Dot Color
  const getNodeFillColor = (node: ConceptNode): string => {
    if (node.category && semanticColors.category[node.category]) {
      return semanticColors.category[node.category].dark;
    }
    const phase = resolvePhase(node);
    if (phase === "planning") return "#10B981";
    if (phase === "execution") return "#3B82F6";
    return "#F59E0B";
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
                  <FileText className="w-6 h-6 text-concept-fg" />
                  Tablero de Conocimiento
                </h2>
                <p className="text-caption text-muted mt-1">
                  Organización editorial de conceptos clasificados por fase, categoría semántica y prioridad de investigación.
                </p>
              </div>

              <button
                onClick={onOpenAddNode}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-concept-fg text-white text-caption font-semibold shadow-sm hover:brightness-110 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir concepto</span>
              </button>
            </div>

            {/* 3 Research Phase Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Column 1: Planning */}
              <div className="space-y-3.5 bg-sunken/40 dark:bg-white/[0.02] border border-line-soft rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-soft">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                      {t("phases.planning")}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted bg-surface px-2 py-0.5 rounded-md border border-line-soft">
                    {planningNodes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {planningNodes.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-line text-center text-caption text-muted">
                      Sin conceptos en planificación
                    </div>
                  ) : (
                    planningNodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => openDocumentDeepDive(node)}
                        className={`p-4 rounded-xl bg-surface border border-line hover:border-concept-fg/50 transition-all cursor-pointer group space-y-2.5 ${getCategoryBorderClass(
                          node.category
                        )} ${getPriorityGlowClass(node.priority)}`}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                          <div className="flex items-center gap-1 flex-wrap">
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

                        <div className="pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-muted">
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
              <div className="space-y-3.5 bg-sunken/40 dark:bg-white/[0.02] border border-line-soft rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-soft">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                      {t("phases.execution")}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted bg-surface px-2 py-0.5 rounded-md border border-line-soft">
                    {executionNodes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {executionNodes.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-line text-center text-caption text-muted">
                      Sin conceptos en ejecución
                    </div>
                  ) : (
                    executionNodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => openDocumentDeepDive(node)}
                        className={`p-4 rounded-xl bg-surface border border-line hover:border-concept-fg/50 transition-all cursor-pointer group space-y-2.5 ${getCategoryBorderClass(
                          node.category
                        )} ${getPriorityGlowClass(node.priority)}`}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                          <div className="flex items-center gap-1 flex-wrap">
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

                        <div className="pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-muted">
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
              <div className="space-y-3.5 bg-sunken/40 dark:bg-white/[0.02] border border-line-soft rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-soft">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-caption font-bold uppercase tracking-wider text-fg">
                      {t("phases.validation")}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted bg-surface px-2 py-0.5 rounded-md border border-line-soft">
                    {validationNodes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {validationNodes.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-line text-center text-caption text-muted">
                      Sin conceptos en validación
                    </div>
                  ) : (
                    validationNodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => openDocumentDeepDive(node)}
                        className={`p-4 rounded-xl bg-surface border border-line hover:border-concept-fg/50 transition-all cursor-pointer group space-y-2.5 ${getCategoryBorderClass(
                          node.category
                        )} ${getPriorityGlowClass(node.priority)}`}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                          <div className="flex items-center gap-1 flex-wrap">
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

                        <div className="pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-muted">
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
      {/* MODE 2: CONSTELLATION VIEW ('obsidian') — Minimal Spatial Graph */}
      {/* ============================================================== */}
      {canvasMode === "obsidian" && (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDownContainer}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-full h-full bg-app canvas-dots overflow-hidden select-none cursor-grab active:cursor-grabbing"
          tabIndex={0}
          aria-label="Lienzo estelar de constelaciones Obsidian"
        >
          {/* Floating Canvas Toolbar (Top-Left) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1 glass rounded-xl p-1.5 shadow-md border border-line">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring cursor-pointer"
              title={t("canvas.zoomIn")}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring cursor-pointer"
              title={t("canvas.zoomOut")}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFit}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring cursor-pointer"
              title={t("canvas.fit")}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring cursor-pointer"
              title={t("canvas.reset")}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-line mx-1" />

            <span className="text-caption font-mono text-muted px-1.5">
              {Math.round(zoom * 100)}%
            </span>

            <div className="h-4 w-px bg-line mx-1" />

            <button
              onClick={onOpenAddNode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-concept-fg text-white text-caption font-semibold shadow-sm hover:brightness-110 active:scale-95 transition-all ml-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>

          {/* Category / Phase Legend (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 z-20 glass rounded-xl px-3.5 py-2 border border-line shadow-md text-[11px] font-medium flex items-center gap-4 text-muted">
            <span className="font-semibold text-fg">Constelación:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              <span>Planificación</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
              <span>Ejecución</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
              <span>Validación</span>
            </div>
          </div>

          {/* Spatial Canvas Container */}
          <div
            className="w-full h-full origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Relations Layer with Smooth Bezier Curves */}
            <svg className="absolute inset-0 w-[6000px] h-[6000px] pointer-events-none z-0">
              <defs>
                <marker
                  id="arrowhead-obsidian"
                  markerWidth="8"
                  markerHeight="6"
                  refX="16"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="var(--line)" />
                </marker>
                <marker
                  id="arrowhead-obsidian-active"
                  markerWidth="8"
                  markerHeight="6"
                  refX="16"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="var(--concept-fg)" />
                </marker>
              </defs>

              {map.relations.map((rel) => {
                const source = nodeMap.get(rel.from);
                const target = nodeMap.get(rel.to);
                if (!source || !target) return null;

                const sx = source.x;
                const sy = source.y;
                const tx = target.x;
                const ty = target.y;

                const dx = tx - sx;
                const cx1 = sx + dx * 0.5;
                const cy1 = sy;
                const cx2 = sx + dx * 0.5;
                const cy2 = ty;

                const isRelSelected =
                  selectedNodeId === rel.from || selectedNodeId === rel.to;
                const isDimmed = selectedNodeId && !isRelSelected;

                return (
                  <g key={rel.id} className="transition-opacity duration-300">
                    <path
                      d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
                      fill="none"
                      stroke={isRelSelected ? "var(--concept-fg)" : "var(--line)"}
                      strokeWidth={isRelSelected ? "2.5" : "1.2"}
                      opacity={isDimmed ? 0.15 : 0.85}
                      markerEnd={
                        isRelSelected
                          ? "url(#arrowhead-obsidian-active)"
                          : "url(#arrowhead-obsidian)"
                      }
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Obsidian Concept Node Circles Layer */}
            {map.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const isDimmed = selectedNodeId && !isConnected;
              const fillColor = getNodeFillColor(node);

              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => openDocumentDeepDive(node)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectNode(node.id);
                      openDocumentDeepDive(node);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredNode({
                      node,
                      screenX: rect.left + rect.width / 2,
                      screenY: rect.top - 12,
                    });
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`absolute group cursor-pointer z-10 transition-all duration-200 outline-none ${
                    isDimmed ? "opacity-30 hover:opacity-100" : "opacity-100"
                  }`}
                  aria-label={`Concepto: ${node.title}`}
                >
                  {/* Subtle Node Orbit Glow Ring on select */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isSelected
                        ? "ring-4 ring-concept-fg/40 scale-125 shadow-lg"
                        : "group-hover:scale-115"
                    }`}
                  >
                    {/* Inner Celestial Circle */}
                    <div
                      style={{ backgroundColor: fillColor }}
                      className="w-4 h-4 rounded-full border-2 border-white dark:border-black/60 shadow-md transition-transform"
                    />
                  </div>

                  {/* Clean Node Label (Obsidian Style) */}
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all ${
                        isSelected
                          ? "bg-concept-fg text-white shadow-xs"
                          : "bg-surface/85 dark:bg-zinc-900/85 text-fg/90 border border-line-soft/80 group-hover:border-concept-fg"
                      }`}
                    >
                      {node.title}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty Canvas Hint */}
            {map.nodes.length === 0 && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-sm p-8 bg-surface/90 glass border border-line rounded-3xl shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-concept-fg/10 text-concept-fg flex items-center justify-center mx-auto mb-3 border border-concept-fg/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-body font-bold text-fg">{t("canvas.empty.title")}</h3>
                <p className="text-caption text-muted mt-1 leading-relaxed">
                  {t("canvas.empty.description")}
                </p>
                <button
                  onClick={onOpenAddNode}
                  className="mt-4 px-4 py-2 rounded-xl bg-concept-fg text-white text-caption font-semibold shadow-sm hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir primer concepto</span>
                </button>
              </div>
            )}
          </div>

          {/* 6.4 Refined Node Hover Tooltip in Constellation View */}
          {hoveredNode && (
            <div
              style={{
                left: `${hoveredNode.screenX}px`,
                top: `${hoveredNode.screenY}px`,
                transform: "translate(-50%, -100%)",
              }}
              className="fixed z-40 pointer-events-none p-2.5 rounded-xl bg-surface/95 dark:bg-zinc-900/95 border border-line shadow-xl backdrop-blur-md max-w-xs animate-scale-in space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  {t(`phases.${resolvePhase(hoveredNode.node)}`)}
                </span>
                {hoveredNode.node.priority && (
                  <Badge priority={hoveredNode.node.priority} size="sm" />
                )}
              </div>
              <h5 className="text-caption font-bold text-fg leading-tight">
                {hoveredNode.node.title}
              </h5>
              {hoveredNode.node.category && (
                <Badge category={hoveredNode.node.category} size="sm" />
              )}
              {hoveredNode.node.description && (
                <p className="text-[11px] text-muted line-clamp-2 leading-snug">
                  {hoveredNode.node.description}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
