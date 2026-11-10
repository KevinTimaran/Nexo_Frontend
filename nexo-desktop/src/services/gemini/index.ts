/**
 * Native Google Gemini Service for Nexo Desktop.
 * Communicates directly with Google Generative Language API (v1beta).
 * Supports JSON Schema outputs, Tutor didactic mode, and genuine error transparency.
 * NO SILENT MOCK FALLBACKS: Failures surface structured typed errors.
 */
import type {
  AIResponse,
  ChatPhase,
  CognitiveAssistanceMode,
  ConceptKind,
  ConceptNode,
  ConceptRelation,
  DiscoveryQuestion,
  MemoryPatch,
  PerspectiveProposal,
  NodeCategory,
  AICardType,
  NodePriority,
  ResearchPhase,
} from "../../domain/types";
import type { AIReplyRequest, AIService, AITutorRequest } from "../contracts";
import { getSystemInstruction, buildUserPrompt, detectMessageLanguage, sanitizeAssistantText } from "../ai/prompts";
import { normalizeGenerativeUIBlock } from "../ai/generativeUi";
import { normalizeAiMemoryPatches } from "../ai/semanticMemory";
import { normalizePerspectiveProposals } from "../ai/perspectiveEngine";
import { normalizeCategory } from "../../domain/constants";

export type { AICardType };

/* ---------------- Error Class Hierarchy ---------------- */

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: string = "GEMINI_ERROR",
    public readonly status?: number
  ) {
    super(message);
    this.name = "GeminiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIKeyMissingError extends GeminiError {
  constructor(
    message: string = "No se ha configurado ninguna API key de Google Gemini para este dispositivo. Abre Ajustes > Motor de IA para guardar una clave propia."
  ) {
    super(message, "API_KEY_MISSING", 401);
    this.name = "APIKeyMissingError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProviderQuotaError extends GeminiError {
  constructor(
    message: string = "Límite de cuota excedido para Google Gemini (HTTP 429). Espera un momento antes de reintentar."
  ) {
    super(message, "PROVIDER_QUOTA_EXCEEDED", 429);
    this.name = "ProviderQuotaError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends GeminiError {
  constructor(
    detail?: string,
    message: string = detail || "Error de red al conectar con Google Gemini. Revisa tu conexión a internet."
  ) {
    super(message, "NETWORK_ERROR", 0);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/* ---------------- Configuration & Storage ---------------- */

export const STORAGE_KEY_GEMINI_KEY = "nexo.gemini.key";
export const STORAGE_KEY_GEMINI_MODEL = "nexo.gemini.model";
export const STORAGE_KEY_GEMINI_ENABLED = "nexo.gemini.enabled";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
// Never reference a VITE_* key statically here: Vite embeds such values in bundles.
// Users configure their own key in Settings; headless tests may use process env.
export const DEFAULT_GEMINI_API_KEY = "";

let inMemoryKey: string | null = null;
let inMemoryModel: string | null = null;

const uid = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

/**
 * Returns the configured Gemini API key with strict precedence:
 * 1. Checks user override in localStorage ("nexo.gemini.key")
 * 2. Checks in-memory override (for testing and runtime config)
 * 3. Checks a process environment key only in a headless test runner
 */
export function getGeminiApiKey(): string {
  try {
    if (typeof localStorage !== "undefined") {
      const custom = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);
      if (custom && custom.trim().length > 0) return custom.trim();
    }
  } catch {
    // Ignore storage issues
  }
  if (inMemoryKey && inMemoryKey.trim().length > 0) {
    return inMemoryKey.trim();
  }
  const envKey = typeof window === "undefined" && typeof process !== "undefined"
    ? process.env?.["VITE_GEMINI_API_KEY"]
    : "";
  if (envKey && envKey.trim().length > 0) return envKey.trim();

  return "";
}

/**
 * Returns the active Gemini model (defaults to gemini-2.5-flash).
 */
export function getGeminiModel(): string {
  try {
    if (typeof localStorage !== "undefined") {
      const custom = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
      if (custom && custom.trim().length > 0) return custom.trim();
    }
  } catch {
    // Ignore storage issues
  }
  if (inMemoryModel && inMemoryModel.trim().length > 0) {
    return inMemoryModel.trim();
  }
  const envModel = (import.meta as unknown as { env?: { VITE_GEMINI_MODEL?: string } })?.env?.VITE_GEMINI_MODEL;
  if (envModel && envModel.trim().length > 0) return envModel.trim();

  if (typeof process !== "undefined" && process.env?.VITE_GEMINI_MODEL) {
    const processModel = process.env.VITE_GEMINI_MODEL;
    if (processModel && processModel.trim().length > 0) return processModel.trim();
  }
  return DEFAULT_GEMINI_MODEL;
}

export function setGeminiConfig(key?: string, model?: string): void {
  if (key !== undefined) {
    inMemoryKey = key.trim().length === 0 ? null : key.trim();
    try {
      if (typeof localStorage !== "undefined") {
        if (key.trim().length === 0) {
          localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY_GEMINI_KEY, key.trim());
        }
      }
    } catch (err) {
      console.warn("No se pudo guardar la clave de Gemini en localStorage:", err);
    }
  }
  if (model !== undefined) {
    inMemoryModel = model.trim().length === 0 ? null : model.trim();
    try {
      if (typeof localStorage !== "undefined") {
        if (model.trim().length === 0) {
          localStorage.removeItem(STORAGE_KEY_GEMINI_MODEL);
        } else {
          localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model.trim());
        }
      }
    } catch (err) {
      console.warn("No se pudo guardar el modelo de Gemini en localStorage:", err);
    }
  }
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 0;
}

export function isGeminiEnabled(): boolean {
  try {
    if (typeof localStorage !== "undefined") {
      const val = localStorage.getItem(STORAGE_KEY_GEMINI_ENABLED);
      if (val === "false") return false;
    }
  } catch {
    // Default to true
  }
  return isGeminiConfigured();
}

export function setGeminiEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_GEMINI_ENABLED, enabled ? "true" : "false");
    }
  } catch {
    // Ignore storage issues
  }
}

