import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Maximize2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ConceptNodeData } from "../../store/useWorkspaceStore";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import type { ResearchPhase, NodePriority } from "../../domain/types";

const PHASE_CONFIG: Record<
  ResearchPhase,
  { label: string; bar: string; badge: string; text: string }
> = {
  planning: {
    label: "Planificación",
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    text: "text-emerald-500",
  },
  execution: {
    label: "Ejecución",
    bar: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    text: "text-blue-500",
  },
  validation: {
    label: "Validación",
    bar: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    text: "text-amber-500",
  },
};

const PRIORITY_BADGE: Record<NodePriority, { label: string; style: string }> = {
  high: {
    label: "Alta",
    style: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  medium: {
    label: "Media",
    style: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  low: {
    label: "Baja",
    style: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  },
};

export const ConceptNodeCard: React.FC<NodeProps<ConceptNodeData>> = memo(
  ({ id, data, selected }) => {
    const openDeepDive = useWorkspaceStore((state) => state.openDeepDive);

    const phase = data.phase || "planning";
    const phaseInfo = PHASE_CONFIG[phase] || PHASE_CONFIG.planning;
    const priority = data.priority || "medium";
    const priorityInfo = PRIORITY_BADGE[priority] || PRIORITY_BADGE.medium;

    const handleOpenDetails = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (data.onOpenDeepDive) {
        data.onOpenDeepDive(id);
      } else {
        openDeepDive(id);
      }
    };

    return (
      <div
        className={`
          w-[264px] rounded-2xl
          bg-surface/90 dark:bg-zinc-950/90
          backdrop-blur-2xl backdrop-saturate-150
          border transition-all duration-200 group relative select-none
          shadow-[0_8px_20px_-6px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.75)]
          dark:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.08)]
          hover:shadow-[0_16px_32px_-8px_rgba(15,23,42,0.14),inset_0_1px_0_0_rgba(255,255,255,0.9)]
          dark:hover:shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.12)]
          ${
            selected
              ? "border-concept-fg ring-2 ring-concept-fg/40 shadow-[0_0_24px_-4px_rgba(37,99,235,0.35)] scale-[1.02]"
              : "border-line/80 dark:border-white/10 hover:border-concept-fg/40"
          }
        `}
      >
        {/* Specular hairline reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-10"
        />

        {/* React Flow Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-concept-fg !border-2 !border-white dark:!border-zinc-950 transition-transform group-hover:scale-125 shadow-xs"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-concept-fg !border-2 !border-white dark:!border-zinc-950 transition-transform group-hover:scale-125 shadow-xs"
        />
        <Handle
          type="target"
          id="left"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-concept-fg !border-2 !border-white dark:!border-zinc-950 shadow-xs"
        />
        <Handle
          type="source"
          id="right"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !bg-concept-fg !border-2 !border-white dark:!border-zinc-950 shadow-xs"
        />

        {/* 1. Barra superior muy fina con el color de su fase */}
        <div className={`h-1.5 w-full rounded-t-2xl ${phaseInfo.bar} transition-colors duration-200`} />

        {/* 2. Contenido de la mini-tarjeta */}
        <div className="p-3.5 space-y-2">
          {/* Header con Badges de Fase y Prioridad + Botón Ghost de Acción */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-xs ${phaseInfo.badge}`}
              >
                {phaseInfo.label}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-xs ${priorityInfo.style}`}
              >
                {priorityInfo.label}
              </span>
            </div>

            {/* Botón tipo ghost con ícono Maximize2 visible en hover */}
            <button
              type="button"
              onClick={handleOpenDetails}
              className="opacity-0 group-hover:opacity-100 transition-all duration-150 p-1 rounded-lg text-muted hover:text-fg hover:bg-hover active:scale-95 cursor-pointer focus-ring"
              title="Abrir Detalles (Notion Deep-Dive)"
              aria-label="Abrir Detalles"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Título de la idea */}
          <h3 className="text-body font-bold text-fg leading-snug line-clamp-2">
            {data.title}
          </h3>

          {/* 4. Descripción breve */}
          {data.description && (
            <p className="text-[12px] text-muted line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}

          {/* 5. Footer con metadata */}
          {data.metadata && (
            <div className="pt-2 border-t border-line/60 dark:border-white/5 flex items-center justify-between text-[11px] text-muted">
              <span className="truncate max-w-[200px] font-mono text-[10px]">
                {data.metadata}
              </span>
              {data.kind === "concept" && <Sparkles className="w-3.5 h-3.5 text-concept-fg shrink-0" />}
              {data.kind === "viability" && <CheckCircle2 className="w-3.5 h-3.5 text-positive-fg shrink-0" />}
              {data.kind === "risk" && <AlertTriangle className="w-3.5 h-3.5 text-risk-fg shrink-0" />}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ConceptNodeCard.displayName = "ConceptNodeCard";
