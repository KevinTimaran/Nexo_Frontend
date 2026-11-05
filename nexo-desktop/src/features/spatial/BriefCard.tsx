import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Tag } from "lucide-react";
import { GlisseCard } from "../../components/ui/GlisseCard";
import { SPATIAL_PROJECT_BRIEF } from "../../mocks/spatialSeed";

export interface BriefCardProps {
  brief?: typeof SPATIAL_PROJECT_BRIEF;
  className?: string;
}

/**
 * BriefCard — High-level project brief HUD panel rendered with Glisse liquid glass
 * physics, dynamic specular highlights, and fluid micro-interactions.
 */
export const BriefCard: React.FC<BriefCardProps> = ({
  brief = SPATIAL_PROJECT_BRIEF,
  className = "",
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <GlisseCard
      variant="default"
      interactive
      className={`shrink-0 flex flex-col gap-2.5 z-20 ${className}`}
      aria-label="Ficha de Proyecto 3D"
    >
      {/* Header with Phase pill and collapse toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--accent)]" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
            {brief.phase}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted font-mono">Nexo 3D</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed((prev) => !prev);
            }}
            className="p-1 rounded-lg text-muted hover:text-fg hover:bg-surface/10 transition-colors cursor-pointer"
            aria-label={isCollapsed ? "Expandir ficha" : "Colapsar ficha"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-sm font-bold text-fg tracking-tight flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>{brief.title}</span>
      </h2>

      {/* Summary (collapsible) */}
      {!isCollapsed && (
        <>
          <p className="text-xs text-muted leading-relaxed font-normal">
            {brief.summary}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-line/5">
            {brief.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface/5 hover:bg-surface/10 ring-1 ring-line/10 text-muted transition-colors"
              >
                <Tag className="w-2.5 h-2.5 opacity-60" />
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </GlisseCard>
  );
};

export default BriefCard;
