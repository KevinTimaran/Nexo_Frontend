/**
 * Native Google Gemini Service for Nexo Desktop.
 * Communicates directly with Google Generative Language API (v1beta).
 * Supports JSON Schema outputs, Tutor didactic mode, and graceful fallback.
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
import { mockServices } from "../mock";
import { getSystemInstruction, buildUserPrompt } from "../ai/prompts";

export type { AICardType };

const STORAGE_KEY_GEMINI_KEY = "nexo.gemini.key";
const STORAGE_KEY_GEMINI_MODEL = "nexo.gemini.model";
const STORAGE_KEY_GEMINI_ENABLED = "nexo.gemini.enabled";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const uid = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

/**
 * Returns the configured Gemini API key:
 * 1. Checks user override in localStorage
 * 2. Checks environment variable VITE_GEMINI_API_KEY (.env.local)
 */
export function getGeminiApiKey(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);
    if (custom && custom.trim().length > 0) return custom.trim();
  } catch {
    // Ignore storage issues
  }
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  return envKey?.trim() || "";
}

/**
 * Returns the active Gemini model (defaults to gemini-2.5-flash).
 */
export function getGeminiModel(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
    if (custom && custom.trim().length > 0) return custom.trim();
  } catch {
    // Ignore storage issues
  }
  const envModel = (import.meta as unknown as { env?: { VITE_GEMINI_MODEL?: string } }).env?.VITE_GEMINI_MODEL;
  return envModel?.trim() || DEFAULT_GEMINI_MODEL;
}

export function setGeminiConfig(key?: string, model?: string): void {
  try {
    if (key !== undefined) {
      if (key.trim().length === 0) {
        localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY, key.trim());
      }
    }
    if (model !== undefined) {
      if (model.trim().length === 0) {
        localStorage.removeItem(STORAGE_KEY_GEMINI_MODEL);
      } else {
        localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model.trim());
      }
    }
  } catch (err) {
    console.warn("No se pudo guardar la configuración de Gemini:", err);
  }
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 0;
}

export function isGeminiEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_GEMINI_ENABLED);
    if (val === "false") return false;
  } catch {
    // Default to true
  }
  return isGeminiConfigured();
}

export function setGeminiEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_GEMINI_ENABLED, enabled ? "true" : "false");
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

/* ---------------- Helper layout positioning ---------------- */
const GAP_X = 340;
const GAP_Y = 170;

function calculateNextPosition(existingNodes: ConceptNode[]): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 80, y: 160 };
  }

  // Find right-most node
  let maxX = existingNodes[0].x;
  for (const n of existingNodes) {
    if (n.x > maxX) maxX = n.x;
  }

  // Anchor to the latest node
  const lastNode = existingNodes[existingNodes.length - 1];
  const targetX = maxX > 600 ? maxX : lastNode.x + GAP_X;

  // Find a free Y slot to avoid overlaps
  let targetY = lastNode.y;
  let guard = 0;
  while (existingNodes.some((n) => Math.abs(n.x - targetX) < 220 && Math.abs(n.y - targetY) < 130) && guard < 15) {
    targetY += GAP_Y;
    guard++;
  }

  return { x: targetX, y: targetY };
}

interface GeminiStructuredReply {
  text: string;
  simplifiedExplanation: string;
  cardType: AICardType;
  readyForStructuring?: boolean;
  discoveryQuestions?: DiscoveryQuestion[];
  nodes: Array<{
    title: string;
    description: string;
    kind: ConceptKind;
    category: NodeCategory;
    priority: NodePriority;
    phase: ResearchPhase;
    metadata: string;
    details: string;
  }>;
}

/**
 * Gemini AI Service implementation for Nexo Desktop.
 */
