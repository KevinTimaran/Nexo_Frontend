import React, { useMemo, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Layers, Info } from "lucide-react";
import { ConceptNodeCard } from "./ConceptNodeCard";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface NodeCanvasLayoutProps {
  onOpenAddNode?: () => void;
}

export const NodeCanvasLayout: React.FC<NodeCanvasLayoutProps> = ({
  onOpenAddNode,
}) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    workspace,
    syncFlowElements,
  } = useWorkspaceStore();

  const accentColor =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "var(--accent)"
      : "var(--accent)";
  const positiveColor =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--positive-fg").trim() || "var(--positive-fg)"
      : "var(--positive-fg)";
  const riskColor =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--risk-fg").trim() || "var(--risk-fg)"
      : "var(--risk-fg)";
  const mutedColor =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "var(--muted)"
      : "var(--muted)";

  // Register custom node type
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      conceptNode: ConceptNodeCard,
    }),
    []
  );

  // Sync flow elements on mount or if nodes list is empty but workspace has nodes
  useEffect(() => {
    if (workspace && nodes.length === 0 && workspace.map.nodes.length > 0) {
      syncFlowElements();
    }
  }, [workspace, nodes.length, syncFlowElements]);

  const dotColor = getComputedStyle(document.documentElement).getPropertyValue("--dot").trim() || "rgba(255, 255, 255, 0.12)";

  return (
    <div className="w-full h-full relative overflow-hidden bg-transparent select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={2.0}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: {
            stroke: accentColor,
            strokeWidth: 2,
          },
        }}
      >
        {/* Pattern de puntos sutil en el lienzo */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color={dotColor}
        />

        {/* Controles de Zoom y Ajuste (Creative Glass) */}
        <Controls
          position="bottom-right"
          className="!bg-surface/85 dark:!bg-app/85 !border !border-line/80 dark:!border-line/10 !backdrop-blur-2xl !shadow-lg !rounded-2xl !overflow-hidden !m-4"
          showInteractive={false}
        />

        {/* MiniMap minimalista (Creative Glass) */}
        <MiniMap
          position="bottom-left"
          nodeColor={(n) => {
            const phase = n.data?.phase;
            if (phase === "planning") return positiveColor;
            if (phase === "execution") return accentColor;
            if (phase === "validation") return riskColor;
            return mutedColor;
          }}
          maskColor="color-mix(in srgb, var(--app) 75%, transparent)"
          className="!bg-surface/85 dark:!bg-app/85 !border !border-line/80 dark:!border-line/10 !backdrop-blur-2xl !shadow-md !rounded-2xl !overflow-hidden !m-4 !w-36 !h-24 hidden md:block"
        />

        {/* Barra superior izquierda: Estado del Lienzo */}
        <Panel position="top-left" className="!m-4">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl glass-pill shadow-xs border border-line/80 dark:border-line/10 text-caption">
            <div className="flex items-center gap-1.5 text-concept-fg font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>Mapa Conceptual</span>
            </div>
            <span className="text-muted/60">•</span>
            <span className="text-[11px] text-muted font-medium">
              {nodes.length} {nodes.length === 1 ? "concepto" : "conceptos"}
            </span>

            {onOpenAddNode && (
              <button
                type="button"
                onClick={onOpenAddNode}
                className="ml-2 px-2.5 py-1 rounded-xl bg-concept-fg/10 text-concept-fg hover:bg-concept-fg/20 active:scale-95 transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer focus-ring"
              >
                <Plus className="w-3 h-3" />
                Agregar
              </button>
            )}
          </div>
        </Panel>

        {/* Tip flotante discreto */}
        <Panel position="top-right" className="!m-4 hidden sm:block">
          <div className="px-3 py-1.5 rounded-2xl glass-pill border border-line-soft dark:border-line/10 text-[11px] text-muted flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-muted" />
            <span>Haz clic en un nodo para abrir su detalle profundo</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
