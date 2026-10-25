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
import { DeepDiveModal } from "./DeepDiveModal";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { useTheme } from "../../app/providers/ThemeProvider";

interface NodeCanvasLayoutProps {
  onOpenAddNode?: () => void;
}

export const NodeCanvasLayout: React.FC<NodeCanvasLayoutProps> = ({
  onOpenAddNode,
}) => {
  const { theme } = useTheme();
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

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

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

  const dotColor = isDark ? "#3f3f46" : "#cbd5e1";

  return (
    <div className="w-full h-full relative overflow-hidden bg-canvas select-none">
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
            stroke: isDark ? "#3b82f6" : "#2563eb",
            strokeWidth: 2,
          },
        }}
      >
        {/* Fondo con patrón de puntos sutil adaptado a Tailwind */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color={dotColor}
        />

        {/* Controles de Zoom y Ajuste */}
        <Controls
          position="bottom-right"
          className="!bg-surface !border !border-line !shadow-lg !rounded-2xl !overflow-hidden !m-4"
          showInteractive={false}
        />

        {/* MiniMap minimalista */}
        <MiniMap
          position="bottom-left"
          nodeColor={(n) => {
            const phase = n.data?.phase;
            if (phase === "planning") return "#10b981";
            if (phase === "execution") return "#3b82f6";
            if (phase === "validation") return "#f59e0b";
            return "#64748b";
          }}
          maskColor={isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(240, 240, 240, 0.7)"}
          className="!bg-surface/80 !border !border-line !shadow-md !rounded-2xl !overflow-hidden !m-4 !w-36 !h-24 hidden md:block"
        />

        {/* Barra superior de estado / acciones rápidas */}
        <Panel position="top-left" className="!m-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface/90 dark:bg-zinc-900/90 border border-line shadow-sm backdrop-blur-md text-caption">
            <div className="flex items-center gap-1.5 text-concept-fg font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Mapa Conceptual</span>
            </div>
            <span className="text-line">•</span>
            <span className="text-[11px] text-muted font-medium">
              {nodes.length} {nodes.length === 1 ? "concepto" : "conceptos"}
            </span>

            {onOpenAddNode && (
              <button
                type="button"
                onClick={onOpenAddNode}
                className="ml-2 px-2.5 py-1 rounded-xl bg-concept-fg/10 text-concept-fg hover:bg-concept-fg/20 active:scale-95 transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Agregar
              </button>
            )}
          </div>
        </Panel>

        {/* Tip flotante discreto */}
        <Panel position="top-right" className="!m-4 hidden sm:block">
          <div className="px-3 py-1.5 rounded-2xl bg-surface/80 dark:bg-zinc-900/80 border border-line-soft text-[11px] text-muted flex items-center gap-1.5 backdrop-blur-xs">
            <Info className="w-3.5 h-3.5 text-muted" />
            <span>Pasa el cursor sobre un nodo y haz clic en el ícono para abrir detalles</span>
          </div>
        </Panel>
      </ReactFlow>

      {/* Carta Flotante Superpuesta (Deep-Dive Modal estilo Notion) */}
      <DeepDiveModal />
    </div>
  );
};
