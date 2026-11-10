import type {
  CognitiveAssistanceMode,
  ConceptKind,
  ConceptNode,
  EvidenceValidationState,
  PerspectiveId,
  ProjectMemoryKind,
  RelationSemanticType,
  ValidationStatus,
} from "../domain/types";

export type SemanticIconName =
  | "accessibility"
  | "archive"
  | "badge-check"
  | "bot"
  | "building"
  | "check"
  | "circle-dot"
  | "circle-help"
  | "clock"
  | "compass"
  | "cpu"
  | "file-check"
  | "flask"
  | "gavel"
  | "graduation"
  | "heart-handshake"
  | "history"
  | "landmark"
  | "leaf"
  | "lightbulb"
  | "link"
  | "map"
  | "palette"
  | "scale"
  | "search"
  | "settings"
  | "shield"
  | "sparkles"
  | "split"
  | "store"
  | "target"
  | "triangle-alert"
  | "trending-up"
  | "upload"
  | "user"
  | "users"
  | "x-circle";

export interface SemanticVisualToken {
  id: string;
  label: string;
  shortLabel: string;
  icon: SemanticIconName;
  glyph: string;
  light: string;
  dark: string;
}

export interface PerspectiveVisualToken extends SemanticVisualToken {
  id: PerspectiveId | "general";
}

export type SemanticTypeId =
  | ConceptKind
  | ProjectMemoryKind
  | CognitiveAssistanceMode
  | "validation_result";

export interface SemanticTypeVisualToken extends SemanticVisualToken {
  id: SemanticTypeId;
  shape: "round" | "square" | "diamond" | "cut-corner";
}

export type SemanticStatusId =
  | "confirmed"
  | "proposed"
  | "hypothesis"
  | "unknown"
  | "rejected"
  | "validated"
  | "challenged"
  | "mixed"
  | "legacy_unknown";

export interface SemanticStatusVisualToken extends SemanticVisualToken {
  id: SemanticStatusId;
  borderStyle: "solid" | "dashed" | "dotted";
  opacity: number;
}

export type SemanticOriginId = "user" | "ai" | "accepted_ai" | "research" | "imported";

export interface SemanticOriginVisualToken {
  id: SemanticOriginId;
  label: string;
  shortLabel: string;
  icon: SemanticIconName;
}

export type RelationVisualFamily = "support" | "challenge" | "dependency" | "influence" | "neutral";

export interface RelationVisualToken extends SemanticVisualToken {
  id: RelationVisualFamily;
  lineStyle: "solid" | "dashed" | "dotted";
  directed: boolean;
}

const perspective = (
  id: PerspectiveVisualToken["id"],
  label: string,
  shortLabel: string,
  icon: SemanticIconName,
  glyph: string,
  light: string,
  dark: string,
): PerspectiveVisualToken => ({ id, label, shortLabel, icon, glyph, light, dark });

/**
 * Shared perspective registry for Concept Board, Neural 3D, chat and inspectors.
 * Accents are deliberately restrained; labels and icons always reinforce color.
 */
export const perspectiveVisuals: Record<PerspectiveId | "general", PerspectiveVisualToken> = {
  economic: perspective("economic", "Económica", "Economía", "trending-up", "↗", "#0F766E", "#5EEAD4"),
  human: perspective("human", "Social / humana", "Humana", "users", "◎", "#9A3412", "#FDBA74"),
  political: perspective("political", "Política", "Política", "landmark", "◆", "#1D4ED8", "#93C5FD"),
  legal: perspective("legal", "Legal", "Legal", "scale", "§", "#6D28D9", "#C4B5FD"),
  ethical: perspective("ethical", "Ética", "Ética", "heart-handshake", "◇", "#A21CAF", "#F0ABFC"),
  technical: perspective("technical", "Técnica", "Técnica", "cpu", "⌘", "#0369A1", "#7DD3FC"),
  geographic: perspective("geographic", "Geográfica", "Geografía", "map", "⌖", "#047857", "#6EE7B7"),
  environmental: perspective("environmental", "Ambiental", "Ambiente", "leaf", "♧", "#3F6212", "#BEF264"),
  historical: perspective("historical", "Histórica", "Historia", "history", "◷", "#92400E", "#FCD34D"),
  market: perspective("market", "Mercado", "Mercado", "store", "▤", "#C2410C", "#FDBA74"),
  cultural: perspective("cultural", "Cultural", "Cultura", "palette", "✦", "#BE185D", "#F9A8D4"),
  operational: perspective("operational", "Operacional", "Operación", "settings", "⚙", "#334155", "#CBD5E1"),
  educational: perspective("educational", "Educativa", "Educación", "graduation", "⌂", "#4338CA", "#A5B4FC"),
  institutional: perspective("institutional", "Institucional", "Institución", "building", "▥", "#475569", "#CBD5E1"),
  methodological: perspective("methodological", "Metodológica", "Método", "flask", "⚗", "#0F766E", "#99F6E4"),
  privacy: perspective("privacy", "Privacidad", "Privacidad", "shield", "◈", "#9F1239", "#FDA4AF"),
  accessibility: perspective("accessibility", "Accesibilidad", "Accesible", "accessibility", "◉", "#7E22CE", "#D8B4FE"),
  general: perspective("general", "General", "General", "compass", "●", "#9E2A2B", "#E5C158"),
};

