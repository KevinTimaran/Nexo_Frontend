import { Sparkles, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CanvasMode } from "../../domain/types";

export interface ViewModeToggleProps {
  mode: CanvasMode;
  onChange: (mode: CanvasMode) => void;
  className?: string;
  isLocked?: boolean;
}

/**
 * ViewModeToggle component
 * Enforces strictly sequential 3-tab navigation order:
 * 1. Ideación IA (mode: "discovery", legacy: Descubrimiento IA)
 * 2. Tablero de Conceptos (mode: "notion", legacy: Tablero Notion)
 * 3. Neuronal 3D (mode: "spatial", legacy: Neural 3D)
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  mode,
  onChange,
  className = "",
  isLocked = false,
}) => {
  const { t } = useTranslation();
  const discoveryLabel = t("views.discovery", { defaultValue: "1. Ideación IA" });
  const boardLabel = t("views.board", { defaultValue: "2. Tablero de Conceptos" });
  const spatialLabel = t("views.spatial", { defaultValue: "3. Neuronal 3D" });
  const isDiscovery = mode === "discovery" || mode === "obsidian";
  const isNotion = mode === "notion";
  const isSpatial = mode === "spatial";

  return (
    <div
      role="radiogroup"
      aria-label="Modo de visualización del lienzo"
      className={`
        inline-flex items-center p-1 rounded-2xl max-w-full
        glass-pill
        shadow-[0_8px_24px_-6px_rgba(45,21,18,0.08),inset_0_1px_0_0_rgba(255,255,255,0.75)]
        dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(229,193,88,0.08)]
        border border-line/80 dark:border-line/40
        select-none ${className}
      `}
    >
      {/* 1. Ideación IA (Legacy Alias: Descubrimiento IA) */}
      <button
        type="button"
        role="radio"
        aria-checked={isDiscovery}
        aria-label={discoveryLabel}
        data-legacy-mode="Descubrimiento IA"
        onClick={() => onChange("discovery")}
        className={`
          flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all duration-200 focus-ring cursor-pointer whitespace-nowrap
          ${
            isDiscovery
              ? "bg-surface/95 dark:bg-surface-elevated text-fg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(229,193,88,0.15)] border border-line-soft dark:border-[var(--accent-primary)]/40 scale-100"
              : "text-muted hover:text-fg hover:bg-hover/50 scale-[0.98]"
          }
        `}
      >
        <Sparkles className="w-3.5 h-3.5 text-accent-primary shrink-0" />
        <span className="hidden lg:inline">{discoveryLabel}</span>
        <span className="lg:hidden">{t("views.discoveryShort", { defaultValue: "IA" })}</span>
      </button>

      {/* 2. Tablero de Conceptos (Legacy Alias: Tablero Notion) */}
      <button
        type="button"
        role="radio"
        aria-checked={isNotion}
        aria-label={boardLabel}
        aria-describedby={isLocked ? "architecture-lock-hint" : undefined}
        aria-disabled={isLocked}
        title={isLocked ? "Define tu idea en el chat para desbloquear la arquitectura del proyecto" : undefined}
        data-legacy-mode="Tablero Notion"
        onClick={() => {
          if (!isLocked) onChange("notion");
        }}
        className={`
          flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all duration-200 focus-ring whitespace-nowrap
          ${
            isLocked
              ? "opacity-40 cursor-not-allowed text-muted scale-[0.98]"
              : isNotion
                ? "bg-surface/95 dark:bg-surface-elevated text-fg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(229,193,88,0.15)] border border-line-soft dark:border-[var(--accent-primary)]/40 scale-100 cursor-pointer"
                : "text-muted hover:text-fg hover:bg-hover/50 scale-[0.98] cursor-pointer"
          }
        `}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-accent-primary shrink-0" />
        <span className="hidden lg:inline">{boardLabel}</span>
        <span className="lg:hidden">{t("views.boardShort", { defaultValue: "Tablero" })}</span>
      </button>

      {/* 3. Neuronal 3D (Legacy Alias: Neural 3D) */}
      <button
        type="button"
        role="radio"
        aria-checked={isSpatial}
        aria-label={spatialLabel}
        aria-describedby={isLocked ? "architecture-lock-hint" : undefined}
        aria-disabled={isLocked}
        title={isLocked ? "Define tu idea en el chat para desbloquear la arquitectura del proyecto" : undefined}
        data-legacy-mode="Neural 3D"
        onClick={() => {
          if (!isLocked) onChange("spatial");
        }}
        className={`
          flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 rounded-xl text-caption font-semibold transition-all duration-200 focus-ring whitespace-nowrap
          ${
            isLocked
              ? "opacity-40 cursor-not-allowed text-muted scale-[0.98]"
              : isSpatial
                ? "bg-surface/95 dark:bg-surface-elevated text-fg shadow-[0_2px_8px_-2px_rgba(229,193,88,0.25),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(229,193,88,0.2)] border border-line-soft dark:border-[var(--accent-primary)]/40 scale-100 cursor-pointer"
                : "text-muted hover:text-fg hover:bg-hover/50 scale-[0.98] cursor-pointer"
          }
        `}
      >
        <span className="w-2 h-2 rounded-full bg-accent-primary shadow-[0_0_6px_var(--accent)]" />
        <span className="hidden lg:inline">{spatialLabel}</span>
        <span className="lg:hidden">3D</span>
      </button>
      {isLocked && (
        <span id="architecture-lock-hint" className="sr-only">
          {t("views.lockedHint", { defaultValue: "Continúa describiendo tu idea para habilitar el tablero y la vista 3D." })}
        </span>
      )}
    </div>
  );
};
