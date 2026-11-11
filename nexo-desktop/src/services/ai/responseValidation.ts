/**
 * Central, deterministic validation boundary for assistant responses.
 *
 * Every model/provider answer goes through `validateAssistantResponse` before it is rendered or
 * persisted. The checks never call another model: they compare the answer with what the active
 * project actually contains (name, description, user messages, grounded facts, existing nodes).
 *
 * - "fatal" issues mean the text itself cannot be trusted -> the caller retries once with a
 *   correction note and, if it still fails, shows a short honest error (never fabricated text).
 * - "dropped" issues mean only the optional UI block was unusable -> the block is removed and the
 *   conversational text is kept.
 */
import type {
  AssistantMessage,
  CognitiveInsightUIBlock,
  ConceptMap,
  DiscoveryState,
  GenerativeUIBlock,
  Language,
  Message,
} from "../../domain/types";
import { isGroundedProjectFact, validateCognitiveGrounding } from "./cognitiveAssistance";
import { detectMessageLanguage, isPlaceholderResponse } from "./prompts";
import { normalizeIntentText, type TurnIntent } from "./intent";

export type ValidationIssueCode =
  | "empty_or_placeholder"
  | "foreign_domain"
  | "internal_leak"
  | "unsupported_claim"
  | "language_mismatch"
  | "intent_misaligned_ui"
  | "ungrounded_card"
  | "duplicate_card"
  | "dismissed_card";

export interface ValidationIssue {
  code: ValidationIssueCode;
  detail: string;
}

export interface ValidationContext {
  projectName: string;
  projectDescription?: string;
  discovery?: DiscoveryState;
  map: ConceptMap;
  /** Messages of the ACTIVE project only, excluding the current user turn. */
  history: Message[];
  userText: string;
  intent: TurnIntent;
  lang: Language;
}

export interface ValidationResult {
  ok: boolean;
  fatal: ValidationIssue[];
  dropped: ValidationIssue[];
  message: AssistantMessage;
  /** Short, user-safe correction instructions for a retry. Empty when ok. */
  correctionNote: string;
}

/**
 * Vocabulary that only makes sense for specific kinds of projects. A term from a group may be used
 * in an answer only if the same group is already present in the project's own content.
 */
type Archetype = DiscoveryState["archetype"];
interface DomainGroup { id: string; label: string; pattern: RegExp; onlyFor?: Archetype[]; exceptFor?: Archetype[] }

const DOMAIN_GROUPS: readonly DomainGroup[] = [
  { id: "education", label: "estudiantes / vida académica", pattern: /\b(estudiantes?|students?|universitari[oa]s?|syllabus|asignaturas?|alumn[oa]s?|campus|semestre)\b/ },
  { id: "productivity", label: "calendarios / gestores de tareas", pattern: /\b(gestor(?:es)? de tareas|task managers?|to-?do lists?|lista de tareas|calendario academico|academic calendar)\b/ },
  { id: "hardware", label: "ferretería / materiales de reparación", pattern: /\b(ferreteria|hardware store|materiales de reparacion|home repairs?)\b/ },
  { id: "restaurant", label: "restaurante / comandas", pattern: /\b(comandas?|meseros?|camareros?|waiters?|menu del dia)\b/ },
  { id: "healthcare", label: "pacientes / clínica", pattern: /\b(pacientes?|patients?|clinica|hospital)\b/ },
  { id: "dating", label: "citas / matches", pattern: /\b(dating|citas romanticas|swipe|swiping|matches)\b/ },
  // Software vocabulary is an unsupported assumption for physical businesses and research projects.
  { id: "software", label: "supuestos de software", pattern: /\b(aplicacion movil|app movil|mobile app|backend|frontend|base de datos|database|api rest|android|ios)\b/, exceptFor: ["software", "general"] },
  // A research project must not be pushed into a business model.
  { id: "business_model", label: "modelo de negocio", pattern: /\b(modelo de negocio|business model|monetiza\w*|ingresos recurrentes|pricing)\b/, onlyFor: ["research"] },
];

