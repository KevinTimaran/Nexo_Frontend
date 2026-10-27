import React, { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, rightElement, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3 text-slate-400 dark:text-zinc-500 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full h-10 rounded-xl text-slate-800 dark:text-zinc-100 text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500
              bg-slate-100/50 dark:bg-black/40
              border border-slate-200 dark:border-white/5
              shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
              transition-all duration-200
              ${icon ? "pl-9" : "px-3.5"}
              ${rightElement ? "pr-10" : "pr-3.5"}
              ${
                error
                  ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20"
                  : "focus:border-blue-500 dark:focus:border-blue-400"
              }
              ${className}
            `}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              role="alert"
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-xs sm:text-sm text-red-500 dark:text-rose-400 font-medium mt-1 flex items-center gap-1.5 overflow-hidden"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{error}</span>
            </motion.p>
          )}
        </AnimatePresence>
        {hint && !error && <span className="text-xs text-slate-500 dark:text-zinc-400">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

