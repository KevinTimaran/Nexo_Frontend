import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-caption font-medium text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3 text-muted pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full h-9 rounded-xl text-fg text-body placeholder:text-muted/60
              bg-surface/85 dark:bg-white/[0.04]
              border border-line dark:border-white/10
              backdrop-blur-md
              shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]
              dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
              focus:outline-none focus:ring-2 focus:ring-concept-fg/25
              transition-all duration-200
              ${icon ? "pl-9" : "px-3"}
              ${
                error
                  ? "border-danger-fg focus:border-danger-fg focus:ring-danger-fg/20"
                  : "focus:border-concept-fg"
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <span className="text-caption text-danger-fg font-medium">{error}</span>}
        {hint && !error && <span className="text-caption text-muted">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
