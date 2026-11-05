import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Glass, Input, Button } from "glisse";
import { Bot, Send, Sparkles, X, User } from "lucide-react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const SpatialChatPanel: React.FC = () => {
  const setActiveLeftPanel = useWorkspaceStore((s) => s.setActiveLeftPanel);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const spatialNodes = useWorkspaceStore((s) => s.spatialNodes);
  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mensajes de ejemplo para mostrar el estado del chat
  const [messages] = useState<ChatMessage[]>([
    { id: "1", role: "assistant", content: "¡Hola! Soy tu asistente espacial. Puedo ayudarte a explorar conexiones, sugerir clústeres o responder preguntas sobre el lienzo 3D." },
    { id: "2", role: "user", content: "¿Qué nodos están relacionados con el clúster de energía?" },
    { id: "3", role: "assistant", content: "He encontrado 3 nodos relevantes: 'Reactores de Fusión', 'Red de Distribución' y 'Almacenamiento en Baterías'. ¿Quieres que los resalte en el lienzo?" },
  ]);

  const selectedNode = spatialNodes.find((n) => n.id === selectedNodeId);
  const close = () => setActiveLeftPanel(null);

  // Auto-scroll al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    // Aquí iría la lógica para enviar el mensaje
    console.log("Enviar:", inputVal);
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
      className="fixed left-24 top-1/2 -translate-y-1/2 z-40 w-[420px] max-w-[calc(100vw-7.5rem)] h-[640px] max-h-[80vh] flex flex-col"
    >
      {/* Superficie de vidrio principal (Glisse) */}
      <Glass className="flex-1 flex flex-col rounded-3xl overflow-hidden shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Chat de IA Espacial</h3>
              <p className="text-[10px] text-zinc-400">En línea</p>
            </div>
          </div>
          <Button
            variant="glass"
            onClick={close}
            aria-label="Cerrar panel"
            className="w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Indicador de contexto */}
        <div className="px-5 py-3 bg-zinc-900/40">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Foco contextual:</span>
          </div>
          <p className="text-xs text-white font-medium mt-1">
            {selectedNode ? selectedNode.name : "Lienzo 3D completo"}
          </p>
        </div>

        {/* Área de mensajes con scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "assistant" ? "bg-indigo-500/20" : "bg-zinc-700/50"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                </div>
                {/* Burbuja */}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-zinc-800/80 text-zinc-100 rounded-tl-sm"
                      : "bg-indigo-600/90 text-white rounded-tr-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Pie de entrada */}
        <div className="p-4 bg-zinc-900/40 border-t border-white/5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                value={inputVal}
                onValueChange={setInputVal}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta..."
                className="w-full bg-zinc-950/50 border-0 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            <Button
              variant="filled"
              onClick={handleSend}
              disabled={!inputVal.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 text-center">
            La IA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </Glass>
    </motion.aside>
  );
};

export default SpatialChatPanel;