const semanticType = (
  id: SemanticTypeId,
  label: string,
  shortLabel: string,
  icon: SemanticIconName,
  glyph: string,
  light: string,
  dark: string,
  shape: SemanticTypeVisualToken["shape"] = "round",
): SemanticTypeVisualToken => ({ id, label, shortLabel, icon, glyph, light, dark, shape });

export const semanticTypeVisuals: Record<SemanticTypeId, SemanticTypeVisualToken> = {
  concept: semanticType("concept", "Concepto", "Concepto", "lightbulb", "●", "#7C2D12", "#F5D98C"),
  viability: semanticType("viability", "Oportunidad / viabilidad", "Oportunidad", "target", "◎", "#047857", "#6EE7B7", "diamond"),
  risk: semanticType("risk", "Riesgo", "Riesgo", "triangle-alert", "▲", "#B91C1C", "#FCA5A5", "cut-corner"),
  user_fact: semanticType("user_fact", "Dato aportado", "Dato", "check", "✓", "#166534", "#86EFAC", "square"),
  suggestion: semanticType("suggestion", "Sugerencia", "Sugerencia", "sparkles", "✦", "#7C3AED", "#C4B5FD"),
  hypothesis: semanticType("hypothesis", "Hipótesis", "Hipótesis", "flask", "⚗", "#B45309", "#FCD34D", "diamond"),
  unknown: semanticType("unknown", "Dato por definir", "Por definir", "circle-help", "?", "#475569", "#CBD5E1", "square"),
  decision_candidate: semanticType("decision_candidate", "Decisión propuesta", "Propuesta", "gavel", "◇", "#9A3412", "#FDBA74", "diamond"),
  decision: semanticType("decision", "Decisión", "Decisión", "gavel", "◆", "#1D4ED8", "#93C5FD", "diamond"),
  evidence_placeholder: semanticType("evidence_placeholder", "Evidencia pendiente", "Sin evidencia", "search", "…", "#475569", "#CBD5E1", "square"),
  evidence: semanticType("evidence", "Evidencia", "Evidencia", "file-check", "▤", "#0369A1", "#7DD3FC", "square"),
  legacy_unknown: semanticType("legacy_unknown", "Dato heredado", "Heredado", "archive", "◌", "#57534E", "#A8A29E", "square"),
  explanation: semanticType("explanation", "Explicación", "Explicación", "circle-dot", "●", "#0369A1", "#7DD3FC"),
  blind_spot: semanticType("blind_spot", "Punto ciego", "Punto ciego", "circle-help", "?", "#7C2D12", "#FDBA74", "cut-corner"),
  solution: semanticType("solution", "Solución", "Solución", "lightbulb", "✦", "#047857", "#6EE7B7", "diamond"),
  opportunity: semanticType("opportunity", "Oportunidad", "Oportunidad", "trending-up", "↗", "#047857", "#6EE7B7", "diamond"),
  contradiction: semanticType("contradiction", "Contradicción", "Tensión", "split", "≠", "#B91C1C", "#FCA5A5", "cut-corner"),
  alternative: semanticType("alternative", "Alternativa", "Alternativa", "split", "↔", "#6D28D9", "#C4B5FD", "diamond"),
  validation_strategy: semanticType("validation_strategy", "Estrategia de validación", "Validación", "flask", "⚗", "#0F766E", "#99F6E4", "square"),
  comparison: semanticType("comparison", "Comparación", "Comparación", "split", "⇄", "#334155", "#CBD5E1", "square"),
  question: semanticType("question", "Pregunta clave", "Pregunta", "circle-help", "?", "#475569", "#CBD5E1", "square"),
  validation_result: semanticType("validation_result", "Resultado de validación", "Resultado", "badge-check", "✓", "#0F766E", "#99F6E4", "square"),
};

