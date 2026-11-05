import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileDown, Minimize2 } from "lucide-react";
import { getSpatialGroup, type SpatialNode } from "../../domain/spatial";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { MarkdownShortcutEditor } from "./MarkdownShortcutEditor";
import { exportToDocx } from "./exportToDocx";

interface DocFullscreenProps {
  node: SpatialNode;
  content: string;
  onChange: (content: string) => void;
  // Nueva prop para actualizar el título
  onTitleChange?: (newTitle: string) => void; 
}

export const DocFullscreen: React.FC<DocFullscreenProps> = ({
  node,
  content,
  onChange,
  onTitleChange,
}) => {
  const setDocViewMode = useWorkspaceStore((s) => s.setDocViewMode);
  const spatialGroupColors = useWorkspaceStore((s) => s.spatialGroupColors);

  const groupMeta = getSpatialGroup(node.group);
  const groupColor = spatialGroupColors[node.group] ?? groupMeta.color;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-[#070709] overflow-hidden flex flex-col font-sans"
    >
      {/* Top Floating Controls Bar */}
      <div className="fixed inset-x-6 top-6 z-50 flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={() => setDocViewMode("hidden")}
          className="pointer-events-auto h-11 px-5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 backdrop-blur-xl text-zinc-300 hover:text-white transition-all inline-flex items-center gap-2.5 text-xs font-semibold shadow-lg active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span>← Regresar al mapa 3D</span>
        </button>

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDocViewMode("sidebar")}
            className="h-11 px-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 backdrop-blur-xl text-zinc-400 hover:text-white transition-all inline-flex items-center gap-2 text-xs font-medium shadow-lg active:scale-95 cursor-pointer"
            title="Reducir a panel lateral"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reducir</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void exportToDocx(node.name, content);
            }}
            className="h-11 px-5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-all inline-flex items-center gap-2 text-xs shadow-[0_4px_24px_rgba(255,255,255,0.15)] active:scale-95 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            <span>Exportar a Word</span>
          </button>
        </div>
      </div>

      {/* Centered Document Paper Sheet */}
      <div className="flex-1 overflow-y-auto px-6 pt-24 pb-12">
        <div className="relative max-w-3xl mx-auto h-[80vh] min-h-[600px] rounded-3xl bg-zinc-900/40 shadow-2xl overflow-hidden flex flex-col">
          
          {/* Paper Header */}
          <div className="px-8 sm:px-12 pt-8 pb-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: groupColor, color: groupColor }}
              />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Clúster: {groupMeta.label}
              </span>
            </div>
            
            {/* Título Editable */}
            <textarea
              rows={1}
              value={node.name}
              onChange={(e) => {
                if (onTitleChange) onTitleChange(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-white tracking-tight outline-none border-none p-0 resize-none placeholder:text-zinc-600 transition-colors"
              placeholder="Título del documento..."
            />
          </div>

          {/* Editor Body (Lienzo Negro con margen interno) */}
          <div className="flex-1 min-h-0 p-2 sm:p-3 flex flex-col">
            <div className="flex-1 min-h-0 rounded-xl bg-[#050505] shadow-inner overflow-hidden relative">
              <MarkdownShortcutEditor
                title={node.name}
                value={content}
                onChange={onChange}
                compact={false}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default DocFullscreen;