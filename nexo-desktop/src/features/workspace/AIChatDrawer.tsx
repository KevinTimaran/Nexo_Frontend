import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  Sparkles,
  Bot,
  User,
  X,
  ChevronRight,
} from "lucide-react";
import type { Message } from "../../domain/types";

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
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <aside className="w-[320px] shrink-0 h-full sidebar-glass border-l border-line flex flex-col justify-between z-20 animate-sheet-in">
      {/* Header */}
      <div className="p-3 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-concept-fg flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-body font-semibold text-fg leading-none flex items-center gap-1.5">
              {t("chat.aiName")}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-muted hover:text-fg p-1.5 rounded hover:bg-hover transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.length === 0 ? (
          <div className="text-center p-6 bg-surface border border-line rounded-xl my-4 shadow-sm">
            <Sparkles className="w-6 h-6 text-concept-fg mx-auto mb-3" />
            <h4 className="text-body font-semibold text-fg">{t("chat.empty.title")}</h4>
            <p className="text-caption text-muted mt-1">{t("chat.empty.description")}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 animate-rise-in ${isUser ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    isUser
                      ? "bg-surface text-fg border border-line"
                      : "bg-concept-fg text-white shadow-sm"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className={`space-y-1.5 max-w-[85%] ${isUser ? "text-right" : ""}`}>
                  <div
                    className={`p-2.5 rounded-lg text-caption leading-relaxed ${
                      isUser
                        ? "bg-concept-fg text-white rounded-tr-sm"
                        : "bg-surface border border-line text-fg rounded-tl-sm shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Embedded Insight Card if available */}
                  {"insight" in msg && msg.insight && (
                    <div className="p-2.5 rounded-lg bg-surface border border-line space-y-1.5 text-left animate-fade-in shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-concept-fg uppercase tracking-wide">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {msg.insight.title}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {msg.insight.items.map((item) => (
                          <button
                            key={item.nodeId}
                            onClick={() => onSelectNode(item.nodeId)}
                            className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-sunken transition-colors text-caption text-fg text-left group"
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-concept-fg" />
                              {item.label}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-concept-fg group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`text-[10px] text-muted flex items-center ${isUser ? "justify-end" : "justify-start"}`}>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!isUser && (
                      <button
                        onClick={onRetry}
                        className="hover:text-fg ml-2 transition-colors"
                      >
                        {t("chat.message.retry")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Thinking Steps Animation */}
        {isThinking && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="w-6 h-6 rounded-md bg-concept-fg text-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-line text-caption text-muted rounded-tl-sm flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-concept-fg animate-ping" />
              <span>{t("chat.thinking.step2")}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Composer Footer */}
      <div className="p-3 border-t border-line bg-surface/50">
        {/* Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(s.text)}
              className="px-2 py-1 rounded bg-surface hover:bg-sunken border border-line text-[11px] font-medium text-muted hover:text-fg whitespace-nowrap transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Form input */}
        <form onSubmit={handleSend} className="relative flex items-end bg-surface border border-line rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-concept-fg/40 transition-all p-1">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.composer.placeholder")}
            rows={2}
            className="w-full bg-transparent text-fg text-caption p-2 pr-9 placeholder:text-muted outline-none resize-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="absolute right-1.5 bottom-1.5 p-1 rounded-md bg-concept-fg text-white disabled:opacity-40 hover:brightness-110 transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