const INTERNAL_LEAK = /\b(sourceMessageIds?|linkedFactIds?|linkedNodeIds?|memoryState|semanticKey|decisionEventId|memoria semantica|memoria confirmada|cognitive:[a-z0-9:_-]+|fact:[a-z0-9:_-]+|\[id=)/i;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const WHY_APPEARS_QUOTE = /\b(por qu[eé] aparece|why this appears)\b/i;

const UNSUPPORTED_CLAIM_PATTERNS: readonly RegExp[] = [
  /\b\d{1,3}(?:[.,]\d+)?\s?%/,
  /\b(estudios?|investigaciones|encuestas?)\s+(demuestran|muestran|indican|prueban|revelan)\b/i,
  /\b(studies|research|surveys?)\s+(show|shows|indicate|prove|reveal)\b/i,
  /\b(seg[uú]n|de acuerdo con)\s+(un|el|los|las|varios)\s+(estudio|informe|informes|estudios|encuesta|reporte)/i,
  /\baccording to (a|the|recent|several)\s+(study|studies|report|reports|survey|surveys)\b/i,
];

const flat = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flat).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(flat).join(" ");
  return String(value);
};

/** Everything that legitimately belongs to the active project. */
export function buildProjectCorpus(ctx: ValidationContext): string {
  const parts: string[] = [ctx.projectName, ctx.projectDescription ?? "", ctx.userText];
  for (const message of ctx.history) if (message.role === "user") parts.push(message.text);
  for (const fact of ctx.discovery?.facts ?? []) if (isGroundedProjectFact(fact)) parts.push(fact.value);
  for (const node of ctx.map.nodes) parts.push(node.title, node.description);
  return normalizeIntentText(parts.join(" "));
}

function foreignDomains(text: string, corpus: string, archetype?: Archetype): string[] {
  const value = normalizeIntentText(text);
  return DOMAIN_GROUPS
    .filter((group) => !(archetype && group.exceptFor?.includes(archetype)) && !(group.onlyFor && (!archetype || !group.onlyFor.includes(archetype))))
    .filter((group) => group.pattern.test(value) && !group.pattern.test(corpus))
    .map((group) => group.label);
}

function uiText(ui: GenerativeUIBlock): string {
  return flat(ui);
}

function uiKey(ui: GenerativeUIBlock): string {
  const value = ui as unknown as Record<string, unknown>;
  const identity = typeof value.id === "string" ? value.id : typeof value.title === "string" ? value.title : "primary";
  return `${ui.type}:${identity}`;
}

