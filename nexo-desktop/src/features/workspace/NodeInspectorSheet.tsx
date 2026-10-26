import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`
        absolute top-3 bottom-3 sm:top-4 sm:bottom-4
        ${isChatOpen ? "right-3 sm:right-[472px]" : "right-3 sm:right-4"}
        w-84 max-w-[calc(100vw-2rem)]
        rounded-3xl overflow-hidden
        bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
        dark:bg-black/20 dark:border-white/10 dark:shadow-2xl
        p-5 z-30 flex flex-col justify-between
        transition-all duration-300 ease-out select-text text-slate-800 dark:text-zinc-100
      `}
    >
      {/* Specular Top Reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-10" />
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-white/60 dark:border-white/10">
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
            className="text-slate-400 hover:text-slate-800 dark:hover:text-zinc-100 p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 leading-snug">{node.title}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{node.description}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 space-y-2.5 backdrop-blur-md shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Estado:</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-100 uppercase tracking-wider text-[10px] bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10 px-2 py-0.5 rounded-full shadow-2xs">
                {t(`nodeStatus.${node.status}`)}
              </span>
            </div>
            {node.metadata && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400 font-medium">Métrica / Evidencia:</span>
                <span className="font-medium text-slate-800 dark:text-zinc-100">{node.metadata}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-4 border-t border-white/60 dark:border-white/10">
        {onOpenDoc && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => onOpenDoc(node)}
            icon={<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            className="w-full shadow-xs"
          >
            {t("canvas.document.deepDive", { defaultValue: "Lectura profunda" })}
          </Button>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={() => onAskAI(node.title)}
          icon={<Sparkles className="w-4 h-4" />}
          className="w-full !rounded-xl !bg-blue-600 hover:!bg-blue-500 !text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
        >
          {t("canvas.node.ask")}
        </Button>

        <Button
          variant="danger"
          size="md"
          onClick={() => onRemoveNode(node.id)}
          icon={<Trash2 className="w-4 h-4" />}
          className="w-full !rounded-xl"
        >
          {t("canvas.node.remove")}
        </Button>
      </div>
    </motion.div>
  );
};
