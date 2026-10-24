import { create } from "zustand";
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
import { mockServices } from "../services/mock";

interface WorkspaceState {
  // Data
  workspace: Workspace | null;
  canvasMode: CanvasMode;
  selectedNodeId: string | null;
  expandedDocNodeId: string | null;
  isThinking: boolean;
  isChatOpen: boolean;

  // Actions
  setWorkspace: (workspace: Workspace | null) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  selectNode: (nodeId: string | null) => void;
  setExpandedDocNodeId: (nodeId: string | null) => void;
  setThinking: (thinking: boolean) => void;
  setChatOpen: (isOpen: boolean) => void;
  toggleChat: () => void;

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
    mockServices.workspace.save(projectId, map, messages);
  } catch (error) {
    console.error("Failed to persist workspace session", error);
  }
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  canvasMode: "notion",
  selectedNodeId: null,
  expandedDocNodeId: null,
  isThinking: false,
  isChatOpen: true,

  setWorkspace: (workspace) => set({ workspace }),

  setCanvasMode: (canvasMode) => set({ canvasMode }),

  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  setExpandedDocNodeId: (expandedDocNodeId) => set({ expandedDocNodeId }),

  setThinking: (isThinking) => set({ isThinking }),

  setChatOpen: (isChatOpen) => set({ isChatOpen }),

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

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
      set({ workspace: nextWorkspace, selectedNodeId: id });
      persistSession(workspace.project.id, nextMap, workspace.messages);
    }

    return newNode;
  },

  updateNode: (nodeId, patch) => {
    const { workspace } = get();
    if (!workspace) return;

    const nextNodes = workspace.map.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...patch } : node
    );
    const nextMap = { ...workspace.map, nodes: nextNodes };
    const nextWorkspace = { ...workspace, map: nextMap };
    set({ workspace: nextWorkspace });
    persistSession(workspace.project.id, nextMap, workspace.messages);
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

    set({
      workspace: nextWorkspace,
      selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
      expandedDocNodeId: expandedDocNodeId === nodeId ? null : expandedDocNodeId,
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

    set({
      workspace: nextWorkspace,
      selectedNodeId: id,
    });

    persistSession(workspace.project.id, nextMap, workspace.messages);
    return newNode;
  },
}));
