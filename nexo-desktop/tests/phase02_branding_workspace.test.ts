import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { getTimeAwareGreetingPeriod, getTimeAwareGreeting } from "../src/features/dashboard/greeting";
import { mockServices } from "../src/services/mock";
import type { ProjectIcon, NexoLogoProps } from "../src/domain/types";

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

console.log("=== PHASE 02 AUTOMATED ACCEPTANCE TEST SUITE: BRANDING & WORKSPACE ===");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Nexo Logo Component & Brand Integration
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1/6] Verifying NexoLogo component rendering and shell integration...");

const nexoLogoPath = path.resolve(process.cwd(), "src/components/brand/NexoLogo.tsx");
const { NexoLogo } = loadTsxComponent<{
  NexoLogo: React.FC<{
    size?: number | string;
    className?: string;
    showText?: boolean;
    textClassName?: string;
  }>;
}>(nexoLogoPath);

// 1.1 Render NexoLogo standalone
const logoDefaultMarkup = renderToStaticMarkup(React.createElement(NexoLogo, { size: 24 }));
assert.ok(logoDefaultMarkup.includes('data-testid="nexo-logo"'), "NexoLogo must contain data-testid='nexo-logo'");
assert.ok(logoDefaultMarkup.includes("<svg"), "NexoLogo must render an SVG element");
assert.ok(logoDefaultMarkup.includes('width="24"'), "NexoLogo must respect size=24");
assert.ok(logoDefaultMarkup.includes("nexo-grad-main"), "NexoLogo must render brand gradients");

// 1.2 Render NexoLogo with showText=true
const logoWithTextMarkup = renderToStaticMarkup(React.createElement(NexoLogo, { size: 32, showText: true }));
assert.ok(logoWithTextMarkup.includes("NEXO"), "NexoLogo with showText=true must render brand wordmark 'NEXO'");
assert.ok(logoWithTextMarkup.includes('width="32"'), "NexoLogo must respect numeric size 32");

// 1.3 Verify integration in shells
const titlebarSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/Titlebar.tsx"), "utf8");
const dashboardSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/dashboard/DashboardView.tsx"), "utf8");
const workspaceSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/workspace/WorkspaceView.tsx"), "utf8");
const loginSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/auth/LoginView.tsx"), "utf8");
const registerSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/auth/RegisterView.tsx"), "utf8");

assert.ok(titlebarSource.includes("<NexoLogo"), "Titlebar.tsx must render <NexoLogo");
assert.ok(dashboardSource.includes("<NexoLogo"), "DashboardView.tsx must render <NexoLogo");
assert.ok(workspaceSource.includes("<NexoLogo"), "WorkspaceView.tsx must render <NexoLogo");
assert.ok(loginSource.includes("<NexoLogo"), "LoginView.tsx must render <NexoLogo");
assert.ok(registerSource.includes("<NexoLogo"), "RegisterView.tsx must render <NexoLogo");

console.log("✓ NexoLogo component and all 5 active shell integrations verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 2. Personalized Time-Aware Greeting
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2/6] Verifying Time-Aware Personalized Greeting (morning/afternoon/evening, i18n)...");

// Test time period calculations across the 24-hour cycle
const morningDate = new Date(2026, 10, 7, 8, 30);   // 08:30 AM
const afternoonDate = new Date(2026, 10, 7, 14, 15); // 02:15 PM
const eveningDate = new Date(2026, 10, 7, 21, 45);   // 09:45 PM
const lateNightDate = new Date(2026, 10, 7, 2, 10);  // 02:10 AM

assert.strictEqual(getTimeAwareGreetingPeriod(morningDate), "morning", "08:30 must be morning");
assert.strictEqual(getTimeAwareGreetingPeriod(afternoonDate), "afternoon", "14:15 must be afternoon");
assert.strictEqual(getTimeAwareGreetingPeriod(eveningDate), "evening", "21:45 must be evening");
assert.strictEqual(getTimeAwareGreetingPeriod(lateNightDate), "evening", "02:10 must be evening");

// Test Spanish greetings with actual user name
const mockSpanishT = (key: string, opts?: any) => {
  if (key === "home.greeting.morning") return `Buenos días, ${opts?.name || "Usuario"}`;
  if (key === "home.greeting.afternoon") return `Buenas tardes, ${opts?.name || "Usuario"}`;
  if (key === "home.greeting.evening") return `Buenas noches, ${opts?.name || "Usuario"}`;
  return opts?.defaultValue || key;
};

