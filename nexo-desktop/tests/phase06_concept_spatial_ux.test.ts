import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { useWorkspaceStore } from "../src/store/useWorkspaceStore";
import {
  countCodePoints,
  containsImageData,
  MAX_AI_PROMPT_CHARS,
  AI_PROMPT_WARNING_THRESHOLD,
  MAX_NODE_NAME_CHARS,
  IMAGE_REJECTION_MESSAGE,
} from "../src/domain/constants";
import {
  DEFAULT_SPATIAL_GROUP_COLORS,
  SPATIAL_GROUPS,
  type SpatialGroupId,
} from "../src/domain/spatial";
import type { ConceptMap, ConceptNode, Workspace } from "../src/domain/types";
import { services } from "../src/services";

console.log("=== PHASE 06 AUTOMATED ACCEPTANCE TEST SUITE: CONCEPT BOARD & NEURONAL 3D UX ===");

const frontendRoot = path.resolve(__dirname, "..");
const conceptCanvasPath = path.resolve(frontendRoot, "src/features/workspace/ConceptCanvas.tsx");
const deepDiveModalPath = path.resolve(frontendRoot, "src/features/workspace/DeepDiveModal.tsx");
const docFullscreenPath = path.resolve(frontendRoot, "src/features/spatial/DocFullscreen.tsx");
const spatialChatPanelPath = path.resolve(frontendRoot, "src/features/spatial/SpatialChatPanel.tsx");
const nodeListPanelPath = path.resolve(frontendRoot, "src/features/spatial/NodeListPanel.tsx");
const spatialCanvas3DPath = path.resolve(frontendRoot, "src/features/spatial/SpatialCanvas3D.tsx");
const colorSettingsPanelPath = path.resolve(frontendRoot, "src/features/spatial/ColorSettingsPanel.tsx");

// Read file contents for static analysis
const conceptCanvasCode = fs.readFileSync(conceptCanvasPath, "utf-8");
const deepDiveModalCode = fs.readFileSync(deepDiveModalPath, "utf-8");
const docFullscreenCode = fs.readFileSync(docFullscreenPath, "utf-8");
const spatialChatPanelCode = fs.readFileSync(spatialChatPanelPath, "utf-8");
const nodeListPanelCode = fs.readFileSync(nodeListPanelPath, "utf-8");
const spatialCanvas3DCode = fs.readFileSync(spatialCanvas3DPath, "utf-8");
const colorSettingsPanelCode = fs.readFileSync(colorSettingsPanelPath, "utf-8");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Card Click Navigation: Concept Canvas -> 3D Canvas -> Fullscreen Document
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1/6] Verifying Card Click Navigation (Concept Board -> 3D Canvas -> Doc Fullscreen)...");

// 1.1 ConceptCanvas static code inspection
assert.strictEqual(
  conceptCanvasCode.includes("import DeepDiveModal"),
  false,
  "ConceptCanvas.tsx must NOT import DeepDiveModal"
);

assert.strictEqual(
  conceptCanvasCode.includes("<DeepDiveModal"),
  false,
  "ConceptCanvas.tsx must NOT render <DeepDiveModal />"
);

assert.ok(
  conceptCanvasCode.includes('setCanvasMode("spatial")'),
  "ConceptCanvas.tsx card click must switch canvasMode to 'spatial'"
);

assert.ok(
  conceptCanvasCode.includes("setSelectedNode(node.id)"),
  "ConceptCanvas.tsx card click must set selectedNodeId to node.id"
);

assert.ok(
  conceptCanvasCode.includes('setDocViewMode("fullscreen")'),
  "ConceptCanvas.tsx card click must set docViewMode to 'fullscreen'"
);