export interface GeminiTestResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}

/**
 * Tests the Gemini API connection with a minimal prompt.
 */
export async function testGeminiConnection(key?: string, model?: string): Promise<GeminiTestResult> {
  const activeKey = key?.trim() || getGeminiApiKey();
  const activeModel = model?.trim() || getGeminiModel();

  if (!activeKey) {
    return {
      ok: false,
      latencyMs: 0,
      model: activeModel,
      error: "No se ha configurado ninguna clave API de Gemini.",
    };
  }

  const start = performance.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Responde únicamente: OK" }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      return { ok: true, latencyMs, model: activeModel };
    }

    let errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // Keep default error
    }

    return { ok: false, latencyMs, model: activeModel, error: errorMsg };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      latencyMs,
      model: activeModel,
      error: err instanceof Error ? err.message : "Error de conexión con Google Gemini.",
    };
  }
}

/* ---------------- Internal Error Helpers ---------------- */

async function handleGeminiResponseError(response: Response): Promise<never> {
  const status = response.status;
  let detailMessage = `Error en API de Gemini (${status}): ${response.statusText}`;
  let detailCode = "PROVIDER_HTTP_ERROR";

  try {
    const errorText = await response.text();
    if (errorText) {
      try {
        const json = JSON.parse(errorText);
        if (json?.error?.message) {
          detailMessage = json.error.message;
        }
        if (json?.error?.status) {
          detailCode = json.error.status;
        }
      } catch {
        detailMessage = `${detailMessage} - ${errorText.slice(0, 300)}`;
      }
    }
  } catch {
    // Keep default detailMessage
  }

  if (status === 429) {
    throw new ProviderQuotaError(detailMessage);
  }
  if (status === 401 || status === 403) {
    throw new GeminiError(detailMessage, "API_KEY_INVALID", status);
  }
  throw new GeminiError(detailMessage, detailCode, status);
}

function handleGeminiException(err: unknown, fallbackMessage: string, defaultCode: string): never {
  if (err instanceof GeminiError) {
    throw err;
  }
  if (err instanceof Error) {
    const msg = err.message || "";
    const name = err.name || "";
    const isNetwork =
      name === "TypeError" ||
      name === "AbortError" ||
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("Failed to fetch") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("ECONNREFUSED");

    if (isNetwork) {
      throw new NetworkError(err.message);
    }
    throw new GeminiError(err.message, defaultCode);
  }
  throw new GeminiError(fallbackMessage, "UNKNOWN_ERROR");
}

/* ---------------- Helper layout positioning ---------------- */
const GAP_X = 340;
const GAP_Y = 170;

