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
  Sparkles,
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
    setCanvasMode,
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-app space-y-3">
        <Loader2 className="w-6 h-6 text-concept-fg animate-spin" />
        <p className="text-caption text-muted font-medium">{t("workspace.loading")}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-app text-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-sunken flex items-center justify-center text-muted mb-3 border border-line">
          <FolderKanban className="w-6 h-6" />
        </div>
        <h3 className="text-body font-semibold text-fg">{t("workspace.notFound.title")}</h3>
        <p className="text-caption text-muted mt-1 max-w-xs">{t("workspace.notFound.description")}</p>
        <Button variant="primary" size="sm" onClick={() => navigate("/")} className="mt-4">
          {t("workspace.notFound.action")}
        </Button>
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

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-app">
      {/* Workspace Top Toolbar Header */}
      <div className="h-12 shrink-0 bg-surface border-b border-line px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-body font-medium text-concept-fg hover:brightness-110 p-1 -ml-1 rounded-lg transition-colors focus-ring"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Proyectos</span>
          </button>

          <div className="h-4 w-px bg-line" />

          <div>
            <h2 className="text-body font-semibold text-fg flex items-center gap-2">
              {workspace.project.name}
              <span className="text-[10px] font-medium text-muted flex items-center gap-1 bg-sunken px-1.5 py-0.5 rounded-md border border-line ml-1">
                <Check className="w-3 h-3 text-positive-fg" />
                {t("workspace.saved")}
              </span>
            </h2>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium bg-sunken hover:bg-hover border border-line text-fg transition-colors focus-ring"
          >
            <FileText className="w-3.5 h-3.5 text-concept-fg" />
            <span>{t("canvas.generate")}</span>
          </button>

          <button
            onClick={toggleChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-colors border focus-ring ${
              isChatOpen
                ? "bg-concept-fg text-white border-transparent shadow-xs"
                : "bg-sunken hover:bg-hover border-line text-fg"
            }`}
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

          {/* Deep-Dive Document Viewer (NotionModalViewer) */}
          {docNode && (
            <NotionModalViewer
              node={docNode}
              onClose={() => setExpandedDocNodeId(null)}
              onViewInGraph={(nodeId) => {
                setCanvasMode("obsidian");
                selectNode(nodeId);
                setExpandedDocNodeId(null);
              }}
              onAskAI={handleAskAIAboutNode}
              onRemoveNode={handleRemoveNode}
              relatedNodes={docRelatedNodes}
            />
          )}

          {/* Botón flotante para reabrir el chat cuando está cerrado */}
          {!isChatOpen && (
            <button
              onClick={toggleChat}
              className="
                absolute bottom-4 right-4 z-20
                flex items-center gap-2.5 px-4 py-2.5 rounded-2xl
                bg-surface/90 dark:bg-zinc-900/90
                border border-line/80 dark:border-white/10
                text-fg shadow-xl backdrop-blur-xl
                hover:bg-surface hover:shadow-2xl hover:scale-105 active:scale-95
                transition-all duration-200 cursor-pointer group focus-ring
              "
              title="Abrir Nexo AI"
            >
              <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-concept-fg to-concept-fg/80 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <span className="text-caption font-semibold">
                {t("chat.aiName")}
              </span>
            </button>
          )}

          {/* Floating AI Chat Card */}
          <AIChatDrawer
            isOpen={isChatOpen}
            onClose={toggleChat}
            messages={workspace.messages}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            onSelectNode={(nodeId) => selectNode(nodeId)}
            onRetry={() => {
              const lastUserMsg = [...workspace.messages].reverse().find((m) => m.role === "user");
              if (lastUserMsg) void handleSendMessage(lastUserMsg.text);
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <AddNodeModal
        isOpen={isAddNodeOpen}
        onClose={() => setIsAddNodeOpen(false)}
        onAdd={handleAddNode}
      />

      <GenerateDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        project={workspace.project}
        map={workspace.map}
      />
    </div>
  );
};
