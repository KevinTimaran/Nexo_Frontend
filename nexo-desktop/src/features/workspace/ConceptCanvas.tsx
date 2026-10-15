import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Network,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import type { ConceptMap, ConceptNode, ResearchPhase } from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

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
    const maxX = Math.max(...map.nodes.map((n) => n.x)) + 280;
    const minY = Math.min(...map.nodes.map((n) => n.y));
    const maxY = Math.max(...map.nodes.map((n) => n.y)) + 200;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const scaleX = (width - 120) / (maxX - minX || 1);
    const scaleY = (height - 120) / (maxY - minY || 1);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.45), 1.2);

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
    const clickX = (e.clientX - pan.x) / zoom;
    const clickY = (e.clientY - pan.y) / zoom;
    setDragOffset({ x: clickX - node.x, y: clickY - node.y });
  };

  // Node position helper map
  const nodeMap = new Map(map.nodes.map((n) => [n.id, n]));

  // Connected nodes set when a node is selected
  const connectedNodeIds = new Set<string>();
  if (selectedNodeId) {
    connectedNodeIds.add(selectedNodeId);
    map.relations.forEach((rel) => {
      if (rel.from === selectedNodeId) connectedNodeIds.add(rel.to);
      if (rel.to === selectedNodeId) connectedNodeIds.add(rel.from);
    });
  }

  const resolvePhase = (node: ConceptNode): ResearchPhase => {
    if (node.phase) return node.phase;
    if (node.kind === "concept") return "planning";
    if (node.kind === "viability") return "execution";
    return "validation";
  };

  const getPhaseStyles = (phase: ResearchPhase) => {
    switch (phase) {
      case "planning":
        return {
          pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
          border: "border-emerald-500/30 hover:border-emerald-500",
          ring: "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10",
          dot: "bg-emerald-500",
        };
      case "execution":
        return {
          pill: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
          border: "border-blue-500/30 hover:border-blue-500",
          ring: "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10",
          dot: "bg-blue-500",
        };
      case "validation":
        return {
          pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
          border: "border-amber-500/30 hover:border-amber-500",
          ring: "ring-2 ring-amber-500 shadow-lg shadow-amber-500/10",
          dot: "bg-amber-500",
        };
    }
  };

  const kindIcons = {
    concept: <Sparkles className="w-3.5 h-3.5 text-concept-fg" />,
    viability: <CheckCircle2 className="w-3.5 h-3.5 text-positive-fg" />,
    risk: <AlertTriangle className="w-3.5 h-3.5 text-risk-fg" />,
  };

  // Group nodes by phase for Knowledge Mode (Notion)
  const planningNodes = map.nodes.filter((n) => resolvePhase(n) === "planning");
  const executionNodes = map.nodes.filter((n) => resolvePhase(n) === "execution");
  const validationNodes = map.nodes.filter((n) => resolvePhase(n) === "validation");

  const openDocumentDeepDive = (node: ConceptNode) => {
    setExpandedDocNodeId(node.id);
    if (onOpenDocDetail) {
      onOpenDocDetail(node);
    }
  };

  return (
    <div className="relative w-full h-full bg-app overflow-hidden select-none">
      {/* Top-Centered Segmented Control: Dual-Mode Switcher */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center p-1 rounded-2xl glass border border-line shadow-lg backdrop-blur-xl animate-rise-in">
        <div
          role="radiogroup"
          aria-label="Modo del lienzo"
          className="flex items-center gap-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={canvasMode === "graph"}
            onClick={() => setCanvasMode("graph")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all focus-ring ${
              canvasMode === "graph"
                ? "bg-surface text-fg shadow-xs scale-100"
                : "text-muted hover:text-fg hover:bg-hover scale-95"
            }`}
          >
            <Network className="w-3.5 h-3.5 text-concept-fg" />
            <span>{t("modes.graph")}</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={canvasMode === "notion"}
            onClick={() => setCanvasMode("notion")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all focus-ring ${
              canvasMode === "notion"
                ? "bg-surface text-fg shadow-xs scale-100"
                : "text-muted hover:text-fg hover:bg-hover scale-95"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-concept-fg" />
            <span>{t("modes.notion")}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: KNOWLEDGE MODE ('notion') - Structured Editorial Board */}
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
                  Organización editorial de conceptos categorizados por fases de investigación. Selecciona cualquier tarjeta para abrir su documento profundo.
                </p>
              </div>

              <button
                onClick={onOpenAddNode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-concept-fg text-white text-caption font-semibold shadow-sm hover:brightness-110 active:scale-95 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir concepto</span>
              </button>
            </div>

            {/* 3 Research Phase Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Phase 1: Planning (Emerald) */}
              <div className="space-y-3.5 bg-sunken/40 border border-line-soft rounded-2xl p-4">
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
                        className="p-4 rounded-xl bg-surface border border-line hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <Badge kind={node.kind} status={node.status}>
                            <span className="flex items-center gap-1">
                              {kindIcons[node.kind]}
                              {t(`kinds.${node.kind}`)}
                            </span>
                          </Badge>
                          {node.metadata && (
                            <span className="text-muted font-mono bg-sunken px-1.5 py-0.2 rounded border border-line-soft truncate max-w-[100px]">
                              {node.metadata}
                            </span>
                          )}
                        </div>

                        <h4 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug">
                          {node.title}
                        </h4>

                        {node.description && (
                          <p className="text-caption text-muted line-clamp-2 leading-relaxed">
                            {node.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-muted">
                          <span className="flex items-center gap-1 font-medium group-hover:text-fg transition-colors">
                            <FileText className="w-3 h-3 text-emerald-500" />
                            Ver documento
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Phase 2: Execution (Blue) */}
              <div className="space-y-3.5 bg-sunken/40 border border-line-soft rounded-2xl p-4">
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
                        className="p-4 rounded-xl bg-surface border border-line hover:border-blue-500/60 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <Badge kind={node.kind} status={node.status}>
                            <span className="flex items-center gap-1">
                              {kindIcons[node.kind]}
                              {t(`kinds.${node.kind}`)}
                            </span>
                          </Badge>
                          {node.metadata && (
                            <span className="text-muted font-mono bg-sunken px-1.5 py-0.2 rounded border border-line-soft truncate max-w-[100px]">
                              {node.metadata}
                            </span>
                          )}
                        </div>

                        <h4 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug">
                          {node.title}
                        </h4>

                        {node.description && (
                          <p className="text-caption text-muted line-clamp-2 leading-relaxed">
                            {node.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-muted">
                          <span className="flex items-center gap-1 font-medium group-hover:text-fg transition-colors">
                            <FileText className="w-3 h-3 text-blue-500" />
                            Ver documento
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Phase 3: Validation (Amber) */}
              <div className="space-y-3.5 bg-sunken/40 border border-line-soft rounded-2xl p-4">
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
                        className="p-4 rounded-xl bg-surface border border-line hover:border-amber-500/60 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <Badge kind={node.kind} status={node.status}>
                            <span className="flex items-center gap-1">
                              {kindIcons[node.kind]}
                              {t(`kinds.${node.kind}`)}
                            </span>
                          </Badge>
                          {node.metadata && (
                            <span className="text-muted font-mono bg-sunken px-1.5 py-0.2 rounded border border-line-soft truncate max-w-[100px]">
                              {node.metadata}
                            </span>
                          )}
                        </div>

                        <h4 className="text-body font-bold text-fg group-hover:text-concept-fg transition-colors line-clamp-2 leading-snug">
                          {node.title}
                        </h4>

                        {node.description && (
                          <p className="text-caption text-muted line-clamp-2 leading-relaxed">
                            {node.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-muted">
                          <span className="flex items-center gap-1 font-medium group-hover:text-fg transition-colors">
                            <FileText className="w-3 h-3 text-amber-500" />
                            Ver documento
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-amber-500 transition-all" />
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
      {/* MODE 2: GRAPH MODE ('graph') - Spatial Canvas with Bezier Curves */}
      {/* ============================================================== */}
      {canvasMode === "graph" && (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDownContainer}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-full h-full bg-app canvas-dots overflow-hidden select-none cursor-grab active:cursor-grabbing"
          tabIndex={0}
          aria-label={t("canvas.label")}
        >
          {/* Floating Canvas Toolbar (Top-Left) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1 glass rounded-xl p-1.5 shadow-md border border-line">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring"
              title={t("canvas.zoomIn")}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring"
              title={t("canvas.zoomOut")}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFit}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring"
              title={t("canvas.fit")}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring"
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
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-concept-fg text-white text-caption font-semibold shadow-sm hover:brightness-110 active:scale-95 transition-all ml-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>

          {/* Research Phase Legend (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 z-20 glass rounded-xl px-3.5 py-2 border border-line shadow-md text-[11px] font-medium flex items-center gap-4 text-muted">
            <span className="font-semibold text-fg">Fases:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t("phases.planning")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{t("phases.execution")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{t("phases.validation")}</span>
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
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="var(--muted)" />
                </marker>
                <marker
                  id="arrowhead-active"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
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

                const sx = source.x + 130;
                const sy = source.y + 65;
                const tx = target.x + 130;
                const ty = target.y + 65;

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
                      strokeWidth={isRelSelected ? "2.5" : "1.8"}
                      strokeDasharray={isRelSelected ? "none" : "none"}
                      opacity={isDimmed ? 0.25 : 1}
                      markerEnd={isRelSelected ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Concept Nodes Layer */}
            {map.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const isDimmed = selectedNodeId && !isConnected;
              const phase = resolvePhase(node);
              const styles = getPhaseStyles(phase);

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onDoubleClick={() => openDocumentDeepDive(node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                  }}
                  className={`absolute w-[270px] bg-surface border rounded-2xl p-4 cursor-grab active:cursor-grabbing transition-all duration-200 z-10 shadow-sm ${
                    styles.border
                  } ${
                    isSelected
                      ? `${styles.ring} z-30 scale-[1.02]`
                      : isDimmed
                      ? "opacity-40 hover:opacity-100"
                      : "opacity-100"
                  }`}
                >
                  {/* Phase & Status Badge Header */}
                  <div className="flex items-center justify-between gap-1.5 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles.pill}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      {t(`phases.${phase}`)}
                    </span>

                    <Badge kind={node.kind} status={node.status}>
                      <span className="flex items-center gap-1 text-[10px]">
                        {kindIcons[node.kind]}
                        {t(`kinds.${node.kind}`)}
                      </span>
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-body font-bold text-fg leading-snug line-clamp-2">
                    {node.title}
                  </h4>
                  {node.description && (
                    <p className="text-caption text-muted mt-1 leading-relaxed line-clamp-2">
                      {node.description}
                    </p>
                  )}

                  {/* Footer metadata & Deep Dive Trigger */}
                  <div className="mt-3 pt-2 border-t border-line-soft flex items-center justify-between text-[10px]">
                    {node.metadata ? (
                      <span className="text-muted font-mono bg-sunken px-1.5 py-0.5 rounded border border-line-soft truncate max-w-[150px]">
                        {node.metadata}
                      </span>
                    ) : (
                      <span className="text-muted font-mono">Ref: {node.id.slice(0, 7)}</span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDocumentDeepDive(node);
                      }}
                      className="text-muted hover:text-concept-fg font-medium flex items-center gap-0.5 transition-colors"
                      title="Abrir documento"
                    >
                      <span>Doc</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
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
                  className="mt-4 px-4 py-2 rounded-xl bg-concept-fg text-white text-caption font-semibold shadow-sm hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir primer concepto</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