/** Strips quoted user text from a rationale so provenance never reads as conversational content. */
function quotesUserText(rationale: string, corpus: string): boolean {
  const quoted = rationale.match(/[«“"]([^»”"]{12,})[»”"]/g) ?? [];
  return quoted.some((quote) => corpus.includes(normalizeIntentText(quote.slice(1, -1))));
}

export function validateAssistantResponse(input: AssistantMessage, ctx: ValidationContext): ValidationResult {
  const message: AssistantMessage = { ...input };
  const fatal: ValidationIssue[] = [];
  const dropped: ValidationIssue[] = [];
  const corpus = buildProjectCorpus(ctx);

  // 1. Text integrity.
  if (isPlaceholderResponse(message.text)) {
    fatal.push({ code: "empty_or_placeholder", detail: "La respuesta está vacía o es texto de plantilla." });
  } else {
    const foreign = foreignDomains(`${message.text} ${message.simplifiedExplanation ?? ""}`, corpus, ctx.discovery?.archetype);
    if (foreign.length) fatal.push({ code: "foreign_domain", detail: `Menciona temas ajenos a este proyecto (${foreign.join(", ")}).` });
    if (INTERNAL_LEAK.test(message.text) || UUID.test(message.text) || WHY_APPEARS_QUOTE.test(message.text)) {
      fatal.push({ code: "internal_leak", detail: "Expone metadatos internos o procedencia en el texto." });
    }
    if (UNSUPPORTED_CLAIM_PATTERNS.some((pattern) => pattern.test(message.text)) && !UNSUPPORTED_CLAIM_PATTERNS.some((pattern) => pattern.test(ctx.userText))) {
      const hasEvidence = Boolean(ctx.discovery?.evidence?.length);
      if (!hasEvidence) fatal.push({ code: "unsupported_claim", detail: "Afirma cifras o estudios sin evidencia disponible." });
    }
    const userWords = ctx.userText.trim().split(/\s+/).length;
    if (userWords >= 4 && message.text.length >= 60) {
      const userLang = detectMessageLanguage(ctx.userText, ctx.lang);
      const answerLang = detectMessageLanguage(message.text, userLang);
      if (answerLang !== userLang) fatal.push({ code: "language_mismatch", detail: "Responde en un idioma distinto al del usuario." });
    }
  }

  // 2. Optional UI block: unusable blocks are dropped, never repaired with invented content.
  const ui = message.ui;
  if (ui) {
    const dropUi = (issue: ValidationIssue) => {
      dropped.push(issue);
      message.ui = undefined;
      message.assistanceMode = undefined;
    };
    const repeated = ctx.history.some((item) => item.role === "assistant" && item.ui && uiKey(item.ui) === uiKey(ui));
    const dismissed = ui.type === "cognitive_insight" && (ctx.discovery?.facts ?? []).some((fact) => fact.key === `cognitive:${ui.id}` && (fact.memoryState === "rejected" || fact.memoryState === "accepted"));
    if (ctx.intent === "define_idea" || ctx.intent === "close") {
      dropUi({ code: "intent_misaligned_ui", detail: "El usuario pidió ayuda para definir su idea; no corresponde una tarjeta." });
    } else if (repeated) {
      dropUi({ code: "duplicate_card", detail: "La tarjeta ya se mostró antes." });
    } else if (dismissed) {
      dropUi({ code: "dismissed_card", detail: "La tarjeta ya fue aceptada o descartada." });
    } else if (foreignDomains(uiText(ui), corpus, ctx.discovery?.archetype).length) {
      dropUi({ code: "foreign_domain", detail: "La tarjeta contiene temas ajenos al proyecto." });
    } else if (INTERNAL_LEAK.test(uiText(ui).replace(/linkedFactIds|linkedNodeIds/g, "")) && ui.type !== "cognitive_insight") {
      dropUi({ code: "internal_leak", detail: "La tarjeta expone metadatos internos." });
    } else if (ui.type === "cognitive_insight" && ctx.discovery) {
      const grounded = validateCognitiveGrounding(ui as CognitiveInsightUIBlock, ctx.discovery, ctx.map);
      if (!grounded) {
        dropUi({ code: "ungrounded_card", detail: "La tarjeta no está respaldada por hechos reales del proyecto." });
      } else {
        // Provenance stays in linkedFactIds; the visible rationale must not quote the user back.
        const rationale = quotesUserText(grounded.rationale, corpus) || WHY_APPEARS_QUOTE.test(grounded.rationale) || INTERNAL_LEAK.test(grounded.rationale) || UUID.test(grounded.rationale)
          ? ""
          : grounded.rationale;
        message.ui = { ...grounded, rationale };
      }
    }
  }

  // 3. Intent alignment of the discovery controls.
  if (ctx.intent === "close") {
    message.discoveryQuestions = [];
    message.dimensions = undefined;
  }
  if (ctx.intent === "define_idea") {
    message.action = "chat";
    message.readyForStructuring = false;
    message.discoveryQuestions = (message.discoveryQuestions ?? []).slice(0, 1);
    message.dimensions = undefined;
  }

  const correctionNote = fatal.length
    ? `Tu respuesta anterior se rechazó: ${fatal.map((issue) => issue.detail).join(" ")} Responde de nuevo únicamente sobre el proyecto «${ctx.projectName}» y lo que el usuario ha dicho en esta conversación, sin cifras ni estudios inventados, sin metadatos internos y en el idioma del usuario.`
    : "";

  return { ok: fatal.length === 0, fatal, dropped, message, correctionNote };
}

export class ResponseValidationError extends Error {
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super("assistant_response_rejected");
    this.name = "ResponseValidationError";
    this.issues = issues;
  }
}

/**
 * Runs the provider, validates, retries once with a correction note and otherwise throws a
 * ResponseValidationError. Nothing is ever substituted for a failed answer.
 */
export async function replyWithValidation<T extends { message: AssistantMessage }>(
  request: (correctionNote?: string) => Promise<T>,
  ctx: ValidationContext,
  maxRetries = 1,
): Promise<{ response: T; validation: ValidationResult }> {
  let note: string | undefined;
  let lastIssues: ValidationIssue[] = [];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await request(note);
    const validation = validateAssistantResponse(response.message, ctx);
    if (validation.ok) {
      response.message = validation.message;
      return { response, validation };
    }
    lastIssues = validation.fatal;
    note = validation.correctionNote;
  }
  throw new ResponseValidationError(lastIssues);
}

/**
 * User-facing rationale for a card. Returns "" (card shows no explanation) for empty text and for
 * legacy persisted rationales that merely quote the user back or expose internal metadata.
 * The stored data is left untouched, so provenance is never deleted.
 */
export function visibleRationale(rationale: string | undefined): string {
  const text = (rationale ?? "").trim();
  if (!text) return "";
  if (/^(has descrito|partiste de|mencionaste|esto parte directamente de|esta propuesta parte de|you said|you described)/i.test(text)) return "";
  if (WHY_APPEARS_QUOTE.test(text)) return "";
  if (/[«“"][^»”"]{8,}[»”"]/.test(text) || INTERNAL_LEAK.test(text) || UUID.test(text)) return "";
  return text;
}
