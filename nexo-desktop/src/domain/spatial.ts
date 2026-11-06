/**
 * Domain model for the Spatial "Neural Canvas" 3D workspace.
 * Mirrors the data shape of the original 3d-force-graph prototype
 * (`group`, `val`, `importance`, `desc`) so the renderer can be ported 1:1.
 */

export type SpatialGroupId = "core" | "research" | "product" | "engineering" | "business";

export interface SpatialGroupMeta {
  id: SpatialGroupId;
  label: string;
  /** Hex color used by the WebGL materials, particles and the HUD legend dots. */
  color: string;
}

export interface SpatialNode {
  id: string;
  name: string;
  group: SpatialGroupId;
  /** Relative size of the orb (radius = cbrt(val) * NODE_REL_SIZE). */
  val: number;
  /** 0..1 — nodes above 0.6 emit their own PointLight. */
  importance: number;
  desc: string;
}

export interface SpatialLink {
  source: string;
  target: string;
  /** Strength of the relation; drives particle count. */
  value: number;
}

export interface SpatialProjectBrief {
  title: string;
  phase: string;
  summary: string;
  tags: string[];
}

export const SPATIAL_GROUPS: readonly SpatialGroupMeta[] = [
  { id: "core", label: "Núcleo", color: "#818cf8" },
  { id: "research", label: "Investigación", color: "#22d3ee" },
  { id: "product", label: "Producto", color: "#34d399" },
  { id: "engineering", label: "Ingeniería", color: "#f472b6" },
  { id: "business", label: "Negocio", color: "#fbbf24" },
] as const;

export const SPATIAL_GROUP_IDS: SpatialGroupId[] = SPATIAL_GROUPS.map((group) => group.id);

export const DEFAULT_SPATIAL_GROUP_COLORS: Record<SpatialGroupId, string> =
  SPATIAL_GROUPS.reduce(
    (acc, group) => {
      acc[group.id] = group.color;
      return acc;
    },
    {} as Record<SpatialGroupId, string>
  );

const GROUP_INDEX: Record<SpatialGroupId, SpatialGroupMeta> = Object.fromEntries(
  SPATIAL_GROUPS.map((g) => [g.id, g])
) as Record<SpatialGroupId, SpatialGroupMeta>;

export const getSpatialGroup = (id: string | null | undefined): SpatialGroupMeta => {
  if (!id) return { id: "core", label: "General", color: "#818cf8" };
  return (
    GROUP_INDEX[id as SpatialGroupId] ?? {
      id: id as SpatialGroupId,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      color: "#818cf8",
    }
  );
};
