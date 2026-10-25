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
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    text: "text-emerald-500",
  },
  execution: {
    label: "Ejecución",
    bar: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    text: "text-blue-500",
  },
  validation: {
    label: "Validación",
    bar: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    text: "text-amber-500",
  },
};

const PRIORITY_BADGE: Record<NodePriority, { label: string; style: string }> = {
  high: {
    label: "Alta",
    style: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  medium: {
    label: "Media",
    style: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  low: {
    label: "Baja",
    style: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
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
        className={`w-[260px] rounded-2xl bg-white dark:bg-zinc-950 border transition-all duration-200 group relative select-none shadow-sm hover:shadow-xl ${
          selected
            ? "border-concept-fg ring-2 ring-concept-fg/40 shadow-lg scale-[1.01]"
            : "border-line-soft hover:border-line dark:border-zinc-800"
        }`}
      >
        {/* React Flow Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-950 transition-transform group-hover:scale-125"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-950 transition-transform group-hover:scale-125"
        />
        <Handle
          type="target"
          id="left"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-950"
        />
        <Handle
          type="source"
          id="right"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-950"
        />

        {/* 1. Barra superior muy fina con el color de su fase */}
        <div className={`h-1.5 w-full rounded-t-2xl ${phaseInfo.bar}`} />

        {/* 2. Contenido de la mini-tarjeta */}
        <div className="p-3.5 space-y-2">
          {/* Header con Badge de Fase y Botón Ghost de Acción (Hover) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${phaseInfo.badge}`}
              >
                {phaseInfo.label}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityInfo.style}`}
              >
                {priorityInfo.label}
              </span>
            </div>

            {/* CRÍTICO: Botón tipo "ghost" con ícono Maximize2 visible en hover */}
            <button
              type="button"
              onClick={handleOpenDetails}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted hover:text-fg hover:bg-hover active:scale-95 cursor-pointer"
              title="Abrir Detalles (Notion Deep-Dive)"
              aria-label="Abrir Detalles"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Título de la idea en el centro */}
          <h3 className="text-body font-bold text-fg leading-snug line-clamp-2">
            {data.title}
          </h3>

          {/* 4. Descripción breve o preview */}
          {data.description && (
            <p className="text-[12px] text-muted line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}

          {/* Footer con metadata / evidencia empírica si existe */}
          {data.metadata && (
            <div className="pt-1 border-t border-line-soft/60 flex items-center justify-between text-[11px] text-muted">
              <span className="truncate max-w-[210px] font-mono text-[10px]">
                {data.metadata}
              </span>
              {data.kind === "concept" && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
              {data.kind === "viability" && <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />}
              {data.kind === "risk" && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ConceptNodeCard.displayName = "ConceptNodeCard";
