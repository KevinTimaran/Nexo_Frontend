/**
 * Native OpenAI Service for Nexo Desktop.
 * Communicates directly with the OpenAI Chat Completions API (v1).
 * Supports JSON Mode (response_format: { type: "json_object" }), gpt-4o-mini and gpt-4o,
 * Tutor didactic mode, and transparent error handling.
 * NO SILENT MOCK FALLBACKS: Failures surface structured typed errors.
 */
import type {
  AIResponse,
  ChatPhase,
  ConceptKind,
  ConceptNode,
  ConceptRelation,
  DiscoveryQuestion,
  NodeCategory,
  AICardType,
  NodePriority,
  ResearchPhase,
} from "../../domain/types";
import type { AIReplyRequest, AIService, AITutorRequest } from "../contracts";
import { getSystemInstruction, buildUserPrompt, detectMessageLanguage } from "../ai/prompts";
import { normalizeCategory } from "../../domain/constants";

export type { AICardType };

/* ---------------- Error Class Hierarchy ---------------- */

export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly code: string = "OPENAI_ERROR",
    public readonly status?: number
  ) {
    super(message);
    this.name = "OpenAIError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OpenAIKeyMissingError extends OpenAIError {
  constructor(
    message: string = "No se ha configurado ninguna clave API de OpenAI. Configura VITE_OPENAI_API_KEY en .env.local o accede a Ajustes."
  ) {
    super(message, "API_KEY_MISSING", 401);
    this.name = "OpenAIKeyMissingError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OpenAIQuotaError extends OpenAIError {
  constructor(
    message: string = "Límite de cuota excedido para OpenAI (HTTP 429). Revisa tu saldo o espera un momento antes de reintentar."
  ) {
    super(message, "PROVIDER_QUOTA_EXCEEDED", 429);
    this.name = "OpenAIQuotaError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OpenAINetworkError extends OpenAIError {
  constructor(
    detail?: string,
    message: string = detail || "Error de red al conectar con OpenAI. Revisa tu conexión a internet."
  ) {
    super(message, "NETWORK_ERROR", 0);
    this.name = "OpenAINetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/* ---------------- Configuration & Storage ---------------- */

export const STORAGE_KEY_OPENAI_KEY = "nexo.openai.key";
export const STORAGE_KEY_OPENAI_MODEL = "nexo.openai.model";
export const STORAGE_KEY_OPENAI_ENABLED = "nexo.openai.enabled";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_OPENAI_API_KEY =
  (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: { VITE_OPENAI_API_KEY?: string } })?.env?.VITE_OPENAI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.VITE_OPENAI_API_KEY) ||
  "";

let inMemoryKey: string | null = null;
let inMemoryModel: string | null = null;

const uid = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

/**
 * Returns the configured OpenAI API key with strict precedence:
 * 1. Checks user override in localStorage ("nexo.openai.key")
 * 2. Checks in-memory override (for testing and runtime config)
 * 3. Checks environment variable VITE_OPENAI_API_KEY (.env.local / import.meta.env / process.env)
 * 4. In browser/Tauri window runtime: falls back to DEFAULT_OPENAI_API_KEY
 * 5. In headless/node test runner: returns empty string if no key is configured.
 */
export function getOpenAIApiKey(): string {
  try {
    if (typeof localStorage !== "undefined") {
      const custom = localStorage.getItem(STORAGE_KEY_OPENAI_KEY);
      if (custom && custom.trim().length > 0) return custom.trim();
    }
  } catch {
    // Ignore storage issues
  }
  if (inMemoryKey && inMemoryKey.trim().length > 0) {
    return inMemoryKey.trim();
  }
  const envMeta = (import.meta as unknown as { env?: { VITE_OPENAI_API_KEY?: string } })?.env?.VITE_OPENAI_API_KEY;
  if (envMeta && envMeta.trim().length > 0) return envMeta.trim();

  if (typeof process !== "undefined" && process.env?.VITE_OPENAI_API_KEY) {
    const processKey = process.env.VITE_OPENAI_API_KEY;
    if (processKey && processKey.trim().length > 0) return processKey.trim();
  }

  // In browser/Tauri environment, ensure we always use the production OpenAI API key
  if (typeof window !== "undefined") {
    return DEFAULT_OPENAI_API_KEY;
  }

  return "";
}

/**
 * Returns the active OpenAI model (defaults to gpt-4o-mini).
 */
export function getOpenAIModel(): string {
  try {
    if (typeof localStorage !== "undefined") {
      const custom = localStorage.getItem(STORAGE_KEY_OPENAI_MODEL);
      if (custom && custom.trim().length > 0) return custom.trim();
    }
  } catch {
    // Ignore storage issues
  }
  if (inMemoryModel && inMemoryModel.trim().length > 0) {
    return inMemoryModel.trim();
  }
  const envModel = (import.meta as unknown as { env?: { VITE_OPENAI_MODEL?: string } })?.env?.VITE_OPENAI_MODEL;
  if (envModel && envModel.trim().length > 0) return envModel.trim();

  if (typeof process !== "undefined" && process.env?.VITE_OPENAI_MODEL) {
    const processModel = process.env.VITE_OPENAI_MODEL;
    if (processModel && processModel.trim().length > 0) return processModel.trim();
  }
  return DEFAULT_OPENAI_MODEL;
}

export function setOpenAIConfig(key?: string, model?: string): void {
  if (key !== undefined) {
    inMemoryKey = key.trim().length === 0 ? null : key.trim();
    try {
      if (typeof localStorage !== "undefined") {
        if (key.trim().length === 0) {
          localStorage.removeItem(STORAGE_KEY_OPENAI_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY_OPENAI_KEY, key.trim());
        }
      }
    } catch (err) {
      console.warn("No se pudo guardar la clave de OpenAI en localStorage:", err);
    }
  }
  if (model !== undefined) {
    inMemoryModel = model.trim().length === 0 ? null : model.trim();
    try {
      if (typeof localStorage !== "undefined") {
        if (model.trim().length === 0) {
          localStorage.removeItem(STORAGE_KEY_OPENAI_MODEL);
        } else {
          localStorage.setItem(STORAGE_KEY_OPENAI_MODEL, model.trim());
        }
      }
    } catch (err) {
      console.warn("No se pudo guardar el modelo de OpenAI en localStorage:", err);
    }
  }
}

export function isOpenAIConfigured(): boolean {
  return getOpenAIApiKey().length > 0;
}

export function isOpenAIEnabled(): boolean {
  try {
    if (typeof localStorage !== "undefined") {
      const val = localStorage.getItem(STORAGE_KEY_OPENAI_ENABLED);
      if (val === "false") return false;
      if (val === "true") return true;
    }
  } catch {
    // Default to true
  }
  return isOpenAIConfigured();
}

export function setOpenAIEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_OPENAI_ENABLED, enabled ? "true" : "false");
    }
  } catch {
    // Ignore storage issues
  }
}

