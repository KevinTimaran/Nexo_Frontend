import React, { useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Flower2, Sparkles, Network } from "lucide-react";
import { SpatialCanvas3D } from "./SpatialCanvas3D";
import { SpatialDock } from "./SpatialDock";
import { ColorSettingsPanel } from "./ColorSettingsPanel";
import { NodeListPanel } from "./NodeListPanel";
import { NodeMiniCard } from "./NodeMiniCard";
import { DocSidebar } from "./DocSidebar";
import { DocFullscreen } from "./DocFullscreen";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { type SpatialNode } from "../../domain/spatial";

export const SpaceWorkspace: React.FC = () => {
  const { t } = useTranslation();
  const spatialNodes = useWorkspaceStore((s) => s.spatialNodes);
  const isThinking = useWorkspaceStore((s) => s.isThinking);
  const activeLeftPanel = useWorkspaceStore((s) => s.activeLeftPanel);
  const setActiveLeftPanel = useWorkspaceStore((s) => s.setActiveLeftPanel);
  const isZenMode = useWorkspaceStore((s) => s.isZenMode);
  const toggleZenMode = useWorkspaceStore((s) => s.toggleZenMode);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNode = useWorkspaceStore((s) => s.setSelectedNode);
  const docViewMode = useWorkspaceStore((s) => s.docViewMode);
  const setDocViewMode = useWorkspaceStore((s) => s.setDocViewMode);
  const spatialDocs = useWorkspaceStore((s) => s.spatialDocs);
  const setSpatialDoc = useWorkspaceStore((s) => s.setSpatialDoc);
  const updateSpatialNode = useWorkspaceStore((s) => s.updateSpatialNode);
  const setCanvasMode = useWorkspaceStore((s) => s.setCanvasMode);

  // Selected node entity
  const selectedNode: SpatialNode | undefined = useMemo(
    () => spatialNodes.find((n) => n.id === selectedNodeId),
    [spatialNodes, selectedNodeId]
  );

  // Current document content for Notion modal (fallback to node.details or node.desc)
  const docContent = useMemo(() => {
    if (!selectedNodeId) return "";
    return (
      spatialDocs[selectedNodeId] ??
      selectedNode?.details ??
      selectedNode?.desc ??
      "Documento de investigación en desarrollo..."
    );
  }, [selectedNodeId, spatialDocs, selectedNode]);

  const setZenMode = useWorkspaceStore((s) => s.setZenMode);

  // Global Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZenMode) {
          setZenMode(false);
          return;
        }
        if (docViewMode === "fullscreen") {
          setDocViewMode("sidebar");
          return;
        }
        if (docViewMode === "sidebar") {
          setDocViewMode("hidden");
          return;
        }
        if (activeLeftPanel) {
          setActiveLeftPanel(null);
          return;
        } else if (selectedNodeId) {
          setSelectedNode(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode, setZenMode, activeLeftPanel, docViewMode, selectedNodeId, setActiveLeftPanel, setDocViewMode, setSelectedNode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-app text-fg font-sans select-none transition-colors duration-300">
      {/* 3D Force-Graph Canvas with smooth fade/blur when in Fullscreen Word mode */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-out ${
          docViewMode === "fullscreen"
            ? "opacity-0 pointer-events-none scale-105 blur-2xl"
            : "opacity-100 scale-100 blur-0"
        }`}
      >
        <SpatialCanvas3D />
      </div>

      {/* 3D Structuring Loading Overlay */}
      {isThinking && spatialNodes.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none" role="status" aria-live="polite">
          <div className="p-6 rounded-2xl glass-card border border-primary/30 max-w-sm text-center space-y-3 pointer-events-auto animate-pulse">
            <Sparkles className="w-8 h-8 animate-spin text-primary mx-auto" />
            <h3 className="text-sm font-bold text-fg">{t("ux.spatialLoading.title", { defaultValue: "Preparando la vista Neuronal 3D…" })}</h3>
            <p className="text-xs text-muted">{t("ux.spatialLoading.description", { defaultValue: "Organizando los conceptos y sus relaciones sin interrumpir tu trabajo." })}</p>
          </div>
        </div>
      )}

      {!isThinking && spatialNodes.length === 0 && (
        <section className="absolute inset-0 z-30 flex items-center justify-center p-6" aria-labelledby="empty-spatial-title">
          <div className="max-w-md rounded-3xl glass-card border border-line p-7 text-center shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center" aria-hidden="true">
              <Network className="w-5 h-5" />
            </div>
            <h3 id="empty-spatial-title" className="mt-4 text-base font-bold text-fg">{t("ux.spatialEmpty.title", { defaultValue: "Las relaciones aparecerán aquí" })}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {t("ux.spatialEmpty.description", { defaultValue: "Cuando el proyecto tenga conceptos conectados, podrás recorrerlos en 3D. Es la misma información del Tablero de Conceptos, vista desde otra perspectiva." })}
            </p>
            <button type="button" onClick={() => setCanvasMode("discovery")} className="mt-5 btn-primary rounded-xl px-4 py-2 text-xs font-semibold focus-ring">
              {t("ux.continueIdeation", { defaultValue: "Continuar en Ideación IA" })}
            </button>
          </div>
        </section>
      )}

      {/* Vertical Dock on Left */}
      {!isZenMode && docViewMode !== "fullscreen" && <SpatialDock />}

      {/* Auxiliary Left Panels */}
      <AnimatePresence>
        {!isZenMode && docViewMode !== "fullscreen" && activeLeftPanel === "filters" && (
          <ColorSettingsPanel key="filters-panel" />
        )}
        {!isZenMode && docViewMode !== "fullscreen" && activeLeftPanel === "nodelist" && (
          <NodeListPanel key="nodelist-panel" />
        )}
      </AnimatePresence>

      {/* Zen Mode Exit Button (Only floating UI visible in Zen Mode) */}
      {isZenMode && (
        <button
          type="button"
          onClick={toggleZenMode}
          className="fixed left-6 top-6 z-60 h-10 px-4 rounded-2xl bg-surface text-fg border border-border-color hover:bg-elevated backdrop-blur-2xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-2xl active:scale-95"
        >
          <Flower2 className="w-4 h-4 text-positive-fg" />
          <span className="text-xs font-semibold">Salir de modo Zen</span>
        </button>
      )}

      {/* Progressive Revelation on Right (MiniCard -> Sidebar) */}
      <AnimatePresence>
        {!isZenMode && selectedNode && docViewMode === "hidden" && (
          <NodeMiniCard
            key="node-mini-card"
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}

        {!isZenMode && selectedNode && docViewMode === "sidebar" && (
          <DocSidebar
            key="doc-sidebar"
            node={selectedNode}
            content={docContent}
            onChange={(text) => setSpatialDoc(selectedNode.id, text)}
            onClose={() => setDocViewMode("hidden")}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Word-mode Document */}
      <AnimatePresence>
        {selectedNode && docViewMode === "fullscreen" && (
          <DocFullscreen
            key={`fullscreen-${selectedNode.id}`}
            node={selectedNode}
            content={docContent}
            onChange={(text) => setSpatialDoc(selectedNode.id, text)}
            onTitleChange={(newTitle) => updateSpatialNode(selectedNode.id, { name: newTitle })}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpaceWorkspace;