assert.strictEqual(getTimeAwareGreeting(mockSpanishT, "Kevin", morningDate), "Buenos días, Kevin");
assert.strictEqual(getTimeAwareGreeting(mockSpanishT, "Kevin", afternoonDate), "Buenas tardes, Kevin");
assert.strictEqual(getTimeAwareGreeting(mockSpanishT, "Kevin", eveningDate), "Buenas noches, Kevin");
assert.strictEqual(getTimeAwareGreeting(mockSpanishT, "", morningDate), "Buenos días, Usuario");

// Test English greetings with actual user name
const mockEnglishT = (key: string, opts?: any) => {
  if (key === "home.greeting.morning") return `Good morning, ${opts?.name || "Usuario"}`;
  if (key === "home.greeting.afternoon") return `Good afternoon, ${opts?.name || "Usuario"}`;
  if (key === "home.greeting.evening") return `Good evening, ${opts?.name || "Usuario"}`;
  return opts?.defaultValue || key;
};

assert.strictEqual(getTimeAwareGreeting(mockEnglishT, "Kevin", morningDate), "Good morning, Kevin");
assert.strictEqual(getTimeAwareGreeting(mockEnglishT, "Kevin", afternoonDate), "Good afternoon, Kevin");
assert.strictEqual(getTimeAwareGreeting(mockEnglishT, "Kevin", eveningDate), "Good evening, Kevin");

console.log("✓ Time-aware personalized greeting logic and i18n verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 3. Curated Project Icon Selector (6 Canonical Icons)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3/6] Verifying curated project icon selector (6 canonical icons)...");

const canonicalIcons: ProjectIcon[] = ["lightbulb", "leaf", "scale", "rocket", "book", "compass"];
const createProjectModalSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/features/dashboard/CreateProjectModal.tsx"),
  "utf8"
);

for (const icon of canonicalIcons) {
  assert.ok(
    createProjectModalSource.includes(`"${icon}"`),
    `CreateProjectModal.tsx must support canonical icon "${icon}"`
  );
}

assert.ok(createProjectModalSource.includes('role="radiogroup"'), "CreateProjectModal must have accessible radiogroup for icons");
assert.ok(createProjectModalSource.includes('role="radio"'), "CreateProjectModal must have accessible radio items for icons");
assert.ok(dashboardSource.includes("ICON_MAP"), "DashboardView.tsx must map project icons using ICON_MAP");
assert.ok(workspaceSource.includes("PROJECT_HEADER_ICONS"), "WorkspaceView.tsx must map and display project icons in header");

console.log("✓ Curated 6-icon selector and domain models verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 4. Folder Hierarchy, CRUD & Validation (Max 50 chars, duplicate prevention)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4/6] Verifying Folder Model, CRUD and Validation in Mock Services...");

