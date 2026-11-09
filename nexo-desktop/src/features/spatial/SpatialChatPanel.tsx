import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Glass, Button } from "glisse";
import { Bot, Send, Sparkles, X, User, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { services } from "../../services";
import { applyGraphOperations } from "../../services/ai/reconcileGraph";
import {
  countCodePoints,
  containsImageData,
  MAX_AI_PROMPT_CHARS,
  AI_PROMPT_WARNING_THRESHOLD,
  IMAGE_REJECTION_MESSAGE,
} from "../../domain/constants";
import { getSpatialGroup } from "../../domain/spatial";
import { useToast } from "../../context/ToastContext";
import type { Message, ConceptMap, Language } from "../../domain/types";
import { currentLanguage } from "../../i18n";

export const SpatialChatPanel: React.FC = () => {
  const setActiveLeftPanel = useWorkspaceStore((s) => s.setActiveLeftPanel);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const spatialNodes = useWorkspaceStore((s) => s.spatialNodes);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const chatPhase = useWorkspaceStore((s) => s.chatPhase);

  const { showToast } = useToast();

  const [inputVal, setInputVal] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);

  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      createdAt: new Date().toISOString(),
      text: "¡Hola! Soy tu asistente en el espacio 3D. Puedo responder preguntas sobre tus conceptos, conexiones y el avance de tu investigación.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedNode = useMemo(
    () => spatialNodes.find((n) => n.id === selectedNodeId),
    [spatialNodes, selectedNodeId]
  );

  const selectedGroupMeta = selectedNode ? getSpatialGroup(selectedNode.group) : null;

  const displayMessages: Message[] = useMemo(() => {
    if (workspace && workspace.messages && workspace.messages.length > 0) {
      return workspace.messages;
    }
    return localMessages;
  }, [workspace, localMessages]);

  const close = () => setActiveLeftPanel(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, isThinking]);

  const triggerImageRejection = () => {
    setImageError(IMAGE_REJECTION_MESSAGE);
    showToast(IMAGE_REJECTION_MESSAGE, "error");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (containsImageData(val)) {
      triggerImageRejection();
      const sanitized = val
        .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[^\s]*/gi, "")
        .replace(/data:image\/[^\s]*/gi, "");
      setInputVal(sanitized);
      return;
    }
    setImageError(null);
    setInputVal(val);
  };

  const codePoints = countCodePoints(inputVal);
  const isOverLimit = codePoints > MAX_AI_PROMPT_CHARS;
  const isNearLimit = codePoints > AI_PROMPT_WARNING_THRESHOLD && !isOverLimit;

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend ?? inputVal;
    const trimmed = rawText.trim();
    if (!trimmed || isThinking) return;

    if (containsImageData(trimmed)) {
      triggerImageRejection();
      return;
    }

    if (countCodePoints(trimmed) > MAX_AI_PROMPT_CHARS) {
      return;
    }

    setLastPrompt(trimmed);
    setInputVal("");
    setImageError(null);
    setError(null);
    setIsThinking(true);

    const userMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userMessage: Message = {
      id: userMsgId,
      role: "user",
      createdAt: new Date().toISOString(),
      text: trimmed,
    };

    const promptText = selectedNode
      ? `[Contexto del nodo enfocado en 3D: "${selectedNode.name}" (Clúster: ${selectedNode.group})]: ${trimmed}`
      : trimmed;

    const currentMessages = workspace?.messages || localMessages;
    const requestDefinitionVersion = workspace?.discovery?.candidateDefinitionVersion;
    const updatedMessages = [...currentMessages, userMessage];

    if (workspace) {
      setWorkspace({
        ...workspace,
        messages: updatedMessages,
      });
    } else {
      setLocalMessages(updatedMessages);
    }

    try {
      const response = await services.ai.reply({
        text: promptText,
        map: workspace?.map || { nodes: [], relations: [] },
        lang: (currentLanguage() as Language) || "es",
        replyTo: userMsgId,
        chatPhase: chatPhase,
        messageHistory: updatedMessages,
      });

      const aiMessage: Message = { ...response.message, replyTo: userMsgId, requestId: userMsgId };

      if (workspace) {
        const latest = useWorkspaceStore.getState().workspace;
        if (!latest || latest.project.id !== workspace.project.id) return;
        const nextMessages = [...latest.messages.filter((message) => !(message.role === "assistant" && message.replyTo === userMsgId)), aiMessage];
        const nextMap: ConceptMap = applyGraphOperations(
          latest.map,
          response.newNodes ?? [],
          response.newRelations ?? [],
          latest.discovery,
          requestDefinitionVersion,
          latest.discovery?.candidateDefinitionVersion,
          [userMsgId, response.message.id],
        );

        setWorkspace({
          ...latest,
          map: nextMap,
          messages: nextMessages,
        });

        if (latest.project?.id) {
          void services.workspace.save(latest.project.id, nextMap, nextMessages, latest.discovery).catch(console.error);
        }
      } else {
        const nextMessages = [...updatedMessages, aiMessage];
        setLocalMessages(nextMessages);
      }
    } catch (err: any) {
      console.error("Error invoking real AI in SpatialChatPanel:", err);
      setError(err?.message || "Error al comunicarse con el asistente de IA");
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -30, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed left-24 top-1/2 -translate-y-1/2 z-40 w-[420px] max-w-[calc(100vw-7.5rem)] h-[640px] max-h-[80vh] flex flex-col text-fg"
    >
      <Glass
        className="flex-1 flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-border-color"
        style={{
          backgroundColor: "var(--card-bg, rgba(9,9,11,0.6))",
          borderColor: "var(--card-border, rgba(255,255,255,0.1))",
        }}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-color">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-concept-fg/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-concept-fg" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg tracking-tight">Copiloto IA Neuronal 3D</h3>
              <p className="text-[10px] text-muted">
                {isThinking ? "Procesando respuesta..." : "Conectado"}
              </p>
            </div>
          </div>
          <Button
            variant="glass"
            onClick={close}
            aria-label="Cerrar panel"
            className="w-8 h-8 rounded-full text-muted hover:text-fg hover:bg-surface border border-border-color cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Indicador de contexto */}
        <div className="px-5 py-3 bg-surface border-b border-border-color">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted font-mono">
              <Sparkles className="w-3 h-3 text-concept-fg" />
              <span>Foco contextual:</span>
            </div>
            {selectedGroupMeta && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border-color"
                style={{
                  backgroundColor: `${selectedGroupMeta.color}20`,
                  color: selectedGroupMeta.color,
                }}
              >
                {selectedGroupMeta.label}
              </span>
            )}
          </div>
          <p className="text-xs text-fg font-medium mt-1 truncate">
            {selectedNode ? selectedNode.name : "Lienzo 3D completo"}
          </p>
        </div>

        {/* Área de mensajes con scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border-color scrollbar-track-transparent">
          <AnimatePresence initial={false}>
            {displayMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "assistant" ? "bg-concept-fg/20" : "bg-elevated"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-3.5 h-3.5 text-concept-fg" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-muted" />
                  )}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed border whitespace-pre-wrap ${
                    msg.role === "assistant"
                      ? "bg-surface text-fg border-border-color rounded-tl-sm"
                      : "bg-concept-fg text-fg border-transparent rounded-tr-sm shadow-md"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 items-center"
            >
              <div className="w-7 h-7 rounded-full bg-concept-fg/20 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-3.5 h-3.5 text-concept-fg" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 text-xs bg-surface text-muted border border-border-color flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-concept-fg" />
                <span>Analizando contexto y generando respuesta...</span>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="truncate">{error}</span>
              </div>
              {lastPrompt && (
                <button
                  type="button"
                  onClick={() => void handleSend(lastPrompt)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reintentar</span>
                </button>
              )}
            </div>
          )}

          {imageError && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{imageError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pie de entrada */}
        <div
          className="p-4 bg-surface border-t border-border-color space-y-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <input
                value={inputVal}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Pregunta a la IA sobre el lienzo o nodo seleccionado..."
                disabled={isThinking}
                className="w-full bg-elevated border border-border-color rounded-xl px-4 py-2.5 text-xs text-fg placeholder:text-muted focus:border-concept-fg outline-none transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!inputVal.trim() || isOverLimit || isThinking}
              aria-label="Enviar mensaje"
              className="w-9 h-9 rounded-xl bg-primary hover:brightness-110 disabled:opacity-40 text-fg shrink-0 flex items-center justify-center transition-all cursor-pointer shadow-md"
            >
              {isThinking ? (
                <Loader2 className="w-4 h-4 animate-spin text-fg" />
              ) : (
                <Send className="w-4 h-4 text-fg" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted">
            <span className={isOverLimit ? "text-red-400 font-semibold" : isNearLimit ? "text-amber-400 font-semibold" : ""}>
              {isOverLimit
                ? "Límite excedido (máximo 20.000 caracteres)"
                : isNearLimit
                ? "Aproximándose al límite de caracteres"
                : "Nexo procesa solo texto; imágenes no admitidas."}
            </span>
            {(isNearLimit || isOverLimit || codePoints > 1000) && (
              <span className={isOverLimit ? "text-red-400 font-mono" : "text-muted font-mono"}>
                {codePoints.toLocaleString()}/{MAX_AI_PROMPT_CHARS.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Glass>
    </motion.aside>
  );
};

export default SpatialChatPanel;
