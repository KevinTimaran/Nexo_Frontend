import React, { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useDialogFocus } from "../../hooks/useDialogFocus";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = `modal-title-${id}`;
  const descriptionId = `modal-description-${id}`;
  useDialogFocus(isOpen, dialogRef, { onEscape: onClose, trap: true });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-3xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none overflow-hidden font-sans">
          {/* Frosted Glass Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-app/35 dark:bg-app/65 backdrop-blur-md cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Glassmorphism V2 Floating Glass Sheet */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : "Ventana de diálogo"}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`
              relative z-10 w-full ${widthClasses[maxWidth]}
              glass-modal rounded-3xl overflow-hidden text-fg select-text
            `}
          >
            {/* Specular Top Reflection Hairline */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/20 to-transparent z-20"
            />

            {(title || description) && (
              <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-line/60 dark:border-line/10 bg-surface/30 dark:bg-surface/[0.02]">
                <div className="pr-4">
                  {title && (
                    <h3 id={titleId} className="text-lg font-bold tracking-tight text-fg dark:text-fg leading-snug">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p id={descriptionId} className="text-xs text-muted dark:text-muted mt-1 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  data-dialog-initial-focus
                  className="w-8 h-8 rounded-xl text-muted hover:text-fg dark:hover:text-fg hover:bg-surface/40 dark:hover:bg-surface/10 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
