import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  warmLuxuryDark,
  warmEditorialLight,
  typographyTokens,
  semanticColors,
  colors,
} from "../src/theme/tokens";
import {
  useWorkspaceStore,
  resolveInitialLandingMode,
} from "../src/store/useWorkspaceStore";
import type { Workspace, ConceptMap, Project } from "../src/domain/types";

function loadTsxComponent<T = Record<string, unknown>>(filePath: string): T {
  const source = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filePath,
  });
  const mod = new Module(filePath);
  mod.filename = filePath;
  // @ts-expect-error internal node module paths resolver
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  // @ts-expect-error internal node module compile
  mod._compile(transpiled.outputText, filePath);
  return mod.exports as T;
}

console.log("=== PHASE 01 AUTOMATED ACCEPTANCE TEST SUITE: DESIGN SYSTEM & NAVIGATION ===");

const indexCssPath = path.resolve(process.cwd(), "src/styles/index.css");
const togglePath = path.resolve(process.cwd(), "src/components/ui/ViewModeToggle.tsx");
const workspaceViewPath = path.resolve(process.cwd(), "src/features/workspace/WorkspaceView.tsx");
const spatialCanvasPath = path.resolve(process.cwd(), "src/features/spatial/SpatialCanvas3D.tsx");
const settingsModalPath = path.resolve(process.cwd(), "src/features/settings/SettingsModal.tsx");
const conceptCanvasPath = path.resolve(process.cwd(), "src/features/workspace/ConceptCanvas.tsx");

const indexCssSource = fs.readFileSync(indexCssPath, "utf8");
const toggleSource = fs.readFileSync(togglePath, "utf8");
const workspaceViewSource = fs.readFileSync(workspaceViewPath, "utf8");
const spatialCanvasSource = fs.readFileSync(spatialCanvasPath, "utf8");
const settingsModalSource = fs.readFileSync(settingsModalPath, "utf8");
const conceptCanvasSource = fs.readFileSync(conceptCanvasPath, "utf8");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Warm Luxury Dark Theme Tokens Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1/6] Verifying Warm Luxury Dark Theme tokens (60-30-10 distribution)...");

assert.strictEqual(warmLuxuryDark.bgMain, "#170704", "Dark bgMain must be #170704");
assert.strictEqual(warmLuxuryDark.bgDeep, "#120503", "Dark bgDeep must be #120503");
assert.strictEqual(warmLuxuryDark.bgSoft, "#1A0906", "Dark bgSoft must be #1A0906");
assert.strictEqual(warmLuxuryDark.surfacePrimary, "#2A1412", "Dark surfacePrimary must be #2A1412");
assert.strictEqual(warmLuxuryDark.surfaceSecondary, "#301413", "Dark surfaceSecondary must be #301413");
assert.strictEqual(warmLuxuryDark.surfaceDeep, "#200F0A", "Dark surfaceDeep must be #200F0A");
assert.strictEqual(warmLuxuryDark.borderBase, "#594836", "Dark borderBase must be #594836");
assert.strictEqual(warmLuxuryDark.accentPrimary, "#E5C158", "Dark accentPrimary must be Champagne Gold #E5C158");
assert.strictEqual(warmLuxuryDark.accentSecondary, "#D4AF37", "Dark accentSecondary must be Metallic Gold #D4AF37");
assert.strictEqual(warmLuxuryDark.accentAmber, "#F59E0B", "Dark accentAmber must be #F59E0B");
assert.strictEqual(warmLuxuryDark.textPrimary, "#F3EBE1", "Dark textPrimary must be #F3EBE1");
assert.strictEqual(warmLuxuryDark.textSecondary, "#A1937E", "Dark textSecondary must be #A1937E");
assert.strictEqual(warmLuxuryDark.textMuted, "#8C7D6D", "Dark textMuted must be #8C7D6D");

// Verify opacity limits for borders
assert.ok(warmLuxuryDark.borderMinOpacity >= 0.4, "Border min opacity must be >= 0.4");
assert.ok(warmLuxuryDark.borderMaxOpacity <= 0.6, "Border max opacity must be <= 0.6");

