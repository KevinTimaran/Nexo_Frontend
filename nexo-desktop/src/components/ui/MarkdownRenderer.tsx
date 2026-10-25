import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Secure, zero-dependency Markdown parser and renderer.
 * Produces structured React elements without unsafe HTML injection.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-line text-caption text-muted italic">
        Contenido documental aún no redactado.
      </div>
    );
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 my-2 space-y-1 text-caption text-fg/90">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushCodeBlock = () => {
    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="p-3.5 my-2.5 rounded-2xl bg-surface-secondary/70 border border-line-soft/80 font-mono text-xs overflow-x-auto text-fg backdrop-blur-xs shadow-inner"
        >
          <code>{codeBuffer.join("\n")}</code>
        </pre>
      );
      codeBuffer = [];
      inCodeBlock = false;
    }
  };

  // Helper to format bold, italic and inline code
  const renderInline = (text: string): React.ReactNode => {
    // Regex for bold **text**, inline code `text`, and italic *text*
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded-md bg-surface-secondary/80 border border-line-soft font-mono text-[11px] text-concept-fg shadow-2xs"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={index} className="italic text-muted">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trimEnd();

    // Code blocks toggles
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Headings
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${lineIndex}`}
          className="text-body font-bold text-fg mt-4 mb-2 tracking-tight flex items-center gap-1.5"
        >
          {renderInline(line.replace("### ", ""))}
        </h3>
      );
      return;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${lineIndex}`}
          className="text-base font-bold text-fg mt-5 mb-2.5 tracking-tight border-b border-line-soft pb-1"
        >
          {renderInline(line.replace("## ", ""))}
        </h2>
      );
      return;
    }

    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1
          key={`h1-${lineIndex}`}
          className="text-lg font-extrabold text-fg mt-6 mb-3 tracking-tight"
        >
          {renderInline(line.replace("# ", ""))}
        </h1>
      );
      return;
    }

    // Unordered Lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      inList = true;
      listItems.push(line.replace(/^[-*]\s+/, ""));
      return;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${lineIndex}`}
          className="pl-3.5 my-2 border-l-2 border-concept-fg/50 text-muted italic text-caption leading-relaxed"
        >
          {renderInline(line.replace(/^>\s*/, ""))}
        </blockquote>
      );
      return;
    }

    // Empty lines
    if (!line.trim()) {
      flushList();
      return;
    }

    // Regular paragraphs
    flushList();
    elements.push(
      <p key={`p-${lineIndex}`} className="text-caption text-fg/80 leading-relaxed my-2">
        {renderInline(line)}
      </p>
    );
  });

  flushList();
  flushCodeBlock();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
