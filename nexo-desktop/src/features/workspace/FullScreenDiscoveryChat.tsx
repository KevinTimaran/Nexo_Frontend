import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Bot,
  Send,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  X,
  Check,
  ZapOff,
  WifiOff,
  KeyRound,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  GitCompareArrows,
  Lightbulb,
  Pencil,
  Trash2,
  Network,
  Trophy,
} from "lucide-react";
import type { ActionableIdea, GenerativeUIBlock } from "../../domain/types";

export type QuestionnaireSelectionType = "single" | "multiple";
export type StrategicDimension = "economic" | "social" | "technical" | "legal";

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  options: string[];
  type?: QuestionnaireSelectionType;
  allowCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "assistant";
  content: string;
  type: "text" | "questionnaire" | "ready" | "dimensions";
  options?: string[];
  questions?: QuestionnaireQuestion[];
  dimensions?: StrategicDimension[];
  ui?: GenerativeUIBlock;
  questionnaireId?: string;
}

export interface FullScreenDiscoveryChatProps {
  messages?: ChatMessage[];
  initialMessages?: ChatMessage[];
  initialSelectedOptions?: Record<string, string | string[]>;
  onSendMessage?: (content: string, questionnaireId?: string, answers?: Record<string, string | string[]>) => void;
  onSelectOption?: (messageId: string, option: string | string[]) => void;
  onSelectedOptionsChange?: (selected: Record<string, string | string[]>) => void;
  onGenerateArchitecture?: (selectedDimensions?: StrategicDimension[]) => void;
  generationStatus?: "discovering" | "ready" | "generating" | "generated" | "generation_error" | "legacy_unknown";
  onNavigateToMode?: (mode: "notion" | "spatial", dimension?: StrategicDimension) => void;
  isThinking?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onGenerativeUIChange?: (messageId: string, ui: GenerativeUIBlock) => void;
  onAddIdeaToBoard?: (messageId: string, idea: ActionableIdea) => void;
}

export const STRATEGIC_DIMENSIONS: Array<{
  id: StrategicDimension;
  label: string;
  icon: string;
  desc: string;
}> = [
  { id: "economic", label: "Económico", icon: "💼", desc: "Monetización, viabilidad y estructura de costos" },
  { id: "social", label: "Social / Humano", icon: "👥", desc: "Impacto social, usuarios y comunidad" },
  { id: "technical", label: "Técnico", icon: "⚙️", desc: "Arquitectura, infraestructura y desarrollo" },
  { id: "legal", label: "Legal", icon: "⚖️", desc: "Normativa, licencias y marco regulatorio" },
];

export const MAX_AI_PROMPT_CHARS = 20000;
export const AI_PROMPT_WARNING_THRESHOLD = 18000;
export const IMAGE_REJECTION_MESSAGE = "Nexo solo procesa texto; no se admiten imágenes";

export const countCodePoints = (str: string): number => Array.from(str || "").length;

export const containsImageData = (text: string): boolean => {
  if (!text) return false;
  return (
    text.includes("data:image/") ||
    /(?:data:image\/[a-zA-Z0-9+.-]+;base64,|\[image:|<img\s+[^>]*src=)/i.test(text) ||
    /(?:iVBORw0KGgo|\/9j\/4|R0lGODlh|R0lGODdh|UklGR)[A-Za-z0-9+/=]{40,}/m.test(text)
  );
};

export const INITIAL_DISCOVERY_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    type: "text",
    content: "¡Hola! Cuéntame, ¿qué tipo de proyecto o aplicación tienes en mente?",
  },
];