// Verify CSS source contains Dark tokens
assert.ok(indexCssSource.includes("#170704"), "index.css must define dark main background #170704");
assert.ok(indexCssSource.includes("#120503"), "index.css must define dark deep background #120503");
assert.ok(indexCssSource.includes("#1A0906"), "index.css must define dark soft background #1A0906");
assert.ok(indexCssSource.includes("#2A1412"), "index.css must define dark primary surface #2A1412");
assert.ok(indexCssSource.includes("#301413"), "index.css must define dark secondary surface #301413");
assert.ok(indexCssSource.includes("#200F0A"), "index.css must define dark deep surface #200F0A");
assert.ok(indexCssSource.includes("#594836"), "index.css must define dark border base #594836");
assert.ok(indexCssSource.includes("#E5C158"), "index.css must define champagne gold accent #E5C158");
assert.ok(indexCssSource.includes("#D4AF37"), "index.css must define metallic gold accent #D4AF37");
assert.ok(indexCssSource.includes("#F3EBE1"), "index.css must define dark text primary #F3EBE1");

console.log("✓ Warm Luxury Dark Theme tokens verified successfully.");

// ─────────────────────────────────────────────────────────────────────────────
// 2. Warm Editorial Light Theme Tokens Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2/6] Verifying Warm Editorial Light Theme tokens (60-30-10 distribution)...");

assert.strictEqual(warmEditorialLight.bgMain, "#F7F3ED", "Light bgMain must be #F7F3ED");
assert.strictEqual(warmEditorialLight.bgLight, "#FAF6F0", "Light bgLight must be #FAF6F0");
assert.strictEqual(warmEditorialLight.surfacePrimary, "#FFFFFF", "Light surfacePrimary must be #FFFFFF");
assert.strictEqual(warmEditorialLight.surfaceSecondary, "#F5E8E7", "Light surfaceSecondary must be #F5E8E7");
assert.strictEqual(warmEditorialLight.borderPrimary, "#E8DFD5", "Light borderPrimary must be #E8DFD5");
assert.strictEqual(warmEditorialLight.borderSecondary, "#E6DFD6", "Light borderSecondary must be #E6DFD6");
assert.strictEqual(warmEditorialLight.accentPrimary, "#9E2A2B", "Light accentPrimary must be Crimson Terracotta #9E2A2B");
assert.strictEqual(warmEditorialLight.accentTint, "rgba(158, 42, 43, 0.12)", "Light accentTint must be rgba(158, 42, 43, 0.12)");
assert.strictEqual(warmEditorialLight.textPrimary, "#2D1512", "Light textPrimary must be #2D1512");
assert.strictEqual(warmEditorialLight.textSecondary, "#7A6E65", "Light textSecondary must be #7A6E65");
assert.strictEqual(warmEditorialLight.textMuted, "#8F7568", "Light textMuted must be #8F7568");

// Verify CSS source contains Light tokens
assert.ok(indexCssSource.includes("#F7F3ED"), "index.css must define light main background #F7F3ED");
assert.ok(indexCssSource.includes("#FAF6F0"), "index.css must define light page tone #FAF6F0");
assert.ok(indexCssSource.includes("#FFFFFF"), "index.css must define pure white surface #FFFFFF");
assert.ok(indexCssSource.includes("#F5E8E7"), "index.css must define light tinted surface #F5E8E7");
assert.ok(indexCssSource.includes("#E8DFD5"), "index.css must define light border primary #E8DFD5");
assert.ok(indexCssSource.includes("#9E2A2B"), "index.css must define crimson terracotta accent #9E2A2B");
assert.ok(indexCssSource.includes("#2D1512"), "index.css must define deep warm espresso text #2D1512");
assert.ok(indexCssSource.includes("#7A6E65"), "index.css must define warm editorial stone text #7A6E65");

console.log("✓ Warm Editorial Light Theme tokens verified successfully.");

// ─────────────────────────────────────────────────────────────────────────────
// 3. Typography Hierarchy & 4-Tier Scale Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3/6] Verifying Native System Typography Stack & 4-Tier Scale...");

const expectedStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif';
assert.strictEqual(typographyTokens.fontFamily, expectedStack, "Font stack in tokens must match native system stack");
assert.ok(indexCssSource.includes(expectedStack), "index.css must define exact native font stack");

// Verify zero proprietary bundled font binaries
const fontFiles = [".otf", ".ttf", ".woff", ".woff2"];
const srcDir = path.resolve(process.cwd(), "src");
function scanForFontBinaries(dir: string): string[] {
  const found: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...scanForFontBinaries(full));
    } else if (fontFiles.some((ext) => entry.name.endsWith(ext))) {
      found.push(full);
    }
  }
  return found;
}
const bundledFonts = scanForFontBinaries(srcDir);
assert.strictEqual(bundledFonts.length, 0, `No font binaries may be bundled. Found: ${bundledFonts.join(", ")}`);

// Verify 4-tier scale utilities in index.css
assert.ok(indexCssSource.includes("@utility text-title-xl"), "index.css must define @utility text-title-xl");
assert.ok(indexCssSource.includes("@utility text-title-md"), "index.css must define @utility text-title-md");
assert.ok(indexCssSource.includes("@utility text-body"), "index.css must define @utility text-body");
assert.ok(indexCssSource.includes("@utility text-caption"), "index.css must define @utility text-caption");

assert.strictEqual(typographyTokens.scale.titleXl.fontSize, "32px");
assert.strictEqual(typographyTokens.scale.titleXl.fontWeight, 600);
assert.strictEqual(typographyTokens.scale.titleMd.fontSize, "16px");
assert.strictEqual(typographyTokens.scale.body.fontSize, "14px");
assert.strictEqual(typographyTokens.scale.caption.fontSize, "12px");

// Verify ::selection high contrast rule in index.css
assert.ok(
  indexCssSource.includes("::selection") && indexCssSource.includes("color: inherit;"),
  "index.css ::selection must inherit text color to ensure readable contrast across themes"
);

console.log("✓ Native Typography System and 4-tier scale verified successfully.");

// ─────────────────────────────────────────────────────────────────────────────
// 4. ViewModeToggle Exact Navigation Order Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4/6] Verifying ViewModeToggle exact 3-tab navigation order...");

const { ViewModeToggle } = loadTsxComponent<{
  ViewModeToggle: React.FC<{
    mode: "discovery" | "notion" | "spatial";
    onChange: (mode: string) => void;
  }>;
}>(togglePath);

const renderedHtml = renderToStaticMarkup(
  React.createElement(ViewModeToggle, {
    mode: "discovery",
    onChange: () => {},
  })
);

// Check that visible text appears in exact sequence
const posIdeacion = renderedHtml.indexOf("1. Ideación IA");
const posTablero = renderedHtml.indexOf("2. Tablero de Conceptos");
const posNeuronal = renderedHtml.indexOf("3. Neuronal 3D");

assert.ok(posIdeacion !== -1, "ViewModeToggle must render '1. Ideación IA'");
assert.ok(posTablero !== -1, "ViewModeToggle must render '2. Tablero de Conceptos'");
assert.ok(posNeuronal !== -1, "ViewModeToggle must render '3. Neuronal 3D'");

assert.ok(
  posIdeacion < posTablero && posTablero < posNeuronal,
  `Tabs must strictly follow order: 1. Ideación IA < 2. Tablero de Conceptos < 3. Neuronal 3D. Pos: [${posIdeacion}, ${posTablero}, ${posNeuronal}]`
);

// Verify legacy compatibility strings are preserved in attributes/HTML
assert.ok(renderedHtml.includes("Descubrimiento IA"), "Legacy alias 'Descubrimiento IA' must be present for test compatibility");
assert.ok(renderedHtml.includes("Tablero Notion"), "Legacy alias 'Tablero Notion' must be present for test compatibility");
assert.ok(renderedHtml.includes("Neural 3D"), "Legacy alias 'Neural 3D' must be present for test compatibility");

