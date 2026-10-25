import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileEdit,
  Eye,
  Save,
  Layers,
  Shield,
  DollarSign,
  Cpu,
  Vote,
} from "lucide-react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { MarkdownRenderer } from "../../components/ui/MarkdownRenderer";
import { Button } from "../../components/ui/Button";
import type {
  ConceptNode,
  ResearchPhase,
  NodePriority,
  NodeCategory,
} from "../../domain/types";

const PHASES: Array<{
  key: ResearchPhase;
  label: string;
  activeClass: string;
  dotColor: string;
}> = [
  {
    key: "planning",
    label: "Planificación",
    activeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  {
    key: "execution",
    label: "Ejecución",
    activeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30",
    dotColor: "bg-blue-500",
  },
  {
    key: "validation",
    label: "Validación",
    activeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30",
    dotColor: "bg-amber-500",
  },
];

const PRIORITIES: Array<{
  key: NodePriority;
  label: string;
  activeClass: string;
}> = [
  {
    key: "high",
    label: "Alta",
    activeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 ring-1 ring-rose-500/30",
  },
  {
    key: "medium",
    label: "Media",
    activeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30",
  },
  {
    key: "low",
    label: "Baja",
    activeClass: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/40 ring-1 ring-zinc-500/30",
  },
];

const CATEGORIES: Array<{
  key: NodeCategory;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "technical", label: "Técnica", icon: <Cpu className="w-3.5 h-3.5" /> },
  { key: "economic", label: "Económica", icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: "legal", label: "Legal", icon: <Shield className="w-3.5 h-3.5" /> },
  { key: "political", label: "Política/Social", icon: <Vote className="w-3.5 h-3.5" /> },
];

