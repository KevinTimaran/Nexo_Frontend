import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  FileText,
  Check,
  Loader2,
  FolderKanban,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { services } from "../../services";
import { currentLanguage } from "../../i18n";
import { useToast } from "../../context/ToastContext";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { ConceptCanvas } from "./ConceptCanvas";
import { AIChatDrawer } from "./AIChatDrawer";
import { NodeInspectorSheet } from "./NodeInspectorSheet";
import { NotionModalViewer } from "./NotionModalViewer";
import { AddNodeModal } from "./AddNodeModal";
import { GenerateDocumentModal } from "../documents/GenerateDocumentModal";
import { Button } from "../../components/ui/Button";
import type { ConceptMap, ConceptNode, Message } from "../../domain/types";

export const WorkspaceView: React.FC = () => {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const lang = currentLanguage();
  const { showToast } = useToast();

  // Zustand centralized workspace store
  const {
    workspace,
    setWorkspace,
    canvasMode,
    selectedNodeId,
    selectNode,
    expandedDocNodeId,
    setExpandedDocNodeId,
    isThinking,
    setThinking,
    isChatOpen,
    toggleChat,
    moveNode,
    addNode,
    removeNode,
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Load Workspace data on project change or language switch
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    services.workspace
      .load(projectId, lang)
      .then((data) => {
        setWorkspace(data);
      })
      .catch(() => {
        showToast(t("workspace.notFound.title"), "error");
      })
      .finally(() => setLoading(false));
  }, [projectId, lang, setWorkspace, showToast, t]);

  // Persist session edits
  const saveSession = (map: ConceptMap, messages: Message[]) => {
    if (!projectId) return;
    services.workspace.save(projectId, map, messages);
  };

  const handleSendMessage = async (text: string) => {
    if (!workspace || !projectId) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      createdAt: new Date().toISOString(),
      text,
    };

    const updatedMessages = [...workspace.messages, userMessage];
    const updatedWorkspace = { ...workspace, messages: updatedMessages };
    setWorkspace(updatedWorkspace);
    saveSession(workspace.map, updatedMessages);

    setThinking(true);

    try {
      const response = await services.ai.reply({
        text,
        map: workspace.map,
        lang,
        replyTo: userMessage.id,
      });

      const nextNodes = [...workspace.map.nodes, ...response.newNodes];
      const nextRelations = [...workspace.map.relations, ...response.newRelations];
      const nextMap: ConceptMap = { nodes: nextNodes, relations: nextRelations };
      const nextMessages = [...updatedMessages, response.message];

      setWorkspace({
        ...workspace,
        map: nextMap,
        messages: nextMessages,
      });

      saveSession(nextMap, nextMessages);

      if (response.newNodes.length > 0) {
        showToast(`Se mapearon ${response.newNodes.length} nuevos conceptos.`, "success");
      }
    } catch {
      showToast(t("chat.error.title"), "error");
    } finally {
      setThinking(false);
    }
  };

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    moveNode(nodeId, x, y);
  };

  const handleAddNode = (newNodeData: Omit<ConceptNode, "id">) => {
    const newNode = addNode(newNodeData);
    showToast(t("projects.create.created", { name: newNode.title }), "success");
  };

  const handleRemoveNode = (nodeId: string) => {
    if (!workspace) return;
    const target = workspace.map.nodes.find((n) => n.id === nodeId);
    removeNode(nodeId);
    if (target) {
      showToast(t("canvas.node.removed", { title: target.title }), "info");
    }
  };

  const handleAskAIAboutNode = (nodeTitle: string) => {
    if (!isChatOpen) toggleChat();
    void handleSendMessage(t("canvas.node.askText", { title: nodeTitle }));
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-transparent space-y-3 select-none">
        <div className="p-4 rounded-2xl glass-card flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-concept-fg animate-spin" />
          <p className="text-caption text-muted font-medium">{t("workspace.loading")}</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-transparent text-center p-6 select-none">
        <div className="p-8 rounded-3xl glass-card max-w-sm flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-surface/80 border border-line flex items-center justify-center text-muted mb-3 shadow-xs">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-body font-bold text-fg">{t("workspace.notFound.title")}</h3>
          <p className="text-caption text-muted mt-1 max-w-xs">{t("workspace.notFound.description")}</p>
          <Button variant="primary" size="sm" onClick={() => navigate("/")} className="mt-4">
            {t("workspace.notFound.action")}
          </Button>
        </div>
      </div>
    );
  }

  const selectedNode = workspace.map.nodes.find((n) => n.id === selectedNodeId) || null;
  const docNode = workspace.map.nodes.find((n) => n.id === expandedDocNodeId) || null;

  // Find related nodes for doc overlay
  const docRelatedNodes = docNode
    ? workspace.map.relations
        .filter((r) => r.from === docNode.id || r.to === docNode.id)
        .map((r) => (r.from === docNode.id ? r.to : r.from))
        .map((id) => workspace.map.nodes.find((n) => n.id === id))
        .filter((n): n is ConceptNode => !!n)
    : [];

  // Global keyboard shortcut: Escape deselects active node or closes inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedNodeId) selectNode(null);
        if (expandedDocNodeId) setExpandedDocNodeId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, expandedDocNodeId, selectNode]);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-app">
      {/* Workspace Top Toolbar Header (Creative Glass) */}
      <div
        className="
          h-12 shrink-0
          bg-surface/80 dark:bg-zinc-950/80 backdrop-blur-2xl backdrop-saturate-150
          border-b border-line/80 dark:border-white/10
          px-4 flex items-center justify-between z-20 relative select-none
        "
      >
        {/* Specular hairline reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="
              flex items-center gap-1.5 text-body font-semibold text-concept-fg hover:brightness-110
              px-2.5 py-1 -ml-1 rounded-xl hover:bg-concept-fg/10 transition-all focus-ring cursor-pointer
            "
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Proyectos</span>
          </button>

          <div className="h-4 w-px bg-line/80 dark:bg-white/10" />

          <div className="flex items-center gap-2.5">
            <h2 className="text-body font-bold text-fg flex items-center gap-2">
              {workspace.project.name}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-positive-fg bg-positive-fg/10 px-2 py-0.5 rounded-full border border-positive-fg/20 backdrop-blur-xs">
              <Check className="w-3 h-3 text-positive-fg" />
              {t("workspace.saved")}
            </span>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              text-caption font-semibold bg-surface/85 dark:bg-white/[0.06]
              border border-line/80 dark:border-white/10 text-fg hover:bg-hover hover:border-concept-fg/40
              backdrop-blur-md shadow-xs transition-all duration-200 focus-ring cursor-pointer
            "
          >
            <FileText className="w-3.5 h-3.5 text-concept-fg" />
            <span>{t("canvas.generate")}</span>
          </button>

          <button
            onClick={toggleChat}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-semibold
              transition-all duration-200 focus-ring cursor-pointer border
              ${
                isChatOpen
                  ? "bg-gradient-to-b from-concept-fg to-concept-fg/90 text-white border-transparent shadow-[0_4px_14px_-3px_rgba(37,99,235,0.45),inset_0_1px_0_0_rgba(255,255,255,0.3)]"
                  : "bg-surface/85 dark:bg-white/[0.06] hover:bg-hover border-line/80 dark:border-white/10 text-fg backdrop-blur-md shadow-xs"
              }
            `}
          >
            {isChatOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span>{isChatOpen ? t("workspace.hideChat") : t("workspace.showChat")}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Spatial Canvas (Main center) */}
        <div className="flex-1 h-full relative">
          <ConceptCanvas
            map={workspace.map}
            selectedNodeId={selectedNodeId}
            onSelectNode={selectNode}
            onNodeMove={handleNodeMove}
            onOpenAddNode={() => setIsAddNodeOpen(true)}
            onOpenDocDetail={(node) => setExpandedDocNodeId(node.id)}
            isChatOpen={isChatOpen}
          />

          {/* Node Inspector Sheet overlay (when in Obsidian mode and a node is selected) */}
          {canvasMode === "obsidian" && selectedNode && !docNode && (
            <NodeInspectorSheet
              node={selectedNode}
              isChatOpen={isChatOpen}
              onClose={() => selectNode(null)}
              onAskAI={handleAskAIAboutNode}
              onRemoveNode={handleRemoveNode}
              onOpenDoc={(node) => setExpandedDocNodeId(node.id)}
            />
          )}

          {/* Document Detail Overlay (expanded Markdown / editorial view) */}
          {docNode && (
            <NotionModalViewer
              node={docNode}
              onClose={() => setExpandedDocNodeId(null)}
              onViewInGraph={() => {
                setExpandedDocNodeId(null);
                selectNode(docNode.id);
              }}
              onAskAI={() => handleAskAIAboutNode(docNode.title)}
              onRemoveNode={() => {
                handleRemoveNode(docNode.id);
                setExpandedDocNodeId(null);
              }}
              relatedNodes={docRelatedNodes}
            />
          )}
        </div>

        {/* AI Copilot Drawer (Floating Creative Glass Drawer) */}
        <AIChatDrawer
          isOpen={isChatOpen}
          onClose={toggleChat}
          messages={workspace.messages}
          isThinking={isThinking}
          onSendMessage={handleSendMessage}
          onSelectNode={(nodeId) => selectNode(nodeId)}
          onRetry={() => {
            const lastUserMsg = [...workspace.messages]
              .reverse()
              .find((m) => m.role === "user");
            if (lastUserMsg) void handleSendMessage(lastUserMsg.text);
          }}
        />
      </div>

      {/* Add Concept Node Modal */}
      <AddNodeModal
        isOpen={isAddNodeOpen}
        onClose={() => setIsAddNodeOpen(false)}
        onAdd={handleAddNode}
      />

      {/* Executive Summary Export Modal */}
      <GenerateDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        project={workspace.project}
        map={workspace.map}
      />
    </div>
  );
};
