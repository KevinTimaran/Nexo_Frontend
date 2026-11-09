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
} from "./types";

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
}

export interface SpatialProjectBrief {
  title: string;
  phase: string;
  summary: string;
  tags: string[];
}

export const SPATIAL_GROUPS: readonly SpatialGroupMeta[] = [
  { id: "core", label: "Núcleo", color: "#E5C158" },
  { id: "legal", label: "Legal", color: "#A855F7" },
  { id: "economic", label: "Económico", color: "#10B981" },
  { id: "political", label: "Político", color: "#3B82F6" },
  { id: "technical", label: "Técnico", color: "#64748B" },
] as const;

export const SPATIAL_GROUP_IDS: SpatialGroupId[] = SPATIAL_GROUPS.map((group) => group.id);

export const DEFAULT_SPATIAL_GROUP_COLORS: Record<SpatialGroupId, string> = {
  core: "#E5C158",
  legal: "#A855F7",
  economic: "#10B981",
  political: "#3B82F6",
  technical: "#64748B",
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
  if (!id) return { id: "core", label: "General", color: "#E5C158" };
  return (
    GROUP_INDEX[id] ?? {
      id: id as SpatialGroupId,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: DEFAULT_SPATIAL_GROUP_COLORS[id as SpatialGroupId] ?? "#E5C158",
    }
  );
};
