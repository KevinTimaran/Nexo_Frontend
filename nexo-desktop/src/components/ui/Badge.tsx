import React from "react";
import type { ConceptKind, ConceptStatus } from "../../domain/types";

export interface BadgeProps {
  children: React.ReactNode;
  kind?: ConceptKind | "default";
  status?: ConceptStatus;
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  kind = "default",
  status,
  size = "sm",
  className = "",
}) => {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-caption font-medium rounded-md gap-1",
    md: "px-2.5 py-1 text-caption font-semibold rounded-lg gap-1.5",
  };

  const kindStyles = {
    default: "bg-elevated text-muted border border-line",
    concept: "bg-concept-fg/10 text-concept-fg border border-concept-fg/20",
    viability: "bg-positive-fg/10 text-positive-fg border border-positive-fg/20",
    risk: "bg-risk-fg/10 text-risk-fg border border-risk-fg/20",
  };

  const statusDot = {
    confirmed: "bg-positive-fg",
    exploring: "bg-concept-fg animate-pulse",
    review: "bg-risk-fg",
  };

  return (
    <span
      className={`inline-flex items-center shrink-0 ${sizeStyles[size]} ${kindStyles[kind]} ${className}`}
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
