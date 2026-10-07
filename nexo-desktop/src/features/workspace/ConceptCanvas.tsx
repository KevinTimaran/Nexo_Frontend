import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  Plus,
  Grid,
  Maximize,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import type { ConceptMap, ConceptNode } from "../../domain/types";

interface ConceptCanvasProps {
  map: ConceptMap;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onOpenAddNode: () => void;
}

export const ConceptCanvas: React.FC<ConceptCanvasProps> = ({
  map,
  selectedNodeId,
  onSelectNode,
  onNodeMove,
  onOpenAddNode,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transformation state
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
    const maxX = Math.max(...map.nodes.map((n) => n.x)) + 260;
    const minY = Math.min(...map.nodes.map((n) => n.y));
    const maxY = Math.max(...map.nodes.map((n) => n.y)) + 180;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const scaleX = (width - 100) / (maxX - minX || 1);
    const scaleY = (height - 100) / (maxY - minY || 1);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.2);

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

  return (
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
      {/* Floating Canvas Toolbar Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 glass border border-line rounded-2xl p-1.5 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="p-2 text-muted hover:text-fg rounded-xl hover:bg-hover transition-colors"
          title={t("canvas.zoomIn")}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-muted hover:text-fg rounded-xl hover:bg-hover transition-colors"
          title={t("canvas.zoomOut")}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFit}
          className="p-2 text-muted hover:text-fg rounded-xl hover:bg-hover transition-colors"
          title={t("canvas.fit")}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 text-muted hover:text-fg rounded-xl hover:bg-hover transition-colors"
          title={t("canvas.reset")}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-line mx-1" />

        <span className="text-caption font-mono text-muted px-2">
          {Math.round(zoom * 100)}%
        </span>

        <div className="h-4 w-px bg-line mx-1" />

        <button
          onClick={onOpenAddNode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-concept-fg text-white text-caption font-semibold shadow-sm hover:brightness-110 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Concept</span>
        </button>
      </div>

      {/* Spatial Canvas Container */}
      <div
        className="w-full h-full origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Relations Layer */}
        <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="var(--ring)" />
            </marker>
          </defs>

          {map.relations.map((rel) => {
            const source = nodeMap.get(rel.from);
            const target = nodeMap.get(rel.to);
            if (!source || !target) return null;

            // Center points of source and target cards (Card size: ~260px w, ~160px h)
            const sx = source.x + 130;
            const sy = source.y + 80;
            const tx = target.x + 130;
            const ty = target.y + 80;

            const dx = tx - sx;
            const dy = ty - sy;
            const cx1 = sx + dx * 0.5;
            const cy1 = sy;
            const cx2 = sx + dx * 0.5;
            const cy2 = ty;

            return (
              <g key={rel.id}>
                <path
                  d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
                  fill="none"
                  stroke="var(--ring)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* Concept Nodes Layer */}
        {map.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const kindBorder = {
            concept: "border-concept-fg/40 hover:border-concept-fg",
            viability: "border-positive-fg/40 hover:border-positive-fg",
            risk: "border-risk-fg/40 hover:border-risk-fg",
          };

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
              className={`absolute w-64 glass border rounded-2xl p-4 shadow-xl cursor-grab active:cursor-grabbing transition-shadow duration-200 z-10 ${
                kindBorder[node.kind]
              } ${
                isSelected
                  ? "ring-2 ring-concept-fg shadow-2xl scale-[1.02] z-20 animate-node-pulse"
                  : ""
              }`}
            >
              {/* Header: Kind & Status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge kind={node.kind} status={node.status}>
                  {t(`kinds.${node.kind}`)}
                </Badge>
                <span className="text-[10px] text-muted font-mono bg-elevated px-2 py-0.5 rounded-full border border-line-soft">
                  {node.metadata}
                </span>
              </div>

              {/* Title & Description */}
              <h4 className="text-body font-bold text-fg leading-snug line-clamp-1">{node.title}</h4>
              <p className="text-caption text-muted mt-1 leading-relaxed line-clamp-3">
                {node.description}
              </p>
            </div>
          );
        })}

        {/* Empty Canvas Hint */}
        {map.nodes.length === 0 && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-sm p-8 glass border border-line rounded-3xl">
            <Sparkles className="w-8 h-8 text-concept-fg mx-auto mb-3 animate-pulse" />
            <h3 className="text-body font-bold text-fg">{t("canvas.empty.title")}</h3>
            <p className="text-caption text-muted mt-1">{t("canvas.empty.description")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
