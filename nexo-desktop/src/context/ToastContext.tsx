import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Notificaciones"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="
              pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl
              glass-card border border-line/80 dark:border-white/10
              shadow-[0_16px_36px_-8px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_48px_-10px_rgba(0,0,0,0.7)]
              text-fg text-body animate-toast-in select-text relative overflow-hidden
            "
          >
            {/* Specular hairline top reflection */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent"
            />

            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === "success" && (
                <div className="w-6 h-6 rounded-lg bg-positive-fg/15 text-positive-fg flex items-center justify-center shrink-0 border border-positive-fg/25">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
              {toast.type === "error" && (
                <div className="w-6 h-6 rounded-lg bg-danger-fg/15 text-danger-fg flex items-center justify-center shrink-0 border border-danger-fg/25">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              )}
              {toast.type === "info" && (
                <div className="w-6 h-6 rounded-lg bg-concept-fg/15 text-concept-fg flex items-center justify-center shrink-0 border border-concept-fg/25">
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="truncate text-body font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="w-7 h-7 rounded-lg text-muted hover:text-fg hover:bg-hover active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
