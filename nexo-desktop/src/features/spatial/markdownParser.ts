export type BlockType = "h1" | "h2" | "h3" | "p" | "bullet" | "quote";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
}

let blockCounter = 0;
export const nextBlockId = (): string => `blk-${++blockCounter}`;

export function parseMarkdownToBlocks(markdown: string, existingBlocks: Block[] = []): Block[] {
  const lines = (markdown ?? "").split("\n");
  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
    return [{ id: existingBlocks[0]?.id ?? nextBlockId(), type: "p", text: "" }];
  }

  return lines.map((line, idx) => {
    const id = existingBlocks[idx]?.id ?? nextBlockId();
    if (line.startsWith("### ")) {
      return { id, type: "h3", text: line.slice(4) };
    }
    if (line.startsWith("## ")) {
      return { id, type: "h2", text: line.slice(3) };
    }
    if (line.startsWith("# ")) {
      return { id, type: "h1", text: line.slice(2) };
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return { id, type: "bullet", text: line.slice(2) };
    }
    if (line.startsWith("> ")) {
      return { id, type: "quote", text: line.slice(2) };
    }
    return { id, type: "p", text: line };
  });
}

export function serializeBlocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h1":
          return `# ${b.text}`;
        case "h2":
          return `## ${b.text}`;
        case "h3":
          return `### ${b.text}`;
        case "bullet":
          return `- ${b.text}`;
        case "quote":
          return `> ${b.text}`;
        case "p":
        default:
          return b.text;
      }
    })
    .join("\n");
}
