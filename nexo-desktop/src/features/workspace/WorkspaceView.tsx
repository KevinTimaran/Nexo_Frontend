import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Check,
  Loader2,
  FolderKanban,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { mockServices } from "../../services/mock";
import { currentLanguage } from "../../i18n";
import { useToast } from "../../context/ToastContext";
import { ConceptCanvas } from "./ConceptCanvas";
import { AIChatDrawer } from "./AIChatDrawer";
import { NodeInspectorSheet } from "./NodeInspectorSheet";
import { AddNodeModal } from "./AddNodeModal";
import { GenerateDocumentModal } from "../documents/GenerateDocumentModal";
import { Button } from "../../components/ui/Button";
import type { ConceptMap, ConceptNode, Message, Workspace } from "../../domain/types";

export const WorkspaceView: React.FC = () => {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const lang = currentLanguage();
  const { showToast } = useToast();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Load Workspace data
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    mockServices.workspace
      .load(projectId, lang)
      .then((data) => {
        setWorkspace(data);
      })
      .catch(() => {
        showToast(t("workspace.notFound.title"), "error");
      })
      .finally(() => setLoading(false));
  }, [projectId, lang]);

  // Persist session edits
  const saveSession = (map: ConceptMap, messages: Message[]) => {
    if (!projectId) return;
    mockServices.workspace.save(projectId, map, messages);
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

    setIsThinking(true);

    try {
      const response = await mockServices.ai.reply({
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
        showToast(`Mapped ${response.newNodes.length} new concept nodes!`, "success");
      }
    } catch {
      showToast(t("chat.error.title"), "error");
    } finally {
      setIsThinking(false);
    }
  };

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    if (!workspace || !projectId) return;
    const nextNodes = workspace.map.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n));
    const nextMap = { ...workspace.map, nodes: nextNodes };
    setWorkspace({ ...workspace, map: nextMap });
    saveSession(nextMap, workspace.messages);
  };

  const handleAddNode = (newNodeData: Omit<ConceptNode, "id">) => {
    if (!workspace || !projectId) return;
    const newNode: ConceptNode = {
      id: "n-" + Math.random().toString(36).substring(2, 8),
      ...newNodeData,
    };
    const nextMap = { ...workspace.map, nodes: [...workspace.map.nodes, newNode] };
    setWorkspace({ ...workspace, map: nextMap });
    saveSession(nextMap, workspace.messages);
    showToast(t("projects.create.created", { name: newNode.title }), "success");
  };

  const handleRemoveNode = (nodeId: string) => {
    if (!workspace || !projectId) return;
    const target = workspace.map.nodes.find((n) => n.id === nodeId);
    const nextNodes = workspace.map.nodes.filter((n) => n.id !== nodeId);
    const nextRelations = workspace.map.relations.filter(
      (r) => r.from !== nodeId && r.to !== nodeId
    );
    const nextMap = { nodes: nextNodes, relations: nextRelations };
    setWorkspace({ ...workspace, map: nextMap });
    saveSession(nextMap, workspace.messages);
    setSelectedNodeId(null);
    if (target) {
      showToast(t("canvas.node.removed", { title: target.title }), "info");
    }
  };

  const handleAskAIAboutNode = (nodeTitle: string) => {
    setIsChatOpen(true);
    void handleSendMessage(t("canvas.node.askText", { title: nodeTitle }));
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-app space-y-3">
        <Loader2 className="w-8 h-8 text-concept-fg animate-spin" />
        <p className="text-body font-medium text-muted">{t("workspace.loading")}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-app text-center">
        <div className="w-12 h-12 rounded-2xl bg-elevated flex items-center justify-center text-muted mb-3">
          <FolderKanban className="w-6 h-6" />
        </div>
        <h3 className="text-body font-bold text-fg">{t("workspace.notFound.title")}</h3>
        <p className="text-caption text-muted mt-1 max-w-xs">{t("workspace.notFound.description")}</p>
        <Button variant="primary" size="sm" onClick={() => navigate("/")} className="mt-4">
          {t("workspace.notFound.action")}
        </Button>
      </div>
    );
  }

  const selectedNode = workspace.map.nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-app">
      {/* Workspace Top Toolbar Header */}
      <div className="h-12 shrink-0 glass border-b border-line px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-caption font-medium text-muted hover:text-fg p-1.5 rounded-lg hover:bg-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("workspace.back")}</span>
          </button>

          <div className="h-4 w-px bg-line" />

          <div>
            <h2 className="text-body font-bold text-fg flex items-center gap-2">
              {workspace.project.name}
              <span className="text-caption font-normal text-muted flex items-center gap-1 bg-elevated px-2 py-0.5 rounded-full border border-line-soft">
                <Check className="w-3 h-3 text-positive-fg" />
                {t("workspace.saved")}
              </span>
            </h2>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsDocModalOpen(true)}
            icon={<FileText className="w-3.5 h-3.5 text-concept-fg" />}
          >
            {t("canvas.generate")}
          </Button>

          <Button
            variant={isChatOpen ? "primary" : "secondary"}
            size="sm"
            onClick={() => setIsChatOpen(!isChatOpen)}
            icon={
              isChatOpen ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5" />
              )
            }
          >
            {isChatOpen ? t("workspace.hideChat") : t("workspace.showChat")}
          </Button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Spatial Canvas (Main center) */}
        <div className="flex-1 h-full relative">
          <ConceptCanvas
            map={workspace.map}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onNodeMove={handleNodeMove}
            onOpenAddNode={() => setIsAddNodeOpen(true)}
          />

          {/* Node Inspector Sheet overlay */}
          <NodeInspectorSheet
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onAskAI={handleAskAIAboutNode}
            onRemoveNode={handleRemoveNode}
          />
        </div>

        {/* AI Chat Drawer (Right panel) */}
        <AIChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={workspace.messages}
          isThinking={isThinking}
          onSendMessage={handleSendMessage}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
          onRetry={() => {
            const lastUserMsg = [...workspace.messages].reverse().find((m) => m.role === "user");
            if (lastUserMsg) void handleSendMessage(lastUserMsg.text);
          }}
        />
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
