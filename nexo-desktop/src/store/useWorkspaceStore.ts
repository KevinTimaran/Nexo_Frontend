import { create } from "zustand";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import {
  INITIAL_DISCOVERY_MESSAGES,
  type CanvasMode,
  type ChatMessage,
  type ChatPhase,
  type ConceptKind,
  type ConceptMap,
  type ConceptNode,
  type ConceptRelation,
  type Message,
  type AssistantMessage,
  type NodeCategory,
  type NodePriority,
  type ResearchPhase,
  type Workspace,
} from "../domain/types";
import {
  DEFAULT_SPATIAL_GROUP_COLORS,
  type SpatialGroupId,
  type SpatialLink,
  type SpatialNode,
} from "../domain/spatial";
import { findDuplicateConcept } from "../services/ai/prompts";
import { normalizeRelationType } from "../services/ai/reconcileGraph";
import { normalizeCategory } from "../domain/constants";
import { services } from "../services";
import { initialDiscovery } from "../services/ai/discovery";

export interface ConceptNodeData extends ConceptNode {
  onOpenDeepDive?: (id: string) => void;
}

function stableId(prefix: string, key: string): string {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  const safeKey = key.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "item";
  return `${prefix}-${safeKey}-${(hash >>> 0).toString(36)}`;
}

function relationKey(relation: ConceptRelation, nodes: ConceptNode[]): string {
  if (relation.semanticKey) return relation.semanticKey;
  const from = nodes.find((node) => node.id === relation.from)?.semanticKey ?? relation.from;
  const to = nodes.find((node) => node.id === relation.to)?.semanticKey ?? relation.to;
  return `${from}->${to}:${normalizeRelationType(relation.semanticType ?? relation.type)}`;
}

type ActiveLeftPanel = "chat" | "filters" | "nodelist" | null;
type DocViewMode = "hidden" | "sidebar" | "fullscreen";

interface WorkspaceState {
  // Data
  workspace: Workspace | null;
  canvasMode: CanvasMode;
  chatPhase: ChatPhase;
  selectedNodeId: string | null;
  expandedDocNodeId: string | null;
  isThinking: boolean;
  isChatOpen: boolean;
  isArchitectureUnlocked: boolean;
  discoveryMessages: ChatMessage[];
  discoverySelectedOptions: Record<string, string | string[]>;

  // React Flow State
  nodes: Node<ConceptNodeData>[];
  edges: Edge[];
  isDeepDiveModalOpen: boolean;

  // Actions
  setWorkspace: (workspace: Workspace | null) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setChatPhase: (phase: ChatPhase) => void;
  setArchitectureUnlocked: (unlocked: boolean) => void;
  selectNode: (nodeId: string | null) => void;
  setExpandedDocNodeId: (nodeId: string | null) => void;
  setThinking: (thinking: boolean) => void;
  setChatOpen: (isOpen: boolean) => void;
  toggleChat: () => void;
  setDiscoverySelectedOptions: (selected: Record<string, string | string[]>) => void;
  resetWorkspace: () => void;

  // Deep-Dive Modal Actions
  openDeepDive: (nodeId: string) => void;
  closeDeepDive: () => void;
  updateNodeContent: (id: string, updates: Partial<ConceptNode>) => void;

