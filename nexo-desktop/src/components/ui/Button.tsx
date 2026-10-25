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
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus-ring rounded-xl disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] cursor-pointer";

  const sizeStyles = {
    sm: "h-8 px-3 text-caption gap-1.5",
    md: "h-9 px-4 text-body gap-2",
    lg: "h-11 px-5 text-body gap-2.5 font-semibold",
  };

  const variantStyles = {
    primary:
      "relative bg-gradient-to-b from-concept-fg to-concept-fg/90 text-white font-semibold shadow-[0_4px_16px_-4px_rgba(37,99,235,0.45),inset_0_1px_0_0_rgba(255,255,255,0.35)] hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 border border-white/20",
    secondary:
      "bg-surface/85 dark:bg-white/[0.06] text-fg border border-line hover:border-concept-fg/40 hover:bg-hover backdrop-blur-md shadow-xs hover:shadow-sm",
    ghost:
      "text-muted hover:text-fg hover:bg-hover transition-colors",
    danger:
      "bg-danger-fg/10 text-danger-fg border border-danger-fg/25 hover:bg-danger-fg/20 shadow-xs backdrop-blur-sm",
    glass:
      "glass text-fg hover:border-concept-fg/40 hover:bg-surface/90 shadow-sm",
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
