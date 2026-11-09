import { create } from "zustand";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
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
import { normalizeCategory } from "../domain/constants";
import { services } from "../services";

export interface ConceptNodeData extends ConceptNode {
  onOpenDeepDive?: (id: string) => void;
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
  setDiscoveryMessages: (messages: ChatMessage[]) => void;
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
    services.workspace.save(projectId, map, messages);
  } catch (error) {
    console.error("Failed to persist workspace session", error);
  }
};

function convertMapToFlow(
  map: ConceptMap | undefined,
  openDeepDive: (id: string) => void
): { nodes: Node<ConceptNodeData>[]; edges: Edge[] } {
  const nodesList = map?.nodes || [];
  const relationsList = map?.relations || [];

  const nodes: Node<ConceptNodeData>[] = nodesList.map((n) => ({
    id: n.id,
    type: "conceptNode",
    position: { x: n.x, y: n.y },
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
      x: existingCoords?.x ?? node.x,
      y: existingCoords?.y ?? node.y,
      z: existingCoords?.z ?? (node.z ?? (Math.random() * 40 - 20)),
      tags: node.tags,
      relevanceScore: score,
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
    const prevProjectId = get().workspace?.project?.id;
    const isNewProject = prevProjectId !== workspace.project?.id;
    const { nodes, edges } = convertMapToFlow(workspace.map, (id) => get().openDeepDive(id));
    const hasGeneratedNodes = Boolean(workspace.map?.nodes && workspace.map.nodes.length > 0);
    const inferredPhase: ChatPhase = hasGeneratedNodes
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
              };
            }
            if (asst.action === "ready" || asst.readyForStructuring) {
              return {
                id: asst.id,
                role: "assistant" as const,
                content: asst.text,
                type: "ready" as const,
                dimensions: asst.dimensions,
              };
            }
            return {
              id: asst.id,
              role: "assistant" as const,
              content: asst.text,
              type: "text" as const,
            };
          })
        : INITIAL_DISCOVERY_MESSAGES;

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
      ...(isNewProject
        ? {
            canvasMode: landingMode,
            discoveryMessages: reconstructedDiscovery,
            discoverySelectedOptions: {},
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

  setDiscoveryMessages: (discoveryMessages) => set({ discoveryMessages }),

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
      const patched = { ...node, ...updates };
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
          currentNodes[idx] = {
            ...currentNodes[idx],
            x: Math.round(change.position.x),
            y: Math.round(change.position.y),
          };
          moved = true;
        }
      }
    }

    if (moved) {
      const nextMap = { ...workspace.map, nodes: currentNodes };
      set({ workspace: { ...workspace, map: nextMap } });
      persistSession(workspace.project.id, nextMap, workspace.messages);
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const newEdge: Edge = {
      id: `r-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    };
    set({ edges: addEdge(newEdge, get().edges) });

    const { workspace } = get();
    if (workspace) {
      const nextRelations = [
        ...workspace.map.relations,
        { id: newEdge.id, from: connection.source, to: connection.target },
      ];
      const nextMap = { ...workspace.map, relations: nextRelations };
      set({ workspace: { ...workspace, map: nextMap } });
      persistSession(workspace.project.id, nextMap, workspace.messages);
    }
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
    const nextWorkspace = { ...workspace, map: nextMap };
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
      node.id === nodeId ? { ...node, x, y } : node
    );
    const nextMap = { ...workspace.map, nodes: nextNodes };
    set({ workspace: { ...workspace, map: nextMap } });
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
      set({ selectedNodeId: existing.id });
      return existing;
    }

    // Determine smart layout placement (staggered to the right of existing nodes)
    const maxX = workspace.map.nodes.reduce((acc, n) => Math.max(acc, n.x), 50);
    const avgY = workspace.map.nodes.length > 0
      ? Math.round(workspace.map.nodes.reduce((acc, n) => acc + n.y, 0) / workspace.map.nodes.length)
      : 200;

    const id = "n-ai-" + Math.random().toString(36).substring(2, 8);
    const category =
      nodeDraft.category ??
      (nodeDraft.kind === "viability" ? "economic" : nodeDraft.kind === "risk" ? "legal" : "technical");
    const score = nodeDraft.relevanceScore ?? 8;
    const priority =
      nodeDraft.priority ?? (score >= 8 ? "high" : score >= 5 ? "medium" : "low");

    const newNode: ConceptNode = {
      id,
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
      val: Math.max(4, Math.min(25, Math.round(score * 2.2))),
      importance: Math.max(0.1, Math.min(1.0, score / 10)),
    };

    const nextNodes = [...workspace.map.nodes, newNode];

    // Connect to the first node if available to form a graph relationship
    const relations = [...(workspace.map.relations || [])];
    if (workspace.map.nodes.length > 0) {
      const rootNode = workspace.map.nodes[0];
      relations.push({
        id: `rel-${rootNode.id}->${newNode.id}`,
        from: rootNode.id,
        to: newNode.id,
        source: rootNode.id,
        target: newNode.id,
        value: 2,
        label: "Ramificación",
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
