import React, { useState, useEffect, useRef } from "react";
import {
  Server,
  Sparkles,
  Database,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  Radio,
} from "lucide-react";
import { useConnectivityStore } from "../../store/useConnectivityStore";
import type { BackendStatus, AIServiceStatus, Neo4jStatus } from "../../domain/types";
import { Button } from "../ui/Button";

interface ConnectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    mode,
    setMode,
    apiUrl,
    setApiUrl,
    backendStatus,
    backendLatencyMs,
    backendLastChecked,
    backendError,
    aiStatus,
    aiProvider,
    aiLastActivity,
    neo4jStatus,
    neo4jLastSync,
    isChecking,
    testConnection,
  } = useConnectivityStore();

  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [isUrlEditing, setIsUrlEditing] = useState(false);

  useEffect(() => {
    setInputUrl(apiUrl);
  }, [apiUrl]);

  // Handle ESC key to dismiss panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiUrl(inputUrl.trim());
    setIsUrlEditing(false);
    void testConnection();
  };

  const handleQuickSetUrl = (url: string) => {
    setInputUrl(url);
    setApiUrl(url);
    setIsUrlEditing(false);
    void testConnection();
  };

  const getBackendBadge = (status: BackendStatus) => {
    switch (status) {
      case "connected":
        return {
          label: "Conectado",
          style: "bg-positive-fg/15 text-positive-fg border-positive-fg/30",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "checking":
        return {
          label: "Comprobando...",
          style: "bg-concept-fg/15 text-concept-fg border-concept-fg/30",
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        };
      case "error":
        return {
          label: "Error HTTP",
          style: "bg-risk-fg/15 text-risk-fg border-risk-fg/30",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      case "disconnected":
        return {
          label: "Desconectado",
          style: "bg-zinc-500/15 text-muted border-zinc-500/30",
          icon: <ShieldAlert className="w-3.5 h-3.5" />,
        };
      case "mock":
      default:
        return {
          label: "Modo Simulación (Mock)",
          style: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: <Radio className="w-3.5 h-3.5" />,
        };
    }
  };

  const getAIBadge = (status: AIServiceStatus) => {
    switch (status) {
      case "ready":
        return {
          label: "Listo para consultas",
          style: "bg-positive-fg/15 text-positive-fg border-positive-fg/30",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "processing":
        return {
          label: "Procesando respuesta...",
          style: "bg-concept-fg/15 text-concept-fg border-concept-fg/30",
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        };
      case "waiting":
        return {
          label: "Esperando prompt",
          style: "bg-concept-fg/10 text-concept-fg border-concept-fg/20",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case "unavailable":
        return {
          label: "No disponible",
          style: "bg-risk-fg/15 text-risk-fg border-risk-fg/30",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      case "error":
        return {
          label: "Fallo de inferencia",
          style: "bg-risk-fg/15 text-risk-fg border-risk-fg/30",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      case "simulated":
      default:
        return {
          label: "Adaptador Local de Desarrollo",
          style: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          icon: <Sparkles className="w-3.5 h-3.5" />,
        };
    }
  };

  const getNeo4jBadge = (status: Neo4jStatus) => {
    switch (status) {
      case "connected":
      case "synchronized":
        return {
          label: "Sincronizado",
          style: "bg-positive-fg/15 text-positive-fg border-positive-fg/30",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "synchronizing":
        return {
          label: "Sincronizando...",
          style: "bg-concept-fg/15 text-concept-fg border-concept-fg/30",
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        };
      case "disconnected":
        return {
          label: "Desconectado",
          style: "bg-zinc-500/15 text-muted border-zinc-500/30",
          icon: <ShieldAlert className="w-3.5 h-3.5" />,
        };
      case "error":
        return {
          label: "Error en base de datos",
          style: "bg-risk-fg/15 text-risk-fg border-risk-fg/30",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      case "unknown":
      default:
        return {
          label: "No configurado en backend",
          style: "bg-zinc-500/10 text-muted border-zinc-500/20",
          icon: <Database className="w-3.5 h-3.5" />,
        };
    }
  };

  const backendBadge = getBackendBadge(backendStatus);
  const aiBadge = getAIBadge(aiStatus);
  const neo4jBadge = getNeo4jBadge(neo4jStatus);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connection-manager-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-black/40 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-[32px] glass-modal border border-line/80 dark:border-white/12 shadow-[0_32px_80px_-16px_rgba(15,23,42,0.22)] dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.85)] overflow-hidden animate-sheet-in text-fg select-none specular-sheen"
      >
        {/* Header */}
        <div className="p-5 border-b border-line/60 dark:border-white/10 flex items-center justify-between bg-surface/50 dark:bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-concept-fg/10 text-concept-fg flex items-center justify-center border border-concept-fg/20 shadow-xs">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 id="connection-manager-title" className="text-body font-bold text-fg leading-snug">
                Panel de Conectividad y Servicios
              </h2>
              <p className="text-[11px] text-muted leading-tight">
                Supervisión del backend Spring Boot, motor de IA y sincronización Neo4j
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-muted hover:text-fg hover:bg-hover flex items-center justify-center transition-colors focus-ring cursor-pointer"
            aria-label="Cerrar panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mode Switcher Banner */}
          <div className="p-4 rounded-2xl glass-card border border-line/80 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-caption font-bold text-fg uppercase tracking-wider">
                  Modo de Operación
                </span>
                <p className="text-[11px] text-muted mt-0.5">
                  Alterna verídicamente el adaptador del cliente API
                </p>
              </div>

              {/* Segmented Toggle Control */}
              <div
                role="radiogroup"
                aria-label="Modo de servicio"
                className="inline-flex p-1 rounded-xl glass-pill shadow-2xs backdrop-blur-md"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "mock"}
                  onClick={() => void setMode("mock")}
                  className={`px-3 py-1 rounded-lg text-caption font-semibold transition-all cursor-pointer ${
                    mode === "mock"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Mock Mode
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "server"}
                  onClick={() => void setMode("server")}
                  className={`px-3 py-1 rounded-lg text-caption font-semibold transition-all cursor-pointer ${
                    mode === "server"
                      ? "bg-concept-fg text-white shadow-xs"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Server Mode
                </button>
              </div>
            </div>

            {/* Configured API URL (editable in Server Mode) */}
            <div className="pt-2 border-t border-line/60 dark:border-white/10 text-[12px] flex items-center justify-between gap-2">
              <span className="text-muted font-medium shrink-0">URL del Backend:</span>
              {isUrlEditing ? (
                <form onSubmit={handleSaveUrl} className="flex items-center gap-1.5 flex-1">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-surface/85 dark:bg-white/[0.06] border border-line dark:border-white/10 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-concept-fg/25 focus:border-concept-fg text-fg"
                    placeholder="http://localhost:8080/api/v1"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-concept-fg text-white text-xs font-semibold rounded-lg hover:brightness-110 cursor-pointer shadow-xs"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputUrl(apiUrl);
                      setIsUrlEditing(false);
                    }}
                    className="px-2.5 py-1 text-muted hover:text-fg text-xs font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-fg bg-surface/80 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-lg border border-line-soft dark:border-white/10 truncate text-xs">
                    {apiUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsUrlEditing(true)}
                    className="text-concept-fg text-[11px] font-semibold hover:underline shrink-0 cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>

            {/* Quick Port Helpers */}
            <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
              <span className="text-muted text-[10px]">Puertos:</span>
              <button
                type="button"
                onClick={() => handleQuickSetUrl("http://localhost:8080/api/v1")}
                className={`px-2 py-0.5 rounded-lg border font-mono text-[10px] transition-all cursor-pointer ${
                  apiUrl.includes(":8080")
                    ? "bg-concept-fg/15 text-concept-fg border-concept-fg/30 font-bold"
                    : "bg-surface/80 dark:bg-white/[0.06] hover:bg-hover border-line-soft dark:border-white/10 text-muted hover:text-fg"
                }`}
              >
                :8080 (Spring Boot)
              </button>
              <button
                type="button"
                onClick={() => handleQuickSetUrl("http://localhost:8000/api/v1")}
                className={`px-2 py-0.5 rounded-lg border font-mono text-[10px] transition-all cursor-pointer ${
                  apiUrl.includes(":8000")
                    ? "bg-concept-fg/15 text-concept-fg border-concept-fg/30 font-bold"
                    : "bg-surface/80 dark:bg-white/[0.06] hover:bg-hover border-line-soft dark:border-white/10 text-muted hover:text-fg"
                }`}
              >
                :8000
              </button>
            </div>
          </div>

          {/* 3 Services Cards */}
          <div className="space-y-3">
            {/* Service 1: Backend Java / Spring Boot */}
            <div className="p-4 rounded-2xl glass-card border border-line/80 dark:border-white/10 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center">
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-body font-bold text-fg">Backend (Spring Boot)</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md ${backendBadge.style}`}
                >
                  {backendBadge.icon}
                  <span>{backendBadge.label}</span>
                </span>
              </div>

              <div className="text-[11px] text-muted space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span>Modo activo:</span>
                  <span className="font-semibold text-fg">
                    {mode === "mock" ? "Simulador local estricto" : "HTTP Server Adapter"}
                  </span>
                </div>
                {backendLatencyMs !== null && (
                  <div className="flex items-center justify-between">
                    <span>Latencia medida:</span>
                    <span className="font-mono text-fg">{backendLatencyMs} ms</span>
                  </div>
                )}
                {backendLastChecked && (
                  <div className="flex items-center justify-between">
                    <span>Última comprobación:</span>
                    <span className="font-mono text-fg">
                      {new Date(backendLastChecked).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {backendError && (
                <div className="p-2.5 rounded-xl bg-risk-fg/10 border border-risk-fg/20 text-caption text-risk-fg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug text-xs">{backendError}</span>
                </div>
              )}
            </div>

            {/* Service 2: AI Service */}
            <div className="p-4 rounded-2xl glass-card border border-line/80 dark:border-white/10 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-body font-bold text-fg">Servicio de Inteligencia Artificial</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md ${aiBadge.style}`}
                >
                  {aiBadge.icon}
                  <span>{aiBadge.label}</span>
                </span>
              </div>

              <div className="text-[11px] text-muted space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span>Proveedor:</span>
                  <span className="font-semibold text-fg">{aiProvider}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Capacidad tutor:</span>
                  <span className="text-positive-fg font-medium">Habilitada («Modo Tutor»)</span>
                </div>
                {aiLastActivity && (
                  <div className="flex items-center justify-between">
                    <span>Última actividad:</span>
                    <span className="font-mono text-fg">{aiLastActivity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service 3: Neo4j Synchronization */}
            <div className="p-4 rounded-2xl glass-card border border-line/80 dark:border-white/10 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-concept-fg/10 text-concept-fg flex items-center justify-center">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-body font-bold text-fg">Sincronización Neo4j</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md ${neo4jBadge.style}`}
                >
                  {neo4jBadge.icon}
                  <span>{neo4jBadge.label}</span>
                </span>
              </div>

              <div className="text-[11px] text-muted space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span>Arquitectura de acceso:</span>
                  <span className="font-semibold text-fg">A través de backend Spring Boot</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estado reportado:</span>
                  <span className="text-muted font-mono text-[11px]">
                    {neo4jStatus === "connected"
                      ? "Activo en servidor"
                      : "No disponible (sin health check activo en backend)"}
                  </span>
                </div>
                {neo4jLastSync && (
                  <div className="flex items-center justify-between">
                    <span>Último sync:</span>
                    <span className="font-mono text-fg">{neo4jLastSync}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 border-t border-line/60 dark:border-white/10 flex items-center justify-between bg-surface/50 dark:bg-white/[0.02] backdrop-blur-md">
          <div className="text-[11px] text-muted">
            {mode === "mock"
              ? "Datos aislados en memoria/localStorage"
              : "Conectando con API remota"}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void testConnection()}
              loading={isChecking}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Comprobar ahora
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
