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
        label: "Simulación local",
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
        dotClass: "bg-positive shadow-[0_0_8px_rgba(16,185,129,0.7)]",
        pillClass:
          "bg-positive/10 text-positive dark:text-positive border-positive/30 hover:bg-positive/15",
        icon: <CheckCircle2 className="w-3 h-3 text-positive" />,
      };
    }

    if (backendStatus === "error") {
      return {
        label: "Error Conexión",
        dotClass: "bg-danger shadow-[0_0_8px_rgba(244,63,94,0.7)]",
        pillClass: "bg-danger/10 text-danger dark:text-danger border-danger/30 hover:bg-danger/15",
        icon: <AlertTriangle className="w-3 h-3 text-danger" />,
      };
    }

    return {
      label: "Servidor Desconectado",
      dotClass: "bg-muted",
      pillClass: "bg-muted/10 text-muted border-line/25 hover:bg-muted/15",
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
