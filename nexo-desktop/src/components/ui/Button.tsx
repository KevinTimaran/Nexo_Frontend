import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "glass";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 focus-ring rounded-xl disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]";

  const sizeStyles = {
    sm: "h-8 px-3 text-caption gap-1.5",
    md: "h-9 px-4 text-body gap-2",
    lg: "h-11 px-5 text-body gap-2.5 font-semibold",
  };

  const variantStyles = {
    primary:
      "bg-concept-fg text-white hover:brightness-110 shadow-sm border border-transparent",
    secondary:
      "bg-elevated text-fg border border-line hover:bg-hover hover:border-ring-soft",
    ghost: "text-muted hover:text-fg hover:bg-hover",
    danger: "bg-risk-fg/10 text-risk-fg hover:bg-risk-fg/20 border border-risk-fg/20",
    glass: "glass text-fg hover:bg-surface/80 border border-line shadow-sm",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
