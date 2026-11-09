/**
 * Automated Verification Test Suite for Multidimensional Concept Generation
 * and Causal Relationship Parsing for 2D Concept Board and 3D Neural Space.
 */
import assert from "node:assert/strict";
import { getSystemInstruction, buildUserPrompt } from "../src/services/ai/prompts";
import { useWorkspaceStore } from "../src/store/useWorkspaceStore";
import type { ConceptMap, Workspace } from "../src/domain/types";

console.log("=== VERIFICACIÓN DE GENERACIÓN MULTIDIMENSIONAL 2D Y 3D ===");

// 1. Verificación de Prompts de Fase 2 (Estructuración Multidimensional)
console.log("\n[1/4] Verificando instrucciones de Fase 2 para arquitectura multidimensional...");
const phase2Prompt = getSystemInstruction("PHASE_2_STRUCTURING", "es");
assert.ok(
  phase2Prompt.includes("ESTRUCTURACIÓN MULTIDIMENSIONAL"),
  "El prompt de Fase 2 debe declarar explícitamente ESTRUCTURACIÓN MULTIDIMENSIONAL"
);
assert.ok(
  phase2Prompt.includes("technical") &&
    phase2Prompt.includes("economic") &&
    phase2Prompt.includes("political") &&
    phase2Prompt.includes("legal"),
  "El prompt de Fase 2 debe exigir las 4 dimensiones canónicas"
);
assert.ok(
  phase2Prompt.includes("RELACIONES CAUSALES DIRECCIONALES"),
  "El prompt de Fase 2 debe exigir relaciones causales direccionales en 'relationships'"
);
console.log("✓ System Prompt de Fase 2 configurado con 4 dimensiones canónicas y relaciones causales.");

// 2. Verificación de buildUserPrompt para Fase 2
console.log("\n[2/4] Verificando buildUserPrompt para Fase 2...");
const userPrompt = buildUserPrompt({
  phase: "PHASE_2_STRUCTURING",
  lang: "es",
  userMessage: "Estructura la arquitectura de mi proyecto",
});
assert.ok(
  userPrompt.includes("arquitectura multidimensional") && userPrompt.includes("relaciones causales"),
  "buildUserPrompt en Fase 2 debe solicitar la arquitectura multidimensional"
);
console.log("✓ buildUserPrompt orienta al modelo a generar arquitectura multidimensional.");

// 3. Verificación de Sincronización en Zustand Store (2D y 3D)
console.log("\n[3/4] Verificando proyección atómica de nodos y enlaces en useWorkspaceStore...");
const testMap: ConceptMap = {
  nodes: [
    {
      id: "node-core",
      title: "Núcleo Operativo del Sistema",
      description: "Motor central de gestión y sincronización.",
      kind: "concept",
      category: "technical",
      priority: "high",
      phase: "planning",
      x: 80,
      y: 160,
    },
    {
      id: "node-econ",
      title: "Modelo Económico y Costos",
      description: "Monetización SaaS y márgenes por transacción.",
      kind: "concept",
      category: "economic",
      priority: "high",
      phase: "planning",
      x: 420,
      y: 160,
    },
    {
      id: "node-social",
      title: "Adopción de Usuarios y Bienestar",
      description: "Curva de aprendizaje reducida y satisfacción de usuarios.",
      kind: "concept",
      category: "political",
      priority: "medium",
      phase: "planning",
      x: 760,
      y: 160,
    },
    {
      id: "node-legal",
      title: "Cumplimiento y Privacidad",
      description: "Marco legal y protección de datos.",
      kind: "risk",
      category: "legal",
      priority: "high",
      phase: "planning",
      x: 760,
      y: 330,
    },
  ],
  relations: [
    {
      id: "rel-1",
      from: "node-core",
      to: "node-econ",
      type: "funds",
      value: 4,
      label: "Monetiza el servicio",
    },
    {
      id: "rel-2",
      from: "node-core",
      to: "node-social",
      type: "enables",
      value: 4,
      label: "Facilita la adopción",
    },
    {
      id: "rel-3",
      from: "node-core",
      to: "node-legal",
      type: "regulates",
      value: 5,
      label: "Regula operaciones",
    },
  ],
};

const mockWorkspace: Workspace = {
  project: {
    id: "proj-multidim",
    name: "Proyecto Gastronómico Nexo",
    description: "Plataforma de gestión de restaurantes",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    nodeCount: 4,
  },
  map: testMap,
  messages: [],
};

useWorkspaceStore.getState().setWorkspace(mockWorkspace);
const state = useWorkspaceStore.getState();

assert.equal(state.nodes.length, 4, "Debe haber 4 nodos en el Tablero de Conceptos 2D");
assert.equal(state.spatialNodes.length, 4, "Debe haber 4 nodos en el Espacio Neuronal 3D");
assert.equal(state.spatialLinks.length, 3, "Debe haber 3 enlaces proyectados en el Espacio Neuronal 3D");
assert.ok(state.isArchitectureUnlocked, "La arquitectura debe quedar desbloqueada al contener nodos");

// Verificar que las 4 categorías canónicas están presentes en el store
const presentCategories = new Set(state.spatialNodes.map((n) => n.category));
assert.ok(presentCategories.has("technical"), "Debe contener categoría technical");
assert.ok(presentCategories.has("economic"), "Debe contener categoría economic");
assert.ok(presentCategories.has("political"), "Debe contener categoría political");
assert.ok(presentCategories.has("legal"), "Debe contener categoría legal");
console.log("✓ Sincronización 2D/3D validada: 4 nodos multidimensionales y 3 enlaces en Zustand.");

// 4. Verificación de navegación y estado de desbloqueo
console.log("\n[4/4] Verificando consistencia de desbloqueo de arquitectura...");
assert.equal(useWorkspaceStore.getState().isArchitectureUnlocked, true);
console.log("✓ Arquitectura desbloqueada correctamente para pestañas superiores.");

console.log("\n=======================================================");
console.log("✨ ¡TODAS LAS VERIFICACIONES DE GENERACIÓN MULTIDIMENSIONAL PASARON! ✨");
console.log("=======================================================\n");
