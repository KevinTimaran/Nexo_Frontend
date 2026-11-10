/**
 * Domain model for the Spatial "Neural Canvas" 3D workspace.
 * Mirrors the data shape of the original 3d-force-graph prototype
 * (`group`, `val`, `importance`, `desc`) so the renderer can be ported 1:1.
 */

import type {
  ConceptKind,
  ConceptStatus,
  NodeCategory,
  NodePriority,
  ResearchPhase,
  ProjectMemoryKind,
  ProjectMemoryState,
  ProjectMemoryOrigin,
  PerspectiveId,
  CognitiveAssistanceMode,
  EvidenceValidationState,
  ValidationStatus,
  RelationSemanticType,
} from "./types";
import { perspectiveVisuals } from "../theme/semanticVisuals";

export type SpatialGroupId =
  | NodeCategory
  | "core"
  | "research"
  | "product"
  | "engineering"
  | "business";

export interface SpatialGroupMeta {
  id: SpatialGroupId;
  label: string;
  /** Hex color used by the WebGL materials, particles and the HUD legend dots. */
  color: string;
}

export interface SpatialNode {
  id: string;
  name: string;
  /** Canonical 2D title alias */
  title?: string;
  group: SpatialGroupId;
  /** Canonical 2D category */
  category?: NodeCategory;
  /** Relative size of the orb (radius = cbrt(val) * NODE_REL_SIZE). */
  val: number;
  /** 0..1 — nodes above 0.6 emit their own PointLight. */
  importance: number;
  desc: string;
  /** Canonical 2D description alias */
  description?: string;
  /** Shared markdown document (single source of truth) */
  details?: string;
  priority?: NodePriority;
  kind?: ConceptKind;
  phase?: ResearchPhase;
  status?: ConceptStatus;
  metadata?: string;
  x?: number;
  y?: number;
  z?: number;
  tags?: string[];
  relevanceScore?: number;
  semanticKey?: string;
  origin?: "ai_initial" | "ai_expansion" | "user" | "approved";
  verification?: "confirmed" | "unconfirmed" | "unknown";
  semanticKind?: ProjectMemoryKind;
  semanticState?: ProjectMemoryState;
  provenanceOrigin?: ProjectMemoryOrigin;
  perspectiveId?: PerspectiveId;
  cognitiveMode?: CognitiveAssistanceMode;
  evidenceValidationState?: EvidenceValidationState;
  contextValidationStatus?: ValidationStatus;
  sourceFactIds?: string[];
  sourceMessageIds?: string[];
  definitionVersion?: string;
  manuallyEditedFields?: string[];
  layout?: { board2d?: { x: number; y: number }; neural3d?: { x?: number; y?: number; z?: number } };
}

export interface SpatialLink {
  id?: string;
  source: string;
  target: string;
  /** Strength of the relation; drives particle count. */
  value: number;
  from?: string;
  to?: string;
  label?: string;
  type?: string;
  semanticType?: RelationSemanticType;
  semanticKey?: string;
  origin?: "ai_initial" | "ai_expansion" | "user" | "approved";
  definitionVersion?: string;
  sourceFactIds?: string[];
  sourceMessageIds?: string[];
  manuallyEditedFields?: string[];
}

export interface SpatialProjectBrief {
  title: string;
  phase: string;
  summary: string;
  tags: string[];
}

export const SPATIAL_GROUPS: readonly SpatialGroupMeta[] = [
  { id: "core", label: "Núcleo", color: perspectiveVisuals.general.dark },
  { id: "legal", label: perspectiveVisuals.legal.label, color: perspectiveVisuals.legal.dark },
  { id: "economic", label: perspectiveVisuals.economic.label, color: perspectiveVisuals.economic.dark },
  { id: "political", label: perspectiveVisuals.political.label, color: perspectiveVisuals.political.dark },
  { id: "technical", label: perspectiveVisuals.technical.label, color: perspectiveVisuals.technical.dark },
] as const;

export const SPATIAL_GROUP_IDS: SpatialGroupId[] = SPATIAL_GROUPS.map((group) => group.id);

export const DEFAULT_SPATIAL_GROUP_COLORS: Record<SpatialGroupId, string> = {
  core: perspectiveVisuals.general.dark,
  legal: perspectiveVisuals.legal.dark,
  economic: perspectiveVisuals.economic.dark,
  political: perspectiveVisuals.political.dark,
  technical: perspectiveVisuals.technical.dark,
  // Legacy groups preserved for backward compatibility
  research: "#22d3ee",
  product: "#34d399",
  engineering: "#f472b6",
  business: "#fbbf24",
};

const GROUP_INDEX: Record<string, SpatialGroupMeta> = Object.fromEntries(
  SPATIAL_GROUPS.map((g) => [g.id, g])
);

export const getSpatialGroup = (id: string | null | undefined): SpatialGroupMeta => {
  if (!id) return { id: "core", label: "General", color: perspectiveVisuals.general.dark };
  return (
    GROUP_INDEX[id] ?? {
      id: id as SpatialGroupId,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: DEFAULT_SPATIAL_GROUP_COLORS[id as SpatialGroupId] ?? perspectiveVisuals.general.dark,
    }
  );
};