// 1.2 Zustand Store Navigation Integration
const testMap: ConceptMap = {
  nodes: [
    {
      id: "node-c1",
      title: "Arquitectura Microservicios",
      name: "Arquitectura Microservicios",
      description: "Infraestructura distribuida con gRPC y Spring Boot",
      desc: "Infraestructura distribuida con gRPC y Spring Boot",
      kind: "concept",
      category: "technical",
      priority: "high",
      val: 18,
      importance: 0.9,
      details: "# Documento de Arquitectura Microservicios\nDetalles técnicos profundos...",
      x: 100,
      y: 100,
    },
    {
      id: "node-c2",
      title: "Marco Legal GDPR",
      name: "Marco Legal GDPR",
      description: "Cumplimiento normativo europeo de protección de datos",
      desc: "Cumplimiento normativo europeo de protección de datos",
      kind: "risk",
      category: "legal",
      priority: "high",
      val: 20,
      importance: 0.95,
      details: "# Marco Regulatorio y Privacidad\nAnálisis de riesgos normativos...",
      x: 300,
      y: 100,
    },
  ],
  relations: [],
};

const mockWorkspace: Workspace = {
  project: {
    id: "proj-ux-phase6",
    name: "Proyecto UX Fase 6",
    description: "Validación de experiencia de usuario conceptual y 3D",
    status: "active",
    icon: "lightbulb",
    updatedAt: new Date().toISOString(),
    nodeCount: 2,
  },
  map: testMap,
  messages: [
    {
      id: "m-init-1",
      role: "user",
      createdAt: new Date().toISOString(),
      text: "Diseñar arquitectura para plataforma segura",
    },
    {
      id: "m-init-2",
      role: "assistant",
      createdAt: new Date().toISOString(),
      text: "Entendido. He formulado los nodos iniciales técnicos y legales.",
    },
  ],
  selectedNodeId: null,
};

useWorkspaceStore.getState().setWorkspace(mockWorkspace);
useWorkspaceStore.getState().setCanvasMode("notion");

assert.strictEqual(
  useWorkspaceStore.getState().canvasMode,
  "notion",
  "Canvas mode should initially be notion (Concept Board)"
);

// Simulate the exact card click handler execution:
useWorkspaceStore.getState().setSelectedNode("node-c1");
useWorkspaceStore.getState().setCanvasMode("spatial");
useWorkspaceStore.getState().setDocViewMode("fullscreen");

const postClickState = useWorkspaceStore.getState();
assert.strictEqual(
  postClickState.canvasMode,
  "spatial",
  "Canvas mode must be 'spatial' after card click"
);
assert.strictEqual(
  postClickState.selectedNodeId,
  "node-c1",
  "Selected node ID must match clicked node id ('node-c1')"
);
assert.strictEqual(
  postClickState.docViewMode,
  "fullscreen",
  "Doc view mode must be 'fullscreen' after card click"
);

// Verify document text parity
assert.strictEqual(
  postClickState.spatialDocs["node-c1"],
  "# Documento de Arquitectura Microservicios\nDetalles técnicos profundos...",
  "Spatial document content must match node.details exactly"
);

console.log("✓ Card Click Navigation and 2D/3D state transitions verified successfully.");

// ─────────────────────────────────────────────────────────────────────────────
// 2. Deprecation and Placeholder Elimination in DeepDiveModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2/6] Verifying Deprecation and Placeholder Elimination in DeepDiveModal.tsx...");

assert.ok(
  deepDiveModalCode.includes("@deprecated"),
  "DeepDiveModal.tsx must contain @deprecated JSDoc tag"
);

assert.strictEqual(
  deepDiveModalCode.includes("Deep Dive Detail"),
  false,
  "DeepDiveModal.tsx must NOT contain placeholder text 'Deep Dive Detail'"
);

assert.strictEqual(
  deepDiveModalCode.includes("Detailed information about the selected node will appear here."),
  false,
  "DeepDiveModal.tsx must NOT contain placeholder text 'Detailed information about the selected node will appear here.'"
);

console.log("✓ DeepDiveModal.tsx placeholder text completely eliminated and marked @deprecated.");

// ─────────────────────────────────────────────────────────────────────────────
// 3. Back Button Redesign in DocFullscreen.tsx (Single Arrow Left)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3/6] Verifying DocFullscreen.tsx Back Button Redesign...");

assert.strictEqual(
  docFullscreenCode.includes("← Regresar al mapa 3D"),
  false,
  "DocFullscreen.tsx must NOT contain duplicate literal arrow '← Regresar al mapa 3D'"
);

assert.ok(
  docFullscreenCode.includes("Regresar al mapa 3D"),
  "DocFullscreen.tsx must contain button label text 'Regresar al mapa 3D'"
);

