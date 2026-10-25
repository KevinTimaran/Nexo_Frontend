import { create } from "zustand";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import type {
  CanvasMode,
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
import { services } from "../services";

export interface ConceptNodeData extends ConceptNode {
  onOpenDeepDive?: (id: string) => void;
}

interface WorkspaceState {
  // Data
  workspace: Workspace | null;
  canvasMode: CanvasMode;
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
}

const persistSession = (projectId: string, map: ConceptMap, messages: Message[]) => {
  try {
    services.workspace.save(projectId, map, messages);
  } catch (error) {
    console.error("Failed to persist workspace session", error);
  }
};

function convertMapToFlow(
  map: ConceptMap,
  openDeepDive: (id: string) => void
): { nodes: Node<ConceptNodeData>[]; edges: Edge[] } {
  const nodes: Node<ConceptNodeData>[] = map.nodes.map((n) => ({
    id: n.id,
    type: "conceptNode",
    position: { x: n.x, y: n.y },
    data: {
      ...n,
      onOpenDeepDive: openDeepDive,
    },
  }));

  const edges: Edge[] = map.relations.map((r) => ({
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
  selectedNodeId: null,
  expandedDocNodeId: null,
  isThinking: false,
  isChatOpen: true,

  nodes: [],
  edges: [],
  isDeepDiveModalOpen: false,

  setWorkspace: (workspace) => {
    if (!workspace) {
      set({ workspace: null, nodes: [], edges: [] });
      return;
    }
    const { nodes, edges } = convertMapToFlow(workspace.map, (id) => get().openDeepDive(id));
    set({ workspace, nodes, edges });
  },

  setCanvasMode: (canvasMode) => set({ canvasMode }),

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
      set({ workspace: nextWorkspace, selectedNodeId: id, nodes, edges });
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

    set({
      workspace: nextWorkspace,
      selectedNodeId: id,
      nodes,
      edges,
    });

    persistSession(workspace.project.id, nextMap, workspace.messages);
    return newNode;
  },
}));