// Verify consistent active tab typography styling
const renderedNotionHtml = renderToStaticMarkup(
  React.createElement(ViewModeToggle, {
    mode: "notion",
    onChange: () => {},
  })
);
const renderedSpatialHtml = renderToStaticMarkup(
  React.createElement(ViewModeToggle, {
    mode: "spatial",
    onChange: () => {},
  })
);
assert.ok(renderedHtml.includes("text-fg"), "Discovery active tab must render text-fg");
assert.ok(renderedNotionHtml.includes("text-fg"), "Notion active tab must render text-fg");
assert.ok(renderedSpatialHtml.includes("text-fg"), "Spatial active tab must render text-fg");

console.log("✓ ViewModeToggle strictly renders '1. Ideación IA' -> '2. Tablero de Conceptos' -> '3. Neuronal 3D'.");

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workspace Top-Bar Cleanup (Removal of Documento & Copilot IA buttons)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5/6] Verifying top-level Documento and Copilot IA navigation removal in WorkspaceView...");

// Verify the header does NOT contain the buttons in top navigation
const topHeaderRegex = /<header[\s\S]*?<\/header>/;
const headerMatch = workspaceViewSource.match(topHeaderRegex);
assert.ok(headerMatch, "WorkspaceView.tsx must have a top header");
const headerHtml = headerMatch[0];

assert.strictEqual(
  headerHtml.includes("workspace.exportDoc"),
  false,
  "WorkspaceView top bar must NOT have Documento export button"
);
assert.strictEqual(
  headerHtml.includes("Copilot IA"),
  false,
  "WorkspaceView top bar must NOT have Copilot IA button"
);

// Verify underlying modals/drawers are still preserved and functional
assert.ok(
  workspaceViewSource.includes("<GenerateDocumentModal"),
  "WorkspaceView must preserve GenerateDocumentModal underlying functionality"
);
assert.ok(
  workspaceViewSource.includes("<AIChatDrawer"),
  "WorkspaceView must preserve AIChatDrawer underlying functionality"
);

console.log("✓ Top-level navigation buttons removed without breaking underlying functionality.");

// ─────────────────────────────────────────────────────────────────────────────
// 6. Default Workspace Landing Routing in Zustand Store
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[6/6] Verifying default landing routing (Empty -> Ideación IA, Populated -> Tablero de Conceptos)...");

// 6.1 Pure helper verification
const emptyMap: ConceptMap = {
  id: "map-empty",
  projectId: "proj-empty",
  nodes: [],
  relations: [],
};
assert.strictEqual(
  resolveInitialLandingMode(emptyMap),
  "discovery",
  "Empty project map (0 nodes) must land on 'discovery' (1. Ideación IA)"
);
assert.strictEqual(
  resolveInitialLandingMode(null),
  "discovery",
  "Null map must land on 'discovery'"
);

const populatedMap: ConceptMap = {
  id: "map-pop",
  projectId: "proj-pop",
  nodes: [
    {
      id: "node-1",
      title: "Core Concept",
      description: "Sample",
      kind: "concept",
      category: "technical",
      priority: "high",
      phase: "execution",
      status: "confirmed",
      x: 0,
      y: 0,
    },
  ],
  relations: [],
};
assert.strictEqual(
  resolveInitialLandingMode(populatedMap),
  "notion",
  "Populated project map (>0 nodes) must land on 'notion' (2. Tablero de Conceptos)"
);

// 6.2 Zustand store setWorkspace integration verification
const mockProjectEmpty: Project = {
  id: "proj-store-empty",
  name: "Empty Project",
  description: "Test",
  status: "active",
  icon: "lightbulb",
  updatedAt: new Date().toISOString(),
  nodeCount: 0,
};
const emptyWorkspace: Workspace = {
  project: mockProjectEmpty,
  map: emptyMap,
  messages: [],
};

const store = useWorkspaceStore.getState();
store.setWorkspace(emptyWorkspace);
assert.strictEqual(
  useWorkspaceStore.getState().canvasMode,
  "discovery",
  "Store setWorkspace with empty project must land on 'discovery' (1. Ideación IA)"
);

