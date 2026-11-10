import React, { useState } from "react";
import { ChevronDown, Compass, Eye, EyeOff, RotateCcw, X } from "lucide-react";
import type { PerspectiveActionEvent, PerspectiveEvaluation, PerspectiveId } from "../../domain/types";
import { visiblePerspectives } from "../../services/ai/perspectiveEngine";

interface PerspectivePanelProps {
  perspectives?: PerspectiveEvaluation[];
  disabled?: boolean;
  onAction?: (event: PerspectiveActionEvent) => void;
}

const createAction = (type: PerspectiveActionEvent["type"], perspectiveId: PerspectiveId): PerspectiveActionEvent => ({
  type,
  perspectiveId,
  actionId: crypto.randomUUID(),
});

export const PerspectivePanel: React.FC<PerspectivePanelProps> = ({ perspectives = [], disabled = false, onAction }) => {
  const [expanded, setExpanded] = useState<Set<PerspectiveId>>(new Set());
  const visible = visiblePerspectives(perspectives);
  const archived = perspectives.filter((item) => item.explorationStatus === "dismissed" || item.explorationStatus === "not_relevant");
  if (visible.length === 0 && archived.length === 0) return null;

  const explore = (item: PerspectiveEvaluation) => {
    setExpanded((current) => new Set(current).add(item.perspectiveId));
    onAction?.(createAction("explore", item.perspectiveId));
  };

  return (
    <section className="glass-card p-5 max-w-2xl w-full space-y-4" aria-labelledby="perspective-panel-title">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Compass className="w-4 h-4" /></div>
        <div>
          <h3 id="perspective-panel-title" className="text-sm font-bold text-fg">Perspectivas relevantes</h3>
          <p className="text-xs text-muted mt-0.5">Lentes sugeridos a partir de la memoria y el grafo actuales. No son hechos confirmados.</p>
        </div>
      </div>
      <div className="space-y-2">
        {visible.map((item) => {
          const isExpanded = expanded.has(item.perspectiveId) || item.explorationStatus === "explored";
          return (
            <article key={item.perspectiveId} className="rounded-xl border border-line bg-surface/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-fg">{item.label}</h4>
                    <span className="text-[10px] rounded-full border border-line px-2 py-0.5 text-muted">{item.relevance === "relevant" ? "Relevante" : "Por explorar"}</span>
                    {item.explorationStatus === "explored" && <span className="text-[10px] text-positive font-semibold">Explorada</span>}
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{item.rationale}</p>
                </div>
              </div>
              {isExpanded && <div className="rounded-lg bg-surface-elevated/50 px-3 py-2 text-xs text-fg" role="region" aria-label={`Enfoque ${item.label}`}><span className="font-semibold">Enfoque:</span> {item.focus}</div>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button type="button" disabled={disabled} onClick={() => explore(item)} className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1.5"><Eye className="w-3 h-3" />{item.explorationStatus === "explored" ? "Volver a revisar" : "Explorar"}</button>
                <button type="button" disabled={disabled} onClick={() => onAction?.(createAction("dismiss", item.perspectiveId))} className="px-2.5 py-1.5 rounded-lg border border-line text-muted text-[11px] hover:text-fg disabled:opacity-50 flex items-center gap-1.5"><X className="w-3 h-3" /> Descartar</button>
                <button type="button" disabled={disabled} onClick={() => onAction?.(createAction("mark_not_relevant", item.perspectiveId))} className="px-2.5 py-1.5 rounded-lg text-muted text-[11px] hover:text-fg disabled:opacity-50 flex items-center gap-1.5"><EyeOff className="w-3 h-3" /> No aplica</button>
              </div>
            </article>
          );
        })}
      </div>
      {archived.length > 0 && (
        <details className="group border-t border-line pt-3">
          <summary className="list-none cursor-pointer text-[11px] font-semibold text-muted hover:text-fg flex items-center gap-1.5"><ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />Revisar perspectivas anteriores ({archived.length})</summary>
          <div className="mt-2 space-y-1.5">
            {archived.map((item) => (
              <div key={item.perspectiveId} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <div><span className="text-xs font-semibold text-fg">{item.label}</span><span className="ml-2 text-[10px] text-muted">{item.explorationStatus === "not_relevant" ? "Marcada como no aplicable" : "Descartada"}</span></div>
                <button type="button" disabled={disabled} onClick={() => onAction?.(createAction("restore", item.perspectiveId))} className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Recuperar</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
};
