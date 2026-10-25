import React from "react";
import { Radio, AlertTriangle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { useConnectivityStore } from "../../store/useConnectivityStore";
import { ConnectionManager } from "./ConnectionManager";

export const ConnectivityStatus: React.FC = () => {
  const { mode, backendStatus, isChecking, isManagerOpen, setManagerOpen, toggleManager } =
    useConnectivityStore();

  const getStatusDisplay = () => {
    if (mode === "mock") {
      return {
        label: "Mock Mode",
        dotClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
        pillClass:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15",
        icon: <Radio className="w-3 h-3 text-amber-500" />,
      };
    }

    if (isChecking || backendStatus === "checking") {
      return {
        label: "Comprobando...",
        dotClass: "bg-concept-fg animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]",
        pillClass:
          "bg-concept-fg/10 text-concept-fg border-concept-fg/30 hover:bg-concept-fg/15",
        icon: <Loader2 className="w-3 h-3 text-concept-fg animate-spin" />,
      };
    }

    if (backendStatus === "connected") {
      return {
        label: "Servidor Conectado",
        dotClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]",
        pillClass:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15",
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
      };
    }

    if (backendStatus === "error") {
      return {
        label: "Error Conexión",
        dotClass: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
        pillClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/15",
        icon: <AlertTriangle className="w-3 h-3 text-rose-500" />,
      };
    }

    return {
      label: "Servidor Desconectado",
      dotClass: "bg-zinc-400",
      pillClass: "bg-zinc-500/10 text-muted border-zinc-500/25 hover:bg-zinc-500/15",
      icon: <ShieldAlert className="w-3 h-3 text-muted" />,
    };
  };

  const current = getStatusDisplay();

  return (
    <>
      <button
        type="button"
        onClick={toggleManager}
        className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs focus-ring cursor-pointer active:scale-95 backdrop-blur-md ${current.pillClass}`}
        title="Ver estado de conexión de servicios (Backend, IA, Neo4j)"
        aria-label={`Estado del servicio: ${current.label}. Clic para abrir el panel de conexión.`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotClass}`} />
        <span className="hidden md:inline font-mono">{current.label}</span>
      </button>

      <ConnectionManager isOpen={isManagerOpen} onClose={() => setManagerOpen(false)} />
    </>
  );
};
