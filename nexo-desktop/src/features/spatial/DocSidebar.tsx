import React from "react";
import { motion, type PanInfo } from "framer-motion";
import { Glass } from "glisse";
import { Maximize2, FileDown, X } from "lucide-react";
import { getSpatialGroup, type SpatialNode } from "../../domain/spatial";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { MarkdownShortcutEditor } from "./MarkdownShortcutEditor";
import { exportToDocx } from "./exportToDocx";
import { SemanticNodeBadges } from "../../components/semantic/SemanticBadges";

interface DocSidebarProps {
  node: SpatialNode;
  content: string;
  onChange: (content: string) => void;
  onClose: () => void;
}

export const DocSidebar: React.FC<DocSidebarProps> = ({
  node,
  content,
  onChange,
  onClose,
}) => {
  const setDocViewMode = useWorkspaceStore((s) => s.setDocViewMode);
  const spatialGroupColors = useWorkspaceStore((s) => s.spatialGroupColors);

  const groupMeta = getSpatialGroup(node.group);
  const groupColor = spatialGroupColors[node.group] ?? groupMeta.color;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (
      info.offset.x > 90 ||
      info.velocity.x > 350 ||
      info.offset.y > 90 ||
      info.velocity.y > 350
    ) {
      onClose();
    }
  };

  return (
    <motion.aside
      layoutId="spatial-doc-panel"
      initial={{ opacity: 0, x: 40, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed right-6 top-6 bottom-6 z-30 w-[520px] max-w-[calc(100vw-3rem)] rounded-3xl backdrop-blur-2xl p-5 flex flex-col gap-3.5 shadow-2xl overflow-hidden text-fg border border-border-color"
      style={{
        borderRadius: "var(--radius-card, 24px)",
        backgroundColor: "var(--card-bg, rgba(9,9,11,0.6))",
        borderColor: "var(--card-border, rgba(255,255,255,0.1))",
      }}
    >
      <Glass
        className="absolute inset-0 pointer-events-none rounded-[inherit] -z-10 !bg-transparent"
        aria-hidden="true"
      />

      {/* Header arrastrable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ right: 0.6, left: 0.1 }}
        onDragEnd={handleDragEnd}
        className="shrink-0 space-y-2 select-none cursor-grab active:cursor-grabbing pb-1"
      >
        <div className="w-10 h-1 rounded-full bg-border-color mx-auto -mt-1" />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: groupColor, color: groupColor }}
              />
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                {groupMeta.label}
              </span>
            </div>
            <h3 className="text-base font-semibold text-fg tracking-tight truncate">
              {node.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void exportToDocx(node.name, content);
              }}
              className="h-8 px-3 rounded-xl bg-surface hover:bg-elevated text-muted hover:text-fg transition-colors inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer border border-border-color"
            >
              <FileDown className="w-3.5 h-3.5 text-concept-fg" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDocViewMode("fullscreen");
              }}
              style={{
                backgroundColor: "var(--button-primary, var(--accent))",
                borderRadius: "var(--radius-button, 12px)",
              }}
              className="h-8 px-3 text-fg hover:brightness-105 transition-all inline-flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Ampliar</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-surface hover:bg-elevated text-muted hover:text-fg transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-border-color"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <SemanticNodeBadges node={node} showPerspective showOrigin compact max={4} />
      </motion.div>

      {/* Lienzo de Escritura Negro Sólido */}
      <div className="relative min-h-0 flex-1 flex flex-col rounded-2xl bg-app border border-line/5 shadow-inner overflow-hidden">
        
        {/* Texto informativo pasivo */}
        <div className="px-4 py-2 border-b border-line/5 bg-surface/[0.02] flex items-center">
          <p className="text-[11px] text-muted flex items-center gap-1.5">
            Escribe <kbd className="bg-surface/10 px-1.5 py-0.5 rounded text-muted font-mono text-[10px]">/</kbd> en el lienzo para abrir los comandos de formato.
          </p>
        </div>

        {/* Editor interno */}
        <div className="flex-1 overflow-hidden relative">
          <MarkdownShortcutEditor
            title={node.name}
            value={content}
            onChange={onChange}
            compact
          />
        </div>
      </div>
    </motion.aside>
  );
};

export default DocSidebar;