interface GenerativeChatBlockProps {
  block: GenerativeUIBlock;
  disabled?: boolean;
  onChange: (block: GenerativeUIBlock) => void;
  onAddIdeaToBoard?: (idea: ActionableIdea) => void;
}

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const GenerativeChatBlock: React.FC<GenerativeChatBlockProps> = ({
  block,
  disabled = false,
  onChange,
  onAddIdeaToBoard,
}) => {
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);

  if (block.type === "timeline") {
    const updateItem = (itemId: string, patch: Partial<(typeof block.items)[number]>) => {
      onChange({
        ...block,
        items: block.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      });
    };

    const moveItem = (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= block.items.length) return;
      const items = [...block.items];
      [items[index], items[target]] = [items[target], items[index]];
      onChange({ ...block, items });
    };

    return (
      <section className="mt-4 rounded-2xl border border-line bg-surface/60 overflow-hidden" aria-label={block.title}>
        <div className="p-4 border-b border-line bg-surface-elevated/40 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-fg">{block.title}</h3>
            {block.description && <p className="text-xs text-muted mt-1 leading-relaxed">{block.description}</p>}
          </div>
        </div>
        <div className="p-4 space-y-3">
          {block.items.map((item, index) => (
            <article key={item.id} className="rounded-xl border border-line bg-surface p-3.5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-[var(--on-primary)] flex items-center justify-center text-[11px] font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-fg">{item.title}</h4>
                      {item.description && <p className="text-[11px] text-muted mt-1 leading-relaxed">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" disabled={disabled || index === 0} onClick={() => moveItem(index, -1)} className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-muted hover:text-fg disabled:opacity-30" aria-label={`Subir ${item.title}`}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" disabled={disabled || index === block.items.length - 1} onClick={() => moveItem(index, 1)} className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-muted hover:text-fg disabled:opacity-30" aria-label={`Bajar ${item.title}`}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mt-3">
                    <label className="text-[10px] font-semibold text-muted">
                      Inicio
                      <input type="date" disabled={disabled} value={item.startDate} onChange={(event) => updateItem(item.id, { startDate: event.target.value })} className="mt-1 w-full rounded-lg border border-line bg-app px-2 py-1.5 text-[11px] text-fg outline-none focus:border-primary" />
                    </label>
                    <label className="text-[10px] font-semibold text-muted">
                      Fin
                      <input type="date" disabled={disabled} value={item.endDate} onChange={(event) => updateItem(item.id, { endDate: event.target.value })} className="mt-1 w-full rounded-lg border border-line bg-app px-2 py-1.5 text-[11px] text-fg outline-none focus:border-primary" />
                    </label>
                    <label className="text-[10px] font-semibold text-muted">
                      Estado
                      <select disabled={disabled} value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value as typeof item.status })} className="mt-1 w-full rounded-lg border border-line bg-app px-2 py-1.5 text-[11px] text-fg outline-none focus:border-primary">
                        <option value="planned">Planeado</option>
                        <option value="in_progress">En curso</option>
                        <option value="done">Completado</option>
                      </select>
                    </label>
                  </div>
                  {item.dependencies.length > 0 && (
                    <p className="text-[10px] text-muted mt-2">
                      Depende de: {item.dependencies.map((dependency) => block.items.find((candidate) => candidate.id === dependency)?.title || dependency).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "decision_comparator") {
    const totalWeight = block.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) || 1;
    const scoredOptions = block.options
      .map((option) => ({
        ...option,
        result: block.criteria.reduce(
          (sum, criterion) => sum + (option.scores[criterion.id] ?? 0) * criterion.weight,
          0
        ) / totalWeight,
      }))
      .sort((a, b) => b.result - a.result);
    const recommendedId = scoredOptions[0]?.id;

    return (
      <section className="mt-4 rounded-2xl border border-line bg-surface/60 overflow-hidden" aria-label={block.title}>
        <div className="p-4 border-b border-line bg-surface-elevated/40 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <GitCompareArrows className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-fg">{block.title}</h3>
            {block.description && <p className="text-xs text-muted mt-1 leading-relaxed">{block.description}</p>}
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {block.criteria.map((criterion) => (
              <label key={criterion.id} className="rounded-xl border border-line bg-surface p-3">
                <span className="flex items-center justify-between text-[11px] font-semibold text-fg">
                  <span>{criterion.label}</span>
                  <span className="text-primary">{criterion.weight}/10</span>
                </span>
                <input type="range" min="1" max="10" step="1" disabled={disabled} value={criterion.weight} onChange={(event) => onChange({ ...block, criteria: block.criteria.map((item) => item.id === criterion.id ? { ...item, weight: Number(event.target.value) } : item) })} className="w-full mt-2 accent-[var(--primary)]" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scoredOptions.map((option) => {
              const isSelected = block.selectedOptionId === option.id;
              const isRecommended = recommendedId === option.id;
              return (
                <article key={option.id} className={`rounded-xl border p-3.5 flex flex-col ${isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-line bg-surface"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-fg">{option.title}</h4>
                    {isRecommended && <span className="text-[9px] uppercase tracking-wider font-bold text-primary flex items-center gap-1"><Trophy className="w-3 h-3" /> Recomendada</span>}
                  </div>
                  {option.description && <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{option.description}</p>}
                  <div className="mt-3 space-y-1.5 flex-1">
                    {block.criteria.map((criterion) => (
                      <div key={criterion.id} className="text-[10px] text-muted">
                        <div className="flex justify-between gap-2"><span>{criterion.label}</span><span>{option.scores[criterion.id] ?? 0}/10</span></div>
                        <div className="h-1 rounded-full bg-surface-elevated mt-1 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(option.scores[criterion.id] ?? 0) * 10}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-2">
                    <span className="text-lg font-bold text-fg">{option.result.toFixed(1)}</span>
                    <button type="button" disabled={disabled} onClick={() => onChange({ ...block, selectedOptionId: option.id })} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${isSelected ? "bg-primary text-[var(--on-primary)]" : "border border-line text-fg hover:bg-[var(--hover)]"}`}>
                      {isSelected ? "Elegida" : "Elegir"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const updateIdea = (ideaId: string, patch: Partial<ActionableIdea>) => {
    onChange({
      ...block,
      items: block.items.map((idea) => (idea.id === ideaId ? { ...idea, ...patch } : idea)),
    });
  };

  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface/60 overflow-hidden" aria-label={block.title}>
      <div className="p-4 border-b border-line bg-surface-elevated/40 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-fg">{block.title}</h3>
          {block.description && <p className="text-xs text-muted mt-1 leading-relaxed">{block.description}</p>}
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {block.items.map((idea) => {
          const isEditing = editingIdeaId === idea.id;
          const isInactive = idea.status === "discarded";
          return (
            <article key={idea.id} className={`rounded-xl border border-line bg-surface p-4 flex flex-col ${isInactive ? "opacity-55" : ""}`}>
              {isEditing ? (
                <div className="space-y-2.5">
                  <input value={idea.title} maxLength={80} onChange={(event) => updateIdea(idea.id, { title: event.target.value })} className="w-full rounded-lg border border-line bg-app px-3 py-2 text-xs font-bold text-fg outline-none focus:border-primary" />
                  <textarea value={idea.description} maxLength={500} rows={3} onChange={(event) => updateIdea(idea.id, { description: event.target.value })} className="w-full rounded-lg border border-line bg-app px-3 py-2 text-[11px] text-fg outline-none resize-none focus:border-primary" />
                  <input value={idea.benefits.join(", ")} onChange={(event) => updateIdea(idea.id, { benefits: splitList(event.target.value) })} placeholder="Beneficios separados por comas" className="w-full rounded-lg border border-line bg-app px-3 py-2 text-[11px] text-fg outline-none focus:border-primary" />
                  <input value={idea.resources.join(", ")} onChange={(event) => updateIdea(idea.id, { resources: splitList(event.target.value) })} placeholder="Recursos separados por comas" className="w-full rounded-lg border border-line bg-app px-3 py-2 text-[11px] text-fg outline-none focus:border-primary" />
                  <input value={idea.relations.join(", ")} onChange={(event) => updateIdea(idea.id, { relations: splitList(event.target.value) })} placeholder="Relaciones separadas por comas" className="w-full rounded-lg border border-line bg-app px-3 py-2 text-[11px] text-fg outline-none focus:border-primary" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-fg">{idea.title}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted">{idea.status === "mapped" ? "En tablero" : idea.status === "approved" ? "Aprobada" : idea.status === "discarded" ? "Descartada" : "Propuesta"}</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{idea.description}</p>
                  {idea.benefits.length > 0 && <div className="mt-3"><p className="text-[10px] font-bold text-fg">Beneficios</p><div className="flex flex-wrap gap-1 mt-1">{idea.benefits.map((benefit) => <span key={benefit} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">{benefit}</span>)}</div></div>}
                  {idea.resources.length > 0 && <p className="text-[10px] text-muted mt-2"><span className="font-bold text-fg">Recursos:</span> {idea.resources.join(", ")}</p>}
                  {idea.relations.length > 0 && <p className="text-[10px] text-muted mt-1 flex items-start gap-1"><Network className="w-3 h-3 mt-0.5 shrink-0" /><span>{idea.relations.join(" · ")}</span></p>}
                </>
              )}
              <div className="mt-4 pt-3 border-t border-line flex flex-wrap gap-1.5">
                <button type="button" disabled={disabled || idea.status === "mapped"} onClick={() => isEditing ? setEditingIdeaId(null) : setEditingIdeaId(idea.id)} className="px-2.5 py-1.5 rounded-lg border border-line text-[10px] font-semibold text-fg hover:bg-[var(--hover)] flex items-center gap-1 disabled:opacity-40"><Pencil className="w-3 h-3" />{isEditing ? "Guardar" : "Editar"}</button>
                <button type="button" disabled={disabled || idea.status === "mapped"} onClick={() => updateIdea(idea.id, { status: idea.status === "approved" ? "pending" : "approved" })} className="px-2.5 py-1.5 rounded-lg border border-line text-[10px] font-semibold text-fg hover:bg-[var(--hover)] flex items-center gap-1 disabled:opacity-40"><Check className="w-3 h-3" />{idea.status === "approved" ? "Aprobada" : "Aprobar"}</button>
                <button type="button" disabled={disabled || idea.status === "mapped"} onClick={() => updateIdea(idea.id, { status: idea.status === "discarded" ? "pending" : "discarded" })} className="px-2.5 py-1.5 rounded-lg border border-line text-[10px] font-semibold text-muted hover:text-fg hover:bg-[var(--hover)] flex items-center gap-1 disabled:opacity-40"><Trash2 className="w-3 h-3" />{idea.status === "discarded" ? "Restaurar" : "Descartar"}</button>
                <button type="button" disabled={disabled || idea.status === "mapped" || idea.status === "discarded"} onClick={() => { onAddIdeaToBoard?.(idea); updateIdea(idea.id, { status: "mapped" }); }} className="ml-auto px-2.5 py-1.5 rounded-lg bg-primary text-[var(--on-primary)] text-[10px] font-bold flex items-center gap-1 disabled:opacity-40"><Network className="w-3 h-3" />{idea.status === "mapped" ? "En el tablero" : "Enviar al tablero"}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export const FullScreenDiscoveryChat: React.FC<FullScreenDiscoveryChatProps> = ({
  messages: controlledMessages,
  initialMessages = INITIAL_DISCOVERY_MESSAGES,
  initialSelectedOptions = {},
  onSendMessage,
  onSelectOption,
  onSelectedOptionsChange,
  onGenerateArchitecture,
  generationStatus = "discovering",
  onNavigateToMode,
  isThinking = false,
  error = null,
  onRetry,
  onGenerativeUIChange,
  onAddIdeaToBoard,
}) => {
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>(initialMessages);
  const messages = controlledMessages ?? internalMessages;

  const [inputValue, setInputValue] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>(
    initialSelectedOptions
  );
  const [customInputsOpen, setCustomInputsOpen] = useState<Record<string, boolean>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLengthRef = useRef<number>(messages.length);

  useEffect(() => {
    if (!controlledMessages && initialMessages) {
      setInternalMessages(initialMessages);
    }
  }, [initialMessages, controlledMessages]);

  useEffect(() => {
    if (initialSelectedOptions) {
      setSelectedOptions(initialSelectedOptions);
    }
  }, [initialSelectedOptions]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (messages.length > prevMessagesLengthRef.current || isThinking || error) {
      container.scrollTop = container.scrollHeight;
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isThinking, error]);

  const triggerImageRejection = () => {
    setImageError(IMAGE_REJECTION_MESSAGE);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const hasImageFile = Array.from(e.clipboardData.files).some((f) =>
        f.type.startsWith("image/")
      );
      if (hasImageFile) {
        e.preventDefault();
        triggerImageRejection();
        return;
      }
    }
    if (e.clipboardData.items && e.clipboardData.items.length > 0) {
      const hasImageItem = Array.from(e.clipboardData.items).some((item) =>
        item.type.startsWith("image/")
      );
      if (hasImageItem) {
        e.preventDefault();
        triggerImageRejection();
        return;
      }
    }
    const pastedText = e.clipboardData.getData("text");
    if (pastedText && containsImageData(pastedText)) {
      e.preventDefault();
      triggerImageRejection();
      return;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const hasImage = Array.from(e.dataTransfer.files).some(
        (f) =>
          f.type.startsWith("image/") ||
          /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(f.name)
      );
      if (hasImage) {
        triggerImageRejection();
        return;
      }
    }
    const text = e.dataTransfer.getData("text");
    if (text && containsImageData(text)) {
      triggerImageRejection();
      return;
    }
  };

  const isOptionSelected = (questionId: string, option: string): boolean => {
    const current = selectedOptions[questionId];
    if (!current) return false;
    if (Array.isArray(current)) return current.includes(option);
    return current === option;
  };

  const isNoneSelected = (questionId: string): boolean => {
    const current = selectedOptions[questionId];
    if (!current) return false;
    if (Array.isArray(current)) {
      return current.some((item) => /ninguna de las opciones/i.test(item));
    }
    return typeof current === "string" && /ninguna de las opciones/i.test(current);
  };

  const isQuestionAnswered = (questionId: string): boolean => {
    const current = selectedOptions[questionId];
    if (!current) return false;
    if (Array.isArray(current)) {
      return current.some((item) => typeof item === "string" && item.trim().length > 0);
    }
    return typeof current === "string" && current.trim().length > 0;
  };

  const handleOptionClick = (questionId: string, option: string, isMultiple?: boolean) => {
    setSelectedOptions((prev) => {
      let nextValue: string | string[];
      if (isMultiple) {
        const currentList = Array.isArray(prev[questionId])
          ? (prev[questionId] as string[])
          : prev[questionId]
            ? [prev[questionId] as string]
            : [];
        // Deselect "Ninguna..." if selecting a normal option
        const cleaned = currentList.filter((item) => !/ninguna de las opciones/i.test(item));
        if (cleaned.includes(option)) {
          nextValue = cleaned.filter((item) => item !== option);
        } else {
          nextValue = [...cleaned, option];
        }
      } else {
        nextValue = option;
      }
      const next = {
        ...prev,
        [questionId]: nextValue,
      };
      onSelectedOptionsChange?.(next);
      onSelectOption?.(questionId, nextValue);
      return next;
    });

    if (/ninguna de las anteriores|otra opci[oó]n|otro/i.test(option)) {
      setCustomInputsOpen((prev) => ({ ...prev, [questionId]: true }));
    }
  };

  const handleSelectNone = (questionId: string, isMultiple?: boolean) => {
    const noneText = "Ninguna de las opciones anteriores me parece adecuada";
    setCustomAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setSelectedOptions((prev) => {
      const nextValue = isMultiple ? [noneText] : noneText;
      const next = { ...prev, [questionId]: nextValue };
      onSelectedOptionsChange?.(next);
      onSelectOption?.(questionId, nextValue);
      return next;
    });
  };

  const handleCustomAnswerChange = (questionId: string, val: string, isMultiple?: boolean) => {
    const limited = val.slice(0, 300);
    setCustomAnswers((prev) => ({ ...prev, [questionId]: limited }));
    const trimmed = limited.trim();
    setSelectedOptions((prev) => {
      let nextValue: string | string[];
      if (isMultiple) {
        const currentList = Array.isArray(prev[questionId])
          ? (prev[questionId] as string[])
          : prev[questionId]
            ? [prev[questionId] as string]
            : [];
        const filtered = currentList.filter(
          (item) => !item.startsWith("Otra: ") && !/ninguna de las opciones/i.test(item)
        );
        nextValue = trimmed.length > 0 ? [...filtered, `Otra: ${trimmed}`] : filtered;
      } else {
        nextValue = trimmed.length > 0 ? `Otra: ${trimmed}` : "";
      }
      const next = {
        ...prev,
        [questionId]: nextValue,
      };
      onSelectedOptionsChange?.(next);
      onSelectOption?.(questionId, nextValue);
      return next;
    });
  };

  const handleToggleCustomInput = (questionId: string) => {
    setCustomInputsOpen((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleCancelCustomInput = (questionId: string) => {
    setCustomInputsOpen((prev) => ({ ...prev, [questionId]: false }));
    setCustomAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setSelectedOptions((prev) => {
      const current = prev[questionId];
      let nextValue: string | string[];
      if (Array.isArray(current)) {
        nextValue = current.filter(
          (item) => !item.startsWith("Otra: ") && !/ninguna de las opciones/i.test(item)
        );
      } else if (
        typeof current === "string" &&
        (current.startsWith("Otra: ") || /ninguna de las opciones/i.test(current))
      ) {
        nextValue = "";
      } else {
        nextValue = current;
      }
      const next = { ...prev, [questionId]: nextValue };
      onSelectedOptionsChange?.(next);
      onSelectOption?.(questionId, nextValue);
      return next;
    });
  };

  const handleSubmitQuestionnaire = (questionnaireId: string, questionsList: QuestionnaireQuestion[]) => {
    if (isThinking) return;
    const answered = questionsList.every((q) => isQuestionAnswered(q.id));
    if (!answered) return;

    const answerLines = questionsList
      .map((q, idx) => {
        const val = selectedOptions[q.id];
        const formattedVal = Array.isArray(val) ? val.join(", ") : val;
        return `${idx + 1}. ${q.question} -> ${formattedVal}`;
      })
      .join("\n");
    const summaryText = `Respuestas al cuestionario:\n${answerLines}`;

    onSendMessage?.(summaryText, questionnaireId, Object.fromEntries(questionsList.map((q) => [q.id, selectedOptions[q.id]])));
  };

  const codePoints = countCodePoints(inputValue);
  const isOverLimit = codePoints > MAX_AI_PROMPT_CHARS;
  const isNearLimit = codePoints > AI_PROMPT_WARNING_THRESHOLD && !isOverLimit;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (containsImageData(val)) {
      triggerImageRejection();
      const sanitized = val
        .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[^\s]*/gi, "")
        .replace(/data:image\/[^\s]*/gi, "");
      setInputValue(sanitized);
      return;
    }
    setInputValue(val);
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isOverLimit || isThinking) return;
    if (containsImageData(trimmed)) {
      triggerImageRejection();
      return;
    }

    setInputValue("");
    setImageError(null);
    onSendMessage?.(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-app text-fg select-text">
      {/* Scrollable Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-6 pt-6"
      >
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-5">
          {messages.map((msg, msgIndex) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 w-full ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {/* AI Avatar (Left) */}
                {!isUser && (
                  <div className="w-9 h-9 rounded-2xl glass-card flex items-center justify-center shrink-0 text-fg">
                    <Bot className="w-4 h-4 text-fg" />
                  </div>
                )}

                {/* Message Content, Grouped Questionnaire or Ready Card */}
                {msg.type === "ready" || msg.type === "dimensions" ? (
                  <div className="glass-card p-6 max-w-xl w-full text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center mx-auto text-fg">
                      <Sparkles className="w-6 h-6 text-fg" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-fg">
                        {generationStatus === "generating" ? "Organizando tu proyecto..." : generationStatus === "generated" ? "Proyecto estructurado" : generationStatus === "generation_error" ? "No se pudo organizar el proyecto" : "Definición Completada"}
                      </h3>
                      <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    </div>

                    {/* Selector de Puntos de Vista Estratégicos */}
                    <div className="pt-2 text-left space-y-2">
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider text-center">
                        Puntos de vista estratégicos a explorar
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {STRATEGIC_DIMENSIONS.map((dim) => (
                          <button
                            key={dim.id}
                            type="button"
                            disabled={isThinking}
                            onClick={() => {
                              onSendMessage?.(`Explorar punto de vista ${dim.label}: ${dim.desc}`);
                            }}
                            className="glass-card hover:bg-[var(--hover)] transition-all p-2.5 rounded-xl text-left border border-line flex flex-col gap-0.5 cursor-pointer disabled:opacity-50"
                          >
                            <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                              <span>{dim.icon}</span>
                              <span>{dim.label}</span>
                            </span>
                            <span className="text-[11px] text-muted">
                              {dim.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isThinking || (generationStatus !== "generated" && generationStatus !== "generation_error")}
                      onClick={() => onGenerateArchitecture?.()}
                      className="btn-primary w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                    >
                      {isThinking ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-spin" />
                          <span>Estructurando Arquitectura con IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{generationStatus === "generated" ? "Ver Tablero de Conceptos" : generationStatus === "generation_error" ? "Reintentar generación" : "Preparando arquitectura automáticamente"}</span>
                        </>
                      )}
                    </button>

                    {onNavigateToMode && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isThinking || generationStatus !== "generated"}
                          onClick={() => onNavigateToMode("notion")}
                          className="px-3 py-2 rounded-xl glass-card hover:bg-[var(--hover)] text-xs font-semibold text-fg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-line disabled:opacity-50"
                        >
                          <span>📋</span>
                          <span>Tablero de Conceptos</span>
                        </button>
                        <button
                          type="button"
                          disabled={isThinking || generationStatus !== "generated"}
                          onClick={() => onNavigateToMode("spatial")}
                          className="px-3 py-2 rounded-xl glass-card hover:bg-[var(--hover)] text-xs font-semibold text-fg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-line disabled:opacity-50"
                        >
                          <span>🌐</span>
                          <span>Espacio Neuronal 3D</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : msg.type === "questionnaire" ? (
                  (() => {
                    const questionsList =
                      msg.questions && msg.questions.length > 0
                        ? msg.questions
                        : msg.options && msg.options.length > 0
                          ? [{ id: msg.id, question: msg.content, options: msg.options }]
                          : [];
                    const showIntro = Boolean(msg.questions && msg.questions.length > 0 && msg.content);
                    const isAlreadyAnswered = messages.slice(msgIndex + 1).some((m) => m.role === "user" && m.questionnaireId === msg.id);
                    const answeredCount = questionsList.filter((q) => isQuestionAnswered(q.id)).length;
                    const totalCount = questionsList.length;
                    const allAnswered = totalCount > 0 && answeredCount === totalCount;

                    return (
                      <div className="glass-card p-6 max-w-2xl w-full space-y-6">
                        {/* Unified Questionnaire Header */}
                        <div className="flex items-center justify-between border-b border-line pb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-fg" />
                            <span className="text-xs font-bold uppercase tracking-wider text-fg">
                              ✨ CUESTIONARIO DE DEFINICIÓN
                            </span>
                          </div>
                          <span className="text-xs text-muted">
                            {isAlreadyAnswered
                              ? "Respuestas registradas"
                              : allAnswered
                                ? "Todas las opciones seleccionadas"
                                : totalCount === 1
                                  ? "Selecciona una opción"
                                  : `${answeredCount} de ${totalCount} seleccionadas`}
                          </span>
                        </div>

                        {/* Optional Questionnaire Intro */}
                        {showIntro && (
                          <p className="text-sm font-semibold text-fg leading-relaxed">
                            {msg.content}
                          </p>
                        )}

                        {/* Questions List with Sub-blocks & Dividers */}
                        <div className="space-y-6">
                          {questionsList.map((q, qIdx) => {
                            const isMultiple = q.type === "multiple";
                            return (
                              <div
                                key={q.id}
                                className={qIdx > 0 ? "border-t border-line pt-5 space-y-3" : "space-y-3"}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-medium text-muted">
                                    {q.question}
                                  </p>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-elevated text-muted border border-line">
                                    {isMultiple ? "Selección múltiple" : "Selección única"}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  {q.options.map((option) => {
                                    const isSelected = isOptionSelected(q.id, option);
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        aria-pressed={isSelected}
                                        disabled={isAlreadyAnswered}
                                        onClick={() => !isAlreadyAnswered && handleOptionClick(q.id, option, isMultiple)}
                                        className={`glass-card hover:bg-[var(--hover)] transition-colors cursor-pointer p-4 text-left flex items-center justify-between gap-2 ${
                                          isSelected
                                            ? "border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--surface-elevated)]"
                                            : ""
                                        } ${isAlreadyAnswered ? "opacity-75 cursor-default" : ""}`}
                                      >
                                        <span className="text-sm font-medium text-fg">
                                          {option}
                                        </span>
                                        {isMultiple ? (
                                          <span
                                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
                                              isSelected
                                                ? "bg-primary border-primary text-bg"
                                                : "border-[var(--muted)] opacity-40"
                                            }`}
                                          >
                                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                          </span>
                                        ) : (
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full shrink-0 transition-opacity ${
                                              isSelected
                                                ? "bg-[var(--accent)] opacity-100"
                                                : "bg-[var(--muted)] opacity-30"
                                            }`}
                                          />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Option: Ninguna de las anteriores / Otra opción */}
                                {q.allowCustom !== false && (
                                  <div className="pt-1">
                                    {!customInputsOpen[q.id] ? (
                                      <button
                                        type="button"
                                        disabled={isAlreadyAnswered}
                                        onClick={() => handleToggleCustomInput(q.id)}
                                        className="text-xs text-muted hover:text-fg transition-colors flex items-center gap-1.5 cursor-pointer py-1 disabled:opacity-50 disabled:cursor-default"
                                      >
                                        <span>✏️</span>
                                        <span>Ninguna de las anteriores / Otra opción</span>
                                      </button>
                                    ) : (
                                      <div className="glass-card p-3 rounded-xl border border-line space-y-2.5">
                                        <div className="flex items-center justify-between text-xs text-muted">
                                          <span className="font-semibold text-fg flex items-center gap-1.5">
                                            <span>✏️</span>
                                            <span>Ninguna de las anteriores / Otra opción</span>
                                          </span>
                                          {!isAlreadyAnswered && (
                                            <button
                                              type="button"
                                              onClick={() => handleCancelCustomInput(q.id)}
                                              className="text-[11px] text-muted hover:text-fg cursor-pointer"
                                            >
                                              Cancelar
                                            </button>
                                          )}
                                        </div>

                                        {/* Quick option: Ninguna de las opciones anteriores me parece adecuada */}
                                        <button
                                          type="button"
                                          disabled={isAlreadyAnswered}
                                          onClick={() => handleSelectNone(q.id, isMultiple)}
                                          className={`w-full py-2 px-3 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between cursor-pointer border ${
                                            isNoneSelected(q.id)
                                              ? "border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--surface-elevated)] text-fg"
                                              : "border-line text-muted hover:text-fg hover:bg-[var(--hover)]"
                                          } ${isAlreadyAnswered ? "opacity-75 cursor-default" : ""}`}
                                        >
                                          <span>Ninguna de las opciones anteriores me parece adecuada</span>
                                          {isNoneSelected(q.id) && (
                                            <span className="w-3.5 h-3.5 rounded-sm bg-primary border-primary text-bg flex items-center justify-center shrink-0">
                                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </span>
                                          )}
                                        </button>

                                        {/* Custom text input with 300 char limit */}
                                        <div className="space-y-1">
                                          <input
                                            type="text"
                                            disabled={isAlreadyAnswered}
                                            value={customAnswers[q.id] || ""}
                                            maxLength={300}
                                            onChange={(e) => handleCustomAnswerChange(q.id, e.target.value, isMultiple)}
                                            placeholder="O escribe tu propio enfoque alternativo..."
                                            className="glass-card px-3 py-2 text-xs text-fg placeholder:text-muted w-full rounded-xl border border-line focus:outline-none"
                                          />
                                          <div className="flex justify-end text-[10px] text-muted">
                                            {(customAnswers[q.id]?.length || 0)} / 300
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Action button to confirm questionnaire answers */}
                        <button
                          type="button"
                          disabled={!allAnswered || isThinking || isAlreadyAnswered}
                            onClick={() => handleSubmitQuestionnaire(msg.id, questionsList)}
                          className={`btn-primary w-full py-3 px-6 rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-2 transition-all mt-4 ${
                            isAlreadyAnswered
                              ? "opacity-60 cursor-default"
                              : !allAnswered || isThinking
                                ? "opacity-40 cursor-not-allowed"
                                : "cursor-pointer shadow-md hover:shadow-lg"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {isAlreadyAnswered
                              ? "Respuestas enviadas"
                              : allAnswered
                                ? (totalCount === 1 ? "Confirmar respuesta" : "Confirmar respuestas del cuestionario")
                                : `Selecciona una opción para cada pregunta (${answeredCount}/${totalCount})`}
                          </span>
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    className={`${msg.ui && !isUser ? "max-w-3xl w-full" : "max-w-xl"} px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? "bg-surface-elevated border border-primary/30 text-fg"
                        : "glass-card text-fg"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-fg">{msg.content}</p>
                    {msg.ui && !isUser && (
                      <GenerativeChatBlock
                        block={msg.ui}
                        disabled={isThinking}
                        onChange={(nextBlock) => onGenerativeUIChange?.(msg.id, nextBlock)}
                        onAddIdeaToBoard={(idea) => onAddIdeaToBoard?.(msg.id, idea)}
                      />
                    )}
                  </div>
                )}

                {/* User Avatar (Right) */}
                {isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-surface-elevated border border-primary/30 flex items-center justify-center shrink-0 text-fg">
                    <User className="w-4 h-4 text-fg" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex items-start gap-3 w-full justify-start animate-fade-in">
              <div className="w-9 h-9 rounded-2xl glass-card flex items-center justify-center shrink-0 text-fg">
                <Bot className="w-4 h-4 text-fg animate-pulse" />
              </div>
              <div className="glass-card px-4 py-3 rounded-2xl text-sm flex items-center gap-2.5 text-muted">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>Nexo está procesando tu idea...</span>
              </div>
            </div>
          )}

          {/* Animated Glassmorphic Error Card (Quota, Tokens, Connectivity, or Auth) */}
          {error && (() => {
            const isQuota = /429|cuota|quota|token|resource_exhausted/i.test(error);
            const isNetwork = /red|network|conexi[oó]n|offline|fetch|failed to fetch/i.test(error);
            const isKey = /clave|api_key|key|autoriz|401|403|unauthorized/i.test(error);

            const badgeLabel = isQuota
              ? "Cuota de Tokens Excedida (HTTP 429)"
              : isNetwork
                ? "Error de Conexión"
                : isKey
                  ? "Clave API Requerida"
                  : "Error de IA";

            const title = isQuota
              ? "Límite temporal de tokens alcanzado"
              : isNetwork
                ? "Sin conexión con los servidores de Google Gemini"
                : isKey
                  ? "Clave API no configurada o inválida"
                  : "No se pudo procesar la respuesta de la IA";

            const description = isQuota
              ? "Google Gemini ha alcanzado temporalmente el límite de solicitudes por minuto o cuota de tokens. Se restablecerá automáticamente en unos momentos."
              : error;

            return (
              <div className="flex items-start gap-3 w-full justify-start animate-fade-in my-2">
                <div
                  className={`w-10 h-10 rounded-2xl glass-card flex items-center justify-center shrink-0 border relative overflow-hidden ${
                    isQuota
                      ? "border-primary text-primary bg-primary/10 shadow-lg"
                      : isNetwork
                        ? "border-line text-fg bg-surface-elevated shadow-lg"
                        : "border-risk/40 text-risk bg-risk/10 shadow-lg"
                  }`}
                >
                  <span className="absolute inset-0 rounded-2xl bg-current opacity-15 animate-ping pointer-events-none" />
                  {isQuota ? (
                    <ZapOff className="w-5 h-5 text-primary animate-pulse relative z-10" />
                  ) : isNetwork ? (
                    <WifiOff className="w-5 h-5 text-fg animate-pulse relative z-10" />
                  ) : isKey ? (
                    <KeyRound className="w-5 h-5 text-risk animate-pulse relative z-10" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-risk animate-pulse relative z-10" />
                  )}
                </div>

                <div
                  className={`glass-card p-5 rounded-2xl text-sm max-w-xl w-full border relative overflow-hidden backdrop-blur-2xl shadow-xl space-y-3 ${
                    isQuota
                      ? "border-primary/30 bg-surface-elevated/70"
                      : isNetwork
                        ? "border-line bg-surface-elevated/60"
                        : "border-risk/30 bg-surface-elevated/50"
                  }`}
                >
                  {/* Ambient animated glow */}
                  <div
                    className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none animate-pulse ${
                      isQuota || !isNetwork ? "bg-primary" : "bg-surface"
                    }`}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border flex items-center gap-1.5 ${
                        isQuota
                          ? "bg-primary/15 text-primary border-primary/30"
                          : isNetwork
                            ? "bg-surface-elevated text-fg border-line"
                            : "bg-risk/15 text-risk border-risk/30"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                      {badgeLabel}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-fg tracking-tight">
                      {title}
                    </h4>
                    <p className="text-xs text-muted leading-relaxed mt-1">
                      {description}
                    </p>
                    {isQuota && (
                      <p className="text-[11px] text-muted font-mono mt-1.5 bg-surface/40 p-2 rounded-lg border border-line/30">
                        💡 Tip: Si persiste, espera 60 segundos o revisa tu cuota en Google AI Studio.
                      </p>
                    )}
                  </div>

                  {onRetry && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onRetry}
                        className="px-3.5 py-1.5 rounded-xl btn-primary text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reintentar ahora</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Container */}
      <div
        className="shrink-0 max-w-4xl mx-auto w-full"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Inline image rejection banner */}
        {imageError && (
          <div className="mx-6 mb-2 p-3 rounded-2xl glass-card border border-danger/40 flex items-center justify-between gap-2 text-danger text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-danger" />
              <span>{imageError}</span>
            </div>
            <button
              type="button"
              onClick={() => setImageError(null)}
              className="text-muted hover:text-fg cursor-pointer p-0.5"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="glass-card p-4 m-6 mt-0 flex flex-col gap-2">
          <div className="flex items-end gap-3">
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta o describe tu idea..."
              rows={2}
              className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm text-fg placeholder:text-muted resize-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isOverLimit || isThinking}
              aria-label="Enviar mensaje"
              className="btn-primary px-4 py-2.5 rounded-xl font-semibold text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <span>Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Character counter (displayed when > 18,000 code points) */}
          {(isNearLimit || isOverLimit) && (
            <div className="flex items-center justify-end px-1 pt-1 border-t border-line/40">
              <span
                className={`text-[11px] font-mono ${
                  isOverLimit ? "text-danger font-bold" : "text-accent-amber"
                }`}
              >
                {codePoints.toLocaleString()} / 20.000
                {isOverLimit && " (límite excedido)"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullScreenDiscoveryChat;
