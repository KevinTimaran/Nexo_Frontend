import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileDown, Minimize2 } from "lucide-react";
import { getSpatialGroup, type SpatialNode } from "../../domain/spatial";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { MarkdownShortcutEditor } from "./MarkdownShortcutEditor";
import { exportToDocx } from "./exportToDocx";
import { countCodePoints, MAX_NODE_NAME_CHARS } from "../../domain/constants";

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
  const updateSpatialNode = useWorkspaceStore((s) => s.updateSpatialNode);

  const [titleValue, setTitleValue] = useState(node.name);
  const lastValidTitleRef = useRef(node.name);

  useEffect(() => {
    setTitleValue(node.name);
    if (node.name && node.name.trim().length > 0) {
      lastValidTitleRef.current = node.name.trim();
    }
  }, [node.name, node.id]);

  const groupMeta = getSpatialGroup(node.group);
  const groupColor = spatialGroupColors[node.group] ?? groupMeta.color;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-app text-fg overflow-hidden flex flex-col font-sans transition-colors duration-300"
    >
      {/* Top Floating Controls Bar */}
      <div className="fixed inset-x-6 top-6 z-50 flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={() => setDocViewMode("hidden")}
          className="pointer-events-auto h-11 px-5 rounded-2xl bg-surface hover:bg-elevated text-muted hover:text-fg border border-border-color backdrop-blur-xl transition-all inline-flex items-center gap-2.5 text-xs font-semibold shadow-lg active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-concept-fg" />
          <span>Regresar al mapa 3D</span>
        </button>

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDocViewMode("sidebar")}
            className="h-11 px-4 rounded-2xl bg-surface hover:bg-elevated text-muted hover:text-fg border border-border-color backdrop-blur-xl transition-all inline-flex items-center gap-2 text-xs font-medium shadow-lg active:scale-95 cursor-pointer"
            title="Reducir a panel lateral"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reducir</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void exportToDocx(titleValue || node.name, content);
            }}
            style={{
              backgroundColor: "var(--button-primary, var(--accent))",
              borderRadius: "var(--radius-button, 16px)",
            }}
            className="h-11 px-5 text-fg font-bold transition-all inline-flex items-center gap-2 text-xs shadow-md active:scale-95 cursor-pointer hover:brightness-105"
          >
            <FileDown className="w-4 h-4 text-fg" />
            <span>Exportar a Word</span>
          </button>
        </div>
      </div>

      {/* Centered Document Paper Sheet */}
      <div className="flex-1 overflow-y-auto px-6 pt-24 pb-12">
        <div
          className="relative max-w-3xl mx-auto h-[80vh] min-h-[600px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-border-color"
          style={{
            backgroundColor: "var(--card-bg, rgba(9,9,11,0.6))",
            borderColor: "var(--card-border, rgba(255,255,255,0.1))",
          }}
        >
          
          {/* Paper Header */}
          <div className="px-8 sm:px-12 pt-8 pb-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: groupColor, color: groupColor }}
              />
              <span className="text-xs font-mono uppercase tracking-wider text-muted">
                Clúster: {groupMeta.label}
              </span>
            </div>
            
            {/* Título Editable con validación estricta de 80 caracteres */}
            <div className="space-y-1.5">
              <textarea
                rows={1}
                value={titleValue}
                maxLength={MAX_NODE_NAME_CHARS}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[\r\n]+/g, " ");
                  if (countCodePoints(sanitized) <= MAX_NODE_NAME_CHARS) {
                    setTitleValue(sanitized);
                    const trimmed = sanitized.trim();
                    if (trimmed.length > 0) {
                      lastValidTitleRef.current = trimmed;
                      if (onTitleChange) {
                        onTitleChange(sanitized);
                      } else {
                        updateSpatialNode(node.id, { name: sanitized });
                      }
                    }
                  }
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onBlur={() => {
                  const trimmed = titleValue.trim();
                  if (!trimmed) {
                    const fallback = lastValidTitleRef.current || node.name || "Concepto";
                    setTitleValue(fallback);
                    if (onTitleChange) onTitleChange(fallback);
                    else updateSpatialNode(node.id, { name: fallback });
                  } else {
                    setTitleValue(trimmed);
                    lastValidTitleRef.current = trimmed;
                    if (onTitleChange) onTitleChange(trimmed);
                    else updateSpatialNode(node.id, { name: trimmed });
                  }
                }}
                className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-fg tracking-tight outline-none border-none p-0 resize-none placeholder:text-muted transition-colors"
                placeholder="Título del documento..."
              />
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{countCodePoints(titleValue)}/{MAX_NODE_NAME_CHARS}</span>
                {countCodePoints(titleValue) >= MAX_NODE_NAME_CHARS && (
                  <span className="text-amber-500 font-medium">Máximo 80 caracteres permitidos</span>
                )}
              </div>
            </div>
          </div>

          {/* Editor Body (Lienzo Negro con margen interno) */}
          <div className="flex-1 min-h-0 p-2 sm:p-3 flex flex-col">
            <div className="flex-1 min-h-0 rounded-xl bg-app shadow-inner overflow-hidden relative">
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