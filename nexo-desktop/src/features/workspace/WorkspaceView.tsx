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
import { detectMessageLanguage, isPlaceholderResponse, sanitizeAssistantText } from "../../services/ai/prompts";
import { filterRepeatedQuestions, nextDiscoveryQuestion, questionKey, recordUserInput, syncIdeaFacts } from "../../services/ai/discovery";
import { hydrateWorkspaceMemory, transitionMemoryFact, type MemoryAction } from "../../services/ai/semanticMemory";
import { applyGraphOperations, buildGroundedGraph, reconcileGraph } from "../../services/ai/reconcileGraph";
import { currentLanguage } from "../../i18n";
import { useToast } from "../../context/ToastContext";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { ViewModeToggle } from "../../components/ui/ViewModeToggle";
import { ConceptCanvas } from "./ConceptCanvas";
import { AIChatDrawer } from "./AIChatDrawer";
import { FullScreenDiscoveryChat } from "./FullScreenDiscoveryChat";
import { NotionModalViewer } from "./NotionModalViewer";
import { GenerateDocumentModal } from "../documents/GenerateDocumentModal";
import { SpaceWorkspace } from "../spatial/SpaceWorkspace";
import { Button } from "../../components/ui/Button";
import { NexoLogo } from "../../components/brand/NexoLogo";
import type {
  ActionableIdea,
  AssistantMessage,
  ConceptMap,
  ConceptNode,
  GenerativeUIBlock,
  Message,
  ChatPhase,
  ProjectIcon,
  UserMessage,
} from "../../domain/types";

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
    isChatOpen,
    toggleChat,
    moveNode,
    removeNode,
    setChatPhase,
    isZenMode,
    docViewMode,
    isArchitectureUnlocked,
    setArchitectureUnlocked,
    discoveryMessages,
    discoverySelectedOptions,
    setDiscoverySelectedOptions,
    addNodeFromChat,
    resetWorkspace,
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const pendingRequestRef = useRef<string | null>(null);
  const failedMessageIdRef = useRef<string | null>(null);
  const generationRef = useRef<string | null>(null);

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
        setWorkspace(data ? hydrateWorkspaceMemory(data) : null);
      })
      .catch(() => {
        showToast(t("workspace.notFound.title"), "error");
      })
      .finally(() => setLoading(false));
  }, [projectId, lang, setWorkspace, showToast, t]);

  // Persist session edits
  const saveSession = (map: ConceptMap, messages: Message[]) => {
    if (!projectId) return;
    void services.workspace.save(projectId, map, messages, useWorkspaceStore.getState().workspace?.discovery).catch(console.error);
  };

  const handleSendMessage = async (text: string, overridePhase?: ChatPhase, questionnaireId?: string, answers?: Record<string, string | string[]>, retryMessageId?: string) => {
    const current = useWorkspaceStore.getState();
    const activeWorkspace = current.workspace;
    if (!activeWorkspace || !projectId || pendingRequestRef.current) return;
    if (!retryMessageId && questionnaireId && activeWorkspace.messages.some((m) => m.role === "user" && m.questionnaireId === questionnaireId)) return;

    let activePhase = overridePhase || ((activeWorkspace.discovery?.lifecycle === "generated" || activeWorkspace.map.nodes.length > 0) ? "PHASE_3_EXPANSION" : current.chatPhase);
    const prior = retryMessageId && activeWorkspace.messages.find((m) => m.role === "user" && m.id === retryMessageId);
    let requestDefinitionVersion = activeWorkspace.discovery?.candidateDefinitionVersion;
    const userMessage: Message = prior && prior.role === "user" ? prior : {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      role: "user",
      createdAt: new Date().toISOString(),
      text,
      questionnaireId,
      answers,
    };
    pendingRequestRef.current = userMessage.id;
    failedMessageIdRef.current = null;
    const history = activeWorkspace.messages.filter((m) => m.id !== userMessage.id);
    if (!prior) {
      const updatedMessages = [...history, userMessage];
      const nextDiscovery = recordUserInput(activeWorkspace.discovery!, userMessage);
      requestDefinitionVersion = nextDiscovery.candidateDefinitionVersion;
      if (nextDiscovery.lifecycle === "discovering") activePhase = "PHASE_1_DISCOVERY";
      current.setWorkspace({ ...activeWorkspace, messages: updatedMessages, discovery: nextDiscovery });
      saveSession(activeWorkspace.map, updatedMessages);
    }
    current.setThinking(true);
    setChatError(null);

    const messageLang = detectMessageLanguage(text, lang);

    try {
      const response = await services.ai.reply({
        text,
        map: activeWorkspace.map,
        lang: messageLang,
        replyTo: userMessage.id,
        chatPhase: activePhase,
        messageHistory: history,
      });
      const latest = useWorkspaceStore.getState().workspace;
      if (!latest || latest.project.id !== projectId) return;
      if (activePhase === "PHASE_1_DISCOVERY" && latest.discovery && response.message.action === "questionnaire") {
        const aiQuestions = response.message.discoveryQuestions && response.message.discoveryQuestions.length > 0
          ? response.message.discoveryQuestions
          : nextDiscoveryQuestion(latest.discovery);
        const filteredQuestions = latest.discovery.lifecycle === "ready" ? [] : filterRepeatedQuestions(latest.discovery, latest.messages, aiQuestions);
        response.message.discoveryQuestions = filteredQuestions;
        if (!response.message.discoveryQuestions.length) {
          response.message.action = "chat";
          if (!response.message.text || isPlaceholderResponse(response.message.text)) {
            response.message.text = latest.discovery.lifecycle === "ready" ? "Ya tengo una base para organizar tu proyecto. Puedes seguir contándome detalles o explorar otras ideas." : "Podemos seguir conversando. Cuéntame ese detalle cuando quieras; también puedes decir que aún no lo sabes.";
          }
        } else if (!response.message.text || isPlaceholderResponse(response.message.text)) {
          response.message.text = "Para entender mejor tu idea, hay algo que quisiera saber:";
        }
      }
      if (latest.discovery?.lifecycle === "generated" || activePhase === "PHASE_3_EXPANSION" || (latest.map?.nodes && latest.map.nodes.length > 0)) {
        response.message.action = "chat";
        response.message.readyForStructuring = false;
        response.message.discoveryQuestions = [];
        delete (response.message as any).dimensions;
      }
      response.message.text = sanitizeAssistantText(response.message.text, messageLang);
      if (response.message.simplifiedExplanation) {
        response.message.simplifiedExplanation = sanitizeAssistantText(response.message.simplifiedExplanation, messageLang);
      }
      if (latest.discovery?.lifecycle === "discovering" && response.message.action === "ready") {
        response.message.action = "chat";
        response.message.readyForStructuring = false;
        if (!response.message.text || isPlaceholderResponse(response.message.text)) {
          response.message.text = nextDiscoveryQuestion(latest.discovery)[0]?.question ?? "Cuéntame un poco más sobre lo que quieres crear o lograr.";
        }
      }
      const askedKeys = (response.message.discoveryQuestions ?? []).map((question) => questionKey(question.question));
      const discoveryWithQuestions = latest.discovery && askedKeys.length
        ? { ...latest.discovery, askedQuestionKeys: [...new Set([...latest.discovery.askedQuestionKeys, ...askedKeys])] }
        : latest.discovery;
      const discovery = discoveryWithQuestions ? syncIdeaFacts(discoveryWithQuestions, response.message.ui, response.message.id, response.message.memoryPatches, userMessage.id) : undefined;
      const requestedGraphChange = activePhase === "PHASE_2_STRUCTURING" || (activePhase === "PHASE_3_EXPANSION" && /^explorar punto de vista/i.test(text)) || /\b(agrega|añade|anade|incorpora|crea|mapear|add)\b.{0,40}\b(nodo|concepto|tablero|mapa|node)\b/i.test(text);
      const proposedNodes = requestedGraphChange ? response.newNodes || [] : [];
      const nextMap: ConceptMap = applyGraphOperations(
        latest.map,
        proposedNodes,
        requestedGraphChange ? response.newRelations || [] : [],
        latest.discovery,
        requestDefinitionVersion,
        latest.discovery?.candidateDefinitionVersion,
        [userMessage.id, response.message.id],
      );
      const nextMessages = [...latest.messages.filter((m) => !(m.role === "assistant" && m.replyTo === userMessage.id)), { ...response.message, replyTo: userMessage.id, requestId: userMessage.id }];
      useWorkspaceStore.getState().setWorkspace({
        ...latest,
        map: nextMap,
        messages: nextMessages,
        discovery,
      });
      saveSession(nextMap, nextMessages);

      const addedNodeCount = nextMap.nodes.length - latest.map.nodes.length;
      if (addedNodeCount > 0) {
        showToast(`Se mapearon ${addedNodeCount} nuevos conceptos como propuestas.`, "success");
        setArchitectureUnlocked(true);
        if (activePhase === "PHASE_2_STRUCTURING" || activePhase === "PHASE_1_DISCOVERY") {
          setChatPhase("PHASE_3_EXPANSION");
        }
      }
    } catch (err: unknown) {
      failedMessageIdRef.current = userMessage.id;
      const errorMsg = err instanceof Error ? err.message : t("chat.error.title");
      setChatError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      pendingRequestRef.current = null;
      useWorkspaceStore.getState().setThinking(false);
    }
  };

  useEffect(() => {
    const discovery = workspace?.discovery;
    const version = discovery?.candidateDefinitionVersion;
    if (!workspace || !projectId || !discovery || !version || discovery.lifecycle === "legacy_unknown" || discovery.lifecycle === "discovering" || discovery.lifecycle === "generation_error" || discovery.generatedDefinitionVersion === version || isThinking) return;
    const timer = window.setTimeout(async () => {
      const state = useWorkspaceStore.getState();
      const current = state.workspace;
      const definition = current?.discovery;
      if (!current || current.project.id !== projectId || !definition || definition.candidateDefinitionVersion !== version || state.isThinking || generationRef.current) return;
      if (definition.generationLedger[version]?.status === "applied") return;
      const requestId = definition.generationLedger[version]?.requestId ?? `${projectId}:${version}`;
      generationRef.current = requestId;
      const pending = { ...definition, lifecycle: "generating" as const, stableDefinitionVersion: version, generationLedger: { ...definition.generationLedger, [version]: { status: "pending" as const, requestId } } };
      state.setWorkspace({ ...current, discovery: pending });
      try {
        await services.workspace.save(projectId, current.map, current.messages, pending);
        const generated = buildGroundedGraph(pending, current.project.name);
        const latest = useWorkspaceStore.getState().workspace;
        if (!latest || latest.project.id !== projectId || latest.discovery?.candidateDefinitionVersion !== version) return;
        const map = reconcileGraph(latest.map, generated, pending, version);
        const applied = {
          ...pending,
          lifecycle: "generated" as const,
          generatedDefinitionVersion: version,
          completionAnchorMessageId: pending.completionAnchorMessageId ?? latest.messages[latest.messages.length - 1]?.id,
          generationLedger: { ...pending.generationLedger, [version]: { status: "applied" as const, requestId } },
        };
        state.setWorkspace({ ...latest, map, discovery: applied });
        state.setChatPhase("PHASE_3_EXPANSION");
        await services.workspace.save(projectId, map, latest.messages, applied);
      } catch (error) {
        const latest = useWorkspaceStore.getState().workspace;
        if (latest?.discovery) {
          const failed = { ...latest.discovery, lifecycle: "generation_error" as const, generationLedger: { ...latest.discovery.generationLedger, [version]: { status: "failed" as const, requestId } } };
          state.setWorkspace({ ...latest, discovery: failed });
          void services.workspace.save(projectId, latest.map, latest.messages, failed).catch(console.error);
        }
        setChatError(error instanceof Error ? error.message : "No se pudo generar el proyecto");
      } finally { generationRef.current = null; }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [workspace?.discovery?.candidateDefinitionVersion, workspace?.discovery?.lifecycle, isThinking, projectId]);

  const handleGenerateArchitecture = async () => {
    const latest = useWorkspaceStore.getState().workspace;
    if (latest?.discovery?.lifecycle === "generation_error") {
      useWorkspaceStore.getState().setWorkspace({ ...latest, discovery: { ...latest.discovery, lifecycle: "ready" } });
      return;
    }
    if (!latest?.map.nodes.length) return;
    setCanvasMode("notion");
  };

  const handleChatSendMessage = async (text: string, questionnaireId?: string, answers?: Record<string, string | string[]>) => {
    const isDimensionExplore = /(explorar punto de vista|punto de vista|dimensi[oó]n)\s*(econ[oó]mic|social|t[eé]cnic|legal|humano|mesero|pasajer)/i.test(text);
    await handleSendMessage(text, isDimensionExplore && workspace?.map?.nodes?.length ? "PHASE_3_EXPANSION" : undefined, questionnaireId, answers);
  };

  const handleGenerativeUIChange = (messageId: string, ui: GenerativeUIBlock) => {
    const state = useWorkspaceStore.getState();
    const activeWorkspace = state.workspace;
    if (!activeWorkspace) return;

    const nextMessages = activeWorkspace.messages.map((message) =>
      message.id === messageId && message.role === "assistant"
        ? ({ ...message, ui } as AssistantMessage)
        : message
    );
    const nextWorkspace = { ...activeWorkspace, messages: nextMessages, discovery: activeWorkspace.discovery ? syncIdeaFacts(activeWorkspace.discovery, ui, messageId) : undefined };

    state.setWorkspace(nextWorkspace);
    void services.workspace.save(activeWorkspace.project.id, activeWorkspace.map, nextMessages, nextWorkspace.discovery).catch(console.error);
  };

  const handleMemoryAction = (memoryKey: string, action: MemoryAction, value?: string) => {
    const state = useWorkspaceStore.getState();
    const current = state.workspace;
    const discovery = current?.discovery;
    const fact = discovery?.facts.find((item) => item.key === memoryKey);
    if (!current || !discovery || !fact || action === "explore") return;

    let event;
    let sourceMessage: UserMessage | undefined;
    if (action === "accept" && fact.kind === "suggestion") {
      event = { type: "accept_suggestion" as const, eventId: `${memoryKey}:accept` };
    } else if (action === "accept" && fact.kind === "hypothesis") {
      event = { type: "confirm_hypothesis" as const, eventId: `${memoryKey}:confirm` };
    } else if (action === "accept" && fact.kind === "decision_candidate") {
      event = { type: "accept_decision_candidate" as const, eventId: `${memoryKey}:accept` };
    } else if (action === "reject" && fact.kind === "suggestion") {
      event = { type: "reject_suggestion" as const, eventId: `${memoryKey}:reject` };
    } else if (action === "reject" && fact.kind === "hypothesis") {
      event = { type: "reject_hypothesis" as const, eventId: `${memoryKey}:reject` };
    } else if (action === "reject" && fact.kind === "decision_candidate") {
      event = { type: "reject_decision_candidate" as const, eventId: `${memoryKey}:reject` };
    } else if (action === "modify" && fact.kind === "suggestion" && value?.trim()) {
      event = { type: "modify_suggestion" as const, eventId: `${memoryKey}:modify:${value.trim()}`, value: value.trim() };
    } else if (action === "resolve" && fact.kind === "unknown" && value?.trim()) {
      const messageId = crypto.randomUUID();
      sourceMessage = { id: messageId, role: "user", text: value.trim(), createdAt: new Date().toISOString() };
      event = { type: "resolve_unknown" as const, eventId: `${memoryKey}:resolve:${messageId}`, value: value.trim(), messageId };
    } else {
      return;
    }

    try {
      const nextFact = transitionMemoryFact(fact, event);
      if (nextFact === fact) return;
      const messages = sourceMessage ? [...current.messages, sourceMessage] : current.messages;
      const nextDiscovery = { ...discovery, facts: discovery.facts.map((item) => item.key === memoryKey ? nextFact : item) };
      const nextWorkspace = { ...current, messages, discovery: nextDiscovery };
      state.setWorkspace(nextWorkspace);
      void services.workspace.save(current.project.id, current.map, messages, nextDiscovery).catch((error) => {
        console.error("Could not save semantic memory action", error);
      });
    } catch (error) {
      console.error("Rejected invalid semantic memory action", error);
    }
  };

  const handleAddIdeaToBoard = (messageId: string, idea: ActionableIdea) => {
    const latest = useWorkspaceStore.getState().workspace;
    const memoryKey = `suggestion:${messageId}:${idea.id}`;
    const existingFact = latest?.discovery?.facts.find((fact) => fact.key === memoryKey);
    if (existingFact?.memoryState === "rejected") return;

    const sourceMessage = latest?.messages.find((message) => message.id === messageId && message.role === "assistant");
    const sourceUi = sourceMessage?.role === "assistant" && sourceMessage.ui?.type === "idea_cards"
      ? sourceMessage.ui
      : { type: "idea_cards" as const, title: "Sugerencias", items: [idea] };
    const nextDiscovery = latest?.discovery
      ? syncIdeaFacts(latest.discovery, {
          ...sourceUi,
          items: sourceUi.items.map((item) => item.id === idea.id ? { ...item, ...idea, status: "approved" as const } : item),
        }, messageId)
      : undefined;
    const acceptedFact = nextDiscovery?.facts.find((fact) => fact.key === memoryKey);
    if (latest && nextDiscovery && nextDiscovery !== latest.discovery) {
      useWorkspaceStore.getState().setWorkspace({ ...latest, discovery: nextDiscovery });
    }

    const details = [
      "### Resumen Ejecutivo",
      idea.description,
      "",
      "### Beneficios",
      ...(idea.benefits.length > 0 ? idea.benefits.map((item) => `- ${item}`) : ["- Por validar"]),
      "",
      "### Recursos necesarios",
      ...(idea.resources.length > 0 ? idea.resources.map((item) => `- ${item}`) : ["- Por definir"]),
      "",
      "### Relaciones sugeridas",
      ...(idea.relations.length > 0 ? idea.relations.map((item) => `- ${item}`) : ["- Sin relaciones sugeridas"]),
    ].join("\n");

    const node = addNodeFromChat({
      title: idea.title,
      description: idea.description,
      kind: "concept",
      category: idea.category,
      priority: idea.priority,
      phase: idea.phase ?? "planning",
      metadata: "Creado desde una tarjeta accionable del chat",
      details,
      relevanceScore: idea.priority === "high" ? 9 : idea.priority === "low" ? 4 : 7,
      semanticKey: acceptedFact?.semanticKey ?? acceptedFact?.key,
      semanticKind: acceptedFact?.kind,
      semanticState: acceptedFact?.memoryState,
      provenanceOrigin: acceptedFact?.origin,
      sourceFactIds: acceptedFact ? [acceptedFact.key] : undefined,
      sourceMessageIds: acceptedFact?.sourceMessageIds ?? (sourceMessage ? [messageId] : undefined),
    });

    if (node) {
      setArchitectureUnlocked(true);
      showToast(`“${idea.title}” se añadió al Tablero de Conceptos.`, "success");
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
              onSelectedOptionsChange={setDiscoverySelectedOptions}
              onSendMessage={handleChatSendMessage}
              onSelectOption={(questionId, option) => {
                setDiscoverySelectedOptions({
                  ...useWorkspaceStore.getState().discoverySelectedOptions,
                  [questionId]: option,
                });
              }}
              onGenerateArchitecture={handleGenerateArchitecture}
              generationStatus={workspace.discovery?.lifecycle}
              onNavigateToMode={async (mode) => {
                if (useWorkspaceStore.getState().workspace?.map.nodes.length) setCanvasMode(mode);
              }}
              isThinking={isThinking}
              error={chatError}
              onRetry={() => {
                setChatError(null);
                const lastUserMsg = useWorkspaceStore.getState().workspace?.messages.find((m) => m.id === failedMessageIdRef.current);
                if (lastUserMsg?.role === "user") void handleSendMessage(lastUserMsg.text, undefined, lastUserMsg.questionnaireId, lastUserMsg.answers, lastUserMsg.id);
              }}
              onGenerativeUIChange={handleGenerativeUIChange}
              onAddIdeaToBoard={handleAddIdeaToBoard}
              memoryFacts={workspace.discovery?.facts}
              onMemoryAction={handleMemoryAction}
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
            onSelectNode={(nodeId) => selectNode(nodeId)}
            onRetry={() => {
              setChatError(null);
              const lastUserMsg = useWorkspaceStore.getState().workspace?.messages.find((m) => m.id === failedMessageIdRef.current);
              if (lastUserMsg?.role === "user") void handleSendMessage(lastUserMsg.text, undefined, lastUserMsg.questionnaireId, lastUserMsg.answers, lastUserMsg.id);
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
