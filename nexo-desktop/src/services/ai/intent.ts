/**
 * Deterministic, language-aware (es/en) detection of what the user is asking for in a turn.
 * Kept free of project state so it can be reused by discovery, orchestration and validation.
 */

export type TurnIntent = "define_idea" | "close" | "statement" | "other";

export const normalizeIntentText = (value: string): string =>
  value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9?¿' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The user asks for help to clarify / define their idea or admits it is not clear yet. */
const DEFINE_IDEA_PATTERNS: readonly RegExp[] = [
  /\bayud\w*\b.{0,24}\b(defin\w*|aclarar|clarificar|concretar|aterrizar|plantear|estructurar|pensar|desarrollar)\b/,
  /\b(no|aun no|todavia no)\b.{0,16}\b(esta|tengo|es|lo tengo|la tengo)\b.{0,12}\bclar[oa]\b/,
  /\bno (estoy|ando) segur[oa]\b/,
  /\bno se (muy bien |bien )?(como|por donde|que) (defin\w*|empezar|plantear|concretar|enfocar)\b/,
  /\b(idea|proyecto)\b.{0,24}\b(difus[oa]|confus[oa]|vaga|poco clar[oa]|no esta clar[oa])\b/,
  /\bhelp me\b.{0,20}\b(define|defining|clarify|clarifying|figure|shape|shaping|refine|refining|think|flesh)\b/,
  /\b(help|need help|would like help|want help)\b.{0,24}\b(defin\w*|clarif\w*|refin\w*|shap\w*)\b/,
  /\b(not|isn't|isnt|aren't|arent)\b (very |yet |quite |really |too |that |so )*clear\b/,
  /\bnot (very |really |quite )?(sure|certain)\b.{0,24}\b(how|what|where|which)\b/,
  /\bi (do not|don't|dont) know (how|where|what) to (start|begin|define|describe)\b/,
];

/** The user commits to building something concrete (as opposed to only asking for help). */
const EXPLICIT_INTENT = /\b(quiero|voy a|necesito|me gustaria|pienso|planeo|i want to|i would like to|i'd like to|i'm going to|im going to|i plan to|planning to|i need to)\s+(crear|hacer|abrir|montar|desarrollar|investigar|lanzar|construir|disenar|escribir|build|create|open|make|start|launch|develop|write|design|research)\b/;

/** The user says the idea is defined enough and asks to move on / structure it. */
const CLOSE_PATTERNS: readonly RegExp[] = [
  /\b(estructurame|estructura(?:me)? esto|estructuralo|organizame esto)\b/,
  /\bpasemos? a lo siguiente\b|\bpasemos? al siguiente\b|\bpasemos? al tablero\b/,
  /\bya (?:esta|estamos|tenemos|queda|quedo)\b.{0,16}\b(?:bien|listo|lista|basico|basica|definid[oa]|claro|clara)\b/,
  /\bya no (?:quiero|voy a|necesito) (?:agregar|anadir|incluir|mas)\b/,
  /\b(?:que sigue|cual es el siguiente paso|que viene ahora|que hacemos ahora)\b/,
  /\bgenera(?:me)? (?:el|la|mi) (?:tablero|mapa|arquitectura|proyecto)\b/,
  /\b(?:eso es todo|es todo por ahora|con eso basta|con eso es suficiente)\b/,
  /\b(?:structure this|let'?s move on|move on to the next|that'?s (?:enough|all)|it'?s good enough|we have the basics|what'?s next|what next|generate the (?:board|map|architecture)|i'?m done adding)\b/,
];

export function isCloseRequest(text: string): boolean {
  const value = normalizeIntentText(text);
  return Boolean(value) && CLOSE_PATTERNS.some((pattern) => pattern.test(value));
}

export function isDefineIdeaRequest(text: string): boolean {
  const value = normalizeIntentText(text);
  if (!value) return false;
  return DEFINE_IDEA_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * A "pure" meta request asks for help but does not state project content, so it
 * must never be stored as the project's intent/problem/detail fact.
 */
export function isPureMetaRequest(text: string, hasPriorIntent: boolean): boolean {
  if (!isDefineIdeaRequest(text)) return false;
  if (hasPriorIntent) return true;
  return !EXPLICIT_INTENT.test(normalizeIntentText(text));
}

export function classifyTurnIntent(text: string, hasPriorIntent = true): TurnIntent {
  if (isPureMetaRequest(text, hasPriorIntent)) return "define_idea";
  // Closing only makes sense once there is an idea to structure.
  if (hasPriorIntent && isCloseRequest(text)) return "close";
  return "other";
}