export const geminiAiService: AIService = {
  async reply(request: AIReplyRequest): Promise<AIResponse> {
    const apiKey = getGeminiApiKey();
    const model = getGeminiModel();

    // If Gemini is not configured, fall back directly to mock
    if (!apiKey) {
      console.info("Gemini API key no configurada, usando servicio simulado.");
      return mockServices.ai.reply(request);
    }

    const { text, map, lang, replyTo, chatPhase } = request;
    const now = new Date().toISOString();

    const activePhase: ChatPhase =
      chatPhase || (map.nodes.length > 0 ? "PHASE_3_EXPANSION" : "PHASE_1_DISCOVERY");

    const existingSummary = (map?.nodes || [])
      .map((n) => `- [${n.kind.toUpperCase()} | ${n.phase || "planning"} | ${n.category || "technical"}] ${n.title}: ${n.description}`)
      .join("\n");

    const systemInstruction = getSystemInstruction(activePhase, lang);
    const promptText = buildUserPrompt({
      phase: activePhase,
      lang,
      existingNodesSummary: existingSummary,
      userMessage: text,
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
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

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Error en API de Gemini (${response.status}):`, errorText);
        return mockServices.ai.reply(request);
      }

      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJson) {
        throw new Error("Respuesta vacía de Gemini");
      }

      const parsed: GeminiStructuredReply = JSON.parse(rawJson);

      // Map proposed nodes into domain ConceptNodes (enforcing phase rules)
      const newNodes: ConceptNode[] = [];
      const newRelations: ConceptRelation[] = [];

      const isWarning = parsed.cardType === "warning";

      // In Phase 1 Discovery or when warning guardrail triggers, NEVER add nodes to canvas
      if (activePhase !== "PHASE_1_DISCOVERY" && !isWarning) {
        let currentMapNodes = [...map.nodes];
        const anchorNode = map.nodes.find((n) => n.kind === "concept") ?? map.nodes[0];

        for (const rawNode of parsed.nodes || []) {
          const pos = calculateNextPosition(currentMapNodes);
          const node: ConceptNode = {
            id: uid("n"),
            kind: rawNode.kind || "concept",
            category: rawNode.category || "technical",
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
      }

      if (isWarning) {
        newNodes.length = 0;
        newRelations.length = 0;
      }

      const primaryNode = newNodes[0];

      const insightItems = [
        ...newNodes.map((n) => ({ nodeId: n.id, kind: n.kind, label: n.title })),
      ];

      return {
        message: {
          id: uid("m"),
          role: "assistant",
          createdAt: now,
          replyTo,
          cardType: parsed.cardType || "idea",
          text: parsed.text,
          simplifiedExplanation: parsed.simplifiedExplanation,
          chatPhase: activePhase,
          readyForStructuring: isWarning
            ? false
            : (parsed.readyForStructuring ?? (activePhase !== "PHASE_1_DISCOVERY")),
          discoveryQuestions: parsed.discoveryQuestions?.map((q, idx) => ({
            id: q.id || `q-${idx + 1}`,
            question: q.question,
            options: q.options || [],
          })),
          insight:
            insightItems.length > 0
              ? {
                  title:
                    lang === "es"
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
      };
    } catch (err) {
      console.error("Error al procesar respuesta con Gemini, utilizando respaldo simulado:", err);
      return mockServices.ai.reply(request);
    }
  },

  async explain(request: AITutorRequest): Promise<string> {
    const apiKey = getGeminiApiKey();
    const model = getGeminiModel();

    if (!apiKey) {
      return mockServices.ai.explain(request);
    }

    const { messageText, conceptTitle, conceptDescription, lang } = request;

    const isSpanishExplain = lang === "es" || /[áéíóúñ¿¡]|\b(el|la|los|las|un|una|de|en|que|es|por|para|con|no|si|como|explicar|concepto|que significa|ejemplo)\b/i.test(messageText + " " + (conceptTitle || ""));
    const targetLang = isSpanishExplain ? "Español" : "English";

    const prompt = `Actúa como un profesor universitario y mentor de producto excepcionalmente pedagógico y claro.
Tu misión es explicar en términos súper comprensibles el siguiente concepto o análisis:

${conceptTitle ? `Concepto: "${conceptTitle}"` : ""}
${conceptDescription ? `Descripción del concepto: "${conceptDescription}"` : ""}
Mensaje o contexto a explicar: "${messageText}"

Idioma obligatorio: ${targetLang}. Si la consulta está en español, responde totalmente en Español.

Genera una respuesta didáctica estructurada con EXACTAMENTE los siguientes 3 puntos numerados:
1. ¿Qué significa en palabras sencillas? (Explicación clara y sin tecnicismos innecesarios en ${targetLang})
2. Ejemplo o analogía de la vida cotidiana (Una analogía práctica y visual para estudiantes en ${targetLang})
3. Próximo paso práctico recomendado (Una acción concreta que el usuario puede hacer hoy en ${targetLang})`;


    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
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

      if (!response.ok) {
        return mockServices.ai.explain(request);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      return text?.trim() || mockServices.ai.explain(request);
    } catch (err) {
      console.warn("Fallo en modo tutor con Gemini, usando respaldo:", err);
      return mockServices.ai.explain(request);
    }
  },
};
