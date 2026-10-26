import React, { useState, useEffect, useRef } from "react";
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

  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Keep workspace container strictly anchored to top (prevent accidental scroll displacement)
  useEffect(() => {
    if (workspaceContainerRef.current) {
      workspaceContainerRef.current.scrollTop = 0;
    }
  }, [projectId, loading]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-zinc-100 space-y-3 select-none font-sans relative overflow-hidden">
        {/* Ambient VisionOS Light Orbs */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-200/50 dark:bg-indigo-900/40 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-200/50 dark:bg-emerald-900/30 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div className="relative z-10 p-5 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:bg-black/20 dark:border-white/10 dark:shadow-2xl flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">{t("workspace.loading")}</p>
        </div>
      </div>
    );
  }

  if (!workspace || !workspace.map) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center p-6 select-none font-sans relative overflow-hidden">
        {/* Ambient VisionOS Light Orbs */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-200/50 dark:bg-indigo-900/40 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-200/50 dark:bg-emerald-900/30 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div className="relative z-10 p-8 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:bg-black/20 dark:border-white/10 dark:shadow-2xl max-w-sm flex flex-col items-center text-slate-800 dark:text-zinc-100">
          <div className="w-12 h-12 rounded-2xl bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-zinc-400 mb-3 shadow-xs">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">{t("workspace.notFound.title")}</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs">{t("workspace.notFound.description")}</p>
          <Button variant="primary" size="sm" onClick={() => navigate("/")} className="mt-4 !rounded-xl !bg-blue-600 hover:!bg-blue-500 !text-white">
            {t("workspace.notFound.action")}
          </Button>
        </div>
      </div>
    );
  }

  const nodesList = workspace.map.nodes || [];
  const relationsList = workspace.map.relations || [];

  const selectedNode = nodesList.find((n) => n.id === selectedNodeId) || null;
  const docNode = nodesList.find((n) => n.id === expandedDocNodeId) || null;

  // Find related nodes for doc overlay
  const docRelatedNodes = docNode
    ? relationsList
        .filter((r) => r.from === docNode.id || r.to === docNode.id)
        .map((r) => (r.from === docNode.id ? r.to : r.from))
        .map((id) => nodesList.find((n) => n.id === id))
        .filter((n): n is ConceptNode => !!n)
    : [];

  return (
    <div
      ref={workspaceContainerRef}
      className="w-full h-full flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-zinc-100 font-sans select-none"
    >
      {/* ─── Ambient VisionOS Light Orbs for Glass Refraction ─── */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-200/50 dark:bg-indigo-900/40 blur-[120px] z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-200/50 dark:bg-emerald-900/30 blur-[120px] z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/4 w-[450px] h-[450px] rounded-full bg-violet-200/35 dark:bg-purple-900/20 blur-[140px] z-0"
        aria-hidden="true"
      />

      {/* Workspace Top Toolbar Header (Glassmorphism V2) */}
      <div
        className="
          h-12 shrink-0
          bg-white/70 dark:bg-black/20 backdrop-blur-2xl
          border-b border-white/80 dark:border-white/10
          shadow-[0_4px_20px_rgb(0,0,0,0.04)] dark:shadow-xl
          px-4 flex items-center justify-between z-20 relative select-none
        "
      >
        {/* Specular hairline reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/10 to-transparent"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="
              flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10
              px-2.5 py-1 -ml-1 rounded-xl transition-all cursor-pointer
            "
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Proyectos</span>
          </button>

          <div className="h-4 w-px bg-slate-300/60 dark:bg-white/10" />

          <div className="flex items-center gap-2.5">
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              {workspace.project.name}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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
              text-xs font-semibold bg-white/60 hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10
              border border-white/80 dark:border-white/10 text-slate-700 dark:text-zinc-200
              backdrop-blur-md shadow-xs transition-all duration-200 cursor-pointer
            "
          >
            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("canvas.generate")}</span>
          </button>

          <button
            onClick={toggleChat}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
              transition-all duration-200 cursor-pointer border
              ${
                isChatOpen
                  ? "bg-blue-600 hover:bg-blue-500 text-white border-transparent shadow-[0_4px_14px_rgba(37,99,235,0.35)]"
                  : "bg-white/60 hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10 border-white/80 dark:border-white/10 text-slate-700 dark:text-zinc-200 shadow-xs backdrop-blur-md"
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
