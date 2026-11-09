import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Loader2,
  FolderKanban,
  Lightbulb,
  Leaf,
  Scale,
  Rocket,
  Book,
  Compass,
  Layers,
} from "lucide-react";
import { services } from "../../services";
import { detectMessageLanguage } from "../../services/ai/prompts";
import { currentLanguage } from "../../i18n";
import { useToast } from "../../context/ToastContext";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { ViewModeToggle } from "../../components/ui/ViewModeToggle";
import { ConceptCanvas } from "./ConceptCanvas";
import { AIChatDrawer } from "./AIChatDrawer";
import { FullScreenDiscoveryChat, type ChatMessage } from "./FullScreenDiscoveryChat";
import { NotionModalViewer } from "./NotionModalViewer";
import { GenerateDocumentModal } from "../documents/GenerateDocumentModal";
import { SpaceWorkspace } from "../spatial/SpaceWorkspace";
import { Button } from "../../components/ui/Button";
import { NexoLogo } from "../../components/brand/NexoLogo";
import type { ConceptMap, ConceptNode, Message, ChatPhase, ProjectIcon } from "../../domain/types";

const PROJECT_HEADER_ICONS: Record<ProjectIcon, React.ReactNode> = {
  lightbulb: <Lightbulb className="w-3.5 h-3.5" />,
  leaf: <Leaf className="w-3.5 h-3.5" />,
  scale: <Scale className="w-3.5 h-3.5" />,
  rocket: <Rocket className="w-3.5 h-3.5" />,
  book: <Book className="w-3.5 h-3.5" />,
  compass: <Compass className="w-3.5 h-3.5" />,
};

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
    setCanvasMode,
    selectedNodeId,
    selectNode,
    expandedDocNodeId,
    setExpandedDocNodeId,
    isThinking,
    setThinking,
    isChatOpen,
    toggleChat,
    moveNode,
    removeNode,
    chatPhase,
    setChatPhase,
    isZenMode,
    docViewMode,
    isArchitectureUnlocked,
    setArchitectureUnlocked,
    discoveryMessages,
    discoverySelectedOptions,
    setDiscoveryMessages,
    setDiscoverySelectedOptions,
    resetWorkspace,
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Reset workspace state upon navigating away so landing mode is fresh when reopening
  useEffect(() => {
    return () => {
      resetWorkspace();
    };
  }, [resetWorkspace]);

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

  const handleSendMessage = async (text: string, overridePhase?: ChatPhase) => {
    if (!workspace || !projectId) return;

    const activePhase = overridePhase || chatPhase;

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
    setChatError(null);

    const messageLang = detectMessageLanguage(text, lang);

    // Provide conversation history in forward chronological order
    const recentMessageHistory = workspace.messages;

    try {
      const response = await services.ai.reply({
        text,
        map: workspace.map,
        lang: messageLang,
        replyTo: userMessage.id,
        chatPhase: activePhase,
        messageHistory: recentMessageHistory,
      });

      const nextNodes = [...(workspace.map?.nodes || []), ...(response.newNodes || [])];
      const nextRelations = [...(workspace.map?.relations || []), ...(response.newRelations || [])];
      const nextMap: ConceptMap = { nodes: nextNodes, relations: nextRelations };
      const nextMessages = [...updatedMessages, response.message];

      setWorkspace({
        ...workspace,
        map: nextMap,
        messages: nextMessages,
      });

      saveSession(nextMap, nextMessages);

      if (isDiscoveryMode) {
        const currentDiscovery = useWorkspaceStore.getState().discoveryMessages;
        const lastMsg = currentDiscovery[currentDiscovery.length - 1];
        const listWithUser =
          lastMsg && lastMsg.role === "user" && lastMsg.content === text
            ? currentDiscovery
            : [
                ...currentDiscovery,
                {
                  id: userMessage.id,
                  role: "user" as const,
                  content: text,
                  type: "text" as const,
                },
              ];

        const newDiscoveryMsgs: ChatMessage[] = [];
        const action = (response.message as any).action;
        const isReady =
          action === "ready" ||
          Boolean(
            response.message.readyForStructuring &&
              (!response.message.discoveryQuestions || response.message.discoveryQuestions.length === 0)
          );
        const hasQuestions = Boolean(
          response.message.discoveryQuestions &&
            response.message.discoveryQuestions.length > 0 &&
            action !== "ready"
        );

        if (hasQuestions) {
          newDiscoveryMsgs.push({
            id: response.message.id || `msg-${Date.now()}`,
            role: "assistant",
            content: response.message.text,
            type: "questionnaire",
            questions: response.message.discoveryQuestions!.map((dq, idx) => ({
              id: dq.id || `dq-${Date.now()}-${idx}`,
              question: dq.question,
              options: dq.options || [],
              type: dq.type,
              allowCustom: dq.allowCustom,
            })),
          });
        } else if (isReady) {
          newDiscoveryMsgs.push({
            id: response.message.id || `msg-${Date.now()}`,
            role: "assistant",
            content: response.message.text,
            type: "ready",
            dimensions: (response.message as any).dimensions,
          });
        } else {
          newDiscoveryMsgs.push({
            id: response.message.id || `msg-${Date.now()}`,
            role: "assistant",
            content: response.message.text,
            type: "text",
          });
        }
        setDiscoveryMessages([...listWithUser, ...newDiscoveryMsgs]);
      }

      if (response.newNodes.length > 0) {
        showToast(`Se mapearon ${response.newNodes.length} nuevos conceptos.`, "success");
        setArchitectureUnlocked(true);
        if (activePhase === "PHASE_2_STRUCTURING" || activePhase === "PHASE_1_DISCOVERY") {
          setChatPhase("PHASE_3_EXPANSION");
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : t("chat.error.title");
      setChatError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setThinking(false);
    }
  };

  const handleGenerateBaseMap = async () => {
    if (!workspace || !projectId) return;
    setChatPhase("PHASE_2_STRUCTURING");
    const userMsgs = discoveryMessages.filter((m) => m.role === "user");
    const userIdea =
      userMsgs.map((m) => m.content).join(" | ") ||
      workspace.project.description ||
      workspace.project.name;
    const prompt = `Estructura el proyecto "${workspace.project.name}" (Idea y decisiones: ${userIdea}) y sus dimensiones estratégicas (económica, social, técnica y legal) en el mapa conceptual.`;
    await handleSendMessage(prompt, "PHASE_2_STRUCTURING");
  };

  const handleGenerateArchitecture = async () => {
    try {
      if (!workspace?.map?.nodes?.length) {
        await handleGenerateBaseMap();
      }
      setArchitectureUnlocked(true);
      setCanvasMode("notion");
    } catch {
      // Error is caught and surfaced in handleSendMessage
    }
  };

  const handleChatSendMessage = async (text: string) => {
    const isDimensionExplore = /(explorar punto de vista|punto de vista|dimensi[oó]n)\s*(econ[oó]mic|social|t[eé]cnic|legal|humano|mesero|pasajer)/i.test(text);
    if (isDimensionExplore && !workspace?.map?.nodes?.length) {
      await handleSendMessage(text, "PHASE_2_STRUCTURING");
    } else {
      await handleSendMessage(text);
    }
  };

  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    moveNode(nodeId, x, y);
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
    setCanvasMode("discovery");
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
  }, [projectId, loading, canvasMode]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-app dark:bg-app text-fg dark:text-fg space-y-3 select-none font-sans relative overflow-hidden">
        {/* Ambient VisionOS Light Orbs */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/20 dark:bg-surface/40 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-positive/15 dark:bg-surface/30 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div className="relative z-10 p-5 rounded-3xl bg-surface/70 backdrop-blur-2xl border border-line/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:bg-app/20 dark:border-line/10 dark:shadow-2xl flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary dark:text-primary animate-spin" />
          <p className="text-xs text-muted dark:text-muted font-medium">{t("workspace.loading")}</p>
        </div>
      </div>
    );
  }

  if (!workspace || !workspace.map) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-app dark:bg-app text-center p-6 select-none font-sans relative overflow-hidden">
        {/* Ambient VisionOS Light Orbs */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/20 dark:bg-surface/40 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-positive/15 dark:bg-surface/30 blur-[120px] z-0"
          aria-hidden="true"
        />
        <div className="relative z-10 p-8 rounded-3xl bg-surface/70 backdrop-blur-2xl border border-line/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:bg-app/20 dark:border-line/10 dark:shadow-2xl max-w-sm flex flex-col items-center text-fg dark:text-fg">
          <div className="w-12 h-12 rounded-2xl bg-surface/60 dark:bg-surface/10 border border-line/80 dark:border-line/10 flex items-center justify-center text-muted dark:text-muted mb-3 shadow-xs">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-fg dark:text-fg">{t("workspace.notFound.title")}</h3>
          <p className="text-xs text-muted dark:text-muted mt-1 max-w-xs">{t("workspace.notFound.description")}</p>
          <Button variant="primary" size="sm" onClick={() => navigate("/")} className="mt-4 !rounded-xl !bg-primary hover:!bg-primary !text-fg">
            {t("workspace.notFound.action")}
          </Button>
        </div>
      </div>
    );
  }

  const nodesList = workspace.map.nodes || [];
  const relationsList = workspace.map.relations || [];

  const docNode = nodesList.find((n) => n.id === expandedDocNodeId) || null;
  const isDiscoveryMode = canvasMode === "discovery" || canvasMode === "obsidian";

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
      className="flex flex-col h-screen w-full relative overflow-hidden bg-app dark:bg-app text-fg dark:text-fg font-sans select-none"
    >
      {/* ─── Ambient VisionOS Light Orbs for Glass Refraction ─── */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/20 dark:bg-surface/40 blur-[120px] z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-positive/15 dark:bg-surface/30 blur-[120px] z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/4 w-[450px] h-[450px] rounded-full bg-violet-200/35 dark:bg-purple-900/20 blur-[140px] z-0"
        aria-hidden="true"
      />

      {/* Unified VisionOS Top Navigation Bar */}
      {!(canvasMode === "spatial" && (isZenMode || docViewMode === "fullscreen")) && (
        <header className="shrink-0 z-50 relative w-full px-6 py-4 flex items-center justify-between gap-4 pointer-events-auto">
          {/* Left: Back Button & Project Identification */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="
                flex items-center gap-1.5 px-3.5 py-2 rounded-2xl
                bg-surface/70 dark:bg-app/60 backdrop-blur-2xl
                border border-line/80 dark:border-line/10
                shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-2xl
                text-xs font-semibold text-fg dark:text-fg
                hover:bg-surface/90 dark:hover:bg-surface/5 transition-all cursor-pointer select-none
              "
              title="Volver a Proyectos"
            >
              <ChevronLeft className="w-4 h-4 text-primary dark:text-primary" />
              <span className="hidden sm:inline">Proyectos</span>
            </button>

            <div
              className="
                hidden md:flex items-center gap-2.5 px-4 py-2 rounded-2xl
                bg-surface/70 dark:bg-app/60 backdrop-blur-2xl
                border border-line/80 dark:border-line/10
                shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-2xl select-none
              "
            >
              <NexoLogo size={18} />
              <div className="h-3.5 w-px bg-sunken/60 dark:bg-surface/10" />
              <div className="flex items-center text-accent-primary" title={workspace.project.icon}>
                {PROJECT_HEADER_ICONS[workspace.project.icon] || <Layers className="w-3.5 h-3.5" />}
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-fg dark:text-fg tracking-tight max-w-[200px] truncate">
                {workspace.project.name}
              </h2>
              <div className="h-3.5 w-px bg-sunken/60 dark:bg-surface/10" />
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-positive/10 text-positive border border-positive/20 px-2 py-0.5 rounded-full glass-pill backdrop-blur-md">
                <Check className="w-3 h-3 text-positive" />
                {t("workspace.saved")}
              </span>
            </div>
          </div>

          {/* Center: Global View Mode Switcher */}
          <div className="flex items-center justify-center">
            <ViewModeToggle
              mode={canvasMode}
              onChange={setCanvasMode}
              isLocked={!isArchitectureUnlocked && (!workspace?.map?.nodes?.length)}
            />
          </div>

          {/* Right section: Layout balance */}
          <div className="flex items-center gap-2 min-w-[32px] justify-end" />
        </header>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Main Center Workspace Area */}
        <div className="flex-1 overflow-hidden relative h-full min-h-0">
          {canvasMode === "spatial" ? (
            <SpaceWorkspace />
          ) : isDiscoveryMode ? (
            <FullScreenDiscoveryChat
              messages={discoveryMessages}
              initialMessages={discoveryMessages}
              initialSelectedOptions={discoverySelectedOptions}
              onMessagesChange={setDiscoveryMessages}
              onSelectedOptionsChange={setDiscoverySelectedOptions}
              onSendMessage={handleChatSendMessage}
              onSelectOption={(questionId, option) => {
                setDiscoverySelectedOptions({
                  ...useWorkspaceStore.getState().discoverySelectedOptions,
                  [questionId]: option,
                });
              }}
              onGenerateArchitecture={handleGenerateArchitecture}
              onNavigateToMode={async (mode) => {
                try {
                  if (!workspace?.map?.nodes?.length) {
                    await handleGenerateBaseMap();
                  }
                  setArchitectureUnlocked(true);
                  setCanvasMode(mode);
                } catch {
                  // Error is caught and surfaced in handleSendMessage
                }
              }}
              isThinking={isThinking}
              error={chatError}
              onRetry={() => {
                setChatError(null);
                const lastUserMsg = [...discoveryMessages]
                  .reverse()
                  .find((m) => m.role === "user");
                if (lastUserMsg) void handleSendMessage(lastUserMsg.content);
              }}
            />
          ) : (
            <ConceptCanvas
              map={workspace.map}
              selectedNodeId={selectedNodeId}
              onSelectNode={selectNode}
              onNodeMove={handleNodeMove}
              onOpenDocDetail={(node) => setExpandedDocNodeId(node.id)}
              isChatOpen={false}
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
                setCanvasMode("spatial");
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

        {/* AI Copilot Drawer (Floating Creative Glass Drawer - isolated strictly to Ideación IA, hidden when !isDiscoveryMode) */}
        {isDiscoveryMode && isChatOpen && (
          <AIChatDrawer
            isOpen={isChatOpen}
            onClose={toggleChat}
            messages={workspace.messages}
            isThinking={isThinking}
            error={chatError}
            onSendMessage={handleSendMessage}
            onGenerateBaseMap={handleGenerateBaseMap}
            onSelectNode={(nodeId) => selectNode(nodeId)}
            onRetry={() => {
              setChatError(null);
              const lastUserMsg = [...workspace.messages]
                .reverse()
                .find((m) => m.role === "user");
              if (lastUserMsg) void handleSendMessage(lastUserMsg.text);
            }}
          />
        )}
      </div>

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