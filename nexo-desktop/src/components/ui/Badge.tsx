import React from "react";
import {
  Flame,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { ConceptKind, ConceptStatus, NodeCategory, NodePriority } from "../../domain/types";
import { SemanticBadge } from "../semantic/SemanticBadges";
import { resolvePerspectiveVisual } from "../../theme/semanticVisuals";

export interface BadgeProps {
  children?: React.ReactNode;
  kind?: ConceptKind | "default";
  category?: NodeCategory;
  priority?: NodePriority;
  status?: ConceptStatus;
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  kind,
  category,
  priority,
  status,
  size = "sm",
  className = "",
}) => {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-semibold rounded-full gap-1 tracking-tight",
    md: "px-2.5 py-1 text-caption font-semibold rounded-full gap-1.5 tracking-tight",
  };

  // If a priority is passed, render a priority badge
  if (priority) {
    const priorityConfig = {
      high: {
        label: "Prioridad Alta",
        icon: <Flame className="w-3 h-3 text-priority-high shrink-0" />,
        style:
          "bg-priority-high/10 text-priority-high border border-priority-high/25 dark:bg-priority-high/15 backdrop-blur-sm shadow-[0_0_12px_-2px_rgba(220,38,38,0.2)]",
      },
      medium: {
        label: "Prioridad Media",
        icon: <AlertCircle className="w-3 h-3 text-priority-medium shrink-0" />,
        style:
          "bg-priority-medium/10 text-priority-medium border border-priority-medium/25 dark:bg-priority-medium/15 backdrop-blur-sm shadow-[0_0_12px_-2px_rgba(217,119,6,0.18)]",
      },
      low: {
        label: "Prioridad Baja",
        icon: <Clock className="w-3 h-3 text-priority-low shrink-0" />,
        style:
          "bg-priority-low/10 text-priority-low border border-priority-low/25 dark:bg-priority-low/15 backdrop-blur-sm",
      },
    };

    const config = priorityConfig[priority];
    return (
      <span
        className={`inline-flex items-center shrink-0 ${sizeStyles[size]} ${config.style} ${className}`}
      >
        {config.icon}
        <span>{children ?? config.label}</span>
      </span>
    );
  }

  // If a category is passed, render a semantic category badge
  if (category) {
    const visual = resolvePerspectiveVisual({ category });
    return <SemanticBadge token={visual} label={typeof children === "string" ? children : undefined} compact={size === "sm"} className={className} />;
  }

  // Default / Kind-based badge
  const effectiveKind = kind || "default";
  const kindStyles = {
    default: "bg-surface/80 text-muted border border-line backdrop-blur-sm",
    concept: "bg-concept-fg/10 text-concept-fg border border-concept-fg/25 dark:bg-concept-fg/15 backdrop-blur-sm shadow-[0_0_12px_-2px_rgba(37,99,235,0.2)]",
    viability: "bg-positive-fg/10 text-positive-fg border border-positive-fg/25 dark:bg-positive-fg/15 backdrop-blur-sm shadow-[0_0_12px_-2px_rgba(16,185,129,0.2)]",
    risk: "bg-risk-fg/10 text-risk-fg border border-risk-fg/25 dark:bg-risk-fg/15 backdrop-blur-sm shadow-[0_0_12px_-2px_rgba(245,158,11,0.2)]",
  };

  const statusDot = {
    confirmed: "bg-positive-fg",
    exploring: "bg-concept-fg animate-pulse",
    review: "bg-risk-fg",
  };

  return (
    <span
      className={`inline-flex items-center shrink-0 ${sizeStyles[size]} ${kindStyles[effectiveKind]} ${className}`}
    >
      {status && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
