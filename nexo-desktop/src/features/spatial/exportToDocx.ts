import fileSaver from "file-saver";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

// Safe reference to saveAs supporting ESM, CJS and browser bundlers
const getSaveAs = () => {
  const mod = fileSaver as unknown as {
    saveAs?: (blob: Blob | Buffer, name: string) => void;
    default?: { saveAs?: (blob: Blob | Buffer, name: string) => void } | ((blob: Blob | Buffer, name: string) => void);
  };
  if (typeof mod?.saveAs === "function") return mod.saveAs;
  if (typeof mod?.default === "function") return mod.default;
  if (mod?.default && typeof mod.default.saveAs === "function") return mod.default.saveAs;
  if (typeof fileSaver === "function") return fileSaver;
  return null;
};

export function sanitizeDocxFileName(title: string): string {
  const normalized = (title?.trim() || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "documento";
}

export const markdownLineToParagraph = (line: string): Paragraph => {
  const trimmed = line.trim();

  if (trimmed.startsWith("### ")) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun({ text: trimmed.replace(/^###\s+/, ""), bold: true, size: 24 })],
      spacing: { before: 200, after: 100 },
    });
  }

  if (trimmed.startsWith("## ")) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: trimmed.replace(/^##\s+/, ""), bold: true, size: 28 })],
      spacing: { before: 240, after: 120 },
    });
  }

  if (trimmed.startsWith("# ")) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: trimmed.replace(/^#\s+/, ""), bold: true, size: 32 })],
      spacing: { before: 320, after: 160 },
    });
  }

  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return new Paragraph({
      bullet: { level: 0 },
      children: [new TextRun({ text: trimmed.replace(/^[-*]\s+/, "") })],
      spacing: { before: 60, after: 60 },
    });
  }

  if (trimmed.startsWith("> ")) {
    return new Paragraph({
      indent: { left: 720 },
      children: [new TextRun({ text: trimmed.replace(/^>\s+/, ""), italics: true })],
      spacing: { before: 120, after: 120 },
    });
  }

  return new Paragraph({
    children: [new TextRun({ text: line })],
    spacing: { before: 60, after: 80 },
  });
};

export function generateDocxDocument(title: string, content: string): Document {
  const lines = (content || "").split("\n");
  const displayTitle = title?.trim() || "Documento de Investigación Nexo";

  const sections = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: displayTitle,
          bold: true,
          size: 38,
        }),
      ],
      spacing: { after: 300 },
    }),
    ...lines.map(markdownLineToParagraph),
  ];

  return new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });
}

export async function generateDocxBlob(title: string, content: string): Promise<Blob> {
  const doc = generateDocxDocument(title, content);
  return Packer.toBlob(doc);
}

/**
 * Generates a styled Microsoft Word (.docx) file from document title & Markdown-formatted
 * content, and triggers automatic download in the user's browser/Tauri window.
 */
export async function exportToDocx(title: string, content: string): Promise<void> {
  try {
    const doc = generateDocxDocument(title, content);
    const safeTitle = sanitizeDocxFileName(title);
    const fileName = `${safeTitle}.docx`;

    const save = getSaveAs();
    if (typeof window !== "undefined" && save) {
      const blob = await Packer.toBlob(doc);
      save(blob, fileName);
    } else {
      // Fallback for headless/Node environments
      const buffer = await Packer.toBuffer(doc);
      if (save) {
        save(buffer as unknown as Blob, fileName);
      }
    }
  } catch (error) {
    console.error("Error al exportar a .docx:", error);
    throw error;
  }
}

export default exportToDocx;
