import assert from "node:assert";
import { useWorkspaceStore } from "../src/store/useWorkspaceStore";
import { DEFAULT_SPATIAL_GROUP_COLORS } from "../src/domain/spatial";
import {
  exportToDocx,
  generateDocxDocument,
  markdownLineToParagraph,
  sanitizeDocxFileName,
} from "../src/features/spatial/exportToDocx";
import {
  parseMarkdownToBlocks,
  serializeBlocksToMarkdown,
  type Block,
} from "../src/features/spatial/markdownParser";
import { Packer } from "docx";

console.log("=== PRUEBAS UNITARIAS Y DE INTEGRACIÓN ADVERSARIALES: SPATIAL HUD & ZUSTAND ===");

// ─── 1. Estado Global Zustand (Fase 1) ───
console.log("\n[1/5] Verificando estados de Zustand (useWorkspaceStore)...");

const store = useWorkspaceStore.getState();
assert.strictEqual(typeof store.isZenMode, "boolean", "isZenMode debe ser booleano");
assert.strictEqual(store.isZenMode, false, "isZenMode debe inicializarse en false");

store.toggleZenMode();
assert.strictEqual(useWorkspaceStore.getState().isZenMode, true, "toggleZenMode debe activar isZenMode");

store.setZenMode(false);
assert.strictEqual(useWorkspaceStore.getState().isZenMode, false, "setZenMode(false) debe desactivar isZenMode");

// Left panel state
assert.strictEqual(useWorkspaceStore.getState().activeLeftPanel, null, "activeLeftPanel debe iniciar en null");
store.setActiveLeftPanel("chat");
assert.strictEqual(useWorkspaceStore.getState().activeLeftPanel, "chat");
store.setActiveLeftPanel("filters");
assert.strictEqual(useWorkspaceStore.getState().activeLeftPanel, "filters");
store.setActiveLeftPanel("nodelist");
assert.strictEqual(useWorkspaceStore.getState().activeLeftPanel, "nodelist");
store.setActiveLeftPanel(null);
assert.strictEqual(useWorkspaceStore.getState().activeLeftPanel, null);

// docViewMode progressive revelation
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "hidden", "docViewMode debe iniciar en 'hidden'");
store.setDocViewMode("sidebar");
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "sidebar");
store.setDocViewMode("fullscreen");
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "fullscreen");
store.setDocViewMode("hidden");
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "hidden");

// Selection transitions & cameraFlightCount increment
const initialFlightCount = useWorkspaceStore.getState().cameraFlightCount;
store.setSelectedNode("node-alpha");
assert.strictEqual(useWorkspaceStore.getState().selectedNodeId, "node-alpha");
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "hidden", "Seleccionar nuevo nodo debe iniciar en docViewMode 'hidden' (Paso 1: MiniCard)");
assert.strictEqual(useWorkspaceStore.getState().cameraFlightCount, initialFlightCount + 1, "cameraFlightCount debe incrementarse");

store.setDocViewMode("sidebar");
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "sidebar");

// Selecting another node must reset docViewMode to hidden
store.setSelectedNode("node-beta");
assert.strictEqual(useWorkspaceStore.getState().selectedNodeId, "node-beta");
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "hidden", "Cambiar de nodo debe reiniciar a 'hidden' (MiniCard)");

// focusSpatialNode action from NodeListPanel
store.focusSpatialNode("node-gamma");
assert.strictEqual(useWorkspaceStore.getState().selectedNodeId, "node-gamma");
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "hidden");

// Deselecting node clears selection and closes doc view
store.setSelectedNode(null);
assert.strictEqual(useWorkspaceStore.getState().selectedNodeId, null);
assert.strictEqual(useWorkspaceStore.getState().docViewMode, "hidden");

console.log("✓ Estado global Zustand (isZenMode, activeLeftPanel, docViewMode, setSelectedNode, focusSpatialNode) validado.");

// ─── 2. Modificación de colores de clústeres en tiempo real (Fase 3) ───
console.log("\n[2/5] Verificando actualización de colores de clúster en tiempo real...");
const initialEngColor = store.spatialGroupColors.engineering ?? DEFAULT_SPATIAL_GROUP_COLORS.engineering;
assert.ok(initialEngColor, "Debe existir un color inicial para 'engineering'");

const testColor = "#ff007f";
store.setSpatialGroupColor("engineering", testColor);
assert.strictEqual(useWorkspaceStore.getState().spatialGroupColors.engineering, testColor, "El color debe actualizarse en el store");

// Restablecer color
store.setSpatialGroupColor("engineering", DEFAULT_SPATIAL_GROUP_COLORS.engineering);
assert.strictEqual(useWorkspaceStore.getState().spatialGroupColors.engineering, DEFAULT_SPATIAL_GROUP_COLORS.engineering);
console.log("✓ Modificación y persistencia de colores de clúster validada.");

// ─── 3. Parseo y Serialización de Bloques Markdown (Fase 5) ───
console.log("\n[3/5] Verificando parseo y serialización de atajos Markdown reales...");