const status = (
  id: SemanticStatusId,
  label: string,
  shortLabel: string,
  icon: SemanticIconName,
  glyph: string,
  light: string,
  dark: string,
  borderStyle: SemanticStatusVisualToken["borderStyle"],
  opacity = 1,
): SemanticStatusVisualToken => ({ id, label, shortLabel, icon, glyph, light, dark, borderStyle, opacity });

export const semanticStatusVisuals: Record<SemanticStatusId, SemanticStatusVisualToken> = {
  confirmed: status("confirmed", "Confirmado", "Confirmado", "check", "✓", "#166534", "#86EFAC", "solid"),
  proposed: status("proposed", "Propuesto", "Propuesto", "clock", "◷", "#9A3412", "#FDBA74", "dashed"),
  hypothesis: status("hypothesis", "Hipótesis sin confirmar", "Hipótesis", "flask", "⚗", "#B45309", "#FCD34D", "dashed"),
  unknown: status("unknown", "Desconocido", "Desconocido", "circle-help", "?", "#475569", "#CBD5E1", "dotted"),
  rejected: status("rejected", "Rechazado", "Rechazado", "x-circle", "×", "#7F1D1D", "#FDA4AF", "dashed", 0.58),
  validated: status("validated", "Validado con evidencia", "Validado", "badge-check", "✓", "#0F766E", "#99F6E4", "solid"),
  challenged: status("challenged", "Desafiado por evidencia", "Desafiado", "triangle-alert", "!", "#B91C1C", "#FCA5A5", "dashed"),
  mixed: status("mixed", "Evidencia mixta", "Mixto", "split", "±", "#7C3AED", "#C4B5FD", "dashed"),
  legacy_unknown: status("legacy_unknown", "Estado heredado desconocido", "Heredado", "archive", "◌", "#57534E", "#A8A29E", "dotted"),
};

export const semanticOriginVisuals: Record<SemanticOriginId, SemanticOriginVisualToken> = {
  user: { id: "user", label: "Creado por la persona usuaria", shortLabel: "Tú", icon: "user" },
  ai: { id: "ai", label: "Sugerido por Nexo", shortLabel: "IA", icon: "bot" },
  accepted_ai: { id: "accepted_ai", label: "Sugerencia de IA aceptada", shortLabel: "IA aceptada", icon: "badge-check" },
  research: { id: "research", label: "Investigación externa", shortLabel: "Fuente externa", icon: "search" },
  imported: { id: "imported", label: "Dato importado o heredado", shortLabel: "Importado", icon: "upload" },
};

const relation = (
  id: RelationVisualFamily,
  label: string,
  icon: SemanticIconName,
  glyph: string,
  light: string,
  dark: string,
  lineStyle: RelationVisualToken["lineStyle"],
  directed: boolean,
): RelationVisualToken => ({ id, label, shortLabel: label, icon, glyph, light, dark, lineStyle, directed });

export const relationVisuals: Record<RelationVisualFamily, RelationVisualToken> = {
  support: relation("support", "Respalda / valida", "check", "+", "#166534", "#86EFAC", "solid", true),
  challenge: relation("challenge", "Desafía / amenaza", "triangle-alert", "!", "#B91C1C", "#FCA5A5", "dashed", true),
  dependency: relation("dependency", "Depende / requiere", "link", "→", "#6D28D9", "#C4B5FD", "dashed", true),
  influence: relation("influence", "Afecta / habilita", "trending-up", "↗", "#0369A1", "#7DD3FC", "solid", true),
  neutral: relation("neutral", "Relacionado / contexto", "link", "—", "#57534E", "#A8A29E", "dotted", false),
};

export interface SemanticNodeInput {
  kind?: ConceptKind;
  semanticKind?: ProjectMemoryKind;
  cognitiveMode?: CognitiveAssistanceMode;
  perspectiveId?: PerspectiveId;
  category?: string;
  group?: string;
  semanticState?: ConceptNode["semanticState"];
  verification?: ConceptNode["verification"];
  status?: ConceptNode["status"];
  origin?: ConceptNode["origin"];
  provenanceOrigin?: ConceptNode["provenanceOrigin"];
  evidenceValidationState?: EvidenceValidationState;
  contextValidationStatus?: ValidationStatus;
}

const CATEGORY_TO_PERSPECTIVE: Record<string, PerspectiveId> = {
  economic: "economic",
  legal: "legal",
  political: "political",
  technical: "technical",
  social: "human",
  human: "human",
};

export function resolvePerspectiveVisual(input?: SemanticNodeInput | null): PerspectiveVisualToken {
  const direct = input?.perspectiveId;
  if (direct && perspectiveVisuals[direct]) return perspectiveVisuals[direct];
  const raw = input?.category ?? input?.group;
  const mapped = raw ? CATEGORY_TO_PERSPECTIVE[String(raw).toLowerCase()] : undefined;
  return mapped ? perspectiveVisuals[mapped] : perspectiveVisuals.general;
}

