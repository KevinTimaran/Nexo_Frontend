import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

/**
 * @deprecated Deprecated in Phase 06 in favor of DocFullscreen in the 3D canvas.
 * Concept card clicks navigate directly to 3D canvas with setDocViewMode("fullscreen").
 * DeepDiveModal is retained only for backwards compatibility.
 */
const DeepDiveModal: React.FC = () => {
  const { isDeepDiveModalOpen, closeDeepDive, selectedNodeId, spatialNodes } = useWorkspaceStore();
  const selectedNode = spatialNodes.find((n) => n.id === selectedNodeId);

  return (
    <AnimatePresence>
      {isDeepDiveModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-surface/90 backdrop-blur-2xl rounded-xl shadow-xl p-6 w-11/12 max-w-2xl"
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20 }}
          >
            <button
              onClick={closeDeepDive}
              className="absolute top-2 right-2 text-muted hover:text-fg"
              aria-label="Close Deep Dive Modal"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 text-fg">
              {selectedNode?.name || "Detalle del Concepto"}
            </h2>
            <div className="text-muted text-sm whitespace-pre-wrap leading-relaxed">
              {selectedNode?.details || selectedNode?.desc || "Sin contenido adicional disponible."}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeepDiveModal;