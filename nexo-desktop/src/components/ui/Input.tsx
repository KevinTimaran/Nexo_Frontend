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
            className={`w-full h-9 bg-elevated border rounded-xl text-fg text-body placeholder:text-muted focus-ring transition-colors ${
              icon ? "pl-9" : "px-3"
            } ${
              error
                ? "border-risk-fg focus:border-risk-fg"
                : "border-line focus:border-concept-fg"
            } ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-caption text-risk-fg">{error}</span>}
        {hint && !error && <span className="text-caption text-muted">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
