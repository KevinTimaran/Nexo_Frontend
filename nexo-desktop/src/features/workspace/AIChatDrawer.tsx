import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import type { AssistantMessage, Message, ResearchPhase } from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { useConnectivityStore } from "../../store/useConnectivityStore";
import { useToast } from "../../context/ToastContext";
import { services } from "../../services";
import { currentLanguage } from "../../i18n";
import { Badge } from "../../components/ui/Badge";

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  isThinking: boolean;
  onSendMessage: (text: string) => void;
  onSelectNode: (nodeId: string) => void;
  onRetry: () => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isThinking,
  onSendMessage,
  onSelectNode,
  onRetry,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const lang = currentLanguage();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand actions for direct canvas synchronization
  const {
    addNodeFromChat,
    toggleExplanation,
    setMessageExplaining,
    setMessageExplanation,
    workspace,
  } = useWorkspaceStore();

  const { mode: serviceMode, aiProvider } = useConnectivityStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const promptSuggestions = [
    { label: t("chat.composer.promptRisks"), text: t("chat.composer.promptRisksText") },
    { label: t("chat.composer.promptViability"), text: t("chat.composer.promptViabilityText") },
    { label: t("chat.composer.promptConcept"), text: t("chat.composer.promptConceptText") },
  ];

  const handleMapNode = (candidate: {
    title: string;
    description: string;
    kind: "concept" | "viability" | "risk";
    phase: ResearchPhase;
    metadata?: string;
  }) => {
    const created = addNodeFromChat(candidate);
    if (created) {
      showToast(`«${created.title}» mapeado en el lienzo`, "success");
      onSelectNode(created.id);
    }
  };

  // Asynchronous Tutor Mode handler ("No entiendo esto, explícamelo")
  const handleRequestExplanation = async (msg: AssistantMessage) => {
    // If an explanation is already processing for this message, avoid duplicate requests
    if (msg.isExplaining) return;

    // If an explanation already exists, simply toggle visibility
    if (msg.simplifiedExplanation) {
      toggleExplanation(msg.id);
      return;
    }

    // Trigger loading state for this specific message
    setMessageExplaining(msg.id, true, null);

    try {
      const explanation = await services.ai.explain({
        messageText: msg.text,
        conceptTitle: msg.actionableNode?.title,
        conceptDescription: msg.actionableNode?.description,
        lang,
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

  // Helper to check if an actionable candidate is already on canvas
  const isNodeOnCanvas = (title: string): boolean => {
    if (!workspace) return false;
    return workspace.map.nodes.some(
      (n) => n.title.toLowerCase().trim() === title.toLowerCase().trim()
    );
  };

  const getPhaseBadge = (phase?: ResearchPhase) => {
    switch (phase) {
      case "planning":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("phases.planning")}
          </span>
        );
      case "execution":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
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
    <aside
      className="
        absolute top-3 bottom-3 right-3 sm:top-4 sm:bottom-4 sm:right-4 z-30
        w-[390px] sm:w-[440px] max-w-[calc(100vw-1.5rem)]
        flex flex-col justify-between
        rounded-[28px] overflow-hidden
        border border-line/80 dark:border-white/10
        bg-surface/90 dark:bg-zinc-950/90
        backdrop-blur-2xl backdrop-saturate-150
        shadow-[0_20px_50px_-12px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.04)]
        dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]
        animate-sheet-in transition-all duration-300 ease-out select-text
      "
    >
      {/* Specular Top Reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-10" />

      {/* Floating Card Header */}
      <div className="p-3.5 sm:p-4 border-b border-line/60 dark:border-white/10 flex items-center justify-between bg-surface/60 dark:bg-white/[0.03] backdrop-blur-md relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-concept-fg to-concept-fg/80 flex items-center justify-center text-white shadow-md shadow-concept-fg/25">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body font-bold text-fg leading-none tracking-tight">
                {t("chat.aiName")}
              </h3>
              <span className="text-[10px] font-semibold bg-concept-fg/15 text-concept-fg border border-concept-fg/25 px-1.5 py-0.5 rounded-full">
                Copilot
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1 leading-none font-normal">
              Exploración, ideación y modo tutor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <span className="text-[10px] font-semibold text-muted bg-sunken/80 dark:bg-white/[0.05] border border-line-soft dark:border-white/10 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-fg hover:bg-hover active:scale-95 transition-all focus-ring cursor-pointer"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center p-6 bg-surface/60 dark:bg-white/[0.02] border border-line/60 dark:border-white/10 rounded-2xl my-4 shadow-sm backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-concept-fg/10 text-concept-fg flex items-center justify-center mx-auto mb-3 border border-concept-fg/20 shadow-xs">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-body font-bold text-fg">{t("chat.empty.title")}</h4>
            <p className="text-caption text-muted mt-1.5 leading-relaxed">
              {t("chat.empty.description")}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const asstMsg = !isUser ? (msg as AssistantMessage) : null;
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
                      ? "bg-surface text-fg border border-line"
                      : "bg-concept-fg text-white"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className={`space-y-2 max-w-[88%] ${isUser ? "text-right" : ""}`}>
                  {/* Bubble / Text Box */}
                  <div
                    className={`p-3.5 rounded-2xl text-caption leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-concept-fg text-white rounded-tr-sm"
                        : "bg-surface/90 border border-line text-fg rounded-tl-sm backdrop-blur-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-normal">{msg.text}</p>
                  </div>

                  {/* 5.1 Structured Rich Knowledge Card for Assistant Responses */}
                  {asstMsg && (actionable || asstMsg.cardType) && (
                    <div className="p-4 rounded-2xl bg-sunken/90 dark:bg-zinc-900/90 border border-line-soft dark:border-zinc-800 space-y-3 text-left shadow-sm hover:shadow-md transition-all">
                      {/* Card Header with Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {actionable?.kind === "viability" ? (
                            <Compass className="w-4 h-4 text-positive-fg" />
                          ) : actionable?.kind === "risk" ? (
                            <AlertTriangle className="w-4 h-4 text-risk-fg" />
                          ) : (
                            <Lightbulb className="w-4 h-4 text-concept-fg" />
                          )}
                          <span className="text-[11px] font-bold text-fg tracking-wide uppercase">
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
                        <p className="text-caption text-muted leading-relaxed">
                          {actionable.description}
                        </p>
                      )}

                      {/* Contextual metadata chip if present */}
                      {actionable?.metadata && (
                        <div className="text-[11px] font-mono text-muted bg-surface/75 px-2 py-0.5 rounded-md border border-line-soft inline-block">
                          {actionable.metadata}
                        </div>
                      )}

                      {/* 5.2 Card Action Buttons: Tutor Mode & Direct Canvas Mapping */}
                      <div className="pt-2 flex flex-col gap-1.5 border-t border-line-soft dark:border-zinc-800/80">
                        {/* Tutor Mode Action Button */}
                        <button
                          type="button"
                          onClick={() => void handleRequestExplanation(asstMsg)}
                          disabled={asstMsg.isExplaining}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-caption font-medium text-muted hover:text-fg hover:bg-hover active:bg-selected transition-all focus-ring disabled:opacity-50 cursor-pointer"
                        >
                          {asstMsg.isExplaining ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 text-concept-fg animate-spin" />
                              <span>Generando explicación didáctica...</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-3.5 h-3.5 text-concept-fg" />
                              <span>No entiendo esto, explícamelo</span>
                            </>
                          )}
                        </button>

                        {/* Direct Canvas Mapping Action */}
                        {actionable && (
                          <button
                            type="button"
                            onClick={() => handleMapNode(actionable)}
                            disabled={isAlreadyMapped}
                            className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-caption font-semibold transition-all shadow-sm ${
                              isAlreadyMapped
                                ? "bg-positive-fg/15 text-positive-fg border border-positive-fg/20 cursor-default"
                                : "bg-concept-fg text-white hover:brightness-110 active:scale-[0.98] cursor-pointer"
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
                        <div className="p-3.5 rounded-xl bg-concept-fg/5 dark:bg-concept-fg/10 border border-concept-fg/20 text-caption text-fg animate-fade-in space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-concept-fg font-bold text-[11px] uppercase tracking-wide">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Modo Tutor — Explicación Simplificada</span>
                            </div>
                            <span className="text-[10px] text-muted font-mono">
                              {serviceMode === "mock" ? "Simulador Local" : aiProvider}
                            </span>
                          </div>

                          {asstMsg.isExplaining ? (
                            <div className="flex items-center gap-2 py-2 text-muted text-xs">
                              <Loader2 className="w-4 h-4 animate-spin text-concept-fg" />
                              <span>El tutor está preparando tu explicación paso a paso...</span>
                            </div>
                          ) : asstMsg.explanationError ? (
                            <div className="space-y-2">
                              <p className="text-xs text-risk-fg">{asstMsg.explanationError}</p>
                              <button
                                type="button"
                                onClick={() => void handleRequestExplanation(asstMsg)}
                                className="text-xs text-concept-fg font-semibold hover:underline"
                              >
                                Reintentar explicación
                              </button>
                            </div>
                          ) : (
                            <p className="text-muted leading-relaxed font-normal text-xs whitespace-pre-wrap">
                              {asstMsg.simplifiedExplanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Embedded Related Node Links if provided */}
                  {asstMsg?.insight && (
                    <div className="p-3 rounded-xl bg-surface border border-line-soft space-y-1.5 text-left shadow-sm">
                      <div className="text-[10px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-concept-fg" />
                        {asstMsg.insight.title}
                      </div>
                      <div className="space-y-1">
                        {asstMsg.insight.items.map((item) => (
                          <button
                            key={item.nodeId}
                            onClick={() => onSelectNode(item.nodeId)}
                            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-sunken transition-colors text-caption text-fg text-left group cursor-pointer"
                          >
                            <span className="truncate flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.kind === "viability"
                                    ? "bg-positive-fg"
                                    : item.kind === "risk"
                                    ? "bg-risk-fg"
                                    : "bg-concept-fg"
                                }`}
                              />
                              <span className="font-medium">{item.label}</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-concept-fg group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Retry */}
                  <div
                    className={`text-[10px] text-muted flex items-center gap-2 ${
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
                        className="inline-flex items-center gap-1 hover:text-fg transition-colors cursor-pointer"
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
            <div className="w-7 h-7 rounded-xl bg-concept-fg text-white flex items-center justify-center shrink-0 shadow-sm shadow-concept-fg/30">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-surface border border-line text-caption text-muted rounded-tl-sm flex items-center gap-2.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-concept-fg animate-ping" />
              <span className="font-medium text-fg">{t("chat.thinking.step2")}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Composer Footer */}
      <div className="p-3.5 sm:p-4 border-t border-line/60 dark:border-white/10 bg-surface/60 dark:bg-white/[0.03] backdrop-blur-md shrink-0 space-y-2.5">
        {/* Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(s.text)}
              className="px-2.5 py-1 rounded-full bg-surface/90 dark:bg-white/[0.05] hover:bg-hover border border-line-soft dark:border-white/10 text-[11px] font-medium text-muted hover:text-fg whitespace-nowrap transition-all shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Composer Form */}
        <form
          onSubmit={handleSend}
          className="relative flex items-end bg-surface/90 dark:bg-zinc-900/90 border border-line/80 dark:border-white/10 rounded-2xl shadow-xs focus-within:ring-2 focus-within:ring-concept-fg/40 focus-within:border-concept-fg transition-all p-1.5"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.composer.placeholder")}
            rows={2}
            className="w-full bg-transparent text-fg text-caption p-2 pr-11 placeholder:text-muted outline-none resize-none font-normal"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="absolute right-2 bottom-2 p-2 rounded-xl bg-gradient-to-br from-concept-fg to-concept-fg/90 text-white disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
            aria-label={t("chat.composer.send")}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
