import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-3xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none overflow-hidden">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-md animate-fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Creative Glass Modal Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
        className={`
          relative z-10 w-full ${widthClasses[maxWidth]}
          rounded-[28px] overflow-hidden
          border border-line/80 dark:border-white/12
          bg-surface/92 dark:bg-zinc-950/92
          backdrop-blur-3xl backdrop-saturate-[180%]
          shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)]
          dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)]
          animate-sheet-in select-text
        `}
      >
        {/* Specular Top Reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-20"
        />

        {(title || description) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-line/60 dark:border-white/10 bg-surface/40 dark:bg-white/[0.02]">
            <div className="pr-4">
              {title && (
                <h3 id="modal-title" className="text-lg font-bold tracking-tight text-fg leading-snug">
                  {title}
                </h3>
              )}
              {description && (
                <p id="modal-description" className="text-caption text-muted mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-muted hover:text-fg hover:bg-hover active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer focus-ring"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