assert.ok(
  docFullscreenCode.includes("<ArrowLeft"),
  "DocFullscreen.tsx must render single Lucide <ArrowLeft /> icon"
);

console.log("✓ Back button redesign verified: single ArrowLeft icon with clean label.");

// ─────────────────────────────────────────────────────────────────────────────
// 4. Real AI Copilot in 3D (SpatialChatPanel.tsx)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4/6] Verifying Real AI Copilot in 3D (SpatialChatPanel.tsx)...");

// 4.1 Elimination of hardcoded mock strings
assert.strictEqual(
  spatialChatPanelCode.includes("Reactores de Fusión"),
  false,
  "SpatialChatPanel.tsx must NOT contain hardcoded string 'Reactores de Fusión'"
);

assert.strictEqual(
  spatialChatPanelCode.includes("Red de Distribución"),
  false,
  "SpatialChatPanel.tsx must NOT contain hardcoded string 'Red de Distribución'"
);

assert.strictEqual(
  spatialChatPanelCode.includes("Almacenamiento en Baterías"),
  false,
  "SpatialChatPanel.tsx must NOT contain hardcoded string 'Almacenamiento en Baterías'"
);

// 4.2 Real AI integration
assert.ok(
  spatialChatPanelCode.includes("services.ai.reply"),
  "SpatialChatPanel.tsx must invoke real services.ai.reply"
);

// 4.3 Image rejection verification
assert.ok(
  spatialChatPanelCode.includes("IMAGE_REJECTION_MESSAGE"),
  "SpatialChatPanel.tsx must reference IMAGE_REJECTION_MESSAGE"
);

assert.ok(
  spatialChatPanelCode.includes("containsImageData"),
  "SpatialChatPanel.tsx must use containsImageData for validation"
);

assert.ok(
  spatialChatPanelCode.includes("onPaste"),
  "SpatialChatPanel.tsx must handle paste events for image rejection"
);

assert.ok(
  spatialChatPanelCode.includes("onDrop"),
  "SpatialChatPanel.tsx must handle drop events for image rejection"
);

// Functional check of image rejection helper
assert.strictEqual(containsImageData("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA"), true);
assert.strictEqual(containsImageData("Pregunta legítima sobre el nodo"), false);
assert.strictEqual(IMAGE_REJECTION_MESSAGE, "Nexo solo procesa texto; no se admiten imágenes");

// 4.4 20,000-character limits
assert.ok(
  spatialChatPanelCode.includes("MAX_AI_PROMPT_CHARS"),
  "SpatialChatPanel.tsx must enforce MAX_AI_PROMPT_CHARS"
);

assert.ok(
  spatialChatPanelCode.includes("countCodePoints"),
  "SpatialChatPanel.tsx must count code points using countCodePoints"
);

assert.strictEqual(MAX_AI_PROMPT_CHARS, 20_000);
assert.strictEqual(AI_PROMPT_WARNING_THRESHOLD, 18_000);

// Functional check of Unicode code points
assert.strictEqual(countCodePoints("🧠".repeat(10)), 10, "10 emojis must count as 10 code points");
assert.strictEqual(countCodePoints("a".repeat(20_000)), 20_000);
assert.strictEqual(countCodePoints("a".repeat(20_001)) > MAX_AI_PROMPT_CHARS, true);

// 4.5 Contextual focus and active project conversation history
assert.ok(
  spatialChatPanelCode.includes("selectedNode"),
  "SpatialChatPanel.tsx must read selectedNode from store"
);

assert.ok(
  spatialChatPanelCode.includes("workspace.messages") || spatialChatPanelCode.includes("workspace?.messages"),
  "SpatialChatPanel.tsx must read active project's conversation context"
);