export function resolveSemanticTypeVisual(input?: SemanticNodeInput | null): SemanticTypeVisualToken {
  if (input?.contextValidationStatus) return semanticTypeVisuals.validation_result;
  if (input?.cognitiveMode && semanticTypeVisuals[input.cognitiveMode]) return semanticTypeVisuals[input.cognitiveMode];
  if (input?.semanticKind && semanticTypeVisuals[input.semanticKind]) return semanticTypeVisuals[input.semanticKind];
  if (input?.kind && semanticTypeVisuals[input.kind]) return semanticTypeVisuals[input.kind];
  return semanticTypeVisuals.legacy_unknown;
}

export function statusFromEvidence(state: EvidenceValidationState): SemanticStatusId {
  if (state === "supports") return "validated";
  if (state === "challenges") return "challenged";
  if (state === "mixed") return "mixed";
  return "unknown";
}

export function statusFromValidation(state: ValidationStatus): SemanticStatusId {
  if (state === "supported") return "validated";
  if (state === "challenged") return "challenged";
  if (state === "mixed" || state === "partially_supported") return "mixed";
  return "unknown";
}

export function resolveSemanticStatusVisual(
  input?: SemanticNodeInput | null,
  explicitStatus?: SemanticStatusId,
): SemanticStatusVisualToken {
  if (explicitStatus) return semanticStatusVisuals[explicitStatus] ?? semanticStatusVisuals.legacy_unknown;
  if (input?.contextValidationStatus) return semanticStatusVisuals[statusFromValidation(input.contextValidationStatus)];
  if (input?.evidenceValidationState) return semanticStatusVisuals[statusFromEvidence(input.evidenceValidationState)];
  if (input?.semanticState === "rejected") return semanticStatusVisuals.rejected;
  if (input?.semanticKind === "legacy_unknown" || input?.semanticState === "legacy_unknown") return semanticStatusVisuals.legacy_unknown;
  if (input?.semanticKind === "unknown" || input?.semanticState === "unknown" || input?.verification === "unknown") return semanticStatusVisuals.unknown;
  if (input?.semanticKind === "hypothesis" && input?.semanticState !== "confirmed") return semanticStatusVisuals.hypothesis;
  if (input?.verification === "confirmed" || input?.semanticState === "confirmed" || input?.status === "confirmed") return semanticStatusVisuals.confirmed;
  return semanticStatusVisuals.proposed;
}

export function resolveSemanticOriginVisual(input?: SemanticNodeInput | null): SemanticOriginVisualToken {
  if (input?.provenanceOrigin === "research_evidence") return semanticOriginVisuals.research;
  if (input?.provenanceOrigin === "user_message" || input?.provenanceOrigin === "questionnaire_answer" || input?.provenanceOrigin === "decision_event" || input?.origin === "user") return semanticOriginVisuals.user;
  if (input?.provenanceOrigin === "accepted_suggestion" || input?.origin === "approved") return semanticOriginVisuals.accepted_ai;
  if (input?.provenanceOrigin === "ai_suggestion" || input?.origin === "ai_initial" || input?.origin === "ai_expansion") return semanticOriginVisuals.ai;
  return semanticOriginVisuals.imported;
}

export function resolveRelationVisual(type?: RelationSemanticType | string | null): RelationVisualToken {
  switch (type) {
    case "supports":
    case "validates":
    case "solves":
      return relationVisuals.support;
    case "contradicts":
    case "threatens":
      return relationVisuals.challenge;
    case "depends_on":
    case "requires":
      return relationVisuals.dependency;
    case "affects":
    case "impacts":
    case "enables":
    case "regulates":
    case "funds":
      return relationVisuals.influence;
    default:
      return relationVisuals.neutral;
  }
}

export function semanticColor(token: Pick<SemanticVisualToken, "light" | "dark">, isDark: boolean): string {
  return isDark ? token.dark : token.light;
}

export function semanticNodeVisuals(input?: SemanticNodeInput | null) {
  return {
    type: resolveSemanticTypeVisual(input),
    perspective: resolvePerspectiveVisual(input),
    status: resolveSemanticStatusVisual(input),
    origin: resolveSemanticOriginVisual(input),
  };
}

export const supportedPerspectiveIds = Object.keys(perspectiveVisuals).filter((id) => id !== "general") as PerspectiveId[];
export const supportedSemanticTypeIds = Object.keys(semanticTypeVisuals) as SemanticTypeId[];
export const supportedSemanticStatusIds = Object.keys(semanticStatusVisuals) as SemanticStatusId[];