const mockProjectPopulated: Project = {
  id: "proj-store-pop",
  name: "Populated Project",
  description: "Test",
  status: "active",
  icon: "rocket",
  updatedAt: new Date().toISOString(),
  nodeCount: 1,
};
const populatedWorkspace: Workspace = {
  project: mockProjectPopulated,
  map: populatedMap,
  messages: [],
};

store.setWorkspace(populatedWorkspace);
assert.strictEqual(
  useWorkspaceStore.getState().canvasMode,
  "notion",
  "Store setWorkspace with populated project must land on 'notion' (2. Tablero de Conceptos)"
);

console.log("✓ Default workspace landing routing verified in both helper and Zustand store.");

// 6.3 Verify clean re-entry and unmount cleanup in WorkspaceView
assert.ok(
  workspaceViewSource.includes("resetWorkspace();"),
  "WorkspaceView must call resetWorkspace on unmount to ensure fresh landing mode evaluation"
);

store.resetWorkspace();
assert.strictEqual(useWorkspaceStore.getState().workspace, null, "resetWorkspace must clear active workspace");
store.setWorkspace(emptyWorkspace);
assert.strictEqual(useWorkspaceStore.getState().canvasMode, "discovery", "Re-entering empty workspace must land on discovery");

store.resetWorkspace();
store.setWorkspace(populatedWorkspace);
assert.strictEqual(useWorkspaceStore.getState().canvasMode, "notion", "Re-entering populated workspace must land on notion");

// ─────────────────────────────────────────────────────────────────────────────
// 7. Architectural Polish & Forensic Edge-Case Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[7/7] Verifying architectural edge cases (3D WebGL sync, settings, category shadows)...");

// 7.1 ConceptCanvas semantic perspective accents
assert.ok(
  conceptCanvasSource.includes("perspectiveVisuals") && conceptCanvasSource.includes("SemanticIcon"),
  "ConceptCanvas must derive perspective accents and icons from the shared semantic registry"
);
assert.ok(
  !conceptCanvasSource.includes("rgba(168,85,247,0.5)") && !conceptCanvasSource.includes("rgba(59,130,246,0.5)"),
  "ConceptCanvas must not duplicate legacy category color mappings"
);

// 7.2 SettingsModal Theme Persistence Key
assert.ok(
  settingsModalSource.includes('localStorage.setItem("nexo.theme", newTheme);'),
  "SettingsModal must persist to 'nexo.theme' to align with index.html startup bootstrap"
);
assert.ok(
  settingsModalSource.includes('document.documentElement.setAttribute("data-theme", newTheme);'),
  "SettingsModal must set 'data-theme' on document.documentElement"
);

// 7.3 SpatialCanvas3D Theme Synchronization & WebGL Stability
assert.ok(
  spatialCanvasSource.includes("resolveCssColor"),
  "SpatialCanvas3D must use resolveCssColor to avoid raw var(--) parsing issues in Three.Color"
);
assert.ok(
  spatialCanvasSource.includes("vis.halo.needsUpdate = true;"),
  "SpatialCanvas3D must set needsUpdate on halo materials during theme sync"
);
assert.ok(
  spatialCanvasSource.includes("vis.orb.needsUpdate = true;"),
  "SpatialCanvas3D must set needsUpdate on orb materials during theme sync"
);
assert.ok(
  spatialCanvasSource.includes("vis.targetEmissive = isDarkTheme ? BASE.emissiveIntensity : 0.25;"),
  "SpatialCanvas3D must update targetEmissive in theme sync effect"
);
assert.ok(
  spatialCanvasSource.includes("rgba(45,21,18,0.06)"),
  "SpatialCanvas3D must provide dark dim link color for light theme"
);
assert.ok(
  spatialCanvasSource.includes("frameAttempts < 60"),
  "SpatialCanvas3D must feature resilient multi-frame setupScene retry loop"
);

console.log("✓ All architectural edge cases and forensic safeguards verified successfully.");

console.log("\n=============================================================================");
console.log("✨ ALL PHASE 01 ACCEPTANCE CRITERIA VERIFIED AND PASSED WITH FLYING COLORS! ✨");
console.log("=============================================================================\n");
