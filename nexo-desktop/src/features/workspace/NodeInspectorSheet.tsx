import React from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Trash2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { ConceptNode, ResearchPhase } from "../../domain/types";

interface NodeInspectorSheetProps {
  node: ConceptNode | null;
  isChatOpen?: boolean;
  onClose: () => void;
  onAskAI: (nodeTitle: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onOpenDoc?: (node: ConceptNode) => void;
}

export const NodeInspectorSheet: React.FC<NodeInspectorSheetProps> = ({
  node,
  isChatOpen = false,
  onClose,
  onAskAI,
  onRemoveNode,
  onOpenDoc,
}) => {
  const { t } = useTranslation();

  if (!node) return null;

  const kindIcons = {
    concept: <Sparkles className="w-4 h-4 text-concept-fg" />,
    viability: <CheckCircle2 className="w-4 h-4 text-positive-fg" />,
    risk: <AlertTriangle className="w-4 h-4 text-risk-fg" />,
  };

  const resolvePhase = (n: ConceptNode): ResearchPhase => {
    if (n.phase) return n.phase;
    if (n.kind === "concept") return "planning";
    if (n.kind === "viability") return "execution";
    return "validation";
  };

  const phase = resolvePhase(node);

  const getPhaseBadge = (p: ResearchPhase) => {
    switch (p) {
      case "planning":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("phases.planning")}
          </span>
        );
      case "execution":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {t("phases.execution")}
          </span>
        );
      case "validation":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t("phases.validation")}
          </span>
        );
    }
  };

  return (
    <div
      className={`
        absolute top-3 bottom-3 sm:top-4 sm:bottom-4
        ${isChatOpen ? "right-3 sm:right-[444px]" : "right-3 sm:right-4"}
        w-84 max-w-[calc(100vw-2rem)]
        rounded-3xl overflow-hidden
        border border-line/80 dark:border-white/12
        glass-modal specular-sheen
        p-5 shadow-2xl
        z-30 flex flex-col justify-between
        transition-all duration-300 ease-out animate-sheet-in select-text
      `}
    >
      {/* Specular Top Reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-10" />
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-line/60 dark:border-white/10">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getPhaseBadge(phase)}
            <Badge kind={node.kind} status={node.status}>
              <span className="flex items-center gap-1">
                {kindIcons[node.kind]}
                {t(`kinds.${node.kind}`)}
              </span>
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg p-1.5 rounded-lg hover:bg-hover transition-colors focus-ring cursor-pointer"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-body font-bold text-fg text-lg leading-snug">{node.title}</h3>
            <p className="text-caption text-muted mt-2 leading-relaxed">{node.description}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface/75 dark:bg-white/[0.04] border border-line/80 dark:border-white/10 space-y-2.5 backdrop-blur-md shadow-2xs">
            <div className="flex items-center justify-between text-caption">
              <span className="text-muted font-medium">Estado:</span>
              <span className="font-semibold text-fg uppercase tracking-wider text-[10px] glass-pill">
                {t(`nodeStatus.${node.status}`)}
              </span>
            </div>
            {node.metadata && (
              <div className="flex items-center justify-between text-caption">
                <span className="text-muted font-medium">Métrica / Evidencia:</span>
                <span className="font-medium text-fg">{node.metadata}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-4 border-t border-line/60 dark:border-white/10">
        {onOpenDoc && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => onOpenDoc(node)}
            icon={<FileText className="w-4 h-4 text-concept-fg" />}
            className="w-full shadow-2xs"
          >
            {t("canvas.document.deepDive", { defaultValue: "Lectura profunda" })}
          </Button>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={() => onAskAI(node.title)}
          icon={<Sparkles className="w-4 h-4" />}
          className="w-full shadow-md shadow-concept-fg/20"
        >
          {t("canvas.node.ask")}
        </Button>

        <Button
          variant="danger"
          size="md"
          onClick={() => onRemoveNode(node.id)}
          icon={<Trash2 className="w-4 h-4" />}
          className="w-full"
        >
          {t("canvas.node.remove")}
        </Button>
      </div>
    </div>
  );
};
