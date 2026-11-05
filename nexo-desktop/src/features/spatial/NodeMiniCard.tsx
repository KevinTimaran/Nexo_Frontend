import React from "react";
import { motion, type PanInfo } from "framer-motion";
import { Glass } from "glisse";
import { ArrowDown, X } from "lucide-react";
import { getSpatialGroup, type SpatialNode } from "../../domain/spatial";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface NodeMiniCardProps {
  node: SpatialNode;
  onClose: () => void;
}

export const NodeMiniCard: React.FC<NodeMiniCardProps> = ({ node, onClose }) => {
  const spatialGroupColors = useWorkspaceStore((s) => s.spatialGroupColors);
  const setDocViewMode = useWorkspaceStore((s) => s.setDocViewMode);

  const groupMeta = getSpatialGroup(node.group);
  const groupColor = spatialGroupColors[node.group] ?? groupMeta.color;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Glisse swipe-right or swipe-down to dismiss
    if (
      info.offset.x > 70 ||
      info.velocity.x > 300 ||
      info.offset.y > 70 ||
      info.velocity.y > 300
    ) {
      onClose();
    }
  };

  return (
    <motion.aside
      layoutId="spatial-doc-panel"
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={{ right: 0.6, bottom: 0.6, left: 0.1, top: 0.1 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      // Se cambió top-6 por top-24 para bajar la tarjeta y evitar colisiones
      className="fixed right-6 top-24 z-30 w-88 max-w-[calc(100vw-3rem)] rounded-3xl bg-zinc-950/60 backdrop-blur-2xl ring-1 ring-white/10 p-5 space-y-3.5 shadow-2xl select-none overflow-hidden"
    >
      {/* Glisse Liquid Glass Live Refraction */}
      <Glass
        className="absolute inset-0 pointer-events-none rounded-[inherit] -z-10 !bg-transparent"
        aria-hidden="true"
      />

      {/* Specular hairline sheen */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Swipe drag handle */}
      <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 cursor-grab active:cursor-grabbing" />

      {/* Header: Group dot + Name + Close Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: groupColor, color: groupColor }}
            />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              {groupMeta.label}
            </span>
          </div>
          <h3 className="text-base font-semibold text-white tracking-tight truncate">
            {node.name}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Cerrar detalle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2-line brief description */}
      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
        {node.desc || "Sin descripción adicional en este nodo de investigación."}
      </p>

      {/* Primary Action Button: "Redactar Documento" with arrow down icon */}
      <button
        type="button"
        onClick={() => setDocViewMode("sidebar")}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-3 text-xs font-bold transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
      >
        <span>Redactar Documento</span>
        <ArrowDown className="w-4 h-4 text-zinc-900" />
      </button>
    </motion.aside>
  );
};

export default NodeMiniCard;