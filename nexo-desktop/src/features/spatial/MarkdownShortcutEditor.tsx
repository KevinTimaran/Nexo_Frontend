import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heading1, Heading2, Heading3, List, Quote } from "lucide-react";

export interface MarkdownShortcutEditorProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

import {
  type Block,
  type BlockType,
  nextBlockId,
  parseMarkdownToBlocks,
  serializeBlocksToMarkdown,
} from "./markdownParser";

export type { Block, BlockType };
export { nextBlockId, parseMarkdownToBlocks, serializeBlocksToMarkdown };

const MAX_CHARS = 5000; 

export const MarkdownShortcutEditor: React.FC<MarkdownShortcutEditorProps> = ({
  value,
  onChange,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(() => parseMarkdownToBlocks(value));
  const [, setFocusedIndex] = useState(0);
  const [slashMenu, setSlashMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  
  // Nuevo estado para manejar el "Ctrl + A" global
  const [isAllSelected, setIsAllSelected] = useState(false);

  const isInternalChange = useRef(false);
  const inputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setBlocks((prev) => parseMarkdownToBlocks(value, prev));
  }, [value]);

  const updateBlocksAndNotify = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    isInternalChange.current = true;
    const serialized = serializeBlocksToMarkdown(newBlocks);
    onChange(serialized);
  };

  useEffect(() => {
    inputRefs.current.forEach((el) => {
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
      }
    });
  }, [blocks]);

  const handleBlockChange = (id: string, text: string) => {
    const target = blocks.find((b) => b.id === id);
    if (!target) return;

    const newTotalLength = value.length - target.text.length + text.length;
    if (newTotalLength > MAX_CHARS) return;

    let nextType = target.type;
    let nextText = text;

    if (text.startsWith("# ")) { nextType = "h1"; nextText = text.slice(2); }
    else if (text.startsWith("## ")) { nextType = "h2"; nextText = text.slice(3); }
    else if (text.startsWith("### ")) { nextType = "h3"; nextText = text.slice(4); }
    else if (text.startsWith("- ") || text.startsWith("* ")) { nextType = "bullet"; nextText = text.slice(2); }
    else if (text.startsWith("> ")) { nextType = "quote"; nextText = text.slice(2); }

    if (text.endsWith("/")) {
      const el = inputRefs.current.get(id);
      if (el) {
        setSlashMenu({
          id,
          top: el.offsetTop + el.offsetHeight + 8,
          left: el.offsetLeft + 24,
        });
      }
    } else if (slashMenu && !text.endsWith("/")) {
      setSlashMenu(null);
    }

    const updated = blocks.map((b) =>
      b.id === id ? { ...b, type: nextType, text: nextText } : b
    );

    updateBlocksAndNotify(updated);
  };

  const applySlashCommand = (type: BlockType) => {
    if (!slashMenu) return;
    const targetBlock = blocks.find((b) => b.id === slashMenu.id);
    if (!targetBlock) return;

    const newText = targetBlock.text.slice(0, -1).trim();
    const updated = blocks.map((b) =>
      b.id === slashMenu.id ? { ...b, type, text: newText } : b
    );

    updateBlocksAndNotify(updated);
    setSlashMenu(null);

    setTimeout(() => {
      inputRefs.current.get(slashMenu.id)?.focus();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    e.stopPropagation(); 

    // 1. Lógica cuando TODO el documento está seleccionado (Custom Ctrl+A)
    if (isAllSelected) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const newBlocks = [{ id: nextBlockId(), type: 'p' as BlockType, text: '' }];
        updateBlocksAndNotify(newBlocks);
        setIsAllSelected(false);
        setFocusedIndex(0);
        setTimeout(() => inputRefs.current.get(newBlocks[0].id)?.focus(), 10);
        return;
      }

      // Reemplazar todo si se escribe una letra
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const newBlocks = [{ id: nextBlockId(), type: 'p' as BlockType, text: e.key }];
        updateBlocksAndNotify(newBlocks);
        setIsAllSelected(false);
        setFocusedIndex(0);
        setTimeout(() => {
          const el = inputRefs.current.get(newBlocks[0].id);
          if (el) { el.focus(); el.setSelectionRange(1, 1); }
        }, 10);
        return;
      }

      // Copiar todo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigator.clipboard.writeText(value);
        return;
      }

      // Deseleccionar si usa flechas
      if (e.key.startsWith('Arrow') || e.key === 'Escape') {
        setIsAllSelected(false);
      }
    }

    // 2. Detectar Ctrl + A o Cmd + A
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setIsAllSelected(true);
      return;
    }

    if (e.key === "Escape" && slashMenu) {
      setSlashMenu(null);
      return;
    }

    const currentBlock = blocks[index];
    if (!currentBlock) return;
    const textarea = e.currentTarget;
    const caretPos = textarea.selectionStart ?? currentBlock.text.length;
    const hasSelection = textarea.selectionStart !== textarea.selectionEnd;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slashMenu) setSlashMenu(null);

      if (currentBlock.type === "bullet" && currentBlock.text.trim() === "") {
        const updated = blocks.map((b, i) => (i === index ? { ...b, type: "p" as BlockType } : b));
        updateBlocksAndNotify(updated);
        return;
      }

      const textBefore = currentBlock.text.slice(0, caretPos);
      const textAfter = currentBlock.text.slice(caretPos);

      const nextType: BlockType = currentBlock.type === "bullet" ? "bullet" : "p";
      const newBlock: Block = { id: nextBlockId(), type: nextType, text: textAfter };

      const newBlocks = [...blocks];
      newBlocks[index] = { ...currentBlock, text: textBefore };
      newBlocks.splice(index + 1, 0, newBlock);

      updateBlocksAndNotify(newBlocks);
      setFocusedIndex(index + 1);

      setTimeout(() => {
        const nextEl = inputRefs.current.get(newBlock.id);
        if (nextEl) { nextEl.focus(); nextEl.setSelectionRange(0, 0); }
      }, 10);
      return;
    }

    if (e.key === "Backspace" && caretPos === 0 && !hasSelection) {
      if (currentBlock.type !== "p") {
        e.preventDefault();
        const updated = blocks.map((b, i) => (i === index ? { ...b, type: "p" as BlockType } : b));
        updateBlocksAndNotify(updated);
        return;
      }
      if (index > 0) {
        e.preventDefault();
        const prevBlock = blocks[index - 1];
        const mergePos = prevBlock.text.length;
        const mergedText = prevBlock.text + currentBlock.text;

        const newBlocks = blocks.filter((_, i) => i !== index);
        newBlocks[index - 1] = { ...prevBlock, text: mergedText };

        updateBlocksAndNotify(newBlocks);
        setFocusedIndex(index - 1);

        setTimeout(() => {
          const prevEl = inputRefs.current.get(prevBlock.id);
          if (prevEl) { prevEl.focus(); prevEl.setSelectionRange(mergePos, mergePos); }
        }, 10);
        return;
      }
    }

    if (e.key === "ArrowUp" && index > 0 && caretPos === 0 && !hasSelection) {
      e.preventDefault();
      const prevEl = inputRefs.current.get(blocks[index - 1].id);
      if (prevEl) { prevEl.focus(); setFocusedIndex(index - 1); }
    } else if (e.key === "ArrowDown" && index < blocks.length - 1 && caretPos === currentBlock.text.length && !hasSelection) {
      e.preventDefault();
      const nextEl = inputRefs.current.get(blocks[index + 1].id);
      if (nextEl) { nextEl.focus(); setFocusedIndex(index + 1); }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, index: number) => {
    e.stopPropagation(); 
    const pastedText = e.clipboardData.getData("text");
    
    const currentBlock = blocks[index];
    const textarea = e.currentTarget;
    const startPos = textarea.selectionStart ?? currentBlock.text.length;
    const endPos = textarea.selectionEnd ?? currentBlock.text.length;
    
    const textBefore = currentBlock.text.slice(0, startPos);
    const textAfter = currentBlock.text.slice(endPos);

    const newTotalLength = value.length - currentBlock.text.length + textBefore.length + pastedText.length + textAfter.length;
    
    if (newTotalLength > MAX_CHARS) {
      e.preventDefault();
      alert("Has alcanzado el límite máximo de caracteres del documento.");
      return;
    }

    if (!pastedText.includes("\n")) return;

    e.preventDefault();
    const pastedLines = pastedText.split("\n");
    pastedLines[0] = textBefore + pastedLines[0];
    pastedLines[pastedLines.length - 1] = pastedLines[pastedLines.length - 1] + textAfter;

    const parsedBlocks = parseMarkdownToBlocks(pastedLines.join("\n"));
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1, ...parsedBlocks);
    updateBlocksAndNotify(newBlocks);
  };

  const wordCount = useMemo(() => {
    const text = value.trim();
    return text ? text.split(/\s+/).length : 0;
  }, [value]);

  const isLimitReached = value.length >= MAX_CHARS;

  return (
    <div className="flex h-full min-h-0 flex-col font-sans bg-app relative overflow-hidden">
      {/* Barra Superior Flotante */}
      <div className="shrink-0 px-6 py-3 flex items-center justify-between select-none bg-app/80 backdrop-blur-md border-b border-line/5 z-10">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted tracking-wider uppercase">
            Documento
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-muted bg-surface/5 px-2.5 py-1 rounded-full">
            {wordCount} palabras
          </span>
          <span className={`px-2.5 py-1 rounded-full transition-colors ${
            isLimitReached ? "text-red-400 bg-red-400/10" : "text-muted bg-surface/5"
          }`}>
            {value.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Área de Escritura */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-8 py-12 pb-32 space-y-1 relative">
          
          <AnimatePresence>
            {slashMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSlashMenu(null)} />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ top: slashMenu.top, left: slashMenu.left }}
                  className="absolute z-50 w-56 bg-surface/95 backdrop-blur-xl border border-line/10 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5"
                >
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Formato
                  </div>
                  {[
                    { icon: Heading1, label: "Título 1", type: "h1" as BlockType },
                    { icon: Heading2, label: "Título 2", type: "h2" as BlockType },
                    { icon: Heading3, label: "Título 3", type: "h3" as BlockType },
                    { icon: List, label: "Lista", type: "bullet" as BlockType },
                    { icon: Quote, label: "Cita", type: "quote" as BlockType },
                  ].map((item) => (
                    <button
                      key={item.type}
                      onClick={() => applySlashCommand(item.type)}
                      className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg hover:bg-surface/10 text-left transition-colors group cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded bg-surface/5 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs text-fg font-medium">{item.label}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {blocks.map((block, index) => {
            const isH1 = block.type === "h1";
            const isH2 = block.type === "h2";
            const isH3 = block.type === "h3";
            const isBullet = block.type === "bullet";
            const isQuote = block.type === "quote";

            const typographyClass = isH1
              ? "text-4xl font-bold text-fg tracking-tight mt-6 mb-2"
              : isH2
              ? "text-2xl font-semibold text-fg tracking-tight mt-5 mb-1"
              : isH3
              ? "text-xl font-medium text-fg mt-4 mb-1"
              : isQuote
              ? "text-lg italic text-muted border-l-4 border-primary/50 pl-4 my-2"
              : "text-base text-muted leading-7";

            return (
              <div key={block.id} className={`flex items-start gap-3 group rounded-md transition-colors ${isAllSelected ? "bg-primary/20 px-2 -mx-2" : ""}`}>
                {isBullet && (
                  <span className="w-2 h-2 rounded-full bg-primary mt-3 shrink-0 shadow-[0_0_8px_var(--accent)]" />
                )}

                <textarea
                  ref={(el) => {
                    if (el) inputRefs.current.set(block.id, el);
                    else inputRefs.current.delete(block.id);
                  }}
                  rows={1}
                  value={block.text}
                  onFocus={() => {
                    setFocusedIndex(index);
                    setIsAllSelected(false); // Deseleccionar al hacer clic en otro lado
                  }}
                  onChange={(e) => {
                    handleBlockChange(block.id, e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  onKeyUp={(e) => e.stopPropagation()}
                  onCopy={(e) => e.stopPropagation()}
                  onCut={(e) => e.stopPropagation()}
                  placeholder={
                    index === 0 && blocks.length === 1 && !block.text
                      ? "Escribe algo o presiona '/' para comandos..."
                      : ""
                  }
                  className={`w-full bg-transparent resize-none outline-none border-0 p-0 placeholder:text-muted transition-colors ${typographyClass}`}
                  style={{ minHeight: isH1 ? "3rem" : isH2 ? "2.5rem" : isH3 ? "2rem" : "1.75rem" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarkdownShortcutEditor;