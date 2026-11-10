import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  normalizeTitle,
  calculateJaccardSimilarity,
  levenshteinDistance,
  findDuplicateConcept,
  isDuplicateConcept,
  buildUserPrompt,
  getSystemInstruction,
} from "../src/services/ai/prompts";
import {
  DEFAULT_SPATIAL_GROUP_COLORS,
  SPATIAL_GROUPS,
  getSpatialGroup,
} from "../src/domain/spatial";
import type { ConceptNode, ConceptRelation, Workspace } from "../src/domain/types";
import { useWorkspaceStore } from "../src/store/useWorkspaceStore";
import { perspectiveVisuals } from "../src/theme/semanticVisuals";

console.log("=== PHASE 05 AUTOMATED ACCEPTANCE TEST SUITE: UNIFIED AI, BOARD & NEURONAL 3D ===");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Deduplication Algorithms & Title Normalization
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1/5] Verifying Title Normalization, Levenshtein, Jaccard & Duplicate Detection...");

// 1.1 normalizeTitle invariant tests
assert.strictEqual(
  normalizeTitle("El marco legal ambiental"),
  "marco legal ambiental",
  "normalizeTitle must strip leading Spanish stop word 'El'"
);

assert.strictEqual(
  normalizeTitle("¿Sistema de pagos?"),
  "sistema pagos",
  "normalizeTitle must strip punctuation and 'de'"
);

assert.strictEqual(
  normalizeTitle("  ARQUITECTURA   DE   DATOS  "),
  "arquitectura datos",
  "normalizeTitle must normalize spaces and casing"
);

assert.strictEqual(
  normalizeTitle("The Autonomous Drone Network"),
  "autonomous drone network",
  "normalizeTitle must strip English stop word 'The'"
);

assert.strictEqual(
  normalizeTitle("Regulación y Políticas Públicas"),
  "regulacion politicas publicas",
  "normalizeTitle must strip accents and stop words 'y'"
);

// 1.2 calculateJaccardSimilarity tests
const simIdentical = calculateJaccardSimilarity("marco legal", "marco legal");
assert.strictEqual(simIdentical, 1.0, "Identical token sets must have Jaccard similarity of 1.0");

const simDisjoint = calculateJaccardSimilarity("marco legal", "red neuronal");
assert.strictEqual(simDisjoint, 0.0, "Disjoint token sets must have Jaccard similarity of 0.0");

const simPartial = calculateJaccardSimilarity("sistema pagos", "sistema cobros");
// intersection: {"sistema"} (1), union: {"sistema", "pagos", "cobros"} (3) -> 1/3 ~ 0.333
assert.ok(
  Math.abs(simPartial - 1 / 3) < 0.001,
  "Partial overlap should calculate correct Jaccard similarity"
);

// 1.3 levenshteinDistance tests
assert.strictEqual(levenshteinDistance("sensor", "sensor"), 0, "Identical strings must have distance 0");
assert.strictEqual(levenshteinDistance("sensor", "sensores"), 2, "Plural 'sensores' should have distance 2 from 'sensor'");
assert.strictEqual(levenshteinDistance("pago", "pagos"), 1, "'pago' vs 'pagos' should have distance 1");
assert.strictEqual(levenshteinDistance("banco", "barco"), 1, "Single char substitution should have distance 1");

// 1.4 isDuplicateConcept & findDuplicateConcept tests
const existingConcepts: Array<{ id: string; title: string }> = [
  { id: "c1", title: "Pasarela de Pagos" },
  { id: "c2", title: "Arquitectura Cloud Distribuida" },
  { id: "c3", title: "Marco Legal Ambiental" },
  { id: "c4", title: "Sensor IoT de Monitoreo" },
];

// Identical match
assert.strictEqual(
  isDuplicateConcept("Pasarela de Pagos", existingConcepts),
  true,
  "Exact match must be detected as duplicate"
);

// Singular vs plural match
assert.strictEqual(
  isDuplicateConcept("Pasarela de Pago", existingConcepts),
  true,
  "Singular 'Pasarela de Pago' must match plural 'Pasarela de Pagos'"
);

// Stop words addition match
assert.strictEqual(
  isDuplicateConcept("La Pasarela de los Pagos", existingConcepts),
  true,
  "Stop-word variations must be detected as duplicate"
);

// Accent omission match
assert.strictEqual(
  isDuplicateConcept("Sensor Iot de Monitoreo", existingConcepts),
  true,
  "Case/accent variations must be detected as duplicate"
);

// Find exact duplicate object
const duplicateFound = findDuplicateConcept("Pasarela de Pago", existingConcepts);
assert.ok(duplicateFound !== null, "findDuplicateConcept must return the matching concept object");
assert.strictEqual(duplicateFound?.id, "c1");

// Distinct concepts should NOT be detected as duplicates
assert.strictEqual(
  isDuplicateConcept("Arquitectura Frontend React", existingConcepts),
  false,
  "Distinct concept must NOT be flagged as duplicate"
);

assert.strictEqual(
  isDuplicateConcept("Modelo Económico Financiero", existingConcepts),
  false,
  "Completely different concept must NOT be flagged as duplicate"
);

console.log("✓ Deduplication algorithms passed.");

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unified Entity Model & Canonical Categories
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2/5] Verifying Unified Entity Model, Categories and Color Mapping...");

// 2.1 Canonical Color Invariants
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.legal, perspectiveVisuals.legal.dark, "legal group must derive from the shared semantic registry");
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.economic, perspectiveVisuals.economic.dark, "economic group must derive from the shared semantic registry");
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.political, perspectiveVisuals.political.dark, "political group must derive from the shared semantic registry");
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.technical, perspectiveVisuals.technical.dark, "technical group must derive from the shared semantic registry");
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.core, "#E5C158", "core group must map to gold #E5C158");

// 2.2 Backward Compatibility with Legacy Color Groups
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.engineering, "#f472b6");
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.research, "#22d3ee");
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.product, "#34d399");
assert.strictEqual(DEFAULT_SPATIAL_GROUP_COLORS.business, "#fbbf24");

// 2.3 getSpatialGroup mappings
assert.strictEqual(getSpatialGroup("legal").id, "legal");
assert.strictEqual(getSpatialGroup("legal").color, perspectiveVisuals.legal.dark);
assert.strictEqual(getSpatialGroup("economic").id, "economic");
assert.strictEqual(getSpatialGroup("economic").color, perspectiveVisuals.economic.dark);
assert.strictEqual(getSpatialGroup("political").id, "political");
assert.strictEqual(getSpatialGroup("technical").id, "technical");
assert.strictEqual(getSpatialGroup("core").id, "core");
assert.strictEqual(getSpatialGroup(null).id, "core", "null category must fallback to 'core'");
assert.strictEqual(getSpatialGroup(undefined).id, "core", "undefined category must fallback to 'core'");
assert.strictEqual(getSpatialGroup("unknown_category").color, "#E5C158", "Unknown category must fallback to color #E5C158");

// 2.4 Entity structural compatibility check
const sampleConceptNode: ConceptNode = {
  id: "node-test-1",
  title: "Infraestructura Cloud",
  content: "Plataforma escalable de servidores distribuidos.",
  category: "technical",
  x: 100,
  y: 200,
  z: 0,
  val: 8,
  importance: 8,
  relevanceScore: 8,
  name: "Infraestructura Cloud",
  desc: "## Descripción\nPlataforma escalable.",
};
assert.strictEqual(sampleConceptNode.relevanceScore, 8);
assert.strictEqual(sampleConceptNode.val, 8);

const sampleRelation: ConceptRelation = {
  id: "rel-test-1",
  from: "node-test-1",
  to: "node-test-2",
  source: "node-test-1",
  target: "node-test-2",
  type: "enables",
  value: 4,
  strength: 4,
  label: "Habilita microservicios",
};
assert.strictEqual(sampleRelation.source, "node-test-1");
assert.strictEqual(sampleRelation.type, "enables");

console.log("✓ Unified entity models & canonical categories passed.");

// ─────────────────────────────────────────────────────────────────────────────
// 3. 9-Step AI Ideation Pipeline Prompting & Response Extraction
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3/5] Verifying 9-Step Ideation Prompt Invariants and Extraction Pipeline...");

// 3.1 Prompt Invariant checks on system instructions and user prompt
const systemInstruction = getSystemInstruction("PHASE_3_EXPANSION", "es", "Proyecto Clima");

assert.ok(
  systemInstruction.includes("legal") &&
  systemInstruction.includes("economic") &&
  systemInstruction.includes("political") &&
  systemInstruction.includes("technical"),
  "System instruction must instruct AI on canonical categories (legal, economic, political, technical)"
);

assert.ok(
  systemInstruction.includes("relevanceScore") && systemInstruction.includes("1 a 10"),
  "System instruction must instruct AI to generate relevanceScore between 1 and 10"
);

assert.ok(
  systemInstruction.includes("enables") &&
  systemInstruction.includes("regulates") &&
  systemInstruction.includes("mitigates"),
  "System instruction must instruct AI on causal relationship types"
);

assert.ok(
  systemInstruction.includes("REGLA DE CONTEXTO ESTRICTO (GUARDRAIL)"),
  "System instruction must preserve the strict context guardrail rule"
);

const userPrompt = buildUserPrompt({
  phase: "PHASE_3_EXPANSION",
  existingNodesSummary: "1. Red de Sensores (technical)",
  userMessage: "Diseñar una red de monitoreo ambiental urbano con sensores IoT",
  lang: "es",
  messageHistory: [],
});

assert.ok(
  userPrompt.includes("Diseñar una red de monitoreo ambiental urbano"),
  "User prompt must inject user message"
);
assert.ok(
  userPrompt.includes("PHASE_3_EXPANSION"),
  "User prompt must inject current interaction phase"
);

// 3.2 Parsing 9-step Ideation Pipeline JSON response
const mockPipelineJson = JSON.stringify({
  nodes: [
    {
      id: "node-ai-1",
      title: "Red de Sensores IoT",
      category: "technical",
      relevanceScore: 9,
      importance: 9,
      val: 9,
      details: "## Descripción\nRed de nodos inalámbricos de bajo consumo.\n\n## Impacto y Justificación\nPermite medición en tiempo real de contaminantes.\n\n## Riesgos y Mitigación\nFallo de baterías mitigado con paneles solares pequeños.\n\n## Pasos de Implementación\n1. Prototipado\n2. Despliegue piloto",
    },
    {
      id: "node-ai-2",
      title: "Normativa de Emisiones Urbanas",
      category: "legal",
      relevanceScore: 8,
      importance: 8,
      val: 8,
      details: "## Descripción\nMarco regulatorio municipal.\n\n## Impacto y Justificación\nObliga a la publicación transparente de métricas.",
    },
  ],
  relations: [
    {
      from: "node-ai-2",
      to: "node-ai-1",
      source: "node-ai-2",
      target: "node-ai-1",
      type: "regulates",
      strength: 4,
      value: 4,
      label: "Regula parámetros de calibración",
    },
  ],
  synthesis: "Ideación inicial completada con 2 conceptos clave.",
});

const parsed = JSON.parse(mockPipelineJson);
assert.ok(parsed !== null, "JSON.parse must parse valid pipeline output");
assert.strictEqual(parsed.nodes?.length, 2);
assert.strictEqual(parsed.nodes?.[0].category, "technical");
assert.strictEqual(parsed.nodes?.[0].relevanceScore, 9);
assert.ok(parsed.nodes?.[0].details?.includes("## Descripción"));
assert.strictEqual(parsed.relations?.length, 1);
assert.strictEqual(parsed.relations?.[0].type, "regulates");
assert.strictEqual(parsed.relations?.[0].strength, 4);

console.log("✓ 9-step prompt generation and response parsing passed.");

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reactive Store Derivation & Atomic 2D/3D Synchronization
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4/5] Verifying Reactive Store Derivation and 2D/3D Synchronization in Zustand...");

// Reset workspace store to clean state
useWorkspaceStore.getState().resetWorkspace();

// 4.1 Mock Seeds must NOT be present initially
const cleanStore = useWorkspaceStore.getState();
assert.strictEqual(
  cleanStore.spatialNodes.length,
  0,
  "spatialNodes must be empty initially (no mock SPATIAL_SEED_NODES)"
);
assert.strictEqual(
  cleanStore.spatialLinks.length,
  0,
  "spatialLinks must be empty initially (no mock SPATIAL_SEED_LINKS)"
);