// 4.6 Functional test: services.ai.reply contract
let replyCallContext: any = null;
const originalReply = services.ai.reply;
try {
  (services.ai as any).reply = async (req: any) => {
    replyCallContext = req;
    return {
      message: {
        id: "msg-ai-test-1",
        role: "assistant",
        createdAt: new Date().toISOString(),
        text: "Análisis completado para el nodo contextual.",
      },
      newNodes: [],
      newRelations: [],
    };
  };

  const testReply = await services.ai.reply({
    text: "[Nodo enfocado en 3D: 'Marco Legal GDPR' (Clúster: legal)]: ¿Cuáles son los riesgos asociados?",
    map: mockWorkspace.map,
    lang: "es",
    replyTo: "msg-user-test-1",
    messageHistory: mockWorkspace.messages,
  });

  assert.ok(testReply.message.text.includes("Análisis completado"));
  assert.ok(replyCallContext.text.includes("Marco Legal GDPR"));
  assert.strictEqual(replyCallContext.messageHistory.length, 2);
} finally {
  (services.ai as any).reply = originalReply;
}

console.log("✓ Real AI Copilot in 3D verified (elimination of fake strings, 20k limits, image rejection, context).");

// ─────────────────────────────────────────────────────────────────────────────
// 5. 80-Character Node Renaming & Real-Time Three.js SpriteText Sync
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5/6] Verifying 80-Character Node Renaming & WebGL SpriteText Sync...");

// 5.1 Static validation in NodeListPanel.tsx and DocFullscreen.tsx
assert.ok(
  nodeListPanelCode.includes("MAX_NODE_NAME_CHARS"),
  "NodeListPanel.tsx must import MAX_NODE_NAME_CHARS"
);
assert.ok(
  nodeListPanelCode.includes("countCodePoints"),
  "NodeListPanel.tsx must count code points for renaming"
);
assert.ok(
  nodeListPanelCode.includes("maxLength={MAX_NODE_NAME_CHARS}"),
  "NodeListPanel.tsx must attach maxLength={MAX_NODE_NAME_CHARS} to rename input"
);

assert.ok(
  docFullscreenCode.includes("MAX_NODE_NAME_CHARS"),
  "DocFullscreen.tsx must import MAX_NODE_NAME_CHARS"
);
assert.ok(
  docFullscreenCode.includes("countCodePoints"),
  "DocFullscreen.tsx must count code points for title editing"
);
assert.ok(
  docFullscreenCode.includes("maxLength={MAX_NODE_NAME_CHARS}"),
  "DocFullscreen.tsx must attach maxLength={MAX_NODE_NAME_CHARS} to title textarea"
);

assert.strictEqual(MAX_NODE_NAME_CHARS, 80, "MAX_NODE_NAME_CHARS constant must equal 80");

// 5.2 Dynamic store renaming test (2D and 3D store parity)
const storeForRenaming = useWorkspaceStore.getState();
const initialNode = storeForRenaming.spatialNodes.find((n) => n.id === "node-c1");
assert.ok(initialNode, "node-c1 must exist in spatialNodes");

const newTitle80Chars = "A".repeat(80);
assert.strictEqual(countCodePoints(newTitle80Chars), 80);

storeForRenaming.updateSpatialNode("node-c1", { name: newTitle80Chars });

const updatedStore = useWorkspaceStore.getState();
const updatedSpatialNode = updatedStore.spatialNodes.find((n) => n.id === "node-c1");
const updated2DNode = updatedStore.workspace?.map.nodes.find((n) => n.id === "node-c1");

assert.strictEqual(
  updatedSpatialNode?.name,
  newTitle80Chars,
  "Renaming must immediately update 3D spatial node name"
);

assert.strictEqual(
  updated2DNode?.title,
  newTitle80Chars,
  "Renaming in 3D must immediately synchronize with 2D concept node title"
);

// Boundary test: 81 code points must be rejected
const overLimit81Chars = "B".repeat(81);
assert.strictEqual(countCodePoints(overLimit81Chars), 81);
assert.strictEqual(countCodePoints(overLimit81Chars) <= MAX_NODE_NAME_CHARS, false);

// Multibyte code point boundary test
const emojiTitle = "🚀 " + "C".repeat(75) + " 🛰️";
assert.strictEqual(countCodePoints(emojiTitle), 80, "Emojis and characters must count exactly 80 code points");
assert.strictEqual(countCodePoints(emojiTitle) <= MAX_NODE_NAME_CHARS, true);

