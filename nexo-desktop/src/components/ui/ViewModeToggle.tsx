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
      className={`
        inline-flex items-center p-1 rounded-2xl
        glass-pill
        shadow-[0_8px_24px_-6px_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.75)]
        dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.08)]
        border border-line/80 dark:border-white/10
        select-none ${className}
      `}
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "notion"}
        onClick={() => onChange("notion")}
        className={`
          flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all duration-200 focus-ring cursor-pointer
          ${
            mode === "notion"
              ? "bg-surface/95 dark:bg-white/[0.1] text-fg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] border border-line-soft dark:border-white/10 scale-100"
              : "text-muted hover:text-fg hover:bg-hover/50 scale-[0.98]"
          }
        `}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-concept-fg shrink-0" />
        <span>Tablero Notion</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={mode === "obsidian"}
        onClick={() => onChange("obsidian")}
        className={`
          flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all duration-200 focus-ring cursor-pointer
          ${
            mode === "obsidian"
              ? "bg-surface/95 dark:bg-white/[0.1] text-fg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] border border-line-soft dark:border-white/10 scale-100"
              : "text-muted hover:text-fg hover:bg-hover/50 scale-[0.98]"
          }
        `}
      >
        <Network className="w-3.5 h-3.5 text-concept-fg shrink-0" />
        <span>Constelación Obsidian</span>
      </button>
    </div>
  );
};