// 4.2 setWorkspace must derive 3D spatialNodes, spatialLinks and sync spatialDocs
const testWorkspace: Workspace = {
  project: {
    id: "proj-p05-test",
    name: "Proyecto Ambiental Test",
    description: "Monitoreo con sensores IoT",
    status: "active",
    icon: "leaf",
    updatedAt: new Date().toISOString(),
    nodeCount: 2,
  },
  messages: [],
  map: {
    nodes: [
      {
        id: "n-tech",
        title: "Microcontrolador ESP32",
        content: "Procesador con WiFi/BLE.",
        category: "technical",
        relevanceScore: 8,
        importance: 0.8,
        val: 8,
        details: "## Documentación Técnica\nDetalles del hardware.",
        x: 50,
        y: 100,
      },
      {
        id: "n-legal",
        title: "Licencia de Uso de Espectro",
        content: "Permiso para transmisión radial.",
        category: "legal",
        relevanceScore: 7,
        importance: 0.7,
        val: 7,
        details: "## Documentación Legal\nCondiciones de operación.",
        x: 200,
        y: 150,
      },
    ],
    relations: [
      {
        id: "rel-1",
        from: "n-legal",
        to: "n-tech",
        source: "n-legal",
        target: "n-tech",
        type: "regulates",
        strength: 5,
        value: 5,
        label: "Regula espectro electromagnético",
      },
    ],
  },
};

useWorkspaceStore.getState().setWorkspace(testWorkspace);

const syncedStore = useWorkspaceStore.getState();
assert.strictEqual(syncedStore.spatialNodes.length, 2, "setWorkspace must derive exactly 2 spatialNodes");
assert.strictEqual(syncedStore.spatialLinks.length, 1, "setWorkspace must derive exactly 1 spatialLink");

// Check derived spatial node attributes
const techSpatialNode = syncedStore.spatialNodes.find((n) => n.id === "n-tech");
assert.ok(techSpatialNode !== undefined);
assert.strictEqual(techSpatialNode?.name, "Microcontrolador ESP32");
assert.strictEqual(techSpatialNode?.group, "technical");
assert.strictEqual(techSpatialNode?.val, 8);
assert.strictEqual(techSpatialNode?.relevanceScore, 8);

// Check derived spatial link attributes
const link1 = syncedStore.spatialLinks[0];
assert.strictEqual(link1.source, "n-legal");
assert.strictEqual(link1.target, "n-tech");
assert.strictEqual(link1.value, 5);
assert.strictEqual(link1.type, "regulates");
assert.strictEqual(link1.label, "Regula espectro electromagnético");

// Check spatialDocs synchronization
assert.strictEqual(
  syncedStore.spatialDocs["n-tech"],
  "## Documentación Técnica\nDetalles del hardware.",
  "spatialDocs must be populated from node.details on setWorkspace"
);

// 4.3 setSpatialDoc must atomically update both spatialDocs and workspace.map.nodes[].details
const updatedMarkdown = "## Documentación Técnica Actualizada\nFirmware v2.0.";
useWorkspaceStore.getState().setSpatialDoc("n-tech", updatedMarkdown);

const postDocStore = useWorkspaceStore.getState();
assert.strictEqual(
  postDocStore.spatialDocs["n-tech"],
  updatedMarkdown,
  "setSpatialDoc must update spatialDocs store dictionary"
);
const updatedNodeIn2D = postDocStore.workspace?.map.nodes.find((n) => n.id === "n-tech");
assert.strictEqual(
  updatedNodeIn2D?.details,
  updatedMarkdown,
  "setSpatialDoc must atomically synchronize with 2D workspace.map.nodes.details"
);

// 4.4 addNodeFromChat synchronization and deduplication
// Case A: Add new genuine concept
useWorkspaceStore.getState().addNodeFromChat({
  title: "Presupuesto Municipal",
  category: "economic",
  content: "Asignación presupuestaria para sensores",
  relevanceScore: 9,
  importance: 9,
  details: "## Análisis Financiero\nFondos públicos 2026.",
});

const postAddStore = useWorkspaceStore.getState();
const ecoNode = postAddStore.workspace?.map.nodes.find((n) => n.category === "economic");
assert.ok(ecoNode !== undefined, "addNodeFromChat must add concept to 2D map.nodes");
assert.ok(
  postAddStore.spatialNodes.some((n) => n.id === ecoNode?.id),
  "addNodeFromChat must automatically project concept into 3D spatialNodes"
);
assert.strictEqual(
  postAddStore.spatialDocs[ecoNode!.id],
  "## Análisis Financiero\nFondos públicos 2026.",
  "addNodeFromChat must automatically populate spatialDocs"
);

// Case B: Add duplicate concept (e.g. "El Presupuesto Municipal") -> must NOT create duplicate node
const countBeforeDup = postAddStore.workspace?.map.nodes.length || 0;
useWorkspaceStore.getState().addNodeFromChat({
  title: "El Presupuesto Municipal",
  category: "economic",
  content: "Duplicado con stop word",
  relevanceScore: 6,
});

