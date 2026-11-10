import React from "react";
import { X, FileText, Share2, ExternalLink } from "lucide-react";
import { GlisseCard } from "../../components/ui/GlisseCard";
import { type SpatialNode } from "../../domain/spatial";
import { graphSemanticLabels } from "../../domain/graphSemantics";
import { SemanticNodeBadges } from "../../components/semantic/SemanticBadges";
import { semanticNodeVisuals } from "../../theme/semanticVisuals";

export interface DetailCardProps {
  node: SpatialNode;
  connectedNeighbors: SpatialNode[];
  onClose: () => void;
  onOpenDoc: () => void;
  onSelectNeighbor: (id: string) => void;
  className?: string;
}

/**
 * DetailCard — Node inspector HUD panel with Glisse liquid glass physics,
 * spring sliding transitions, specular rim reflections, and OrbitControls isolation.
 */
export const DetailCard: React.FC<DetailCardProps> = ({
  node,
  connectedNeighbors,
  onClose,
  onOpenDoc,
  onSelectNeighbor,
  className = "",
}) => {
  const semanticLabels = graphSemanticLabels(node);
  const semantic = semanticNodeVisuals(node);
  const clusterColor = semantic.perspective.dark;

  return (
    <GlisseCard
      key={node.id}
      variant="default"
      interactive={false}
      glow={`color-mix(in srgb, ${clusterColor} 30%, transparent)`}
      initial={{ x: 50, opacity: 0, scale: 0.97 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 50, opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={`flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] z-20 ${className}`}
      aria-label={`Detalle del nodo ${node.name}`}
    >
      {/* Header with Cluster Indicator and Close Button */}
      <div className="flex items-center justify-between pb-2 border-b border-line/5">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
            style={{
              backgroundColor: clusterColor,
              color: clusterColor,
            }}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
            Perspectiva: {semantic.perspective.label}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface/10 active:scale-90 transition-all cursor-pointer"
          aria-label="Cerrar detalle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Node Title & Description */}
      <div>
        <h3 className="text-base font-bold text-fg tracking-tight">
          {node.name}
        </h3>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          {node.desc}
        </p>
        {semanticLabels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Estado semántico: ${semanticLabels.join(", ")}`}>
            {semanticLabels.map((label) => (
              <span key={label} className="px-2 py-0.5 rounded-full border border-line/60 bg-surface/5 text-[10px] font-semibold text-muted">
                {label}
              </span>
            ))}
          </div>
        )}
        <SemanticNodeBadges node={node} showPerspective showOrigin className="mt-2" />
      </div>

      {/* Stats Pill */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-surface/5 p-2.5 rounded-xl ring-1 ring-line/10">
        <div>
          <span className="text-muted block text-[10px]">IMPORTANCIA</span>
          <span className="font-bold text-primary">
            {Math.round(node.importance * 100)}%
          </span>
        </div>
        <div>
          <span className="text-muted block text-[10px]">MASA ORBE</span>
          <span className="font-bold text-positive">
            {node.val} val
          </span>
        </div>
      </div>

      {/* Action: Abrir Documento Notion */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDoc();
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.98] text-fg text-xs font-semibold shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all cursor-pointer"
      >
        <FileText className="w-4 h-4" />
        <span>Abrir Documento Notion</span>
      </button>

      {/* Connected Neighbour Nodes */}
      {connectedNeighbors.length > 0 && (
        <div className="pt-2 border-t border-line/5 flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Share2 className="w-3 h-3 text-primary" />
            <span>Conexiones ({connectedNeighbors.length})</span>
          </span>

          <div className="flex flex-col gap-1.5">
            {connectedNeighbors.map((neighbor) => (
              <button
                key={neighbor.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNeighbor(neighbor.id);
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-surface/5 hover:bg-surface/10 active:scale-[0.99] ring-1 ring-line/5 hover:ring-line/15 text-left transition-all text-xs cursor-pointer group"
              >
                <span className="text-muted group-hover:text-fg truncate font-medium">
                  {neighbor.name}
                </span>
                <ExternalLink className="w-3 h-3 text-muted group-hover:text-primary shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}
    </GlisseCard>
  );
};

export default DetailCard;