export const DeepDiveModal: React.FC = () => {
  const {
    isDeepDiveModalOpen,
    closeDeepDive,
    selectedNodeId,
    workspace,
    updateNodeContent,
  } = useWorkspaceStore();

  const node: ConceptNode | undefined = workspace?.map.nodes.find(
    (n) => n.id === selectedNodeId
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ResearchPhase>("planning");
  const [priority, setPriority] = useState<NodePriority>("medium");
  const [category, setCategory] = useState<NodeCategory>("technical");
  const [details, setDetails] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaved, setIsSaved] = useState(false);

  // Synchronize internal form state when opened or node changes
  useEffect(() => {
    if (node) {
      setTitle(node.title || "");
      setDescription(node.description || "");
      setPhase(node.phase || "planning");
      setPriority(node.priority || "medium");
      setCategory(node.category || "technical");
      setDetails(node.details || "");
      setActiveTab("edit");
      setIsSaved(false);
    }
  }, [node]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDeepDiveModalOpen) {
        closeDeepDive();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeepDiveModalOpen, closeDeepDive]);

  if (!isDeepDiveModalOpen || !node) return null;

  const handleSaveAndClose = () => {
    updateNodeContent(node.id, {
      title: title.trim() || node.title,
      description: description.trim(),
      phase,
      priority,
      category,
      details,
    });
    setIsSaved(true);
    setTimeout(() => {
      closeDeepDive();
    }, 150);
  };

  const currentPhaseConfig =
    PHASES.find((p) => p.key === phase) || PHASES[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none">
        {/* Backdrop con desenfoque de cristal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-md cursor-pointer"
          onClick={closeDeepDive}
          aria-hidden="true"
        />

        {/* Carta Flotante Superpuesta estilo Notion (Creative Glass) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="
            relative w-full max-w-3xl max-h-[90vh]
            rounded-[32px] overflow-hidden
            border border-line/80 dark:border-white/12
            bg-surface/92 dark:bg-zinc-950/92
            backdrop-blur-3xl backdrop-saturate-[180%]
            shadow-[0_32px_80px_-16px_rgba(15,23,42,0.22),inset_0_1px_0_0_rgba(255,255,255,0.9)]
            dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]
            flex flex-col z-10 text-fg select-text
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="deep-dive-title"
        >
          {/* Barra superior de color de fase */}
          <div className={`h-2 w-full ${currentPhaseConfig.dotColor} transition-colors duration-300`} />

          {/* Specular hairline top reflection */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-2 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-20"
          />

          {/* Modal Header */}
          <div className="px-6 pt-5 pb-4 border-b border-line/60 dark:border-white/10 bg-surface/40 dark:bg-white/[0.02] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-caption font-mono text-muted tracking-wider uppercase">
                  Notion Deep-Dive • ID: {node.id}
                </span>
              </div>
              <button
                type="button"
                onClick={closeDeepDive}
                className="w-8 h-8 rounded-xl text-muted hover:text-fg hover:bg-hover active:scale-95 transition-all flex items-center justify-center cursor-pointer focus-ring"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Encabezado grande para el Título del Concepto (Editable) */}
            <div>
              <input
                id="deep-dive-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del concepto..."
                className="w-full text-2xl sm:text-3xl font-extrabold tracking-tight bg-transparent text-fg placeholder:text-muted/40 focus:outline-none border-b border-transparent hover:border-line-soft focus:border-concept-fg transition-colors pb-1"
              />
            </div>

            {/* Badges/Selectores para cambiar Fase, Prioridad y Categoría */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-caption">
              {/* Selector de Fase */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted font-medium">Fase:</span>
                <div className="flex items-center gap-1 glass-pill p-1 rounded-xl">
                  {PHASES.map((p) => {
                    const active = phase === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPhase(p.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? p.activeClass
                            : "text-muted hover:text-fg hover:bg-hover"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.dotColor}`} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Prioridad */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted font-medium">Prioridad:</span>
                <div className="flex items-center gap-1 glass-pill p-1 rounded-xl">
                  {PRIORITIES.map((pr) => {
                    const active = priority === pr.key;
                    return (
                      <button
                        key={pr.key}
                        type="button"
                        onClick={() => setPriority(pr.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          active
                            ? pr.activeClass
                            : "text-muted hover:text-fg hover:bg-hover"
                        }`}
                      >
                        {pr.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Categoría */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted font-medium">Categoría:</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NodeCategory)}
                  className="px-2.5 py-1 rounded-xl glass-pill text-[11px] font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-concept-fg/25 focus:border-concept-fg cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key} className="bg-surface text-fg">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Área Principal Expansiva (Página estilo Notion) */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {/* Descripción Breve / Resumen */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Resumen Ejecutivo
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve resumen de 1-2 oraciones del concepto..."
                className="
                  w-full text-caption px-3.5 py-2.5 rounded-xl text-fg
                  bg-surface/85 dark:bg-white/[0.04]
                  border border-line/80 dark:border-white/10
                  backdrop-blur-md
                  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]
                  dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
                  focus:outline-none focus:ring-2 focus:ring-concept-fg/25 focus:border-concept-fg
                  transition-colors
                "
              />
            </div>

            {/* Documentación Profunda (Editor / Preview Tabs) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-concept-fg" />
                  Documentación y Especificación Detallada (Notion Style)
                </label>

                {/* Tabs Switcher */}
                <div className="flex items-center p-0.5 rounded-xl glass-pill text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "edit"
                        ? "bg-surface/95 dark:bg-white/[0.1] text-fg shadow-2xs border border-line-soft dark:border-white/10"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    <FileEdit className="w-3 h-3" />
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "preview"
                        ? "bg-surface/95 dark:bg-white/[0.1] text-fg shadow-2xs border border-line-soft dark:border-white/10"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Vista Previa
                  </button>
                </div>
              </div>

              {activeTab === "edit" ? (
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Redacta la especificación completa de este bloque aquí...&#10;&#10;Puedes usar Markdown:&#10;### Hipótesis Central&#10;- Punto 1...&#10;&#10;### Métricas Clave&#10;- Adopción esperada: 80%&#10;&#10;### Próximos Pasos&#10;1. Validar prototipo..."
                  rows={14}
                  className="
                    w-full p-4 font-mono text-[13px] rounded-2xl
                    bg-surface/85 dark:bg-white/[0.04]
                    border border-line/80 dark:border-white/10
                    backdrop-blur-md
                    shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]
                    dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
                    focus:outline-none focus:ring-2 focus:ring-concept-fg/25 focus:border-concept-fg
                    text-fg placeholder:text-muted/40 leading-relaxed resize-y min-h-[260px]
                  "
                />
              ) : (
                <div className="w-full min-h-[260px] max-h-[420px] overflow-y-auto p-5 bg-surface/70 dark:bg-white/[0.03] rounded-2xl border border-line/80 dark:border-white/10 backdrop-blur-md">
                  <MarkdownRenderer
                    content={
                      details.trim().length > 0
                        ? details
                        : "*No hay contenido documentado todavía. Haz clic en 'Editor' para comenzar a redactar.*"
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer con Botones de Acción */}
          <div className="px-6 py-4 border-t border-line/60 dark:border-white/10 bg-surface/50 dark:bg-white/[0.02] backdrop-blur-md flex items-center justify-between">
            <span className="text-[11px] text-muted">
              Presiona <kbd className="px-1.5 py-0.5 rounded bg-surface/90 dark:bg-white/[0.06] border border-line-soft dark:border-white/10 font-mono shadow-2xs">ESC</kbd> para salir sin guardar
            </span>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDeepDive}
              >
                Cancelar
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAndClose}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                {isSaved ? "¡Guardado!" : "Guardar y Cerrar"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
