import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Network,
  Layers,
  FileText,
  Trash2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import type { ConceptNode, ResearchPhase } from "../../domain/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface DocumentDetailOverlayProps {
  node: ConceptNode | null;
  onClose: () => void;
  onViewInGraph: (nodeId: string) => void;
  onAskAI: (nodeTitle: string) => void;
  onRemoveNode: (nodeId: string) => void;
  relatedNodes?: ConceptNode[];
}

export const DocumentDetailOverlay: React.FC<DocumentDetailOverlayProps> = ({
  node,
  onClose,
  onViewInGraph,
  onAskAI,
  onRemoveNode,
  relatedNodes = [],
}) => {
  const { t } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: Escape key closes the overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const getPhaseBadge = (phase?: ResearchPhase) => {
    switch (phase) {
      case "planning":
        return (
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t("phases.planning")}
          </span>
        );
      case "execution":
        return (
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {t("phases.execution")}
          </span>
        );
      case "validation":
        return (
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {t("phases.validation")}
          </span>
        );
      default:
        return null;
    }
  };

  const kindIcons = {
    concept: <Sparkles className="w-4 h-4 text-concept-fg" />,
    viability: <CheckCircle2 className="w-4 h-4 text-positive-fg" />,
    risk: <AlertTriangle className="w-4 h-4 text-risk-fg" />,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-title"
      className="absolute inset-0 z-40 bg-black/40 backdrop-blur-md flex justify-end animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={overlayRef}
        className="w-full max-w-2xl h-full glass-modal border-l border-white/20 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden animate-sheet-in z-50 text-fg specular-sheen"
      >
        {/* Document Top Bar */}
        <div className="h-14 px-6 border-b border-line-soft flex items-center justify-between shrink-0 bg-surface-primary/20 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-caption font-medium text-muted hover:text-fg py-1.5 px-2 rounded-lg hover:bg-hover transition-colors focus-ring"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("common.close")}</span>
            </button>
            <span className="text-muted/40">•</span>
            <span className="text-caption text-muted flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-concept-fg" />
              Documento de Conocimiento
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewInGraph(node.id)}
              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-caption font-medium bg-surface-secondary/70 hover:bg-surface-secondary border border-line-soft text-fg transition-colors focus-ring"
              title="Centrar y ver en el grafo"
            >
              <Network className="w-3.5 h-3.5 text-concept-fg" />
              <span>Ver en grafo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-fg rounded-lg hover:bg-hover transition-colors focus-ring"
              aria-label={t("common.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto px-8 sm:px-12 py-8 space-y-8 select-text">
          {/* Header Metadata Chips */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              {getPhaseBadge(node.phase)}
              <Badge kind={node.kind} status={node.status}>
                <span className="flex items-center gap-1">
                  {kindIcons[node.kind]}
                  {t(`kinds.${node.kind}`)}
                </span>
              </Badge>
              <span className="text-caption text-muted font-mono bg-sunken px-2 py-0.5 rounded-md border border-line-soft">
                {t(`nodeStatus.${node.status}`)}
              </span>
            </div>

            {/* Document Title */}
            <h1
              id="document-title"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-fg leading-tight"
            >
              {node.title}
            </h1>
          </div>

          {/* Quick Fact Callout */}
          {node.metadata && (
            <div className="p-4 rounded-2xl bg-surface-secondary/70 border border-line-soft flex items-center justify-between text-caption text-fg backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-concept-fg shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span className="font-semibold text-muted">Evidencia / Métrica:</span>
                <span className="font-medium text-fg">{node.metadata}</span>
              </div>
              <span className="text-[10px] text-muted font-mono uppercase tracking-wider glass-pill">
                Ref: {node.id}
              </span>
            </div>
          )}

          {/* Main Content Body */}
          <div className="space-y-6 text-body leading-relaxed text-fg/90">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Resumen Ejecutivo
              </h3>
              <p className="text-base text-fg leading-relaxed font-normal">
                {node.description}
              </p>
            </div>

            {/* Structured Long-form Details */}
            {node.details ? (
              <div className="space-y-4 pt-4 border-t border-line-soft">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Detalles y Plan de Ejecución
                </h3>
                <div className="whitespace-pre-wrap text-caption sm:text-body leading-relaxed font-normal bg-surface-secondary/50 p-5 rounded-2xl border border-line-soft space-y-3 backdrop-blur-xs">
                  {node.details}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-line-soft">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Estructura de la Idea
                </h3>
                <div className="space-y-3 text-caption leading-relaxed bg-surface-secondary/50 p-4 rounded-2xl border border-line-soft backdrop-blur-xs">
                  <p>
                    • <strong>Objetivo clave:</strong> Resolver la fricción identificada en el mercado mediante la adopción de herramientas digitales centradas en el usuario.
                  </p>
                  <p>
                    • <strong>Fase asignada:</strong> {node.phase?.toUpperCase() || "PLANIFICACIÓN"} — Permite mantener trazabilidad del descubrimiento a la implementación.
                  </p>
                </div>
              </div>
            )}

            {/* Connected Concepts Section */}
            {relatedNodes.length > 0 && (
              <div className="pt-4 border-t border-line-soft space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-concept-fg" />
                  <span>Conceptos Relacionados ({relatedNodes.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {relatedNodes.map((rel) => (
                    <button
                      key={rel.id}
                      onClick={() => onViewInGraph(rel.id)}
                      className="p-3.5 rounded-2xl glass-card border border-white/10 text-left transition-all group flex flex-col justify-between hover:border-concept-fg/40 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted mb-1">
                        <span>{t(`kinds.${rel.kind}`)}</span>
                        <ExternalLink className="w-3 h-3 group-hover:text-concept-fg transition-colors" />
                      </div>
                      <span className="text-caption font-semibold text-fg group-hover:text-concept-fg transition-colors line-clamp-1">
                        {rel.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-8 border-t border-line-soft bg-surface-primary/20 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveNode(node.id)}
            icon={<Trash2 className="w-4 h-4 text-risk-fg" />}
            className="text-risk-fg hover:bg-risk-fg/10"
          >
            {t("canvas.node.remove")}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAskAI(node.title)}
              icon={<Sparkles className="w-4 h-4 text-concept-fg" />}
            >
              {t("canvas.node.ask")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onViewInGraph(node.id)}
              icon={<Network className="w-4 h-4" />}
            >
              {t("canvas.document.viewInGraph", { defaultValue: "Ver en Grafo" })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
