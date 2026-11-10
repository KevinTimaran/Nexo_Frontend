import React from "react";
import type { SemanticNodeInput, SemanticStatusId } from "../../theme/semanticVisuals";
import {
  resolvePerspectiveVisual,
  resolveSemanticOriginVisual,
  resolveSemanticStatusVisual,
  resolveSemanticTypeVisual,
  type SemanticVisualToken,
} from "../../theme/semanticVisuals";
import { SemanticIcon } from "./SemanticIcon";

interface SemanticBadgeProps {
  token: SemanticVisualToken;
  label?: string;
  borderStyle?: "solid" | "dashed" | "dotted";
  compact?: boolean;
  className?: string;
}

export const SemanticBadge: React.FC<SemanticBadgeProps> = ({
  token,
  label,
  borderStyle = "solid",
  compact = false,
  className = "",
}) => {
  const style = {
    borderStyle,
    "--semantic-light": token.light,
    "--semantic-dark": token.dark,
  } as React.CSSProperties;

  return (
    <span
      className={`semantic-badge inline-flex items-center gap-1 rounded-full border font-semibold ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"} ${className}`}
      style={style}
      title={token.label}
    >
      <SemanticIcon name={token.icon} className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span>{label ?? token.shortLabel}</span>
    </span>
  );
};

interface SemanticNodeBadgesProps {
  node: SemanticNodeInput;
  status?: SemanticStatusId;
  showPerspective?: boolean;
  showOrigin?: boolean;
  compact?: boolean;
  max?: number;
  className?: string;
}

export const SemanticNodeBadges: React.FC<SemanticNodeBadgesProps> = ({
  node,
  status,
  showPerspective = true,
  showOrigin = false,
  compact = false,
  max = 4,
  className = "",
}) => {
  const type = resolveSemanticTypeVisual(node);
  const perspective = resolvePerspectiveVisual(node);
  const semanticStatus = resolveSemanticStatusVisual(node, status);
  const origin = resolveSemanticOriginVisual(node);
  const items: React.ReactNode[] = [
    <SemanticBadge key="type" token={type} compact={compact} />,
  ];

  if (showPerspective) items.push(<SemanticBadge key="perspective" token={perspective} compact={compact} />);
  items.push(<SemanticBadge key="status" token={semanticStatus} borderStyle={semanticStatus.borderStyle} compact={compact} />);
  if (showOrigin) {
    items.push(
      <span key="origin" className={`inline-flex items-center gap-1 rounded-full border border-line bg-surface/60 text-muted font-semibold ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"}`} title={origin.label}>
        <SemanticIcon name={origin.icon} className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
        {origin.shortLabel}
      </span>,
    );
  }

  return <div className={`flex flex-wrap gap-1.5 ${className}`}>{items.slice(0, max)}</div>;
};

