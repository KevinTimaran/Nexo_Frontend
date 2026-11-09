import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  sanitizeDocxFileName,
  parseInlineFormatting,
  generateDocxDocument,
  generateDocxBuffer,
  generateProjectDocxDocument,
  generateProjectDocxBuffer,
} from "../src/features/spatial/exportToDocx";

describe("Phase 07 Document Export (.docx)", () => {
  it("sanitizes filenames correctly preserving valid chars and stripping diacritics", () => {
    assert.equal(sanitizeDocxFileName("Investigación & Desarrollo"), "investigacion-desarrollo");
    assert.equal(sanitizeDocxFileName("¿Qué es Nexo 3D?"), "que-es-nexo-3d");
    assert.equal(sanitizeDocxFileName("   "), "documento");
    assert.equal(sanitizeDocxFileName("---Título---"), "titulo");
  });

  it("parses markdown inline formatting into docx TextRuns", () => {
    const runs = parseInlineFormatting("Hola **mundo** con *estilo* y `código`");
    assert.equal(runs.length, 6);
    assert.ok(runs[1] instanceof Object, "Bold run created");
    assert.ok(runs[3] instanceof Object, "Italic run created");
    assert.ok(runs[5] instanceof Object, "Code run created");
  });

  it("generates a valid binary .docx buffer for a single node document", async () => {
    const title = "Nodo: Inteligencia Artificial en Salud";
    const markdown = `# Introducción
La IA está transformando el sector salud.
## Aspectos Regulatorios
- **HIPAA**: Cumplimiento de privacidad.
- **FDA**: Certificación de algoritmos médicos.
> "La privacidad del paciente es el pilar central."
---
Conclusión y recomendaciones finales.`;

    const buffer = await generateDocxBuffer(title, markdown);
    assert.ok(Buffer.isBuffer(buffer), "Output must be a Node Buffer");
    assert.ok(buffer.length > 5000, `Buffer size (${buffer.length} bytes) must be > 5KB`);

    // Verify OpenXML ZIP header magic bytes: PK\x03\x04
    assert.equal(buffer[0], 0x50, "Magic byte 0 must be 'P'");
    assert.equal(buffer[1], 0x4b, "Magic byte 1 must be 'K'");
    assert.equal(buffer[2], 0x03, "Magic byte 2 must be 0x03");
    assert.equal(buffer[3], 0x04, "Magic byte 3 must be 0x04");
  });

  it("generates a comprehensive multi-node project executive summary (.docx)", async () => {
    const mockProject = {
      id: "proj-1",
      name: "BioTech Analytics 2026",
      description: "Plataforma de análisis genómico y diagnóstico predictivo asistido por IA.",
    };

    const mockNodes = [
      {
        id: "node-1",
        name: "Cumplimiento RGPD / HIPAA",
        group: "legal",
        importance: 0.9,
        description: "Regulaciones estrictas sobre datos de secuenciación de ADN.",
        content: "### Marco Normativo\nRequiere consentimiento explícito y auditoría inmutable.",
      },
      {
        id: "node-2",
        name: "Modelo SaaS y Costos Cloud",
        group: "economic",
        importance: 0.8,
        description: "Estructura de precios por muestra analizada y GPUs dedicadas.",
      },
      {
        id: "node-3",
        name: "Pipeline Bioinformático Nextflow",
        group: "technical",
        importance: 0.95,
        description: "Contenedores Docker y orquestación distribuida con Slurm/Kubernetes.",
      },
      {
        id: "node-4",
        name: "Aceptación Médica y Ética",
        group: "political",
        importance: 0.75,
        description: "Confianza de los colegios de médicos y bioeticistas.",
      },
    ];

    const mockLinks = [
      { source: "node-1", target: "node-3", label: "restringe arquitectura de" },
      { source: "node-2", target: "node-3", label: "financia infraestructura de" },
    ];

    const buffer = await generateProjectDocxBuffer(mockProject, mockNodes, mockLinks);
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 8000, `Project buffer size (${buffer.length} bytes) must be > 8KB`);

    // Verify ZIP magic header
    assert.equal(buffer[0], 0x50);
    assert.equal(buffer[1], 0x4b);
    assert.equal(buffer[2], 0x03);
    assert.equal(buffer[3], 0x04);
  });

  it("verifies GenerateDocumentModal has integrated Word (.docx) export button", () => {
    const modalPath = path.resolve(__dirname, "../src/features/documents/GenerateDocumentModal.tsx");
    const content = fs.readFileSync(modalPath, "utf-8");

    assert.match(content, /exportProjectToDocx/);
    assert.match(content, /Exportar Word \(\.docx\)/);
    assert.match(content, /FileDown/);
  });
});
