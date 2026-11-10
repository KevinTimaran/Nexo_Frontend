import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { ConceptNode, PerspectiveId, RelationSemanticType } from "../src/domain/types";
import {
  perspectiveVisuals,
  relationVisuals,
  resolvePerspectiveVisual,
  resolveRelationVisual,
  resolveSemanticStatusVisual,
  resolveSemanticTypeVisual,
  semanticNodeVisuals,
  semanticStatusVisuals,
  semanticTypeVisuals,
  supportedPerspectiveIds,
  supportedSemanticStatusIds,
  supportedSemanticTypeIds,
} from "../src/theme/semanticVisuals";
import { projectSpatialNodes } from "../src/store/useWorkspaceStore";

console.log("=== PHASE 7: VISUAL SEMANTIC SYSTEM ===");

const HEX = /^#[0-9A-F]{6}$/i;
const rgb = (hex: string) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
const mix = (foreground: number[], background: number[], amount: number) => foreground.map((value, index) => Math.round(value * amount + background[index] * (1 - amount)));
const luminance = (color: number[]) => {
  const linear = color.map((value) => value / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const contrast = (foreground: number[], background: number[]) => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};
const assertBadgeContrast = (light: string, dark: string, label: string) => {
  const lightText = mix(rgb(light), rgb("#2D1512"), 0.82);
  const lightSurface = mix(rgb(light), rgb("#FFFFFF"), 0.09);
  const darkText = mix(rgb(dark), rgb("#F3EBE1"), 0.84);
  const darkSurface = mix(rgb(dark), rgb("#2A1412"), 0.10);
  assert.ok(contrast(lightText, lightSurface) >= 4.5, `${label} light badge text must meet WCAG AA`);
  assert.ok(contrast(darkText, darkSurface) >= 4.5, `${label} dark badge text must meet WCAG AA`);
};
const requiredPerspectives: PerspectiveId[] = [
  "economic", "human", "political", "legal", "ethical", "technical", "geographic",
  "environmental", "historical", "market", "cultural", "operational", "educational",
  "institutional", "methodological", "privacy", "accessibility",
];

for (const id of requiredPerspectives) {
  const token = perspectiveVisuals[id];
  assert.ok(token, `Perspective ${id} must have a visual token`);
  assert.match(token.light, HEX);
  assert.match(token.dark, HEX);
  assert.ok(token.label && token.icon && token.glyph, `${id} must reinforce color with label, icon and glyph`);
  assertBadgeContrast(token.light, token.dark, id);
}
assert.deepEqual([...supportedPerspectiveIds].sort(), [...requiredPerspectives].sort());

for (const id of supportedSemanticTypeIds) {
  const token = semanticTypeVisuals[id];
  assert.ok(token.label && token.icon && token.glyph && token.shape, `${id} must include non-color cues`);
  assert.match(token.light, HEX);
  assert.match(token.dark, HEX);
  assertBadgeContrast(token.light, token.dark, id);
}

for (const id of supportedSemanticStatusIds) {
  const token = semanticStatusVisuals[id];
  assert.ok(token.label && token.icon && token.glyph && token.borderStyle, `${id} must include label, icon, glyph and border`);
  assert.match(token.light, HEX);
  assert.match(token.dark, HEX);
  assertBadgeContrast(token.light, token.dark, id);
}

for (const id of ["confirmed", "hypothesis", "unknown", "proposed", "rejected", "validated", "mixed"] as const) {
  assert.ok(semanticStatusVisuals[id], `Status ${id} must map safely`);
}
assert.notEqual(semanticStatusVisuals.confirmed.borderStyle, semanticStatusVisuals.hypothesis.borderStyle);
assert.notEqual(semanticStatusVisuals.unknown.glyph, semanticStatusVisuals.confirmed.glyph);
assert.ok(semanticStatusVisuals.rejected.opacity < semanticStatusVisuals.confirmed.opacity);

const baseNode = (patch: Partial<ConceptNode>): ConceptNode => ({
  id: "node", title: "Semantic node", description: "Visual semantics test", kind: "concept",
  status: "exploring", metadata: "", x: 10, y: 20, ...patch,
});

const scenarios: Record<string, ConceptNode[]> = {
  hardware: [
    baseNode({ id: "hardware-central", title: "Ferretería", semanticKind: "user_fact", semanticState: "confirmed", verification: "confirmed", category: "economic", perspectiveId: "economic", origin: "user" }),
    baseNode({ id: "hardware-hypothesis", title: "Guía de compra", semanticKind: "hypothesis", semanticState: "proposed", verification: "unconfirmed", perspectiveId: "human", category: "political" }),
    baseNode({ id: "hardware-opportunity", title: "Asesoría personalizada", kind: "viability", cognitiveMode: "opportunity", perspectiveId: "market", category: "economic" }),
    baseNode({ id: "hardware-risk", title: "Costo de inventario", kind: "risk", cognitiveMode: "risk", perspectiveId: "economic", category: "economic" }),
    baseNode({ id: "hardware-evidence", title: "Fuente externa", semanticKind: "evidence", evidenceValidationState: "supports", provenanceOrigin: "research_evidence", perspectiveId: "market" }),
    baseNode({ id: "hardware-unknown", title: "Demanda local", semanticKind: "unknown", semanticState: "unknown", verification: "unknown", perspectiveId: "geographic" }),
  ],
  thesis: [
    baseNode({ id: "thesis-problem", title: "Problema de investigación", cognitiveMode: "question", perspectiveId: "methodological" }),
    baseNode({ id: "thesis-hypothesis", title: "Hipótesis", semanticKind: "hypothesis", semanticState: "proposed", perspectiveId: "methodological" }),
    baseNode({ id: "thesis-evidence", title: "Artículo académico", semanticKind: "evidence", evidenceValidationState: "mixed", perspectiveId: "educational" }),
    baseNode({ id: "thesis-history", title: "Contexto histórico", perspectiveId: "historical" }),
    baseNode({ id: "thesis-ethics", title: "Riesgo ético", kind: "risk", perspectiveId: "ethical" }),
    baseNode({ id: "thesis-unknown", title: "Pregunta abierta", semanticKind: "unknown", semanticState: "unknown", perspectiveId: "human" }),
  ],
  software: [
    baseNode({ id: "software-constraint", title: "Restricción técnica", kind: "risk", perspectiveId: "technical" }),
    baseNode({ id: "software-privacy", title: "Riesgo de privacidad", kind: "risk", perspectiveId: "privacy" }),
    baseNode({ id: "software-opportunity", title: "Usabilidad", kind: "viability", cognitiveMode: "opportunity", perspectiveId: "accessibility" }),
    baseNode({ id: "software-need", title: "Necesidad del usuario", semanticKind: "user_fact", perspectiveId: "human" }),
    baseNode({ id: "software-hypothesis", title: "Hipótesis de adopción", semanticKind: "hypothesis", semanticState: "proposed", perspectiveId: "market" }),
    baseNode({ id: "software-evidence", title: "Prueba de uso", semanticKind: "evidence", evidenceValidationState: "challenges", perspectiveId: "technical" }),
  ],
};

for (const [scenario, nodes] of Object.entries(scenarios)) {
  for (const node of nodes) {
    const visual = semanticNodeVisuals(node);
    assert.ok(visual.type.label && visual.perspective.label && visual.status.label && visual.origin.label, `${scenario}/${node.id} must resolve all semantic axes`);
    assert.ok(visual.type.icon && visual.type.shortLabel, `${scenario}/${node.id} type must not depend on color alone`);
    assert.ok(visual.perspective.icon && visual.perspective.shortLabel, `${scenario}/${node.id} perspective must not depend on color alone`);
    assert.ok(visual.status.icon && visual.status.shortLabel && visual.status.borderStyle, `${scenario}/${node.id} status must not depend on color alone`);
  }

  const spatial = projectSpatialNodes(nodes);
  for (const node of nodes) {
    const spatialNode = spatial.find((item) => item.id === node.id);
    assert.ok(spatialNode, `${scenario}/${node.id} must project to 3D`);
    const visual2d = semanticNodeVisuals(node);
    const visual3d = semanticNodeVisuals(spatialNode);
    assert.equal(visual3d.type.id, visual2d.type.id, `${scenario}/${node.id} type parity`);
    assert.equal(visual3d.perspective.id, visual2d.perspective.id, `${scenario}/${node.id} perspective parity`);
    assert.equal(visual3d.status.id, visual2d.status.id, `${scenario}/${node.id} status parity`);
    assert.equal(visual3d.origin.id, visual2d.origin.id, `${scenario}/${node.id} provenance parity`);
  }
}

assert.equal(resolvePerspectiveVisual({ perspectiveId: "not-real" as PerspectiveId }).id, "general");
assert.equal(resolvePerspectiveVisual(undefined).id, "general");
assert.equal(resolveSemanticTypeVisual(undefined).id, "legacy_unknown");
assert.equal(resolveSemanticStatusVisual(undefined).id, "proposed");

const relationTypes: RelationSemanticType[] = [
  "related_to", "supports", "affects", "depends_on", "contradicts", "validates", "enables",
  "requires", "impacts", "solves", "threatens", "regulates", "funds",
];
for (const relationType of relationTypes) {
  const visual = resolveRelationVisual(relationType);
  assert.ok(visual.label && visual.icon && visual.lineStyle, `${relationType} must have non-color relation semantics`);
}
assert.equal(resolveRelationVisual("supports").id, "support");
assert.equal(resolveRelationVisual("contradicts").id, "challenge");
assert.equal(resolveRelationVisual("depends_on").id, "dependency");
assert.equal(resolveRelationVisual("unknown_relation").id, "neutral");
assert.notEqual(relationVisuals.support.lineStyle, relationVisuals.challenge.lineStyle);

const denseGraph = Array.from({ length: 20 }, (_, index) => baseNode({
  id: `dense-${index}`,
  title: `Concepto ${index + 1}`,
  semanticKind: index % 5 === 0 ? "hypothesis" : index % 5 === 1 ? "evidence" : index % 5 === 2 ? "unknown" : "suggestion",
  semanticState: index % 5 === 2 ? "unknown" : index % 4 === 0 ? "confirmed" : "proposed",
  perspectiveId: requiredPerspectives[index % requiredPerspectives.length],
  evidenceValidationState: index % 5 === 1 ? (index % 2 ? "supports" : "mixed") : undefined,
}));
const denseVisuals = denseGraph.map(semanticNodeVisuals);
assert.equal(denseVisuals.length, 20);
assert.ok(new Set(denseVisuals.map((item) => item.perspective.id)).size >= 12, "Dense graph must preserve varied perspectives without inventing per-node colors");
assert.ok(new Set(denseVisuals.map((item) => item.type.icon)).size >= 4, "Dense graph must retain non-color type cues");

const persisted = JSON.parse(JSON.stringify(scenarios.software)) as ConceptNode[];
assert.deepEqual(
  persisted.map((node) => semanticNodeVisuals(node).type.id),
  scenarios.software.map((node) => semanticNodeVisuals(node).type.id),
  "Visual semantics must derive from persisted semantic data after reload",
);

const conceptCanvas = fs.readFileSync(path.resolve("src/features/workspace/ConceptCanvas.tsx"), "utf8");
const spatialCanvas = fs.readFileSync(path.resolve("src/features/spatial/SpatialCanvas3D.tsx"), "utf8");
const chat = fs.readFileSync(path.resolve("src/features/workspace/FullScreenDiscoveryChat.tsx"), "utf8");
const semanticBadges = fs.readFileSync(path.resolve("src/components/semantic/SemanticBadges.tsx"), "utf8");
assert.ok(conceptCanvas.includes("resolvePerspectiveVisual"));
assert.ok(spatialCanvas.includes("semanticNodeVisuals") && spatialCanvas.includes("resolveRelationVisual"));
assert.ok(chat.includes("semanticTypeVisuals") && chat.includes("semanticStatusVisuals"));
assert.ok(semanticBadges.includes("<SemanticIcon") && semanticBadges.includes("token.shortLabel"), "Badges must render icon and text in addition to color");
assert.ok(spatialCanvas.includes("reduceMotion") && spatialCanvas.includes("prefers-reduced-motion"));

console.log("✓ Shared mappings, fallbacks, accessibility cues, 2D/3D parity, three scenarios, dense graph and persistence passed");