function calculateNextPosition(existingNodes: ConceptNode[]): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 80, y: 160 };
  }

  let maxX = existingNodes[0].x;
  for (const n of existingNodes) {
    if (n.x > maxX) maxX = n.x;
  }

  const lastNode = existingNodes[existingNodes.length - 1];
  const targetX = maxX > 600 ? maxX : lastNode.x + GAP_X;

  let targetY = lastNode.y;
  let guard = 0;
  while (existingNodes.some((n) => Math.abs(n.x - targetX) < 220 && Math.abs(n.y - targetY) < 130) && guard < 15) {
    targetY += GAP_Y;
    guard++;
  }

  return { x: targetX, y: targetY };
}

interface GeminiStructuredReply {
  action?: "chat" | "questionnaire" | "ready";
  message?: string;
  memoryPatches?: MemoryPatch[];
  perspectives?: PerspectiveProposal[];
  assistanceMode?: CognitiveAssistanceMode;
  questions?: Array<{
    id?: string;
    question: string;
    options: string[];
  }>;
  text?: string;
  simplifiedExplanation?: string;
  cardType?: AICardType;
  readyForStructuring?: boolean;
  discoveryQuestions?: DiscoveryQuestion[];
  ui?: unknown;
  nodes?: Array<{
    title: string;
    description: string;
    kind: ConceptKind;
    category: NodeCategory;
    priority: NodePriority;
    phase: ResearchPhase;
    metadata: string;
    details: string;
  }>;
  relationships?: Array<{
    sourceTitle?: string;
    targetTitle?: string;
    from?: string;
    to?: string;
    type?: string;
    strength?: number;
    value?: number;
    label?: string;
  }>;
}

/* ---------------- Gemini AI Service ---------------- */