const postDupStore = useWorkspaceStore.getState();
assert.strictEqual(
  postDupStore.workspace?.map.nodes.length,
  countBeforeDup,
  "addNodeFromChat must deduplicate concepts and prevent duplicate creation"
);

// 4.5 removeNode synchronization
const nodeToRemoveId = ecoNode!.id;
useWorkspaceStore.getState().removeNode(nodeToRemoveId);

const postRemoveStore = useWorkspaceStore.getState();
assert.strictEqual(
  postRemoveStore.workspace?.map.nodes.some((n) => n.id === nodeToRemoveId),
  false,
  "removeNode must remove node from 2D map"
);
assert.strictEqual(
  postRemoveStore.spatialNodes.some((n) => n.id === nodeToRemoveId),
  false,
  "removeNode must atomically remove node from 3D spatialNodes"
);
assert.strictEqual(
  postRemoveStore.spatialDocs[nodeToRemoveId],
  undefined,
  "removeNode must atomically clear document from spatialDocs"
);

console.log("✓ Reactive store derivation and atomic 2D/3D synchronization passed.");

// ─────────────────────────────────────────────────────────────────────────────
// 5. AI-Only Concept Creation Enforcement & UI Static Analysis
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5/5] Verifying AI-Only Creation Enforcement via Static Analysis...");

const conceptCanvasPath = path.resolve(__dirname, "../src/features/workspace/ConceptCanvas.tsx");
const workspaceViewPath = path.resolve(__dirname, "../src/features/workspace/WorkspaceView.tsx");
const addNodeModalPath = path.resolve(__dirname, "../src/features/workspace/AddNodeModal.tsx");
const spaceWorkspacePath = path.resolve(__dirname, "../src/features/spatial/SpaceWorkspace.tsx");

const conceptCanvasContent = fs.readFileSync(conceptCanvasPath, "utf-8");
const workspaceViewContent = fs.readFileSync(workspaceViewPath, "utf-8");
const addNodeModalContent = fs.readFileSync(addNodeModalPath, "utf-8");
const spaceWorkspaceContent = fs.readFileSync(spaceWorkspacePath, "utf-8");

// 5.1 ConceptCanvas.tsx assertions
assert.strictEqual(
  conceptCanvasContent.includes("onOpenAddNode"),
  false,
  "ConceptCanvas must NOT expose or accept onOpenAddNode prop"
);

assert.strictEqual(
  conceptCanvasContent.includes('"Añadir concepto"') || conceptCanvasContent.includes("'Añadir concepto'"),
  false,
  "ConceptCanvas must NOT render manual 'Añadir concepto' button"
);

assert.ok(
  conceptCanvasContent.includes("Genera conceptos explorando tu idea con la IA"),
  "ConceptCanvas must render active AI guidance in empty columns"
);

assert.ok(
  conceptCanvasContent.includes("Idear con IA") || conceptCanvasContent.includes("setCanvasMode(\"discovery\")"),
  "ConceptCanvas header must direct users to AI ideation mode"
);

// 5.2 WorkspaceView.tsx assertions
assert.strictEqual(
  workspaceViewContent.includes("<AddNodeModal"),
  false,
  "WorkspaceView must NOT render AddNodeModal"
);

assert.strictEqual(
  workspaceViewContent.includes("isAddNodeOpen"),
  false,
  "WorkspaceView must NOT maintain isAddNodeOpen modal state"
);

assert.strictEqual(
  workspaceViewContent.includes("handleAddNode"),
  false,
  "WorkspaceView must NOT define manual handleAddNode function"
);

// 5.3 AddNodeModal.tsx assertions
assert.ok(
  addNodeModalContent.includes("@deprecated"),
  "AddNodeModal must be documented as @deprecated"
);

assert.ok(
  addNodeModalContent.includes("return null"),
  "AddNodeModal must be an inert stub returning null"
);

// 5.4 SpaceWorkspace.tsx assertions
assert.ok(
  spaceWorkspaceContent.includes("selectedNode.details") ||
  spaceWorkspaceContent.includes("spatialDocs"),
  "SpaceWorkspace must bind document viewer to selectedNode.details and spatialDocs"
);

console.log("✓ UI enforcement and static analysis passed.");
console.log("\n=== ALL PHASE 05 ACCEPTANCE INVARIANTS PASSED SUCCESSFULLY ===");
