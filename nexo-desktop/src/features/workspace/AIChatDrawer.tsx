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
} from "lucide-react";
import type { AssistantMessage, Message, ResearchPhase } from "../../domain/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { useToast } from "../../context/ToastContext";

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
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand actions for direct canvas synchronization
  const { addNodeFromChat, toggleExplanation, workspace } = useWorkspaceStore();

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
    <aside className="w-[360px] sm:w-[380px] shrink-0 h-full sidebar-glass border-l border-line flex flex-col justify-between z-20 animate-sheet-in">
      {/* Header */}
      <div className="p-3.5 border-b border-line flex items-center justify-between bg-surface/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-concept-fg flex items-center justify-center text-white shadow-sm shadow-concept-fg/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-body font-bold text-fg leading-none flex items-center gap-1.5">
              {t("chat.aiName")}
              <span className="text-[10px] font-medium bg-concept-fg/10 text-concept-fg border border-concept-fg/20 px-1.5 py-0.2 rounded">
                IA
              </span>
            </h3>
            <p className="text-[10px] text-muted mt-0.5">Exploración e ideación visual</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-muted hover:text-fg p-1.5 rounded-lg hover:bg-hover transition-colors"
          aria-label={t("common.close")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.length === 0 ? (
          <div className="text-center p-6 bg-surface/70 border border-line rounded-2xl my-4 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-concept-fg/10 text-concept-fg flex items-center justify-center mx-auto mb-3 border border-concept-fg/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-body font-bold text-fg">{t("chat.empty.title")}</h4>
            <p className="text-caption text-muted mt-1 leading-relaxed">
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

                  {/* Rich Knowledge Card for Assistant Messages */}
                  {asstMsg && (actionable || asstMsg.cardType) && (
                    <div className="p-4 rounded-2xl bg-sunken/90 dark:bg-zinc-900/90 border border-line-soft dark:border-zinc-800 space-y-3 text-left shadow-sm animate-fade-in transition-all">
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
                        {getPhaseBadge(actionable?.phase)}
                      </div>

                      {actionable?.description && (
                        <p className="text-caption text-muted leading-relaxed">
                          {actionable.description}
                        </p>
                      )}

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex flex-col gap-1.5 border-t border-line-soft dark:border-zinc-800/80">
                        {/* Ghost Button: "No entiendo esto, explícamelo" */}
                        <button
                          type="button"
                          onClick={() => toggleExplanation(msg.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-caption font-medium text-muted hover:text-fg hover:bg-hover active:bg-selected transition-all"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-concept-fg" />
                          <span>{t("chat.message.explain")}</span>
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
                                : "bg-concept-fg text-white hover:brightness-110 active:scale-[0.98]"
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

                      {/* Contextual Simplified Explanation Callout */}
                      {asstMsg.showExplanation && (
                        <div className="p-3 rounded-xl bg-concept-fg/5 dark:bg-concept-fg/10 border border-concept-fg/20 text-caption text-fg animate-fade-in space-y-1">
                          <div className="flex items-center gap-1.5 text-concept-fg font-semibold text-[11px]">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>{t("chat.message.explained")}</span>
                          </div>
                          <p className="text-muted leading-relaxed font-normal text-xs">
                            {asstMsg.simplifiedExplanation ||
                              "Esta tarjeta resume un componente esencial de tu proyecto. Te ayuda a entender su objetivo y los siguientes pasos necesarios para validar si tiene éxito."}
                          </p>
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
                            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-sunken transition-colors text-caption text-fg text-left group"
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
                        className="inline-flex items-center gap-1 hover:text-fg transition-colors"
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

      {/* Prompt Composer Footer */}
      <div className="p-3.5 border-t border-line bg-surface/50 backdrop-blur-md">
        {/* Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 no-scrollbar">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(s.text)}
              className="px-2.5 py-1 rounded-full bg-surface hover:bg-sunken border border-line text-[11px] font-medium text-muted hover:text-fg whitespace-nowrap transition-colors shadow-2xs"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Composer Form */}
        <form
          onSubmit={handleSend}
          className="relative flex items-end bg-surface border border-line rounded-xl shadow-xs focus-within:ring-2 focus-within:ring-concept-fg/40 focus-within:border-concept-fg transition-all p-1.5"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.composer.placeholder")}
            rows={2}
            className="w-full bg-transparent text-fg text-caption p-2 pr-10 placeholder:text-muted outline-none resize-none font-normal"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-concept-fg text-white disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all shadow-sm"
            aria-label={t("chat.composer.send")}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
