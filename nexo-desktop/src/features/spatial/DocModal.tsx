import React, { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { FileText, Sparkles, X, Check } from "lucide-react";
import { GlisseCard } from "../../components/ui/GlisseCard";
import type { SpatialNode } from "../../domain/spatial";

export interface DocModalProps {
  isOpen: boolean;
  node: SpatialNode | null;
  content: string;
  onClose: () => void;
  onSave: (nodeId: string, content: string) => void;
}

/**
 * DocModal — Notion-style document editor overlay modal with Glisse liquid glass
 * optics, spring entrance/exit physics, dynamic rim specular highlight, and full OrbitControls isolation.
 */
export const DocModal: React.FC<DocModalProps> = ({
  isOpen,
  node,
  content,
  onClose,
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Sync editor innerText only when opening or changing target node, avoiding caret jumping on typing
  useEffect(() => {
    if (isOpen && editorRef.current) {
      editorRef.current.innerText = content;
    }
  }, [isOpen, node?.id, content]);

  const handleClose = () => {
    if (editorRef.current && node) {
      onSave(node.id, editorRef.current.innerText);
    }
    onClose();
  };

  const handleBlur = () => {
    if (editorRef.current && node) {
      onSave(node.id, editorRef.current.innerText);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && node && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notion-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 backdrop-blur-md bg-black/60 font-sans pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <GlisseCard
            variant="modal"
            interactive={false}
            initial={{ scale: 0.94, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 18 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="w-full max-w-3xl max-h-[85vh] flex flex-col p-0! overflow-hidden z-50"
            stopEventPropagation
          >
            {/* Top Modal Header */}
            <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Documento Notion · {node.group}
                  </span>
                  <span className="text-xs font-semibold text-zinc-200">
                    {node.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body with contentEditable div */}
            <div
              className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 select-text"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25">
                    Fase Activa
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    ID: {node.id}
                  </span>
                </div>

                <h1
                  id="notion-modal-title"
                  className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                >
                  {node.name}
                </h1>
              </div>

              {/* Editor Content Area */}
              <div className="pt-4 border-t border-white/10">
                <label
                  htmlFor="notion-doc-editor"
                  className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2"
                >
                  Cuerpo del Documento (Editable en vivo):
                </label>
                <div
                  id="notion-doc-editor"
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyDown={(e) => {
                    // Prevent Escape from being swallowed if typing, or stop bubbling
                    e.stopPropagation();
                  }}
                  className="w-full min-h-[220px] p-4 rounded-2xl bg-black/40 ring-1 ring-white/10 text-zinc-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 whitespace-pre-wrap selection:bg-indigo-500/30 font-sans cursor-text"
                />
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/5 ring-1 ring-indigo-500/20 flex items-start gap-3 text-xs text-zinc-300">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  Las modificaciones en este documento se sincronizan reactivamente en el estado local de Zustand y preservan el contexto del nodo para el copiloto de IA.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <span className="font-mono text-[11px]">
                Presiona Escape o haz clic fuera para salir
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-semibold transition-all cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Listo</span>
              </button>
            </div>
          </GlisseCard>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DocModal;
