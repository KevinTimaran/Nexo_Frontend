import fileSaver from "file-saver";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

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

export interface BaseRunOptions {
  bold?: boolean;
  italics?: boolean;
  size?: number;
  color?: string;
  font?: string;
}

/**
 * Parses markdown inline styles: bold (**text**), italic (*text*), inline code (`code`),
 * into an array of styled docx TextRun instances.
 */
export function parseInlineFormatting(text: string, baseOptions: BaseRunOptions = {}): TextRun[] {
  if (!text) return [new TextRun({ text: "", ...baseOptions })];

  const runs: TextRun[] = [];
  // Tokenize bold (**...**), italic (*...*), code (`...`), or plain text
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|[^*`]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const part = match[0];
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      runs.push(
        new TextRun({
          ...baseOptions,
          text: part.slice(2, -2),
          bold: true,
        })
      );
    } else if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      runs.push(
        new TextRun({
          ...baseOptions,
          text: part.slice(1, -1),
          italics: true,
        })
      );
    } else if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      runs.push(
        new TextRun({
          ...baseOptions,
          text: part.slice(1, -1),
          font: "Courier New",
          color: "666666",
        })
      );
    } else {
      runs.push(
        new TextRun({
          ...baseOptions,
          text: part,
        })
      );
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, ...baseOptions })];
}

export const markdownLineToParagraph = (line: string): Paragraph => {
  const trimmed = line.trim();

  // Horizontal divider
  if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
    return new Paragraph({
      border: {
        bottom: { color: "CBD5E1", space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      spacing: { before: 180, after: 180 },
      children: [],
    });
  }

  // Heading 3
  if (trimmed.startsWith("### ")) {
    const text = trimmed.replace(/^###\s+/, "");
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: parseInlineFormatting(text, { bold: true, size: 24 }),
      spacing: { before: 200, after: 100 },
    });
  }

  // Heading 2
  if (trimmed.startsWith("## ")) {
    const text = trimmed.replace(/^##\s+/, "");
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: parseInlineFormatting(text, { bold: true, size: 28, color: "1E293B" }),
      spacing: { before: 240, after: 120 },
    });
  }

  // Heading 1
  if (trimmed.startsWith("# ")) {
    const text = trimmed.replace(/^#\s+/, "");
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: parseInlineFormatting(text, { bold: true, size: 32, color: "0F172A" }),
      spacing: { before: 320, after: 160 },
    });
  }

  // Bullet list
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    const text = trimmed.replace(/^[-*]\s+/, "");
    return new Paragraph({
      bullet: { level: 0 },
      children: parseInlineFormatting(text),
      spacing: { before: 60, after: 60 },
    });
  }

  // Numbered list
  if (/^\d+\.\s+/.test(trimmed)) {
    const text = trimmed.replace(/^\d+\.\s+/, "");
    return new Paragraph({
      bullet: { level: 0 },
      children: parseInlineFormatting(text),
      spacing: { before: 60, after: 60 },
    });
  }

  // Blockquote / Callout
  if (trimmed.startsWith("> ")) {
    const text = trimmed.replace(/^>\s+/, "");
    return new Paragraph({
      indent: { left: 720 },
      border: {
        left: { color: "94A3B8", space: 4, style: BorderStyle.SINGLE, size: 18 },
      },
      children: parseInlineFormatting(text, { italics: true, color: "475569" }),
      spacing: { before: 120, after: 120 },
    });
  }

  // Normal body line
  return new Paragraph({
    children: parseInlineFormatting(line),
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
          color: "0F172A",
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

export async function generateDocxBuffer(title: string, content: string): Promise<Buffer> {
  const doc = generateDocxDocument(title, content);
  return Packer.toBuffer(doc);
}

export interface ProjectExportNode {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  group?: string;
  kind?: string;
  description?: string;
  desc?: string;
  content?: string;
  importance?: number;
  val?: number;
  metadata?: string;
}

export interface ProjectExportLink {
  source: string | { id: string };
  target: string | { id: string };
  label?: string;
  relationship?: string;
}

export function generateProjectDocxDocument(
  project: { name: string; description?: string; id?: string },
  nodes: ProjectExportNode[] = [],
  links: ProjectExportLink[] = []
): Document {
  const projectName = project?.name || "Proyecto Nexo";
  const projectDesc = project?.description || "Espacio de trabajo conceptual e ideación estratégica.";

  const categories = ["legal", "economic", "political", "technical"];
  const categoryLabels: Record<string, string> = {
    legal: "Marco Legal y Normativo",
    economic: "Viabilidad Económica y Negocio",
    political: "Factores Políticos y Gobernanza",
    technical: "Factibilidad Técnica y Arquitectura",
  };

  const children: (Paragraph | Table)[] = [];

  // 1. Header Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: `INFORME EJECUTIVO: ${projectName}`,
          bold: true,
          size: 38,
          color: "0F172A",
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // 2. Overview Callout
  children.push(
    new Paragraph({
      indent: { left: 720 },
      border: {
        left: { color: "6366F1", space: 6, style: BorderStyle.SINGLE, size: 24 },
      },
      children: [
        new TextRun({ text: "Resumen del Proyecto: ", bold: true, color: "1E293B" }),
        new TextRun({ text: projectDesc, italics: true, color: "475569" }),
      ],
      spacing: { before: 100, after: 240 },
    })
  );

  // 3. Metadata Metrics Table
  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
  };

  const metadataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Total de Conceptos\n", bold: true, size: 20 }),
                  new TextRun({ text: `${nodes.length} nodos activos`, color: "6366F1", bold: true, size: 26 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Relaciones Semánticas\n", bold: true, size: 20 }),
                  new TextRun({ text: `${links.length} vínculos`, color: "10B981", bold: true, size: 26 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Generador\n", bold: true, size: 20 }),
                  new TextRun({ text: "Motor IA Nexo 3D", color: "8B5CF6", bold: true, size: 26 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(metadataTable);

  children.push(
    new Paragraph({
      border: {
        bottom: { color: "CBD5E1", space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      spacing: { before: 240, after: 200 },
      children: [],
    })
  );

  // 4. Categorized Concepts Sections
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: "Estructura de Conceptos por Dimensión",
          bold: true,
          size: 30,
          color: "1E293B",
        }),
      ],
      spacing: { before: 200, after: 160 },
    })
  );

  for (const cat of categories) {
    const catNodes = nodes.filter(
      (n) =>
        (n.group || "").toLowerCase() === cat ||
        (n.kind || "").toLowerCase() === cat
    );

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `${categoryLabels[cat] || cat.toUpperCase()} (${catNodes.length})`,
            bold: true,
            size: 26,
            color: "334155",
          }),
        ],
        spacing: { before: 180, after: 100 },
      })
    );

    if (catNodes.length === 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Sin conceptos mapeados en esta dimensión.",
              italics: true,
              color: "94A3B8",
            }),
          ],
          spacing: { before: 40, after: 100 },
        })
      );
    } else {
      for (const node of catNodes) {
        const nodeTitle = node.name || node.title || node.label || "Concepto";
        const nodeDesc = node.description || node.desc || "Sin descripción";
        const importance = typeof node.importance === "number" ? Math.round(node.importance * 10) : (node.val ?? 5);

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({ text: `• ${nodeTitle}`, bold: true, size: 22, color: "0F172A" }),
              new TextRun({ text: ` [Relevancia: ${importance}/10]`, color: "6366F1", bold: true, size: 18 }),
            ],
            spacing: { before: 100, after: 40 },
          })
        );

        children.push(
          new Paragraph({
            children: parseInlineFormatting(nodeDesc),
            spacing: { before: 20, after: 60 },
          })
        );

        if (node.content && node.content.trim()) {
          const contentLines = node.content.trim().split("\n");
          for (const cLine of contentLines) {
            children.push(markdownLineToParagraph(cLine));
          }
        }
      }
    }
  }

  // 5. Semantic Links / Relationships
  if (links.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: "Interconexiones y Red de Relaciones",
            bold: true,
            size: 30,
            color: "1E293B",
          }),
        ],
        spacing: { before: 260, after: 140 },
      })
    );

    for (const link of links) {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);

      const sourceName = sourceNode?.name || sourceNode?.title || sourceId;
      const targetName = targetNode?.name || targetNode?.title || targetId;
      const relLabel = link.label || link.relationship || "conecta con";

      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `${sourceName} `, bold: true }),
            new TextRun({ text: `—[${relLabel}]→ `, italics: true, color: "6366F1" }),
            new TextRun({ text: `${targetName}`, bold: true }),
          ],
          spacing: { before: 40, after: 40 },
        })
      );
    }
  }

  // 6. Professional Footer
  children.push(
    new Paragraph({
      border: {
        top: { color: "CBD5E1", space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      spacing: { before: 300, after: 80 },
      children: [
        new TextRun({
          text: `Documento generado automáticamente por Nexo Desktop • Fecha: ${new Date().toLocaleDateString("es-ES")}`,
          italics: true,
          size: 18,
          color: "94A3B8",
        }),
      ],
    })
  );

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}

export async function generateProjectDocxBlob(
  project: { name: string; description?: string; id?: string },
  nodes: ProjectExportNode[] = [],
  links: ProjectExportLink[] = []
): Promise<Blob> {
  const doc = generateProjectDocxDocument(project, nodes, links);
  return Packer.toBlob(doc);
}

export async function generateProjectDocxBuffer(
  project: { name: string; description?: string; id?: string },
  nodes: ProjectExportNode[] = [],
  links: ProjectExportLink[] = []
): Promise<Buffer> {
  const doc = generateProjectDocxDocument(project, nodes, links);
  return Packer.toBuffer(doc);
}

/**
 * Exports the entire project concept workspace into a polished .docx Word file.
 */
export async function exportProjectToDocx(
  project: { name: string; description?: string; id?: string },
  nodes: ProjectExportNode[] = [],
  links: ProjectExportLink[] = []
): Promise<void> {
  try {
    const doc = generateProjectDocxDocument(project, nodes, links);
    const safeTitle = sanitizeDocxFileName(project?.name || "informe-ejecutivo");
    const fileName = `${safeTitle}-resumen-ejecutivo.docx`;

    const save = getSaveAs();
    if (typeof window !== "undefined" && save) {
      const blob = await Packer.toBlob(doc);
      save(blob, fileName);
    } else {
      const buffer = await Packer.toBuffer(doc);
      if (save) {
        save(buffer as unknown as Blob, fileName);
      }
    }
  } catch (error) {
    console.error("Error al exportar proyecto a .docx:", error);
    throw error;
  }
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
