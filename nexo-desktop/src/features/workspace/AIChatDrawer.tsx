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
    if (msg.isExplaining) return;

    if (msg.simplifiedExplanation) {
      toggleExplanation(msg.id);
      return;
    }

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
            bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
            dark:bg-black/20 dark:border-white/10 dark:shadow-2xl
            text-slate-800 dark:text-zinc-100 select-text
          "
        >
      {/* Specular Top Reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/20 to-transparent z-10"
      />

      {/* Floating Card Header */}
      <div className="p-4 border-b border-white/60 dark:border-white/10 flex items-center justify-between bg-white/30 dark:bg-white/[0.02] backdrop-blur-md relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 leading-none tracking-tight">
                {t("chat.aiName")}
              </h3>
              <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                Copilot
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-none font-normal">
              Exploración, ideación y modo tutor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10 px-2 py-0.5 rounded-full shadow-2xs">
              {messages.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
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
          <div className="text-center p-6 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-2xl my-4 shadow-xs backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-500/20 shadow-xs">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">{t("chat.empty.title")}</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
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
                      ? "bg-white/70 dark:bg-white/10 text-slate-700 dark:text-zinc-200 border border-white/80 dark:border-white/10"
                      : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Body */}
                <div className={`space-y-2 max-w-[88%] ${isUser ? "text-right" : ""}`}>
                  {/* Bubble / Text Box */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-blue-600 text-white font-normal rounded-tr-sm shadow-sm"
                        : "bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 text-slate-800 dark:text-zinc-100 rounded-tl-sm backdrop-blur-md shadow-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-normal">{msg.text}</p>
                  </div>

                  {/* Structured Rich Knowledge Card for Assistant Responses (Glass Sub-Card) */}
                  {asstMsg && (actionable || asstMsg.cardType) && (
                    <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 space-y-3 text-left shadow-xs hover:shadow-md transition-all backdrop-blur-md">
                      {/* Card Header with Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {actionable?.kind === "viability" ? (
                            <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : actionable?.kind === "risk" ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                          <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-100 tracking-wide uppercase">
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
                        <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                          {actionable.description}
                        </p>
                      )}

                      {/* Contextual metadata chip */}
                      {actionable?.metadata && (
                        <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded-md border border-white/80 dark:border-white/10 inline-block">
                          {actionable.metadata}
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex flex-col gap-1.5 border-t border-white/40 dark:border-white/10">
                        {/* Tutor Mode Action Button */}
                        <button
                          type="button"
                          onClick={() => void handleRequestExplanation(asstMsg)}
                          disabled={asstMsg.isExplaining}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/60 dark:border-white/10 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {asstMsg.isExplaining ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                              <span>Generando explicación didáctica...</span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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
                            className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                              isAlreadyMapped
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 cursor-default"
                                : "bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white cursor-pointer shadow-sm"
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
                        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-500/20 text-xs text-slate-800 dark:text-zinc-200 animate-fade-in space-y-2 backdrop-blur-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] uppercase tracking-wide">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Modo Tutor — Explicación Simplificada</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                              {serviceMode === "mock" ? "Simulador Local" : aiProvider}
                            </span>
                          </div>

                          {asstMsg.isExplaining ? (
                            <div className="flex items-center gap-2 py-2 text-slate-500 dark:text-zinc-400 text-xs">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                              <span>El tutor está preparando tu explicación paso a paso...</span>
                            </div>
                          ) : asstMsg.explanationError ? (
                            <div className="space-y-2">
                              <p className="text-xs text-amber-600 dark:text-amber-400">{asstMsg.explanationError}</p>
                              <button
                                type="button"
                                onClick={() => void handleRequestExplanation(asstMsg)}
                                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                              >
                                Reintentar explicación
                              </button>
                            </div>
                          ) : (
                            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-normal text-xs whitespace-pre-wrap">
                              {asstMsg.simplifiedExplanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Embedded Related Node Links if provided */}
                  {asstMsg?.insight && (
                    <div className="p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 space-y-1.5 text-left shadow-xs backdrop-blur-md">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        {asstMsg.insight.title}
                      </div>
                      <div className="space-y-1">
                        {asstMsg.insight.items.map((item) => (
                          <button
                            key={item.nodeId}
                            onClick={() => onSelectNode(item.nodeId)}
                            className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-xs text-slate-800 dark:text-zinc-100 text-left group cursor-pointer"
                          >
                            <span className="truncate flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.kind === "viability"
                                    ? "bg-emerald-500"
                                    : item.kind === "risk"
                                    ? "bg-amber-500"
                                    : "bg-blue-600"
                                }`}
                              />
                              <span className="font-medium">{item.label}</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Retry */}
                  <div
                    className={`text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-2 ${
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
                        className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 text-xs text-slate-600 dark:text-zinc-300 rounded-tl-sm flex items-center gap-2.5 shadow-xs backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span className="font-medium text-slate-800 dark:text-zinc-100">{t("chat.thinking.step2")}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Composer Footer */}
      <div className="p-4 border-t border-white/60 dark:border-white/10 bg-white/30 dark:bg-white/[0.02] backdrop-blur-md shrink-0 space-y-2.5">
        {/* Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(s.text)}
              className="px-2.5 py-1 rounded-full bg-white/60 hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10 border border-white/80 dark:border-white/10 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white whitespace-nowrap transition-all shadow-xs hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Composer Form with Sunken Input */}
        <form
          onSubmit={handleSend}
          className="
            relative flex items-end
            bg-slate-100/50 dark:bg-black/40
            border border-slate-200 dark:border-white/5
            rounded-xl shadow-inner
            focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/60
            transition-all p-1.5 backdrop-blur-md
          "
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.composer.placeholder")}
            rows={2}
            className="w-full bg-transparent text-slate-800 dark:text-zinc-100 text-xs p-2 pr-11 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none resize-none font-normal"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="
              absolute right-2 bottom-2 p-2 rounded-xl
              bg-blue-600 hover:bg-blue-500 active:scale-95 text-white
              disabled:opacity-40 transition-all shadow-sm cursor-pointer
            "
            aria-label={t("chat.composer.send")}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </motion.aside>
  )}
</AnimatePresence>
  );
};