export interface OpenAITestResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}

/**
 * Tests the OpenAI API connection with a minimal prompt.
 */
export async function testOpenAIConnection(key?: string, model?: string): Promise<OpenAITestResult> {
  const activeKey = key?.trim() || getOpenAIApiKey();
  const activeModel = model?.trim() || getOpenAIModel();

  if (!activeKey) {
    return {
      ok: false,
      latencyMs: 0,
      model: activeModel,
      error: "No se ha configurado ninguna clave API de OpenAI.",
    };
  }

  const start = performance.now();
  const url = "https://api.openai.com/v1/chat/completions";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeKey}`,
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [{ role: "user", content: "Responde únicamente: OK" }],
        max_tokens: 10,
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
      error: err instanceof Error ? err.message : "Error de conexión con OpenAI.",
    };
  }
}

/* ---------------- Internal Error Helpers ---------------- */

async function handleOpenAIResponseError(response: Response): Promise<never> {
  const status = response.status;
  let detailMessage = `Error en API de OpenAI (${status}): ${response.statusText}`;
  let detailCode = "OPENAI_HTTP_ERROR";

  try {
    const errorText = await response.text();
    if (errorText) {
      try {
        const json = JSON.parse(errorText);
        if (json?.error?.message) {
          detailMessage = json.error.message;
        }
        if (json?.error?.code) {
          detailCode = String(json.error.code);
        }
      } catch {
        detailMessage = `${detailMessage} - ${errorText.slice(0, 300)}`;
      }
    }
  } catch {
    // Keep default detailMessage
  }

  if (status === 429) {
    throw new OpenAIQuotaError(detailMessage);
  }
  if (status === 401 || status === 403) {
    throw new OpenAIError(detailMessage, "API_KEY_INVALID", status);
  }
  throw new OpenAIError(detailMessage, detailCode, status);
}

function handleOpenAIException(err: unknown, fallbackMessage: string, defaultCode: string): never {
  if (err instanceof OpenAIError) {
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
      throw new OpenAINetworkError(err.message);
    }
    throw new OpenAIError(err.message, defaultCode);
  }
  throw new OpenAIError(fallbackMessage, "UNKNOWN_ERROR");
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

interface OpenAIStructuredReply {
  action?: "chat" | "questionnaire" | "ready";
  message?: string;
  questions?: Array<{
    id?: string;
    question: string;
    options: string[];
    type?: "single" | "multiple";
    allowCustom?: boolean;
  }>;
  text?: string;
  simplifiedExplanation?: string;
  cardType?: AICardType;
  readyForStructuring?: boolean;
  discoveryQuestions?: DiscoveryQuestion[];
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

/* ---------------- OpenAI AI Service ---------------- */

export const openaiAiService: AIService = {
  async reply(request: AIReplyRequest): Promise<AIResponse> {
    const apiKey = getOpenAIApiKey();
    const model = getOpenAIModel();

    const { text, map, lang, replyTo, chatPhase } = request;
    const now = new Date().toISOString();

    const effectiveLang = detectMessageLanguage(text, lang);

    if (!apiKey) {
      throw new OpenAIKeyMissingError();
    }

    const activePhase: ChatPhase =
      chatPhase || (map.nodes.length > 0 ? "PHASE_3_EXPANSION" : "PHASE_1_DISCOVERY");

    const existingSummary = (map?.nodes || [])
      .map((n) => `- [${n.kind.toUpperCase()} | ${n.phase || "planning"} | ${n.category || "technical"}] ${n.title}: ${n.description}`)
      .join("\n");

    const systemInstruction = getSystemInstruction(activePhase, effectiveLang);
    const promptText = buildUserPrompt({
      phase: activePhase,
      lang: effectiveLang,
      existingNodesSummary: existingSummary,
      userMessage: text,
      messageHistory: request.messageHistory,
    });

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: `${systemInstruction}\n\nIMPORTANTE: Tu respuesta DEBE ser un objeto JSON estrictamente válido conforme a la especificación dada.`,
      },
    ];

    if (request.messageHistory && request.messageHistory.length > 0) {
      // Include up to 10 previous conversational turns to maintain deep ideation context
      const historySlice = request.messageHistory.slice(-10);
      for (const m of historySlice) {
        if (m.text && m.text.trim().length > 0) {
          messages.push({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          });
        }
      }
    }

    messages.push({
      role: "user",
      content: promptText,
    });

    const url = "https://api.openai.com/v1/chat/completions";

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });
    } catch (fetchErr) {
      handleOpenAIException(fetchErr, "Error de red al conectar con OpenAI.", "NETWORK_ERROR");
    }

    if (!response.ok) {
      await handleOpenAIResponseError(response);
    }

    try {
      const data = await response.json();
      const rawJson = data?.choices?.[0]?.message?.content;

      if (!rawJson) {
        throw new OpenAIError("Respuesta vacía o incompleta de OpenAI.", "EMPTY_RESPONSE", 200);
      }

      const parsed: OpenAIStructuredReply = JSON.parse(rawJson);

      const newNodes: ConceptNode[] = [];
      const newRelations: ConceptRelation[] = [];
      const isWarning = parsed.cardType === "warning";

      if (activePhase !== "PHASE_1_DISCOVERY" && !isWarning) {
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

        // Parse explicit relationships returned by OpenAI LLM
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

      const action = parsed.action;
      const effectiveText = parsed.message || parsed.text || "";
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

      const isReadyStructuring = isWarning
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
          simplifiedExplanation: parsed.simplifiedExplanation || (isReadyAction ? "Idea lista para estructuración." : ""),
          chatPhase: activePhase,
          action: action,
          readyForStructuring: isReadyStructuring,
          dimensions: (parsed as any).dimensions || (isReadyAction ? ["economic", "social", "technical", "legal"] : undefined),
          discoveryQuestions: mappedQuestions,
          insight:
            insightItems.length > 0
              ? {
                  title:
                    effectiveLang === "es"
                      ? "Estructura conceptual generada por OpenAI GPT"
                      : "Conceptual structure by OpenAI GPT",
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
      };
    } catch (parseErr) {
      handleOpenAIException(parseErr, "Error al procesar la respuesta de OpenAI.", "OPENAI_PARSE_ERROR");
    }
  },

  async explain(request: AITutorRequest): Promise<string> {
    const apiKey = getOpenAIApiKey();
    const model = getOpenAIModel();
    const { messageText, conceptTitle, conceptDescription, lang } = request;

    const effectiveLang = detectMessageLanguage(
      `${messageText} ${conceptTitle || ""}`,
      lang
    );

    if (!apiKey) {
      throw new OpenAIKeyMissingError();
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

    const url = "https://api.openai.com/v1/chat/completions";

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "Eres un profesor universitario y mentor de producto excepcionalmente pedagógico y claro.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.6,
          max_tokens: 600,
        }),
      });
    } catch (fetchErr) {
      handleOpenAIException(fetchErr, "Error de red en modo tutor de OpenAI.", "NETWORK_ERROR");
    }

    if (!response.ok) {
      await handleOpenAIResponseError(response);
    }

    try {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      const trimmedText = text?.trim();
      if (!trimmedText) {
        throw new OpenAIError("Respuesta vacía de OpenAI en modo tutor.", "EMPTY_RESPONSE", 200);
      }

      return trimmedText;
    } catch (parseErr) {
      handleOpenAIException(parseErr, "Fallo al procesar la respuesta de tutor con OpenAI.", "OPENAI_TUTOR_ERROR");
    }
  },
};
