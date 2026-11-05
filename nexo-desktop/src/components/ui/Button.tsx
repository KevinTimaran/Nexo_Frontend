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
  style,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center transition-all duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] cursor-pointer";

  const sizeStyles = {
    sm: "h-8 px-3 text-caption gap-1.5",
    md: "h-9 px-4 text-body gap-2",
    lg: "h-11 px-5 text-body gap-2.5",
  };

  const variantStyles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost:
      "text-muted hover:text-fg hover:bg-hover transition-colors",
    danger:
      "bg-danger-fg/10 text-danger-fg border border-danger-fg/25 hover:bg-danger-fg/20 shadow-xs backdrop-blur-sm",
    glass:
      "glass text-fg hover:border-concept-fg/40 hover:bg-surface/90 shadow-sm",
  };

  const dynamicStyle: React.CSSProperties = {
    borderRadius: "var(--radius-button, 12px)",
    fontWeight: "var(--font-weight-button, 600)" as unknown as number,
    fontSize: size === "md" ? "var(--button-scale-font-size, 0.8125rem)" : undefined,
    minHeight: size === "md" ? "var(--button-scale-height, 2.25rem)" : undefined,
    ...style,
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      style={dynamicStyle}
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