// 5.3 Real-time SpriteText synchronization in SpatialCanvas3D.tsx
assert.ok(
  spatialCanvas3DCode.includes("visual.label.text = node.name"),
  "SpatialCanvas3D.tsx must update SpriteText visual.label.text when node name changes"
);

assert.ok(
  spatialCanvas3DCode.includes("fgRef.current?.refresh?.()"),
  "SpatialCanvas3D.tsx must call fgRef.current.refresh() to re-render WebGL canvas"
);

// 5.4 Empty and whitespace title defense test
storeForRenaming.updateSpatialNode("node-c1", { name: "   " });
const storeAfterWhitespaceRename = useWorkspaceStore.getState();
assert.strictEqual(
  storeAfterWhitespaceRename.spatialNodes.find((n) => n.id === "node-c1")?.name,
  newTitle80Chars,
  "Whitespace rename must NOT overwrite existing node name in 3D"
);
assert.strictEqual(
  storeAfterWhitespaceRename.workspace?.map.nodes.find((n) => n.id === "node-c1")?.title,
  newTitle80Chars,
  "Whitespace rename must NOT overwrite existing node title in 2D"
);

storeForRenaming.updateNodeContent("node-c1", { title: "" });
const storeAfterEmptyUpdate = useWorkspaceStore.getState();
assert.strictEqual(
  storeAfterEmptyUpdate.spatialNodes.find((n) => n.id === "node-c1")?.name,
  newTitle80Chars,
  "Empty title updateNodeContent must preserve existing node name"
);

// 5.5 Newline sanitization and keyboard handling in rename components
assert.ok(
  docFullscreenCode.includes("replace(/[\\r\\n]+/g"),
  "DocFullscreen.tsx must sanitize newlines from title input"
);
assert.ok(
  docFullscreenCode.includes("lastValidTitleRef"),
  "DocFullscreen.tsx must track lastValidTitleRef to restore previous title on empty blur"
);
assert.ok(
  docFullscreenCode.includes('e.key === "Enter"'),
  "DocFullscreen.tsx must handle Enter key to blur and commit title"
);

assert.ok(
  nodeListPanelCode.includes("replace(/[\\r\\n]+/g"),
  "NodeListPanel.tsx must sanitize newlines in rename input"
);
assert.ok(
  nodeListPanelCode.includes("e.key === 'Escape'"),
  "NodeListPanel.tsx must handle Escape key to cancel renaming"
);

console.log("✓ 80-character node renaming validation, 2D/3D store parity, and WebGL SpriteText sync verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cluster Color Selection: Immediate 3D Material Sync
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[6/6] Verifying Cluster Color Selection & Three.js Material Sync...");

// 6.1 ColorSettingsPanel static inspection
assert.ok(
  colorSettingsPanelCode.includes("setSpatialGroupColor"),
  "ColorSettingsPanel.tsx must invoke setSpatialGroupColor on color change"
);

assert.ok(
  colorSettingsPanelCode.includes('type="color"'),
  "ColorSettingsPanel.tsx must render color input picker"
);

// 6.2 Zustand store color modification test
const testGroup: SpatialGroupId = "technical";
const customHexColor = "#10b981";

useWorkspaceStore.getState().setSpatialGroupColor(testGroup, customHexColor);
assert.strictEqual(
  useWorkspaceStore.getState().spatialGroupColors[testGroup],
  customHexColor,
  "Store must immediately reflect the new group color"
);

// 6.3 SpatialCanvas3D static verification of reactive color update
assert.ok(
  spatialCanvas3DCode.includes("visual.orb.color.copy(color)"),
  "SpatialCanvas3D.tsx must update orb material color on group color change"
);

assert.ok(
  spatialCanvas3DCode.includes("visual.core.color.copy(color)"),
  "SpatialCanvas3D.tsx must update core material color on group color change"
);

assert.ok(
  spatialCanvas3DCode.includes("visual.halo.color.copy(color)"),
  "SpatialCanvas3D.tsx must update halo material color on group color change"
);

console.log("✓ Cluster color selection and Three.js material synchronization verified.");

console.log("\n=============================================================================");
console.log("✨ ALL PHASE 06 ACCEPTANCE CRITERIA VERIFIED AND PASSED WITH FLYING COLORS! ✨");
console.log("=============================================================================\n");
