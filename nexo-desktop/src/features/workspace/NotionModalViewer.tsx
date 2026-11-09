import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Network,
  Share2,
} from "lucide-react";
import type { ConceptNode, ResearchPhase } from "../../domain/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { MarkdownRenderer } from "../../components/ui/MarkdownRenderer";

export interface NotionModalViewerProps {
  node: ConceptNode | null;
  onClose: () => void;
  onViewInGraph?: (nodeId: string) => void;
  onAskAI?: (nodeTitle: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  relatedNodes?: ConceptNode[];
}

export const NotionModalViewer: React.FC<NotionModalViewerProps> = ({
  node,
  onClose,
  onViewInGraph,
  onAskAI,
  onRemoveNode,
  relatedNodes = [],
}) => {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: Escape closes the viewer
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
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-0.5 rounded-full bg-positive/15 text-positive dark:text-positive border border-positive/25">
            <span className="w-1.5 h-1.5 rounded-full bg-positive" />
            {t("phases.planning")}
          </span>
        );
      case "execution":
        return (
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary dark:text-primary border border-primary/25">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t("phases.execution")}
          </span>
        );
      case "validation":
        return (
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t("phases.validation")}
          </span>
        );
      default:
        return null;
    }
  };

  const kindIcons = {
    concept: <Sparkles className="w-3.5 h-3.5 text-concept-fg" />,
    viability: <CheckCircle2 className="w-3.5 h-3.5 text-positive-fg" />,
    risk: <AlertTriangle className="w-3.5 h-3.5 text-risk-fg" />,
  };

  return (
    <AnimatePresence>
      {node && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notion-document-title"
          className="fixed inset-0 z-50 flex justify-end overflow-hidden font-sans select-none"
        >
          {/* Frosted Glass Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-app/35 dark:bg-app/65 backdrop-blur-md cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Glass Sheet V2 Floating Inspector */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="
              relative z-10 w-full sm:w-[560px] md:w-[640px] max-w-full h-full
              bg-surface/70 backdrop-blur-2xl border-l border-line/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
              dark:bg-app/20 dark:border-line/10 dark:shadow-2xl
              flex flex-col justify-between
              overflow-hidden text-fg dark:text-fg select-text
            "
          >
            {/* Top Header Toolbar */}
            <div className="p-4 sm:p-5 border-b border-line/60 dark:border-line/10 flex items-center justify-between bg-surface/30 dark:bg-surface/[0.02] backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted dark:text-muted uppercase tracking-wider block">
                    Documento de Investigación
                  </span>
                  <span className="text-xs font-mono text-muted dark:text-muted">ID: {node.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onViewInGraph && (
                  <button
                    onClick={() => onViewInGraph(node.id)}
                    className="h-8 px-2.5 rounded-xl border border-line/80 dark:border-line/10 hover:border-primary/50 bg-surface/60 dark:bg-surface/[0.06] hover:bg-surface/90 text-xs font-medium flex items-center gap-1.5 text-muted dark:text-muted hover:text-fg dark:hover:text-fg transition-all cursor-pointer shadow-xs"
                    title="Visualizar en Neural 3D"
                  >
                    <Network className="w-3.5 h-3.5 text-primary dark:text-primary" />
                    <span className="hidden sm:inline">Ver en Grafo</span>
                  </button>
                )}

                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl text-muted hover:text-fg dark:hover:text-fg hover:bg-surface/40 dark:hover:bg-surface/10 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Cerrar documento"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Metadata Bar */}
          <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-line/60 dark:border-line/10">
            <Badge kind={node.kind} status={node.status} size="md">
              <span className="flex items-center gap-1 text-xs">
                {kindIcons[node.kind]}
                {t(`kinds.${node.kind}`)}
              </span>
            </Badge>

            {node.category && <Badge category={node.category} size="md" />}
            {node.priority && <Badge priority={node.priority} size="md" />}
            {getPhaseBadge(node.phase)}

            {node.metadata && (
              <span className="text-caption font-mono text-muted bg-surface/80 dark:bg-surface/[0.06] px-2.5 py-0.5 rounded-lg border border-line-soft dark:border-line/10 ml-auto">
                {node.metadata}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h1
              id="notion-document-title"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg leading-tight"
            >
              {node.title}
            </h1>
            {node.description && (
              <p className="text-body text-muted mt-2 leading-relaxed font-normal">
                {node.description}
              </p>
            )}
          </div>

          {/* Markdown Content Section */}
          <div className="pt-4 border-t border-line/60 dark:border-line/10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-concept-fg" />
              <span>Memoria y Especificaciones Detalladas</span>
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none text-caption">
              <MarkdownRenderer
                content={
                  node.details ||
                  `### Resumen del Concepto\n\n${node.description}\n\n### Indicadores Clave\n- **Estado:** ${node.status}\n- **Prioridad:** ${node.priority || "Media"}\n- **Categoría:** ${node.category || "Técnica"}\n\n> Este documento sintetiza los fundamentos del concepto y sus dependencias con los objetivos del proyecto.`
                }
              />
            </div>
          </div>

          {/* Related Connected Concepts */}
          {relatedNodes.length > 0 && (
            <div className="pt-6 border-t border-line/60 dark:border-line/10 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-concept-fg" />
                <span>Conceptos Relacionados ({relatedNodes.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {relatedNodes.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3 rounded-2xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 text-left space-y-1 transition-all hover:bg-surface/60 dark:hover:bg-surface/10 shadow-xs backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-muted dark:text-muted uppercase">{t(`kinds.${rel.kind}`)}</span>
                      {rel.priority && <Badge priority={rel.priority} size="sm" />}
                    </div>
                    <h4 className="text-xs font-bold text-fg dark:text-fg truncate">{rel.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-line/60 dark:border-line/10 flex items-center justify-between bg-surface/30 dark:bg-surface/[0.02] backdrop-blur-md shrink-0">
          {onRemoveNode ? (
            <button
              onClick={() => onRemoveNode(node.id)}
              className="text-danger dark:text-danger hover:bg-danger/10 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onAskAI && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAskAI(node.title)}
                className="!rounded-xl !bg-primary hover:!bg-primary !text-fg shadow-sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Consultar al Copilot
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};