export const geminiAiService: AIService = {
  async reply(request: AIReplyRequest): Promise<AIResponse> {
    const apiKey = getGeminiApiKey();
    const model = getGeminiModel();

    const { text, map, lang, replyTo, chatPhase, discovery } = request;
    const now = new Date().toISOString();

    const effectiveLang = detectMessageLanguage(text, lang);

    // Fallback 1 Replacement: Throw typed error when key is missing
    if (!apiKey) {
      throw new APIKeyMissingError();
    }

    const activePhase: ChatPhase =
      chatPhase || (map.nodes.length > 0 ? "PHASE_3_EXPANSION" : "PHASE_1_DISCOVERY");

    const existingSummary = (map?.nodes || [])
      .map((n) => `- [id=${n.id} | ${n.kind.toUpperCase()} | ${n.phase || "planning"} | ${n.category || "technical"}] ${n.title}: ${n.description}`)
      .join("\n");
    const memorySummary = discovery?.facts.map((fact) => `- [id=${fact.key} | ${fact.kind ?? "legacy_unknown"} | ${fact.memoryState ?? fact.status}] ${fact.value}`).join("\n");
    const perspectiveSummary = discovery?.perspectives?.filter((item) => item.explorationStatus !== "dismissed" && item.explorationStatus !== "not_relevant").slice(0, 5).map((item) => `- [${item.perspectiveId} | ${item.relevance}] ${item.rationale}`).join("\n");

    const systemInstruction = getSystemInstruction(activePhase, effectiveLang);
    const promptText = buildUserPrompt({
      phase: activePhase,
      lang: effectiveLang,
      existingNodesSummary: existingSummary,
      memorySummary,
      perspectiveSummary,
      userMessage: text,
      messageHistory: request.messageHistory,
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${promptText}` }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      });
    } catch (fetchErr) {
      // Fallback 3 Replacement (network/connectivity failure)
      handleGeminiException(fetchErr, "Error de red al conectar con Google Gemini.", "NETWORK_ERROR");
    }

    // Fallback 2 Replacement: Throw typed error on non-200 HTTP response
    if (!response.ok) {
      await handleGeminiResponseError(response);
    }

    try {
      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJson) {
        throw new GeminiError("Respuesta vacía o incompleta de Google Gemini.", "EMPTY_RESPONSE", 200);
      }

      const parsed: GeminiStructuredReply = JSON.parse(rawJson);
      const generativeUI = normalizeGenerativeUIBlock(parsed.ui);

      const newNodes: ConceptNode[] = [];
      const newRelations: ConceptRelation[] = [];
      const isWarning = parsed.cardType === "warning";

      if (
        activePhase !== "PHASE_1_DISCOVERY" &&
        !isWarning &&
        generativeUI?.type !== "idea_cards"
      ) {
        let currentMapNodes = [...map.nodes];
        const anchorNode = map.nodes.find((n) => n.kind === "concept") ?? map.nodes[0];

        for (const rawNode of parsed.nodes || []) {
          const pos = calculateNextPosition(currentMapNodes);
          const node: ConceptNode = {
            id: uid("n"),
            kind: rawNode.kind || "concept",
            category: normalizeCategory(rawNode.category),
            priority: rawNode.priority || "medium",
            status: rawNode.kind === "risk" ? "review" : "exploring",
            phase: rawNode.phase || (activePhase === "PHASE_2_STRUCTURING" ? "planning" : "execution"),
            x: pos.x,
            y: pos.y,
            title: rawNode.title,
            description: rawNode.description,
            metadata: rawNode.metadata,
            details: rawNode.details,
          };

          newNodes.push(node);
          currentMapNodes.push(node);

          if (anchorNode && activePhase === "PHASE_3_EXPANSION") {
            newRelations.push({
              id: uid("r"),
              from: anchorNode.id,
              to: node.id,
            });
          }
        }

        // Parse explicit relationships returned by Gemini LLM
        if (parsed.relationships && parsed.relationships.length > 0) {
          for (const rel of parsed.relationships) {
            const sTitle = (rel.sourceTitle || rel.from || "").toLowerCase().trim();
            const tTitle = (rel.targetTitle || rel.to || "").toLowerCase().trim();
            if (!sTitle || !tTitle) continue;

            const source = currentMapNodes.find(
              (n) => n.title.toLowerCase().trim() === sTitle || n.id === rel.from || n.title.toLowerCase().includes(sTitle)
            );
            const target = currentMapNodes.find(
              (n) => n.title.toLowerCase().trim() === tTitle || n.id === rel.to || n.title.toLowerCase().includes(tTitle)
            );

            if (source && target && source.id !== target.id) {
              const alreadyExists = newRelations.some(
                (r) => (r.from === source.id && r.to === target.id) || (r.from === target.id && r.to === source.id)
              );
              if (!alreadyExists) {
                newRelations.push({
                  id: uid("r"),
                  from: source.id,
                  to: target.id,
                  type: rel.type || "enables",
                  value: rel.strength || rel.value || 3,
                  label: rel.label || undefined,
                });
              }
            }
          }
        }

        // Automatic Causal Fallback: Ensure generated concepts are linked to the anchor concept in 3D
        const rootNode = anchorNode || newNodes[0];
        if (rootNode && newRelations.length === 0 && newNodes.length > 1) {
          for (const n of newNodes) {
            if (n.id !== rootNode.id) {
              newRelations.push({
                id: uid("r"),
                from: rootNode.id,
                to: n.id,
                type: n.category === "legal" ? "regulates" : n.category === "economic" ? "funds" : "enables",
                value: 3,
                label:
                  n.category === "legal"
                    ? "Marco Legal"
                    : n.category === "economic"
                      ? "Sustento Económico"
                      : "Componente",
              });
            }
          }
        }
      }

      if (isWarning) {
        newNodes.length = 0;
        newRelations.length = 0;
      }

      const primaryNode = newNodes[0];
      const insightItems = [
        ...newNodes.map((n) => ({ nodeId: n.id, kind: n.kind, label: n.title })),
      ];

      const action = generativeUI ? "chat" : parsed.action;
      const contextTopic = map.nodes[0]?.title || undefined;
      const rawText = parsed.message || parsed.text || "";
      const effectiveText = sanitizeAssistantText(rawText, effectiveLang, contextTopic);
      const rawQuestions = parsed.questions || parsed.discoveryQuestions || [];
      const isReadyAction = action === "ready";
      const isChatAction = action === "chat";
      const isQuestionnaireAction = action === "questionnaire";

      const mappedQuestions = isChatAction
        ? []
        : rawQuestions.map((q: any, idx: number) => ({
            id: q.id || `q-${idx + 1}`,
            question: q.question,
            options: q.options || [],
            type: q.type || (idx === 1 ? "multiple" : "single"),
            allowCustom: q.allowCustom ?? true,
          }));

      const isReadyStructuring = generativeUI
        ? false
        : isWarning
        ? false
        : isReadyAction
          ? true
          : (isChatAction || isQuestionnaireAction)
            ? false
            : (parsed.readyForStructuring ?? (activePhase !== "PHASE_1_DISCOVERY"));

      return {
        message: {
          id: uid("m"),
          role: "assistant",
          createdAt: now,
          replyTo,
          cardType: parsed.cardType || "idea",
          text: effectiveText,
          simplifiedExplanation: sanitizeAssistantText(
            parsed.simplifiedExplanation || (isReadyAction ? "Idea lista para estructuración." : ""),
            effectiveLang,
            contextTopic
          ),
          chatPhase: activePhase,
          assistanceMode: generativeUI?.type === "cognitive_insight" ? generativeUI.mode : parsed.assistanceMode,
          action: action,
          ui: generativeUI,
          memoryPatches: normalizeAiMemoryPatches(parsed.memoryPatches),
          readyForStructuring: isReadyStructuring,
          discoveryQuestions: mappedQuestions,
          insight:
            insightItems.length > 0
              ? {
                  title:
                    effectiveLang === "es"
                      ? "Estructura conceptual generada por Gemini"
                      : "Conceptual structure by Gemini",
                  items: insightItems,
                }
              : undefined,
          actionableNode: primaryNode && !isWarning
            ? {
                title: primaryNode.title,
                description: primaryNode.description,
                kind: primaryNode.kind,
                category: primaryNode.category,
                priority: primaryNode.priority,
                phase: primaryNode.phase ?? "planning",
                metadata: primaryNode.metadata,
                details: primaryNode.details,
              }
            : undefined,
        },
        newNodes,
        newRelations,
        perspectiveProposals: normalizePerspectiveProposals(parsed.perspectives, undefined, map),
      };
    } catch (parseErr) {
      // Fallback 3 Replacement (JSON parse / structured response failure)
      handleGeminiException(parseErr, "Error al procesar la respuesta de Gemini.", "GEMINI_PARSE_ERROR");
    }
  },

  async explain(request: AITutorRequest): Promise<string> {
    const apiKey = getGeminiApiKey();
    const model = getGeminiModel();
    const { messageText, conceptTitle, conceptDescription, lang } = request;

    const effectiveLang = detectMessageLanguage(
      `${messageText} ${conceptTitle || ""}`,
      lang
    );

    // Fallback 4 Replacement: Throw typed error when key is missing in tutor mode
    if (!apiKey) {
      throw new APIKeyMissingError();
    }

    const targetLang = effectiveLang === "es" ? "Español" : "English";

    const prompt = `Actúa como un profesor universitario y mentor de producto excepcionalmente pedagógico y claro.
Tu misión es explicar en términos súper comprensibles el siguiente concepto o análisis:

${conceptTitle ? `Concepto: "${conceptTitle}"` : ""}
${conceptDescription ? `Descripción del concepto: "${conceptDescription}"` : ""}
Mensaje o contexto a explicar: "${messageText}"

Idioma obligatorio: ${targetLang}. Si la consulta o contexto está en español, responde totalmente en Español. Si está en inglés, responde totalmente en Inglés.

Genera una respuesta didáctica estructurada con EXACTAMENTE los siguientes 3 puntos numerados:
1. ¿Qué significa en palabras sencillas? (Explicación clara y sin tecnicismos innecesarios en ${targetLang})
2. Ejemplo o analogía de la vida cotidiana (Una analogía práctica y visual para estudiantes en ${targetLang})
3. Próximo paso práctico recomendado (Una acción concreta que el usuario puede hacer hoy en ${targetLang})`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 500,
          },
        }),
      });
    } catch (fetchErr) {
      // Fallback 7 Replacement (network failure in tutor mode)
      handleGeminiException(fetchErr, "Error de red en modo tutor de Google Gemini.", "NETWORK_ERROR");
    }

    // Fallback 5 Replacement: Throw typed error on non-200 HTTP response
    if (!response.ok) {
      await handleGeminiResponseError(response);
    }

    try {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      // Fallback 6 Replacement: Throw typed error when text is empty
      const trimmedText = text?.trim();
      if (!trimmedText) {
        throw new GeminiError("Respuesta vacía de Google Gemini en modo tutor.", "EMPTY_RESPONSE", 200);
      }

      return trimmedText;
    } catch (parseErr) {
      // Fallback 7 Replacement (JSON parse failure in tutor mode)
      handleGeminiException(parseErr, "Fallo al procesar la respuesta de tutor con Gemini.", "GEMINI_TUTOR_ERROR");
    }
  },
};
