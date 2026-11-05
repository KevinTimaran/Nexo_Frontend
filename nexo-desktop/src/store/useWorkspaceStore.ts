import { create } from "zustand";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import type {
  CanvasMode,
  ChatPhase,
  ConceptKind,
  ConceptMap,
  ConceptNode,
  Message,
  AssistantMessage,
  NodeCategory,
  NodePriority,
  ResearchPhase,
  Workspace,
} from "../domain/types";
import {
  DEFAULT_SPATIAL_GROUP_COLORS,
  type SpatialGroupId,
  type SpatialLink,
  type SpatialNode,
} from "../domain/spatial";
import { SPATIAL_SEED_LINKS, SPATIAL_SEED_NODES } from "../mocks/spatialSeed";
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

  // React Flow State
  nodes: Node<ConceptNodeData>[];
  edges: Edge[];
  isDeepDiveModalOpen: boolean;

  // Actions
  setWorkspace: (workspace: Workspace | null) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  setChatPhase: (phase: ChatPhase) => void;
  selectNode: (nodeId: string | null) => void;
  setExpandedDocNodeId: (nodeId: string | null) => void;
  setThinking: (thinking: boolean) => void;
  setChatOpen: (isOpen: boolean) => void;
  toggleChat: () => void;

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
    phase: ResearchPhase;
    metadata?: string;
    details?: string;
  }) => ConceptNode | null;

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


export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  canvasMode: "notion",
  chatPhase: "PHASE_1_DISCOVERY",
  selectedNodeId: null,
  expandedDocNodeId: null,
  isThinking: false,
  isChatOpen: true,

  nodes: [],
  edges: [],
  isDeepDiveModalOpen: false,

  activeFilter: null,
  isDocModalOpen: false,
  spatialNodes: SPATIAL_SEED_NODES,
  spatialLinks: SPATIAL_SEED_LINKS,
  links: SPATIAL_SEED_LINKS,
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

  setSpatialDoc: (nodeId, content) =>
    set((state) => ({ spatialDocs: { ...state.spatialDocs, [nodeId]: content } })),

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

  setWorkspace: (workspace) => {
    if (!workspace) {
      set({ workspace: null, nodes: [], edges: [], chatPhase: "PHASE_1_DISCOVERY" });
      return;
    }
    const { nodes, edges } = convertMapToFlow(workspace.map, (id) => get().openDeepDive(id));
    const inferredPhase: ChatPhase =
      workspace.map?.nodes && workspace.map.nodes.length > 0
        ? "PHASE_3_EXPANSION"
        : "PHASE_1_DISCOVERY";
    set({ workspace, nodes, edges, chatPhase: inferredPhase });
  },

  setCanvasMode: (canvasMode) => set({ canvasMode }),

  setChatPhase: (chatPhase) => set({ chatPhase }),

  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  setExpandedDocNodeId: (expandedDocNodeId) => set({ expandedDocNodeId }),

  setThinking: (isThinking) => set({ isThinking }),

  setChatOpen: (isChatOpen) => set({ isChatOpen }),

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  openDeepDive: (nodeId) => set({ selectedNodeId: nodeId, isDeepDiveModalOpen: true }),

  closeDeepDive: () => set({ isDeepDiveModalOpen: false }),

  updateNodeContent: (id, updates) => {
    const { workspace, nodes } = get();
    if (!workspace) return;

    const nextNodes = workspace.map.nodes.map((node) =>
      node.id === id ? { ...node, ...updates } : node
    );
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

    set({
      workspace: nextWorkspace,
      nodes: nextFlowNodes,
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
    const newNode: ConceptNode = {
      id,
      ...nodeData,
    };

    if (workspace) {
      const nextNodes = [...workspace.map.nodes, newNode];
      const nextMap = { ...workspace.map, nodes: nextNodes };
      const nextWorkspace = { ...workspace, map: nextMap };
      const { nodes, edges } = convertMapToFlow(nextMap, (nid) => get().openDeepDive(nid));
      const nextPhase: ChatPhase =
        get().chatPhase === "PHASE_2_STRUCTURING" ? "PHASE_3_EXPANSION" : get().chatPhase;
      set({ workspace: nextWorkspace, selectedNodeId: id, nodes, edges, chatPhase: nextPhase });
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
      (rel) => rel.from !== nodeId && rel.to !== nodeId
    );
    const nextMap = { nodes: nextNodes, relations: nextRelations };
    const nextWorkspace = { ...workspace, map: nextMap };
    const { nodes, edges } = convertMapToFlow(nextMap, (nid) => get().openDeepDive(nid));

    set({
      workspace: nextWorkspace,
      selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
      expandedDocNodeId: expandedDocNodeId === nodeId ? null : expandedDocNodeId,
      nodes,
      edges,
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

    // Check if node already exists by title to prevent accidental duplicates
    const existing = workspace.map.nodes.find(
      (n) => n.title.toLowerCase().trim() === nodeDraft.title.toLowerCase().trim()
    );
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
    const newNode: ConceptNode = {
      id,
      kind: nodeDraft.kind,
      category: nodeDraft.category ?? (nodeDraft.kind === "viability" ? "economic" : nodeDraft.kind === "risk" ? "legal" : "technical"),
      priority: nodeDraft.priority ?? (nodeDraft.kind === "risk" ? "high" : "medium"),
      title: nodeDraft.title,
      description: nodeDraft.description,
      status: "confirmed",
      phase: nodeDraft.phase,
      metadata: nodeDraft.metadata || "Generado por IA",
      details: nodeDraft.details,
      x: maxX + 320,
      y: avgY + (Math.random() > 0.5 ? 40 : -40),
    };

    const nextNodes = [...workspace.map.nodes, newNode];

    // Connect to the first node if available to form a graph relationship
    const relations = [...workspace.map.relations];
    if (workspace.map.nodes.length > 0) {
      const rootNode = workspace.map.nodes[0];
      relations.push({
        id: `rel-${rootNode.id}->${newNode.id}`,
        from: rootNode.id,
        to: newNode.id,
      });
    }

    const nextMap: ConceptMap = { nodes: nextNodes, relations };
    const nextWorkspace = { ...workspace, map: nextMap };
    const { nodes, edges } = convertMapToFlow(nextMap, (nid) => get().openDeepDive(nid));

    const nextPhase: ChatPhase =
      get().chatPhase === "PHASE_2_STRUCTURING" ? "PHASE_3_EXPANSION" : get().chatPhase;

    set({
      workspace: nextWorkspace,
      selectedNodeId: id,
      nodes,
      edges,
      chatPhase: nextPhase,
    });

    persistSession(workspace.project.id, nextMap, workspace.messages);
    return newNode;
  },
}));
