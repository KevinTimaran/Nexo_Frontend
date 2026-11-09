import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Bot,
  User,
  X,
  ChevronRight,
  HelpCircle,
  PlusCircle,
  CheckCircle2,
  Lightbulb,
  Compass,
  AlertTriangle,
  RotateCcw,
  Loader2,
  BookOpen,
} from "lucide-react";
import type { AssistantMessage, Message, ProjectFact, ResearchPhase } from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { useConnectivityStore } from "../../store/useConnectivityStore";
import { useToast } from "../../context/ToastContext";
import { services } from "../../services";
import { detectMessageLanguage } from "../../services/ai/prompts";
import { transitionMemoryFact } from "../../services/ai/semanticMemory";
import { currentLanguage } from "../../i18n";
import { Badge } from "../../components/ui/Badge";
import {
  MAX_AI_PROMPT_CHARS,
  AI_PROMPT_WARNING_THRESHOLD,
  IMAGE_REJECTION_MESSAGE,
  countCodePoints,
  containsImageData,
} from "../../domain/constants";

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  isThinking: boolean;
  onSendMessage: (text: string) => void;
  onGenerateBaseMap?: () => void;
  onSelectNode: (nodeId: string) => void;
  onRetry: () => void;
  error?: string | null;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isThinking,
  onSendMessage,
  onGenerateBaseMap,
  onSelectNode,
  onRetry,
  error = null,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const lang = currentLanguage();
  const [inputText, setInputText] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand actions for direct canvas synchronization
  const {
    addNodeFromChat,
    toggleExplanation,
    setMessageExplaining,
    setMessageExplanation,
    workspace,
    chatPhase,
  } = useWorkspaceStore();

  const { mode: serviceMode, aiProvider } = useConnectivityStore();

  const triggerImageRejection = () => {
    setImageError(IMAGE_REJECTION_MESSAGE);
    showToast(IMAGE_REJECTION_MESSAGE, "error");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const hasImage = Array.from(e.clipboardData.files).some((f) =>
        f.type.startsWith("image/")
      );
      if (hasImage) {
        e.preventDefault();
        triggerImageRejection();
        return;
      }
    }
    if (e.clipboardData.items && e.clipboardData.items.length > 0) {
      const hasImage = Array.from(e.clipboardData.items).some((item) =>
        item.type.startsWith("image/")
      );
      if (hasImage) {
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

  const codePoints = countCodePoints(inputText);
  const isOverLimit = codePoints > MAX_AI_PROMPT_CHARS;
  const isNearLimit = codePoints > AI_PROMPT_WARNING_THRESHOLD && !isOverLimit;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (containsImageData(val)) {
      triggerImageRejection();
      const sanitized = val
        .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[^\s]*/gi, "")
        .replace(/data:image\/[^\s]*/gi, "");
      setInputText(sanitized);
      return;
    }
    setInputText(val);
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, error]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking || isOverLimit) return;
    if (containsImageData(inputText)) {
      triggerImageRejection();
      return;
    }
    onSendMessage(inputText.trim());
    setInputText("");
    setImageError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const promptSuggestions =
    chatPhase === "PHASE_1_DISCOVERY"
      ? [
          { label: "Idea de proyecto", text: "Tengo la idea de desarrollar un proyecto para " },
          { label: "Público objetivo", text: "El público objetivo principal son " },
          { label: "Problema a resolver", text: "El problema central que busca resolver es " },
        ]
      : [
          { label: t("chat.composer.promptRisks"), text: t("chat.composer.promptRisksText") },
          { label: t("chat.composer.promptViability"), text: t("chat.composer.promptViabilityText") },
          { label: t("chat.composer.promptConcept"), text: t("chat.composer.promptConceptText") },
        ];

  const getChatPhaseBadge = () => {
    switch (chatPhase) {
      case "PHASE_1_DISCOVERY":
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Fase 1: Descubrimiento
          </span>
        );
      case "PHASE_2_STRUCTURING":
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary dark:text-primary border border-primary/25">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            Fase 2: Estructuración
          </span>
        );
      case "PHASE_3_EXPANSION":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-positive/15 text-positive dark:text-positive border border-positive/25">
            <span className="w-1.5 h-1.5 rounded-full bg-positive" />
            Fase 3: Expansión
          </span>
        );
    }
  };

  const handleMapNode = (candidate: {
    title: string;
    description: string;
    kind: "concept" | "viability" | "risk";
    phase: ResearchPhase;
    metadata?: string;
  }, sourceMessageId: string) => {
    if (!sourceMessageId) return;
    const state = useWorkspaceStore.getState();
    const current = state.workspace;
    const semanticKey = `actionable:${sourceMessageId}`;
    const existingFact = current?.discovery?.facts.find((fact) => fact.key === semanticKey);
    if (existingFact?.memoryState === "rejected") return;

    let acceptedFact = existingFact;
    if (acceptedFact && ["proposed", "modified"].includes(acceptedFact.memoryState ?? "legacy_unknown")) {
      acceptedFact = transitionMemoryFact(acceptedFact, { type: "accept_suggestion", eventId: `${semanticKey}:accept` });
      if (current?.discovery) {
        state.setWorkspace({
          ...current,
          discovery: { ...current.discovery, facts: current.discovery.facts.map((fact) => fact.key === semanticKey ? acceptedFact! : fact) },
        });
      }
    } else if (!acceptedFact && current?.discovery) {
      const proposal: ProjectFact = {
        key: semanticKey,
        semanticKey,
        value: `${candidate.title}: ${candidate.description}`,
        status: "unconfirmed",
        sourceMessageIds: [sourceMessageId],
        kind: "suggestion",
        memoryState: "proposed",
        origin: "ai_suggestion",
      };
      acceptedFact = transitionMemoryFact(proposal, { type: "accept_suggestion", eventId: `${semanticKey}:accept` });
      state.setWorkspace({
        ...current,
        discovery: { ...current.discovery, facts: [...current.discovery.facts, acceptedFact] },
      });
    }

    const created = addNodeFromChat({
      ...candidate,
      semanticKey: acceptedFact?.semanticKey ?? semanticKey,
      semanticKind: acceptedFact?.kind ?? "suggestion",
      semanticState: acceptedFact?.memoryState ?? "accepted",
      provenanceOrigin: acceptedFact?.origin ?? "accepted_suggestion",
      sourceFactIds: acceptedFact ? [acceptedFact.key] : undefined,
      sourceMessageIds: acceptedFact?.sourceMessageIds ?? [sourceMessageId],
    });
    if (created) {
      showToast(`«${created.title}» mapeado en el lienzo`, "success");
      onSelectNode(created.id);
    }
  };

  // Asynchronous Tutor Mode handler ("No entiendo esto, explícamelo")
  const handleRequestExplanation = async (msg: AssistantMessage) => {
    if (msg.isExplaining) return;

    if (msg.simplifiedExplanation) {
      toggleExplanation(msg.id);
      return;
    }

    setMessageExplaining(msg.id, true, null);

    const explanationLang = detectMessageLanguage(
      `${msg.text} ${msg.actionableNode?.title || ""}`,
      lang
    );

    try {
      const explanation = await services.ai.explain({
        messageText: msg.text,
        conceptTitle: msg.actionableNode?.title,
        conceptDescription: msg.actionableNode?.description,
        lang: explanationLang,
      });

      setMessageExplanation(msg.id, explanation);
    } catch {
      setMessageExplaining(
        msg.id,
        false,
        "No fue posible generar la explicación didáctica en este momento. Por favor reintenta."
      );
    }
  };

  const isNodeOnCanvas = (title: string): boolean => {
    if (!workspace) return false;
    return workspace.map.nodes.some(
      (n) => n.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
  };

  const getPhaseBadge = (phase?: ResearchPhase) => {
    switch (phase) {
      case "planning":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-positive/15 text-positive dark:text-positive border border-positive/25">
            <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
            {t("phases.planning")}
          </span>
        );
      case "execution":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary dark:text-primary border border-primary/25">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t("phases.execution")}
          </span>
        );
      case "validation":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t("phases.validation")}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="
            absolute inset-y-4 right-4 z-30
            w-[390px] sm:w-[440px] max-w-[calc(100vw-2rem)]
            flex flex-col justify-between
            rounded-3xl overflow-hidden
            bg-surface/70 backdrop-blur-2xl border border-line/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
            dark:bg-app/20 dark:border-line/10 dark:shadow-2xl
            text-fg dark:text-fg select-text
          "
        >
      {/* Specular Top Reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/20 to-transparent z-10"
      />

      {/* Floating Card Header */}
      <div className="p-4 border-b border-line/60 dark:border-line/10 flex items-center justify-between bg-surface/30 dark:bg-surface/[0.02] backdrop-blur-md relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-fg shadow-md shadow-blue-500/25">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-fg dark:text-fg leading-none tracking-tight">
                {t("chat.aiName")}
              </h3>
              {getChatPhaseBadge()}
            </div>
            <p className="text-[11px] text-muted dark:text-muted mt-1 leading-none font-normal">
              {chatPhase === "PHASE_1_DISCOVERY"
                ? "Definiendo Qué, Quién y Cómo"
                : chatPhase === "PHASE_2_STRUCTURING"
                ? "Sintetizando idea central en el lienzo"
                : "Ramificación técnica, legal y riesgos"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <span className="text-[10px] font-semibold text-muted dark:text-muted bg-surface/60 dark:bg-surface/10 border border-line/80 dark:border-line/10 px-2 py-0.5 rounded-full shadow-2xs">
              {messages.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-fg dark:hover:text-fg hover:bg-surface/40 dark:hover:bg-surface/10 active:scale-95 transition-all cursor-pointer"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center p-6 bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 rounded-2xl my-4 shadow-xs backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:text-primary flex items-center justify-center mx-auto mb-3 border border-primary/20 shadow-xs">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-fg dark:text-fg">{t("chat.empty.title")}</h4>
            <p className="text-xs text-muted dark:text-muted mt-1.5 leading-relaxed">
              {t("chat.empty.description")}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const asstMsg = !isUser ? (msg as AssistantMessage) : null;
            const isWarning = asstMsg?.cardType === "warning";
            const actionable = asstMsg?.actionableNode;
            const isAlreadyMapped = actionable ? isNodeOnCanvas(actionable.title) : false;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 animate-rise-in ${isUser ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isUser
                      ? "bg-surface/70 dark:bg-surface/10 text-fg dark:text-fg border border-line/80 dark:border-line/10"
                      : isWarning
                      ? "bg-amber-500 text-fg shadow-amber-500/20"
                      : "bg-gradient-to-br from-blue-600 to-indigo-600 text-fg shadow-blue-500/20"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : isWarning ? <AlertTriangle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Body */}
                <div className={`space-y-2 max-w-[88%] ${isUser ? "text-right" : ""}`}>
                  {/* Bubble / Text Box */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-primary text-fg font-normal rounded-tr-sm shadow-sm"
                        : isWarning
                        ? "bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/50 text-fg dark:text-fg rounded-tl-sm backdrop-blur-md shadow-xs"
                        : "bg-surface/60 dark:bg-surface/5 border border-line/70 dark:border-line/10 text-fg dark:text-fg rounded-tl-sm backdrop-blur-md shadow-xs"
                    }`}
                  >
                    {isWarning && (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs mb-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>Aviso: Fuera de contexto</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap font-normal">{msg.text}</p>
                  </div>

                  {/* Discovery Interactive Questions (Phase 1) */}
                  {asstMsg?.discoveryQuestions && asstMsg.discoveryQuestions.length > 0 && (
                    <div className="space-y-2.5 text-left mt-2 animate-rise-in">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Preguntas clave de descubrimiento</span>
                      </div>
                      {asstMsg.discoveryQuestions.map((dq, qIdx) => (
                        <div
                          key={dq.id || qIdx}
                          className="p-3.5 rounded-2xl bg-surface/50 dark:bg-surface/5 border border-line/60 dark:border-line/10 space-y-2 backdrop-blur-md shadow-xs hover:border-amber-500/30 transition-all"
                        >
                          <p className="text-xs font-semibold text-fg dark:text-fg leading-snug">
                            {dq.question}
                          </p>
                          {dq.options && dq.options.length > 0 && (
                            <div className="flex flex-col gap-1.5 pt-1">
                              {dq.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={isThinking}
                                  onClick={() => onSendMessage(opt)}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium bg-surface/70 hover:bg-primary hover:text-fg dark:bg-surface/10 dark:hover:bg-primary dark:hover:text-fg border border-line/80 dark:border-line/15 text-fg dark:text-fg transition-all duration-150 shadow-2xs hover:scale-[1.01] active:scale-[0.98] cursor-pointer group flex items-center justify-between gap-2 disabled:opacity-50"
                                >
                                  <span className="leading-snug">{opt}</span>
                                  <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ready for Structuring Callout / Action (Phase 1 -> Phase 2) */}
                  {asstMsg?.readyForStructuring && onGenerateBaseMap && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-positive/10 border border-primary/30 backdrop-blur-md shadow-sm space-y-2 text-left animate-rise-in mt-2">
                      <div className="flex items-center gap-1.5 text-primary dark:text-primary font-bold text-xs">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>Idea delimitada con éxito</span>
                      </div>
                      <p className="text-xs text-muted dark:text-muted leading-relaxed">
                        Tenemos definidos los pilares clave (Qué, Quién y Cómo). ¿Listo para estructurar el mapa conceptual?
                      </p>
                      <button
                        type="button"
                        onClick={onGenerateBaseMap}
                        disabled={isThinking}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-fg shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generar mapa base</span>
                      </button>
                    </div>
                  )}

                  {/* Dedicated Warning Card for Off-Topic Assistant Messages */}
                  {asstMsg && isWarning && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/50 space-y-2 text-left shadow-xs backdrop-blur-md animate-rise-in">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="uppercase tracking-wider text-[11px]">Mensaje fuera de contexto</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Guardrail activo
                        </span>
                      </div>
                      <p className="text-xs text-muted dark:text-muted leading-relaxed">
                        {asstMsg.simplifiedExplanation || "Mensaje fuera de contexto detectado."}
                      </p>
                    </div>
                  )}

                  {/* Structured Rich Knowledge Card for Assistant Responses (Glass Sub-Card) */}
                  {asstMsg && !isWarning && (actionable || asstMsg.cardType) && (
                    <div className="p-4 rounded-2xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 space-y-3 text-left shadow-xs hover:shadow-md transition-all backdrop-blur-md">
                      {/* Card Header with Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {actionable?.kind === "viability" ? (
                            <Compass className="w-4 h-4 text-positive dark:text-positive" />
                          ) : actionable?.kind === "risk" ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Lightbulb className="w-4 h-4 text-primary dark:text-primary" />
                          )}
                          <span className="text-[11px] font-bold text-fg dark:text-fg tracking-wide uppercase">
                            {actionable?.title || t("chat.insight.eyebrow")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {actionable?.category && (
                            <Badge category={actionable.category} size="sm" />
                          )}
                          {actionable?.priority && (
                            <Badge priority={actionable.priority} size="sm" />
                          )}
                          {getPhaseBadge(actionable?.phase)}
                        </div>
                      </div>

                      {/* Card Content */}
                      {actionable?.description && (
                        <p className="text-xs text-muted dark:text-muted leading-relaxed">
                          {actionable.description}
                        </p>
                      )}

                      {/* Contextual metadata chip */}
                      {actionable?.metadata && (
                        <div className="text-[10px] font-mono text-muted dark:text-muted bg-surface/60 dark:bg-surface/10 px-2 py-0.5 rounded-md border border-line/80 dark:border-line/10 inline-block">
                          {actionable.metadata}
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex flex-col gap-1.5 border-t border-line/40 dark:border-line/10">
                        {/* Tutor Mode Action Button */}
                        <button
                          type="button"
                          onClick={() => void handleRequestExplanation(asstMsg)}
                          disabled={asstMsg.isExplaining}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-medium text-muted dark:text-muted hover:text-fg dark:hover:text-fg bg-surface/40 dark:bg-surface/5 hover:bg-surface/80 dark:hover:bg-surface/10 border border-line/60 dark:border-line/10 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {asstMsg.isExplaining ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 text-primary dark:text-primary animate-spin" />
                              <span>Generando explicación didáctica...</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-3.5 h-3.5 text-primary dark:text-primary" />
                              <span>No entiendo esto, explícamelo</span>
                            </>
                          )}
                        </button>

                        {/* Direct Canvas Mapping Action */}
                        {actionable && (
                          <button
                            type="button"
                            onClick={() => handleMapNode(actionable, asstMsg?.id ?? "")}
                            disabled={isAlreadyMapped}
                            className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                              isAlreadyMapped
                                ? "bg-positive/15 text-positive dark:text-positive border border-positive/25 cursor-default"
                                : "bg-primary hover:bg-primary active:scale-[0.98] text-fg cursor-pointer shadow-sm"
                            }`}
                          >
                            {isAlreadyMapped ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t("chat.message.addedToCanvas")}</span>
                              </>
                            ) : (
                              <>
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>{t("chat.message.addToCanvas")}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Tutor Mode Explanation Box */}
                      {asstMsg.showExplanation && (
                        <div className="p-3.5 rounded-xl bg-primary/70 dark:bg-primary/20 border border-primary/30 dark:border-primary/20 text-xs text-fg dark:text-fg animate-fade-in space-y-2 backdrop-blur-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-primary dark:text-primary font-bold text-[11px] uppercase tracking-wide">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Modo Tutor — Explicación Simplificada</span>
                            </div>
                            <span className="text-[10px] text-muted dark:text-muted font-mono">
                              {serviceMode === "mock" ? "Simulador Local" : aiProvider}
                            </span>
                          </div>

                          {asstMsg.isExplaining ? (
                            <div className="flex items-center gap-2 py-2 text-muted dark:text-muted text-xs">
                              <Loader2 className="w-4 h-4 animate-spin text-primary dark:text-primary" />
                              <span>El tutor está preparando tu explicación paso a paso...</span>
                            </div>
                          ) : asstMsg.explanationError ? (
                            <div className="space-y-2">
                              <p className="text-xs text-amber-600 dark:text-amber-400">{asstMsg.explanationError}</p>
                              <button
                                type="button"
                                onClick={() => void handleRequestExplanation(asstMsg)}
                                className="text-xs text-primary dark:text-primary font-semibold hover:underline cursor-pointer"
                              >
                                Reintentar explicación
                              </button>
                            </div>
                          ) : (
                            <p className="text-muted dark:text-muted leading-relaxed font-normal text-xs whitespace-pre-wrap">
                              {asstMsg.simplifiedExplanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Embedded Related Node Links if provided */}
                  {asstMsg?.insight && (
                    <div className="p-3 rounded-2xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 space-y-1.5 text-left shadow-xs backdrop-blur-md">
                      <div className="text-[10px] font-semibold text-muted dark:text-muted uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary dark:text-primary" />
                        {asstMsg.insight.title}
                      </div>
                      <div className="space-y-1">
                        {asstMsg.insight.items.map((item) => (
                          <button
                            key={item.nodeId}
                            onClick={() => onSelectNode(item.nodeId)}
                            className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-surface/50 dark:hover:bg-surface/10 transition-colors text-xs text-fg dark:text-fg text-left group cursor-pointer"
                          >
                            <span className="truncate flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.kind === "viability"
                                    ? "bg-positive"
                                    : item.kind === "risk"
                                    ? "bg-amber-500"
                                    : "bg-primary"
                                }`}
                              />
                              <span className="font-medium">{item.label}</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-primary dark:group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Retry */}
                  <div
                    className={`text-[10px] text-muted dark:text-muted flex items-center gap-2 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!isUser && (
                      <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-1 hover:text-fg dark:hover:text-fg transition-colors cursor-pointer"
                        title={t("chat.message.retry")}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t("common.retry")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-fg flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-surface/60 dark:bg-surface/5 border border-line/70 dark:border-line/10 text-xs text-muted dark:text-muted rounded-tl-sm flex items-center gap-2.5 shadow-xs backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="font-medium text-fg dark:text-fg">{t("chat.thinking.step2")}</span>
            </div>
          </div>
        )}
        {/* Error Banner with Reintentar action */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/50 space-y-2.5 text-left shadow-xs backdrop-blur-md animate-rise-in">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="uppercase tracking-wider text-[11px]">Error en la comunicación con la IA</span>
              </div>
            </div>
            <p className="text-xs text-muted dark:text-muted leading-relaxed">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/70 hover:bg-surface dark:bg-surface/10 dark:hover:bg-surface/20 border border-line/80 dark:border-line/20 text-xs font-semibold text-fg dark:text-fg shadow-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Composer Footer */}
      <div
        className="p-4 border-t border-line/60 dark:border-line/10 bg-surface/30 dark:bg-surface/[0.02] backdrop-blur-md shrink-0 space-y-2.5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Inline image rejection banner */}
        {imageError && (
          <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-between gap-2 text-danger text-xs animate-fade-in">
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

        {/* Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {chatPhase === "PHASE_1_DISCOVERY" && onGenerateBaseMap && messages.some((m) => m.role === "user") && (
            <button
              type="button"
              onClick={onGenerateBaseMap}
              disabled={isThinking}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-fg text-[11px] font-semibold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>Generar mapa base</span>
            </button>
          )}
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(s.text)}
              className="px-2.5 py-1 rounded-full bg-surface/60 hover:bg-surface/90 dark:bg-surface/5 dark:hover:bg-surface/10 border border-line/80 dark:border-line/10 text-[11px] font-medium text-muted dark:text-muted hover:text-fg dark:hover:text-fg whitespace-nowrap transition-all shadow-xs hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Composer Form with Sunken Input */}
        <form
          onSubmit={handleSend}
          className="
            relative flex flex-col
            bg-sunken/50 dark:bg-app/40
            border border-line dark:border-line/5
            rounded-xl shadow-inner
            focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/60
            transition-all p-1.5 backdrop-blur-md
          "
        >
          <div className="relative flex items-end w-full">
            <textarea
              value={inputText}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.composer.placeholder")}
              rows={2}
              className="w-full bg-transparent text-fg dark:text-fg text-xs p-2 pr-11 placeholder:text-muted dark:placeholder:text-muted outline-none resize-none font-normal"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking || isOverLimit}
              className="
                absolute right-2 bottom-2 p-2 rounded-xl
                bg-primary hover:bg-primary active:scale-95 text-fg
                disabled:opacity-40 transition-all shadow-sm cursor-pointer
              "
              aria-label={t("chat.composer.send")}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {(isNearLimit || isOverLimit) && (
            <div className="w-full flex items-center justify-end px-2 pt-1 border-t border-line/30 dark:border-line/10">
              <span
                className={`text-[10px] font-mono ${
                  isOverLimit
                    ? "text-red-500 font-bold"
                    : "text-amber-600 dark:text-amber-400 font-semibold"
                }`}
              >
                {codePoints.toLocaleString()} / 20.000
                {isOverLimit && " (límite excedido)"}
              </span>
            </div>
          )}
        </form>
      </div>
    </motion.aside>
  )}
</AnimatePresence>
  );
};

