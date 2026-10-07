import React from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Trash2, ArrowUpRight, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { ConceptNode } from "../../domain/types";

interface NodeInspectorSheetProps {
  node: ConceptNode | null;
  onClose: () => void;
  onAskAI: (nodeTitle: string) => void;
  onRemoveNode: (nodeId: string) => void;
}

export const NodeInspectorSheet: React.FC<NodeInspectorSheetProps> = ({
  node,
  onClose,
  onAskAI,
  onRemoveNode,
}) => {
  const { t } = useTranslation();

  if (!node) return null;

  const kindIcons = {
    concept: <Sparkles className="w-4 h-4 text-concept-fg" />,
    viability: <CheckCircle2 className="w-4 h-4 text-positive-fg" />,
    risk: <AlertTriangle className="w-4 h-4 text-risk-fg" />,
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 glass border border-line rounded-2xl p-5 shadow-2xl z-30 flex flex-col justify-between animate-sheet-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-line-soft">
          <div className="flex items-center gap-2">
            {kindIcons[node.kind]}
            <Badge kind={node.kind} status={node.status}>
              {t(`kinds.${node.kind}`)}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg p-1.5 rounded-lg hover:bg-hover transition-colors"
            aria-label="Close"
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

          <div className="p-3 rounded-xl bg-elevated/60 border border-line-soft space-y-2">
            <div className="flex items-center justify-between text-caption">
              <span className="text-muted">Status:</span>
              <span className="font-medium text-fg uppercase tracking-wider text-[10px]">
                {t(`nodeStatus.${node.status}`)}
              </span>
            </div>
            <div className="flex items-center justify-between text-caption">
              <span className="text-muted">Supporting Data:</span>
              <span className="font-medium text-fg">{node.metadata}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-4 border-t border-line-soft">
        <Button
          variant="primary"
          size="md"
          onClick={() => onAskAI(node.title)}
          icon={<Sparkles className="w-4 h-4" />}
          className="w-full shadow-md shadow-blue-500/15"
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