  // React Flow Handlers
  setNodes: (nodes: Node<ConceptNodeData>[] | ((nds: Node<ConceptNodeData>[]) => Node<ConceptNodeData>[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  syncFlowElements: () => void;

  // Node operations
  addNode: (nodeData: Omit<ConceptNode, "id">) => ConceptNode;
  updateNode: (nodeId: string, patch: Partial<ConceptNode>) => void;
  removeNode: (nodeId: string) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;

  // Message operations
  addMessage: (message: Message) => void;
  toggleExplanation: (messageId: string) => void;
  setMessageExplaining: (messageId: string, isExplaining: boolean, error?: string | null) => void;
  setMessageExplanation: (messageId: string, explanation: string) => void;
  addNodeFromChat: (nodeDraft: {
    title: string;
    description: string;
    kind: ConceptKind;
    category?: NodeCategory;
    priority?: NodePriority;
    phase?: ResearchPhase;
    metadata?: string;
    details?: string;
    relevanceScore?: number;
    semanticKey?: string;
    semanticKind?: ConceptNode["semanticKind"];
    semanticState?: ConceptNode["semanticState"];
    provenanceOrigin?: ConceptNode["provenanceOrigin"];
    sourceFactIds?: string[];
    sourceMessageIds?: string[];
  }) => ConceptNode | null;

  /** Returns the last 3 messages (most recent first) to maintain conversational context. */
  getRecentMessages: () => Message[];

  // ─── Spatial "Neural Canvas" 3D UI ───
  // NOTE: `nodes`/`edges` above belong to React Flow (ConceptCanvas).
  // The 3D graph data is exposed via `spatialNodes`, `spatialLinks` and `links`.
  /** Cluster/category currently isolated in the 3D canvas (null = show all). */
  activeFilter: string | null;
  /** Notion-style document overlay for the selected spatial node. */
  isDocModalOpen: boolean;
  spatialNodes: SpatialNode[];
  spatialLinks: SpatialLink[];
  /** Alias for spatialLinks matching prototype requirements */
  links: SpatialLink[];
  /** Per-node document body (plain text) edited in the Notion overlay. */
  spatialDocs: Record<string, string>;
  /** Runtime color overrides for each spatial cluster/group. */
  spatialGroupColors: Record<SpatialGroupId, string>;
  /** Zen mode hides floating HUD except the zen exit control. */
  isZenMode: boolean;
  /** Active auxiliary left panel, toggled from the spatial dock. */
  activeLeftPanel: ActiveLeftPanel;
  /** Progressive document reveal mode for the selected node. */
  docViewMode: DocViewMode;
  /** Monotonic counter used to trigger camera flight to the selected node */
  cameraFlightCount: number;

  setActiveFilter: (group: string | null) => void;
  /** Selects a node (shares `selectedNodeId`); clearing it also closes the doc overlay. */
  setSelectedNode: (nodeId: string | null) => void;
  /** Selects a node and commands camera flight to it, opening the detail mini-card. */
  focusSpatialNode: (nodeId: string) => void;
  setDocModalOpen: (isOpen: boolean) => void;
  setSpatialDoc: (nodeId: string, content: string) => void;
  setSpatialGroupColor: (group: SpatialGroupId, color: string) => void;
  setZenMode: (isZenMode: boolean) => void;
  toggleZenMode: () => void;
  setActiveLeftPanel: (panel: ActiveLeftPanel) => void;
  setDocViewMode: (mode: DocViewMode) => void;
  removeSpatialNode: (nodeId: string) => void;
  updateSpatialNode: (nodeId: string, patch: Partial<SpatialNode>) => void;
}

const persistSession = (projectId: string, map: ConceptMap, messages: Message[]) => {
  try {
    void services.workspace.save(projectId, map, messages, useWorkspaceStore.getState().workspace?.discovery).catch(console.error);
  } catch (error) {
    console.error("Failed to persist workspace session", error);
  }
};

export function convertMapToFlow(
  map: ConceptMap | undefined,
  openDeepDive: (id: string) => void
): { nodes: Node<ConceptNodeData>[]; edges: Edge[] } {
  const nodesList = map?.nodes || [];
  const relationsList = map?.relations || [];

  const nodes: Node<ConceptNodeData>[] = nodesList.map((n) => ({
    id: n.id,
    type: "conceptNode",
    position: { x: n.layout?.board2d?.x ?? n.x, y: n.layout?.board2d?.y ?? n.y },
    data: {
      ...n,
      onOpenDeepDive: openDeepDive,
    },
  }));

  const edges: Edge[] = relationsList.map((r) => ({
    id: r.id,
    source: r.from,
    target: r.to,
    type: "smoothstep",
    label: r.label,
    data: {
      semanticType: r.semanticType,
      semanticKey: r.semanticKey,
      origin: r.origin,
      sourceFactIds: r.sourceFactIds,
      sourceMessageIds: r.sourceMessageIds,
      manuallyEditedFields: r.manuallyEditedFields,
    },
    animated: true,
    style: {
      stroke: "#3b82f6",
      strokeWidth: 2,
    },
  }));

  return { nodes, edges };
}


/**
 * Resolves the initial landing tab based on whether the project has generated nodes:
 * - Empty projects (0 nodes) -> "discovery" (1. Ideación IA)
 * - Populated projects (has nodes) -> "notion" (2. Tablero de Conceptos)
 */
export function resolveInitialLandingMode(map?: ConceptMap | null): CanvasMode {
  return map?.nodes && map.nodes.length > 0 ? "notion" : "discovery";
}

function stableSpatialDepth(node: ConceptNode): number {
  const key = node.semanticKey ?? node.id;
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  return ((hash >>> 0) % 4000) / 100 - 20;
}

/**
 * Projects 2D ConceptNode entities into 3D SpatialNode representations.
 * Preserves existing physics simulation coordinates (x, y, z) if available.
 */
export function projectSpatialNodes(
  nodes: ConceptNode[] = [],
  existingSpatialNodes: SpatialNode[] = []
): SpatialNode[] {
  const coordMap = new Map<string, { x?: number; y?: number; z?: number }>();
  for (const sn of existingSpatialNodes) {
    if (sn.x !== undefined || sn.y !== undefined || sn.z !== undefined) {
      coordMap.set(sn.id, { x: sn.x, y: sn.y, z: sn.z });
    }
  }

  return nodes.map((node) => {
    const existingCoords = coordMap.get(node.id);
    const boardLayout = node.layout?.board2d;
    const spatialLayout = node.layout?.neural3d;
    const category = node.category || "technical";
    const group = (node.group || category) as SpatialGroupId;
    const title = node.title || node.name || "Sin título";
    const desc = node.details || node.description || node.desc || "";
    const priority = node.priority || (node.kind === "risk" ? "high" : "medium");
    const score = node.relevanceScore ?? (priority === "high" ? 9 : priority === "low" ? 4 : 7);

    const val =
      node.val ??
      Math.max(4, Math.min(25, Math.round(score * 2.2)));
    const importance =
      node.importance ??
      Math.max(0.1, Math.min(1.0, score / 10));

    return {
      id: node.id,
      name: title,
      title,
      group,
      category,
      val,
      importance,
      desc,
      description: node.description || desc,
      details: node.details,
      priority,
      kind: node.kind,
      phase: node.phase,
      status: node.status,
      metadata: node.metadata,
      x: spatialLayout?.x ?? boardLayout?.x ?? existingCoords?.x ?? node.x,
      y: spatialLayout?.y ?? boardLayout?.y ?? existingCoords?.y ?? node.y,
      z: spatialLayout?.z ?? existingCoords?.z ?? node.z ?? stableSpatialDepth(node),
      tags: node.tags,
      relevanceScore: score,
      semanticKey: node.semanticKey,
      origin: node.origin,
      verification: node.verification,
      semanticKind: node.semanticKind,
      semanticState: node.semanticState,
      provenanceOrigin: node.provenanceOrigin,
      sourceFactIds: node.sourceFactIds,
      sourceMessageIds: node.sourceMessageIds,
      definitionVersion: node.definitionVersion,
      manuallyEditedFields: node.manuallyEditedFields,
      layout: node.layout,
    };
  });
}

/**
 * Projects 2D ConceptRelation entities into 3D SpatialLinks with directional particles.
 */
export function projectSpatialLinks(relations: ConceptRelation[] = []): SpatialLink[] {
  return relations.map((rel) => {
    const source = rel.from || (rel.source as string);
    const target = rel.to || (rel.target as string);
    return {
      id: rel.id,
      source,
      target,
      from: source,
      to: target,
      value: Math.max(1, Math.min(5, Math.round(rel.value ?? 2))),
      label: rel.label,
      type: rel.type,
      semanticType: rel.semanticType,
      semanticKey: rel.semanticKey,
      origin: rel.origin,
      definitionVersion: rel.definitionVersion,
      sourceFactIds: rel.sourceFactIds,
      sourceMessageIds: rel.sourceMessageIds,
      manuallyEditedFields: rel.manuallyEditedFields,
    };
  });
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  canvasMode: "notion",
  chatPhase: "PHASE_1_DISCOVERY",
  selectedNodeId: null,
  expandedDocNodeId: null,
  isThinking: false,
  isChatOpen: false,
  isArchitectureUnlocked: false,
  discoveryMessages: INITIAL_DISCOVERY_MESSAGES,
  discoverySelectedOptions: {},

  nodes: [],
  edges: [],
  isDeepDiveModalOpen: false,

  activeFilter: null,
  isDocModalOpen: false,
  spatialNodes: [],
  spatialLinks: [],
  links: [],
  spatialDocs: {},
  spatialGroupColors: { ...DEFAULT_SPATIAL_GROUP_COLORS },
  isZenMode: false,
  activeLeftPanel: null,
  docViewMode: "hidden",
  cameraFlightCount: 0,

  setActiveFilter: (activeFilter) => set({ activeFilter }),

  setSelectedNode: (selectedNodeId) =>
    set((state) => {
      if (selectedNodeId === null) {
        return { selectedNodeId: null, isDocModalOpen: false, docViewMode: "hidden" };
      }
      return {
        selectedNodeId,
        docViewMode: "hidden",
        cameraFlightCount: state.cameraFlightCount + 1,
      };
    }),

  focusSpatialNode: (selectedNodeId) =>
    set((state) => ({
      selectedNodeId,
      docViewMode: "hidden",
      cameraFlightCount: state.cameraFlightCount + 1,
    })),

  setDocModalOpen: (isDocModalOpen) => set({ isDocModalOpen }),

  setSpatialDoc: (nodeId, content) => {
    const { workspace } = get();
    if (!workspace) {
      set((state) => ({ spatialDocs: { ...state.spatialDocs, [nodeId]: content } }));
      return;
    }

    const nextNodes = workspace.map.nodes.map((node) =>
      node.id === nodeId ? { ...node, details: content } : node
    );
    const nextMap = { ...workspace.map, nodes: nextNodes };
    const nextWorkspace = { ...workspace, map: nextMap };

    const nextFlowNodes = get().nodes.map((fn) =>
      fn.id === nodeId
        ? {
            ...fn,
            data: {
              ...fn.data,
              details: content,
            },
          }
        : fn
    );

    const nextSpatialNodes = get().spatialNodes.map((sn) =>
      sn.id === nodeId ? { ...sn, details: content, desc: content } : sn
    );

    set({
      workspace: nextWorkspace,
      nodes: nextFlowNodes,
      spatialNodes: nextSpatialNodes,
      spatialDocs: { ...get().spatialDocs, [nodeId]: content },
    });

    if (workspace.project?.id) {
      persistSession(workspace.project.id, nextMap, workspace.messages || []);
    }
  },

  setSpatialGroupColor: (group, color) =>
    set((state) => ({
      spatialGroupColors: {
        ...state.spatialGroupColors,
        [group]: color,
      },
    })),

  setZenMode: (isZenMode) => set({ isZenMode }),

  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),

  setActiveLeftPanel: (activeLeftPanel) => set({ activeLeftPanel }),

  setDocViewMode: (docViewMode) => set({ docViewMode }),

  removeSpatialNode: (nodeId) => {
    get().removeNode(nodeId);
  },

  updateSpatialNode: (nodeId, patch) => {
    const safeTitle =
      patch.name !== undefined && patch.name.trim().length > 0
        ? patch.name.trim()
        : undefined;
    const updates: Partial<ConceptNode> = {
      ...(safeTitle !== undefined ? { title: safeTitle, name: safeTitle } : {}),
      ...(patch.desc !== undefined ? { description: patch.desc, desc: patch.desc } : {}),
      ...(patch.group !== undefined ? { category: normalizeCategory(patch.group), group: patch.group } : {}),
      ...(patch.val !== undefined ? { val: patch.val } : {}),
      ...(patch.importance !== undefined ? { importance: patch.importance } : {}),
      ...(patch.details !== undefined ? { details: patch.details } : {}),
    };
    get().updateNodeContent(nodeId, updates);
  },

  resetWorkspace: () =>
    set({
      workspace: null,
      nodes: [],
      edges: [],
      spatialNodes: [],
      spatialLinks: [],
      links: [],
      spatialDocs: {},
      selectedNodeId: null,
      expandedDocNodeId: null,
      chatPhase: "PHASE_1_DISCOVERY",
      isArchitectureUnlocked: false,
      discoveryMessages: INITIAL_DISCOVERY_MESSAGES,
      discoverySelectedOptions: {},
    }),

  setWorkspace: (workspace) => {
    if (!workspace) {
      set({
        workspace: null,
        nodes: [],
        edges: [],
        spatialNodes: [],
        spatialLinks: [],
        links: [],
        spatialDocs: {},
        chatPhase: "PHASE_1_DISCOVERY",
        isArchitectureUnlocked: false,
      });
      return;
    }
    const migratedNodes = (workspace.map?.nodes ?? []).map((node) => ({
      ...node,
      layout: {
        ...node.layout,
        board2d: node.layout?.board2d ?? { x: node.x, y: node.y },
        neural3d: {
          x: node.layout?.neural3d?.x ?? node.x,
          y: node.layout?.neural3d?.y ?? node.y,
          z: node.layout?.neural3d?.z ?? node.z ?? stableSpatialDepth(node),
        },
      },
    }));
    workspace = {
      ...workspace,
      map: { ...workspace.map, nodes: migratedNodes },
      discovery: workspace.discovery ?? initialDiscovery(Boolean(workspace.map?.nodes && workspace.map.nodes.length > 0)),
    };
    const prevProjectId = get().workspace?.project?.id;
    const isNewProject = prevProjectId !== workspace.project?.id;
    const { nodes, edges } = convertMapToFlow(workspace.map, (id) => get().openDeepDive(id));
    const hasGeneratedNodes = Boolean(workspace.map?.nodes && workspace.map.nodes.length > 0);
    if (hasGeneratedNodes && workspace.discovery && workspace.discovery.lifecycle === "legacy_unknown") {
      workspace = { ...workspace, discovery: { ...workspace.discovery, lifecycle: "generated" } };
    }
    const inferredPhase: ChatPhase = workspace.discovery?.lifecycle === "generated" || (hasGeneratedNodes && workspace.discovery?.lifecycle === "legacy_unknown")
      ? "PHASE_3_EXPANSION"
      : "PHASE_1_DISCOVERY";
    const landingMode = resolveInitialLandingMode(workspace.map);

    const spatialNodes = projectSpatialNodes(
      workspace.map?.nodes || [],
      isNewProject ? [] : get().spatialNodes
    );
    const spatialLinks = projectSpatialLinks(workspace.map?.relations || []);
    const spatialDocs: Record<string, string> = {};
    for (const n of workspace.map?.nodes || []) {
      if (n.details) {
        spatialDocs[n.id] = n.details;
      }
    }

    const reconstructedDiscovery: ChatMessage[] =
      workspace.messages && workspace.messages.length > 0
        ? workspace.messages.map((m) => {
            if (m.role === "user") {
              return {
                id: m.id,
                role: "user" as const,
                content: m.text,
                type: "text" as const,
                 questionnaireId: m.questionnaireId,
              };
            }
            const asst = m as AssistantMessage;
            if (asst.discoveryQuestions && asst.discoveryQuestions.length > 0 && asst.action !== "ready") {
              return {
                id: asst.id,
                role: "assistant" as const,
                content: asst.text,
                type: "questionnaire" as const,
                questions: asst.discoveryQuestions.map((dq) => ({
                  id: dq.id,
                  question: dq.question,
                  options: dq.options,
                  type: dq.type,
                  allowCustom: dq.allowCustom,
                })),
                ui: asst.ui,
                memoryPatches: asst.memoryPatches,
              };
            }
            return {
              id: asst.id,
              role: "assistant" as const,
              content: asst.text,
              type: "text" as const,
              ui: asst.ui,
              memoryPatches: asst.memoryPatches,
            };
          })
        : INITIAL_DISCOVERY_MESSAGES;

    const lifecycle = workspace.discovery?.lifecycle;
    if (lifecycle === "generated" || (hasGeneratedNodes && lifecycle !== "generation_error")) {
      const anchorId = workspace.discovery?.completionAnchorMessageId ?? reconstructedDiscovery.find((m) => m.role === "user")?.id;
      const anchorIndex = anchorId ? reconstructedDiscovery.findIndex((message) => message.id === anchorId) : -1;
      const insertAt = anchorIndex >= 0
        ? anchorIndex + 1
        : (reconstructedDiscovery.length > 2 ? 2 : reconstructedDiscovery.length);

      const cardId = `generation-status-${workspace.project.id}`;
      if (!reconstructedDiscovery.some((message) => message.id === cardId || message.type === "ready")) {
        reconstructedDiscovery.splice(insertAt, 0, {
          id: cardId,
          role: "assistant",
          type: "ready",
          content: "Tu tablero y la vista neuronal ya muestran la estructura inicial de tu proyecto. Puedes seguir conversando y ajustarla.",
        });
      }
    } else if (lifecycle === "generation_error") {
      const cardId = `generation-status-${workspace.project.id}`;
      if (!reconstructedDiscovery.some((message) => message.id === cardId || message.type === "ready")) {
        reconstructedDiscovery.push({
          id: cardId,
          role: "assistant",
          type: "ready",
          content: "Hubo un problema al guardar la estructura inicial. Puedes reintentar.",
        });
      }
    }

    const selectedOptions = Object.assign({}, isNewProject ? {} : get().discoverySelectedOptions, ...workspace.messages.filter((m): m is Extract<Message, { role: "user" }> => m.role === "user" && Boolean(m.answers)).map((m) => m.answers));
    set({
      workspace,
      nodes,
      edges,
      spatialNodes,
      spatialLinks,
      links: spatialLinks,
      spatialDocs,
      chatPhase: inferredPhase,
      isArchitectureUnlocked: hasGeneratedNodes,
      discoveryMessages: reconstructedDiscovery,
      discoverySelectedOptions: selectedOptions,
      ...(isNewProject
        ? {
            canvasMode: landingMode,
          }
        : {}),
    });
  },

  setArchitectureUnlocked: (isArchitectureUnlocked) => set({ isArchitectureUnlocked }),

  setCanvasMode: (canvasMode) => set({ canvasMode }),

  setChatPhase: (chatPhase) => set({ chatPhase }),

  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  setExpandedDocNodeId: (expandedDocNodeId) => set({ expandedDocNodeId }),

  setThinking: (isThinking) => set({ isThinking }),

  setChatOpen: (isChatOpen) => set({ isChatOpen }),

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),


  setDiscoverySelectedOptions: (discoverySelectedOptions) => set({ discoverySelectedOptions }),

  openDeepDive: (nodeId) =>
    set({
      selectedNodeId: nodeId,
      canvasMode: "spatial",
      docViewMode: "fullscreen",
      isDeepDiveModalOpen: false,
    }),

  closeDeepDive: () => set({ isDeepDiveModalOpen: false }),

  updateNodeContent: (id, updates) => {
    const { workspace, nodes } = get();
    if (!workspace) return;

    const nextNodes = workspace.map.nodes.map((node) => {
      if (node.id !== id) return node;
      const patched = { ...node, ...updates, manuallyEditedFields: [...new Set([...(node.manuallyEditedFields ?? []), ...Object.keys(updates)])] };
      if (updates.title !== undefined) {
        const trimmed = updates.title.trim();
        if (trimmed.length > 0) {
          patched.title = trimmed;
          patched.name = trimmed;
        } else {
          patched.title = node.title;
          patched.name = node.name || node.title;
        }
      }
      if (updates.description !== undefined) patched.desc = updates.description;
      return patched;
    });
    const nextMap = { ...workspace.map, nodes: nextNodes };
    const nextWorkspace = { ...workspace, map: nextMap };

    const nextFlowNodes = nodes.map((fn) =>
      fn.id === id
        ? {
            ...fn,
            data: {
              ...fn.data,
              ...updates,
            },
          }
        : fn
    );

    const spatialNodes = projectSpatialNodes(nextNodes, get().spatialNodes);
    const nextSpatialDocs =
      updates.details !== undefined
        ? { ...get().spatialDocs, [id]: updates.details }
        : get().spatialDocs;

    set({
      workspace: nextWorkspace,
      nodes: nextFlowNodes,
      spatialNodes,
      spatialDocs: nextSpatialDocs,
    });

    persistSession(workspace.project.id, nextMap, workspace.messages);
  },

  setNodes: (nodesOrUpdater) => {
    const nextNodes =
      typeof nodesOrUpdater === "function" ? nodesOrUpdater(get().nodes) : nodesOrUpdater;
    set({ nodes: nextNodes });
  },

  setEdges: (edgesOrUpdater) => {
    const nextEdges =
      typeof edgesOrUpdater === "function" ? edgesOrUpdater(get().edges) : edgesOrUpdater;
    set({ edges: nextEdges });
  },

  onNodesChange: (changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, get().nodes);
    set({ nodes: updatedNodes });

    const { workspace } = get();
    if (!workspace) return;

    let moved = false;
    const currentNodes = [...workspace.map.nodes];
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        const idx = currentNodes.findIndex((n) => n.id === change.id);
        if (idx !== -1) {
          const x = Math.round(change.position.x);
          const y = Math.round(change.position.y);
          currentNodes[idx] = {
            ...currentNodes[idx],
            x,
            y,
            layout: { ...currentNodes[idx].layout, board2d: { x, y } },
          };
          moved = true;
        }
      }
    }

    if (moved) {
      const nextMap = { ...workspace.map, nodes: currentNodes };
      const spatialNodes = projectSpatialNodes(currentNodes, get().spatialNodes);
      set({ workspace: { ...workspace, map: nextMap }, spatialNodes });
      persistSession(workspace.project.id, nextMap, workspace.messages);
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    const removedIds = new Set(changes.filter((change) => change.type === "remove").map((change) => change.id));
    const { workspace } = get();
    if (!workspace || removedIds.size === 0) return;
    const removed = workspace.map.relations.filter((relation) => removedIds.has(relation.id));
    if (removed.length === 0) return;
    const nextMap = { ...workspace.map, relations: workspace.map.relations.filter((relation) => !removedIds.has(relation.id)) };
    const discovery = workspace.discovery ? {
      ...workspace.discovery,
      tombstones: [...new Set([...workspace.discovery.tombstones, ...removed.flatMap((relation) => [relation.id, relationKey(relation, workspace.map.nodes)])])],
    } : undefined;
    set({ workspace: { ...workspace, map: nextMap, discovery }, spatialLinks: projectSpatialLinks(nextMap.relations), links: projectSpatialLinks(nextMap.relations) });
    persistSession(workspace.project.id, nextMap, workspace.messages);
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const { workspace } = get();
    if (!workspace) return;
    const sourceNode = workspace.map.nodes.find((node) => node.id === connection.source);
    const targetNode = workspace.map.nodes.find((node) => node.id === connection.target);
    if (!sourceNode || !targetNode) return;
    const semanticKey = `${sourceNode.semanticKey ?? connection.source}->${targetNode.semanticKey ?? connection.target}:related_to`;
    const newEdge: Edge = {
      id: stableId("rel", semanticKey),
      source: connection.source,
      target: connection.target,
      type: "smoothstep",
      data: { semanticType: "related_to", semanticKey, origin: "user" },
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    };
    if (workspace.map.relations.some((relation) => relationKey(relation, workspace.map.nodes) === semanticKey)) {
      const { nodes, edges } = convertMapToFlow(workspace.map, (id) => get().openDeepDive(id));
      const spatialLinks = projectSpatialLinks(workspace.map.relations);
      set({ nodes, edges, spatialLinks, links: spatialLinks });
      return;
    }

    const nextRelations = [
      ...workspace.map.relations,
      { id: newEdge.id, from: connection.source, to: connection.target, type: "related_to", semanticType: "related_to" as const, semanticKey, origin: "user" as const },
    ];
    const nextMap = { ...workspace.map, relations: nextRelations };
    const { nodes, edges } = convertMapToFlow(nextMap, (id) => get().openDeepDive(id));
    const spatialLinks = projectSpatialLinks(nextRelations);
    set({ workspace: { ...workspace, map: nextMap }, nodes, edges, spatialLinks, links: spatialLinks });
    persistSession(workspace.project.id, nextMap, workspace.messages);
  },

  syncFlowElements: () => {
    const { workspace } = get();
    if (!workspace) return;
    const { nodes, edges } = convertMapToFlow(workspace.map, (id) => get().openDeepDive(id));
    set({ nodes, edges });
  },

  addNode: (nodeData) => {
    const { workspace } = get();
    const id = "n-" + Math.random().toString(36).substring(2, 9);
    const category = nodeData.category ?? "technical";
    const priority = nodeData.priority ?? (nodeData.kind === "risk" ? "high" : "medium");
    const score = nodeData.relevanceScore ?? (priority === "high" ? 9 : priority === "low" ? 4 : 7);

    const newNode: ConceptNode = {
      id,
      ...nodeData,
      origin: nodeData.origin ?? "user",
      category,
      priority,
      name: nodeData.title,
      desc: nodeData.description,
      val: nodeData.val ?? Math.max(4, Math.min(25, Math.round(score * 2.2))),
      importance: nodeData.importance ?? Math.max(0.1, Math.min(1.0, score / 10)),
      relevanceScore: score,
    };

    if (workspace) {
      const nextNodes = [...workspace.map.nodes, newNode];
      const nextMap = { ...workspace.map, nodes: nextNodes };
      const nextWorkspace = { ...workspace, map: nextMap };
      const { nodes, edges } = convertMapToFlow(nextMap, (nid) => get().openDeepDive(nid));
      const spatialNodes = projectSpatialNodes(nextNodes, get().spatialNodes);
      const spatialLinks = projectSpatialLinks(nextMap.relations);
      const nextSpatialDocs = newNode.details
        ? { ...get().spatialDocs, [id]: newNode.details }
        : get().spatialDocs;
      const nextPhase: ChatPhase =
        get().chatPhase === "PHASE_2_STRUCTURING" ? "PHASE_3_EXPANSION" : get().chatPhase;

      set({
        workspace: nextWorkspace,
        selectedNodeId: id,
        nodes,
        edges,
        spatialNodes,
        spatialLinks,
        links: spatialLinks,
        spatialDocs: nextSpatialDocs,
        chatPhase: nextPhase,
      });
      persistSession(workspace.project.id, nextMap, workspace.messages);
    }

    return newNode;
  },

  updateNode: (nodeId, patch) => {
    get().updateNodeContent(nodeId, patch);
  },

  removeNode: (nodeId) => {
    const { workspace, selectedNodeId, expandedDocNodeId } = get();
    if (!workspace) return;

    const nextNodes = workspace.map.nodes.filter((node) => node.id !== nodeId);
    const nextRelations = workspace.map.relations.filter(
      (rel) => rel.from !== nodeId && rel.to !== nodeId && rel.source !== nodeId && rel.target !== nodeId
    );
    const nextMap = { nodes: nextNodes, relations: nextRelations };
    const removed = workspace.map.nodes.find((node) => node.id === nodeId);
    const discovery = removed && workspace.discovery
      ? { ...workspace.discovery, tombstones: [...new Set([...workspace.discovery.tombstones, removed.semanticKey ?? removed.id])] }
      : workspace.discovery;
    const nextWorkspace = { ...workspace, map: nextMap, discovery };
    const { nodes, edges } = convertMapToFlow(nextMap, (nid) => get().openDeepDive(nid));

    const spatialNodes = projectSpatialNodes(nextNodes, get().spatialNodes);
    const spatialLinks = projectSpatialLinks(nextRelations);
    const nextSpatialDocs = { ...get().spatialDocs };
    delete nextSpatialDocs[nodeId];

    set({
      workspace: nextWorkspace,
      selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
      expandedDocNodeId: expandedDocNodeId === nodeId ? null : expandedDocNodeId,
      nodes,
      edges,
      spatialNodes,
      spatialLinks,
      links: spatialLinks,
      spatialDocs: nextSpatialDocs,
      docViewMode: selectedNodeId === nodeId ? "hidden" : get().docViewMode,
    });

    persistSession(workspace.project.id, nextMap, workspace.messages);
  },

  moveNode: (nodeId, x, y) => {
    const { workspace } = get();
    if (!workspace) return;

    const nextNodes = workspace.map.nodes.map((node) =>
      node.id === nodeId ? { ...node, x, y, layout: { ...node.layout, board2d: { x, y } } } : node
    );
    const nextMap = { ...workspace.map, nodes: nextNodes };
    const spatialNodes = projectSpatialNodes(nextNodes, get().spatialNodes);
    set({ workspace: { ...workspace, map: nextMap }, spatialNodes });
    persistSession(workspace.project.id, nextMap, workspace.messages);
  },

  addMessage: (message) => {
    const { workspace } = get();
    if (!workspace) return;

    const nextMessages = [...workspace.messages, message];
    const nextWorkspace = { ...workspace, messages: nextMessages };
    set({ workspace: nextWorkspace });
    persistSession(workspace.project.id, workspace.map, nextMessages);
  },
  getRecentMessages: () => {
    const { workspace } = get();
    if (!workspace) return [];
    // Return last 3 messages (most recent first)
    return workspace.messages.slice(-3).reverse();
  },
  toggleExplanation: (messageId) => {
    const { workspace } = get();
    if (!workspace) return;

    const nextMessages = workspace.messages.map((m) => {
      if (m.id === messageId && m.role === "assistant") {
        const assistant = m as AssistantMessage;
        return {
          ...assistant,
          showExplanation: !assistant.showExplanation,
        };
      }
      return m;
    });

    set({ workspace: { ...workspace, messages: nextMessages } });
  },

  setMessageExplaining: (messageId, isExplaining, error = null) => {
    const { workspace } = get();
    if (!workspace) return;

    const nextMessages = workspace.messages.map((m) => {
      if (m.id === messageId && m.role === "assistant") {
        return {
          ...m,
          isExplaining,
          explanationError: error,
          showExplanation: isExplaining ? true : m.showExplanation,
        } as AssistantMessage;
      }
      return m;
    });

    set({ workspace: { ...workspace, messages: nextMessages } });
  },

  setMessageExplanation: (messageId, explanation) => {
    const { workspace } = get();
    if (!workspace) return;

    const nextMessages = workspace.messages.map((m) => {
      if (m.id === messageId && m.role === "assistant") {
        return {
          ...m,
          isExplaining: false,
          explanationError: null,
          simplifiedExplanation: explanation,
          showExplanation: true,
        } as AssistantMessage;
      }
      return m;
    });

    set({ workspace: { ...workspace, messages: nextMessages } });
  },

  addNodeFromChat: (nodeDraft) => {
    const { workspace } = get();
    if (!workspace) return null;

    // Check if node already exists by normalized & token-similarity deduplication
    const existing = findDuplicateConcept(nodeDraft.title, workspace.map.nodes);
    if (existing) {
      if (nodeDraft.sourceFactIds?.length || nodeDraft.sourceMessageIds?.length) {
        const nextNodes = workspace.map.nodes.map((node) => node.id === existing.id ? {
          ...node,
          semanticKey: node.semanticKey ?? nodeDraft.semanticKey,
          sourceFactIds: [...new Set([...(node.sourceFactIds ?? []), ...(nodeDraft.sourceFactIds ?? [])])],
          sourceMessageIds: [...new Set([...(node.sourceMessageIds ?? []), ...(nodeDraft.sourceMessageIds ?? [])])],
          semanticKind: node.semanticKind ?? nodeDraft.semanticKind,
          semanticState: node.semanticState ?? nodeDraft.semanticState,
          provenanceOrigin: node.provenanceOrigin ?? nodeDraft.provenanceOrigin,
        } : node);
        const nextMap = { ...workspace.map, nodes: nextNodes };
        const nextWorkspace = { ...workspace, map: nextMap };
        const { nodes, edges } = convertMapToFlow(nextMap, (nid) => get().openDeepDive(nid));
        const spatialNodes = projectSpatialNodes(nextNodes, get().spatialNodes);
        set({ workspace: nextWorkspace, nodes, edges, spatialNodes, selectedNodeId: existing.id });
        persistSession(workspace.project.id, nextMap, workspace.messages);
        return nextNodes.find((node) => node.id === existing.id) ?? existing;
      }
      set({ selectedNodeId: existing.id });
      return existing;
    }

    // Determine smart layout placement (staggered to the right of existing nodes)
    const maxX = workspace.map.nodes.reduce((acc, n) => Math.max(acc, n.x), 50);
    const avgY = workspace.map.nodes.length > 0
      ? Math.round(workspace.map.nodes.reduce((acc, n) => acc + n.y, 0) / workspace.map.nodes.length)
      : 200;

    const id = nodeDraft.semanticKey ? stableId("memory", nodeDraft.semanticKey) : "n-ai-" + Math.random().toString(36).substring(2, 8);
    const category =
      nodeDraft.category ??
      (nodeDraft.kind === "viability" ? "economic" : nodeDraft.kind === "risk" ? "legal" : "technical");
    const score = nodeDraft.relevanceScore ?? 8;
    const priority =
      nodeDraft.priority ?? (score >= 8 ? "high" : score >= 5 ? "medium" : "low");

    const newNode: ConceptNode = {
      id,
      origin: "approved",
      verification: "confirmed",
      semanticKey: nodeDraft.semanticKey,
      semanticKind: nodeDraft.semanticKind,
      semanticState: nodeDraft.semanticState,
      provenanceOrigin: nodeDraft.provenanceOrigin,
      sourceFactIds: nodeDraft.sourceFactIds,
      sourceMessageIds: nodeDraft.sourceMessageIds,
      kind: nodeDraft.kind,
      category,
      priority,
      title: nodeDraft.title,
      name: nodeDraft.title,
      description: nodeDraft.description,
      desc: nodeDraft.description,
      status: "confirmed",
      phase: nodeDraft.phase ?? "planning",
      relevanceScore: score,
      metadata: nodeDraft.metadata || `Relevancia ${score}/10 • ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      details: nodeDraft.details || `### Resumen Ejecutivo\n${nodeDraft.description}\n\n### Análisis de Viabilidad e Impacto\nRelevancia: ${score}/10\n\n### Plan de Acción y Próximos Pasos\n1. Validar propuesta.`,
      x: maxX + 320,
      y: avgY + (Math.random() > 0.5 ? 40 : -40),
      layout: { board2d: { x: maxX + 320, y: avgY } },
      val: Math.max(4, Math.min(25, Math.round(score * 2.2))),
      importance: Math.max(0.1, Math.min(1.0, score / 10)),
    };

    const nextNodes = [...workspace.map.nodes, newNode];

    // Connect to the first node if available to form a graph relationship
    const relations = [...(workspace.map.relations || [])];
    if (workspace.map.nodes.length > 0) {
      const rootNode = workspace.map.nodes[0];
      relations.push({
        id: stableId("rel", `${rootNode.semanticKey ?? rootNode.id}->${newNode.semanticKey ?? newNode.id}:related_to`),
        from: rootNode.id,
        to: newNode.id,
        source: rootNode.id,
        target: newNode.id,
        value: 2,
        label: "Ramificación",
        type: "related_to",
        semanticType: "related_to",
        semanticKey: `${rootNode.semanticKey ?? rootNode.id}->${newNode.semanticKey ?? newNode.id}:related_to`,
        origin: "approved",
        sourceFactIds: [...new Set([...(rootNode.sourceFactIds ?? []), ...(newNode.sourceFactIds ?? [])])],
        sourceMessageIds: [...new Set([...(rootNode.sourceMessageIds ?? []), ...(newNode.sourceMessageIds ?? [])])],
      });
    }

    const nextMap: ConceptMap = { nodes: nextNodes, relations };
    const nextWorkspace = { ...workspace, map: nextMap };
    const { nodes, edges } = convertMapToFlow(nextMap, (nid) => get().openDeepDive(nid));

    const spatialNodes = projectSpatialNodes(nextNodes, get().spatialNodes);
    const spatialLinks = projectSpatialLinks(relations);
    const nextSpatialDocs = newNode.details
      ? { ...get().spatialDocs, [id]: newNode.details }
      : get().spatialDocs;

    const nextPhase: ChatPhase =
      get().chatPhase === "PHASE_2_STRUCTURING" ? "PHASE_3_EXPANSION" : get().chatPhase;

    set({
      workspace: nextWorkspace,
      selectedNodeId: id,
      nodes,
      edges,
      spatialNodes,
      spatialLinks,
      links: spatialLinks,
      spatialDocs: nextSpatialDocs,
      chatPhase: nextPhase,
    });

    persistSession(workspace.project.id, nextMap, workspace.messages);
    return newNode;
  },
}));