const sampleMarkdown = `# Título Principal H1
## Sección Secundaria H2
### Subsección Detallada H3
- Viñeta de lista con guión
* Viñeta de lista con asterisco
> Cita textual relevante
Párrafo normal explicativo.`;

const parsedBlocks = parseMarkdownToBlocks(sampleMarkdown);
assert.strictEqual(parsedBlocks.length, 7, "Debe haber 7 bloques parseados");
assert.strictEqual(parsedBlocks[0].type, "h1");
assert.strictEqual(parsedBlocks[0].text, "Título Principal H1");
assert.strictEqual(parsedBlocks[1].type, "h2");
assert.strictEqual(parsedBlocks[1].text, "Sección Secundaria H2");
assert.strictEqual(parsedBlocks[2].type, "h3");
assert.strictEqual(parsedBlocks[2].text, "Subsección Detallada H3");
assert.strictEqual(parsedBlocks[3].type, "bullet");
assert.strictEqual(parsedBlocks[3].text, "Viñeta de lista con guión");
assert.strictEqual(parsedBlocks[4].type, "bullet");
assert.strictEqual(parsedBlocks[4].text, "Viñeta de lista con asterisco");
assert.strictEqual(parsedBlocks[5].type, "quote");
assert.strictEqual(parsedBlocks[5].text, "Cita textual relevante");
assert.strictEqual(parsedBlocks[6].type, "p");
assert.strictEqual(parsedBlocks[6].text, "Párrafo normal explicativo.");

const serialized = serializeBlocksToMarkdown(parsedBlocks);
assert.ok(serialized.includes("# Título Principal H1"));
assert.ok(serialized.includes("## Sección Secundaria H2"));
assert.ok(serialized.includes("### Subsección Detallada H3"));
assert.ok(serialized.includes("- Viñeta de lista con guión"));
assert.ok(serialized.includes("> Cita textual relevante"));
assert.ok(serialized.includes("Párrafo normal explicativo."));

// Test empty markdown fallback
const emptyBlocks = parseMarkdownToBlocks("");
assert.strictEqual(emptyBlocks.length, 1);
assert.strictEqual(emptyBlocks[0].type, "p");
assert.strictEqual(emptyBlocks[0].text, "");

// Test stable block ID preservation across re-parses
const secondPass = parseMarkdownToBlocks(sampleMarkdown, parsedBlocks);
assert.strictEqual(secondPass[0].id, parsedBlocks[0].id, "IDs de bloque deben preservarse para estabilidad de React DOM");
assert.strictEqual(secondPass[1].id, parsedBlocks[1].id);

console.log("✓ Parseo y serialización de atajos Markdown reales verificados exitosamente.");

// ─── 4. Sanitización de Nombres de Archivo .docx (Fase 5) ───
console.log("\n[4/5] Verificando sanitización robusta de nombres de archivo .docx...");

assert.strictEqual(sanitizeDocxFileName("Arquitectura 3D"), "arquitectura-3d");
assert.strictEqual(sanitizeDocxFileName("Investigación & Desarrollo: Nexo"), "investigacion-desarrollo-nexo");
assert.strictEqual(sanitizeDocxFileName("🚀 Neural AI Engine"), "neural-ai-engine");
assert.strictEqual(sanitizeDocxFileName("---Título---"), "titulo");
assert.strictEqual(sanitizeDocxFileName("   "), "documento");
assert.strictEqual(sanitizeDocxFileName(""), "documento");

console.log("✓ Sanitización de nombres de archivo validada en todos los casos de borde.");

// ─── 5. Generación Real de Documento Word (.docx) mediante librería docx ───
console.log("\n[5/5] Verificando generación binaria real de .docx (exportToDocx)...");

async function testDocxDirect() {
  const title = "Documento de Prueba 3D";
  const content = `# Visión del Sistema
## Módulos de Arquitectura
- Graph Engine Three.js
- Glassmorphism Glisse
> "El diseño espacial es el futuro de la cognición humana."
Texto final de prueba.`;

  const doc = generateDocxDocument(title, content);
  assert.ok(doc, "El documento generado por generateDocxDocument debe ser válido");

  const buffer = await Packer.toBuffer(doc);
  assert.ok(buffer.length > 5000, `El archivo .docx debe tener un tamaño binario válido (>5000 bytes, obtuvo ${buffer.length})`);
  console.log(`✓ Archivo .docx generado exitosamente con generateDocxDocument (tamaño: ${buffer.length} bytes).`);

  // Verify exportToDocx function is callable
  assert.strictEqual(typeof exportToDocx, "function");
  await exportToDocx("Test Title", content);
  console.log("✓ exportToDocx se ejecutó correctamente sin excepciones.");
}

testDocxDirect()
  .then(() => {
    console.log("\n=======================================================");
    console.log("✨ ¡TODAS LAS PRUEBAS ADVERSARIALES PASARON CON ÉXITO! ✨");
    console.log("=======================================================\n");
  })
  .catch((err) => {
    console.error("❌ Falló la prueba:", err);
    process.exit(1);
  });
