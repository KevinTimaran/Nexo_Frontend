import React from "react";
import { LayoutGrid, Network } from "lucide-react";
import type { CanvasMode } from "../../domain/types";

export interface ViewModeToggleProps {
  mode: CanvasMode;
  onChange: (mode: CanvasMode) => void;
  className?: string;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  mode,
  onChange,
  className = "",
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="Modo de visualización del lienzo"
      className={`inline-flex items-center p-1 rounded-2xl glass border border-line shadow-xs bg-surface/75 dark:bg-zinc-900/75 backdrop-blur-md select-none ${className}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "notion"}
        onClick={() => onChange("notion")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all focus-ring cursor-pointer ${
          mode === "notion"
            ? "bg-surface text-fg shadow-xs scale-100 border border-line-soft dark:bg-zinc-800"
            : "text-muted hover:text-fg hover:bg-hover scale-95"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-concept-fg shrink-0" />
        <span>Tablero Notion</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={mode === "obsidian"}
        onClick={() => onChange("obsidian")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all focus-ring cursor-pointer ${
          mode === "obsidian"
            ? "bg-surface text-fg shadow-xs scale-100 border border-line-soft dark:bg-zinc-800"
            : "text-muted hover:text-fg hover:bg-hover scale-95"
        }`}
      >
        <Network className="w-3.5 h-3.5 text-concept-fg shrink-0" />
        <span>Constelación Obsidian</span>
      </button>
    </div>
  );
};