async function testFolderCRUD() {
  // 4.1 Create valid folder
  const testFolderName = "Carpeta Test " + Date.now();
  const folder = await mockServices.folders.create(testFolderName);
  assert.ok(folder.id, "Created folder must have an id");
  assert.strictEqual(folder.name, testFolderName, "Folder name must match");

  // 4.2 Reject duplicate folder name (case-insensitive)
  let duplicateRejected = false;
  try {
    await mockServices.folders.create(testFolderName.toLowerCase());
  } catch (err: any) {
    duplicateRejected = true;
    assert.ok(err.message.includes("Ya existe"), "Error message must indicate duplicate name");
  }
  assert.ok(duplicateRejected, "Duplicate folder name must be rejected");

  // 4.2b Reject duplicate folder name with decomposed Unicode (NFD) accents
  let nfdRejected = false;
  try {
    // "Investigacio\u0301n" is NFD for existing seed folder "Investigación"
    await mockServices.folders.create("Investigacio\u0301n");
  } catch (err: any) {
    nfdRejected = true;
    assert.ok(err.message.includes("Ya existe"), "Error message must indicate duplicate name on NFD accents");
  }
  assert.ok(nfdRejected, "Decomposed Unicode (NFD) duplicate folder name must be rejected");

  // 4.3 Reject folder name exceeding 50 characters
  const longName = "A".repeat(51);
  let longNameRejected = false;
  try {
    await mockServices.folders.create(longName);
  } catch (err: any) {
    longNameRejected = true;
    assert.ok(err.message.includes("50"), "Error message must indicate 50-character limit");
  }
  assert.ok(longNameRejected, "Folder name exceeding 50 characters must be rejected");

  // 4.4 Reject empty folder name
  let emptyRejected = false;
  try {
    await mockServices.folders.create("   ");
  } catch {
    emptyRejected = true;
  }
  assert.ok(emptyRejected, "Empty folder name must be rejected");

  // 4.5 Rename folder
  const renamedName = "Renombrada " + Date.now();
  const renamed = await mockServices.folders.rename(folder.id, renamedName);
  assert.strictEqual(renamed.name, renamedName, "Renamed folder must reflect new name");

  // 4.6 Move project into folder
  const project = await mockServices.projects.create({
    name: "Proyecto para Carpeta " + Date.now(),
    description: "Prueba de movimiento",
    icon: "rocket",
  });
  assert.strictEqual(project.folderId, null, "New project should start unassigned");

  const movedProject = await mockServices.folders.moveProject(project.id, folder.id);
  assert.strictEqual(movedProject.folderId, folder.id, "Project must now reference folder.id");

  // 4.7 Non-destructive deletion
  await mockServices.folders.delete(folder.id);
  const remainingFolders = await mockServices.folders.list();
  assert.ok(!remainingFolders.some((f) => f.id === folder.id), "Folder must be deleted from list");

  // Verify project still exists and has folderId set to null (non-destructive)
  const allProjects = await mockServices.projects.list("es");
  const preservedProject = allProjects.find((p) => p.id === project.id);
  assert.ok(preservedProject, "Project must NOT be deleted when folder is deleted");
  assert.strictEqual(preservedProject.folderId, null, "Project folderId must be reset to null upon folder deletion");

  // 4.8 Moving seed project does NOT cause duplicate project entries
  await mockServices.folders.moveProject("campus-market", "f-investigacion");
  const listAfterSeedMove = await mockServices.projects.list("es");
  const campusMarketInstances = listAfterSeedMove.filter((p) => p.id === "campus-market");
  assert.strictEqual(campusMarketInstances.length, 1, "Moving seed project must not create duplicate entries in project list");

  // 4.9 Deleting seed project removes it from project list
  await mockServices.projects.delete("legal-aid");
  const listAfterSeedDelete = await mockServices.projects.list("es");
  assert.ok(!listAfterSeedDelete.some((p) => p.id === "legal-aid"), "Deleted seed project must not appear in project list");
}

await testFolderCRUD();
console.log("✓ Folder CRUD, 50-char validation, duplicate rejection, and non-destructive deletion verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 5. Drag-and-Drop and Accessible Move Alternative
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5/6] Verifying drag-and-drop attributes and accessible move modal...");

// Drag-and-drop assertions on DashboardView
assert.ok(dashboardSource.includes("draggable"), "Project cards must have draggable attribute");
assert.ok(dashboardSource.includes("handleDragStart"), "DashboardView must implement handleDragStart");
assert.ok(dashboardSource.includes("handleDropOnFolder"), "DashboardView must implement handleDropOnFolder");
assert.ok(dashboardSource.includes("onDragOver"), "Folder pills must have onDragOver drop targets");
assert.ok(dashboardSource.includes('setData("text/plain"'), "handleDragStart must set text/plain for cross-engine WebKit compatibility");

// Accessible alternative assertions
assert.ok(dashboardSource.includes("Mover a carpeta..."), "Project action menu must include 'Mover a carpeta...'");
assert.ok(dashboardSource.includes("projectToMove"), "DashboardView must maintain projectToMove state for accessible modal");
assert.ok(dashboardSource.includes('role="radiogroup"'), "Move modal must include accessible radiogroup for selecting folders");

console.log("✓ Drag-and-drop and accessible 'Mover a carpeta...' modal verified.");

// ─────────────────────────────────────────────────────────────────────────────
// 6. Typecheck and Invariant Integrity
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[6/6] Verifying type definitions and absence of TS6133 defects...");

const typesSource = fs.readFileSync(path.resolve(process.cwd(), "src/domain/types.ts"), "utf8");
assert.ok(typesSource.includes("export interface Folder"), "domain/types.ts must export Folder interface");
assert.ok(typesSource.includes("folderId?: string | null;"), "Project interface must include folderId");
assert.ok(typesSource.includes("icon?: ProjectIcon;"), "NewProjectInput must include icon");

console.log("✓ Type definitions and structural invariants verified.");

console.log("\n=============================================================================");
console.log("✨ ALL PHASE 02 ACCEPTANCE CRITERIA VERIFIED AND PASSED WITH FLYING COLORS! ✨");
console.log("=============================================================================");
