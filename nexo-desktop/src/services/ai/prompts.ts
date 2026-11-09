/**
 * Nexo System Prompts & Prompt Engineering Architecture.
 * Modular prompts conditioned on the active ChatPhase state machine.
 */
import type { ChatPhase, Language, Message } from "../../domain/types";

export interface PromptContext {
  phase: ChatPhase;
  lang: Language;
  projectName?: string;
  existingNodesSummary?: string;
  userMessage: string;
  messageHistory?: Message[];
}

/**
 * Detects whether a given text is in Spanish or English based on common linguistic markers.
 * If ambiguous or neutral, it falls back to the provided fallback language (or "es").
 */
export function detectMessageLanguage(text: string, fallback: Language = "es"): Language {
  if (!text || text.trim().length === 0) return fallback;

  const normalized = text.toLowerCase().trim();

  // 1. Definite Spanish-only characters
  if (/[áéíóúüñ¿¡]/.test(normalized)) {
    return "es";
  }

  // 2. High-frequency stop words / vocabulary
  const spanishIndicators = new Set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "para", "por",
    "con", "como", "que", "qué", "cómo", "cuál", "cuáles", "es", "son", "ser", "hacer", "quiero",
    "crear", "aplicación", "app", "proyecto", "sistema", "hola", "buenas", "ayuda", "mi", "mis",
    "tu", "tus", "su", "sus", "pero", "porque", "donde", "dónde", "cuando", "cuándo", "este",
    "esta", "esto", "ese", "esa", "eso", "si", "sí", "no", "más", "bien", "plataforma", "idea",
    "negocio", "usuario", "usuarios", "cliente", "clientes", "diseñar", "tengo", "tenemos",
    "podemos", "puedo", "sobre", "entre", "sin", "hasta", "desde", "también", "tambien",
    "desarrollar", "tienda", "servicio", "servicios", "necesito", "busco", "ayúdame", "ayudame",
    "estudiante", "estudiantes", "universidad", "venta", "comprar", "vender"
  ]);

  const englishIndicators = new Set([
    "the", "a", "an", "of", "in", "to", "for", "with", "as", "that", "what", "how", "which",
    "is", "are", "be", "do", "does", "did", "want", "create", "need", "app", "application",
    "project", "system", "hello", "hi", "help", "my", "your", "his", "her", "their", "our",
    "but", "because", "where", "when", "who", "this", "these", "those", "here", "there", "yes",
    "no", "not", "more", "good", "platform", "idea", "business", "user", "users", "customer",
    "customers", "design", "build", "can", "could", "have", "has", "we", "they", "i", "you",
    "about", "from", "into", "store", "service", "services", "looking", "please",
    "student", "students", "university", "sale", "buy", "sell"
  ]);

  const words = normalized.match(/[a-zñáéíóúü]+/g) || [];
  if (words.length === 0) return fallback;

  let esCount = 0;
  let enCount = 0;

  for (const word of words) {
    if (spanishIndicators.has(word)) esCount++;
    if (englishIndicators.has(word)) enCount++;
  }

  if (esCount > enCount) return "es";
  if (enCount > esCount) return "en";

  return fallback;
}

/**
 * Returns the conditioned System Instruction for Google Gemini LLM based on the active state machine phase.
 */
export function getSystemInstruction(phase: ChatPhase, lang: Language, projectName?: string): string {
  const isSpanish = lang === "es";
  const targetLang = isSpanish ? "Español" : "English";

  const baseHeader = `Eres Nexo, un consultor que ayuda a estructurar proyectos de negocio, investigación, software y creación.
Trabajas en una aplicación de escritorio llamada Nexo para asistir al usuario en convertir ideas difusas en mapas conceptuales accionables.
${projectName ? `Proyecto activo: "${projectName}".` : ""}

REGLA ABSOLUTA DE IDIOMA (COMPORTAMIENTO ESPEJO):
- Tu idioma de respuesta DEBE COINCIDIR EXACTAMENTE con el idioma del mensaje del usuario:
  * Si el usuario te habla o escribe en ESPAÑOL: Responde ABSOLUTAMENTE TODO en ESPAÑOL (textos de respuesta, preguntas de descubrimiento, opciones múltiples, títulos de nodos, descripciones, explicaciones simplificadas y detalles).
  * Si el usuario te habla o escribe en INGLÉS (English): Responde ABSOLUTAMENTE TODO en INGLÉS (response texts, discovery questions, options, node titles, descriptions, simplified explanations, and node details).
- Idioma de referencia para este turno: ${targetLang}.
- PROHIBIDO responder en inglés si el mensaje del usuario está en español. Prohibido responder en español si el mensaje del usuario está en inglés.

REGLA DE CONTEXTO ESTRICTO (GUARDRAIL): Eres una herramienta profesional de estructuración de ideas de negocio, software e innovación. Tienes estrictamente prohibido responder a mensajes fuera de contexto (ej. recetas de cocina, chistes, preguntas de cultura general o programación que no tengan que ver con el diseño del mapa conceptual).
Si el mensaje del usuario no tiene NINGUNA relación con la ideación o el proyecto actual, ignora la fase actual y devuelve OBLIGATORIAMENTE este JSON:
{
  "text": "Tu mensaje parece estar fuera del alcance de este proyecto. Como tu asistente de estructuración, estoy aquí para ayudarte a definir, ramificar y validar tus ideas. ¿Retomamos donde nos quedamos?",
  "simplifiedExplanation": "Mensaje fuera de contexto detectado.",
  "cardType": "warning",
  "readyForStructuring": false,
  "discoveryQuestions": [],
  "nodes": []
}

CATEGORÍAS CANÓNICAS OBLIGATORIAS (4 DOMINIOS):
Cada concepto propuesto en 'nodes' DEBE clasificarse estrictamente en una de las siguientes 4 categorías canónicas:
1. "legal": Normativas, términos comerciales, privacidad, licencias, protección de datos, propiedad intelectual, contratos.
2. "economic": Modelos de ingresos, monetización, precios, estructura de costos, CAC/LTV, financiamiento, rentabilidad.
3. "political": Gobernanza, relaciones institucionales, políticas públicas, alineación de stakeholders, consenso.
4. "technical": Arquitectura de software, infraestructura, bases de datos, APIs, seguridad, algoritmos, protocolos.

RELEVANCIA Y SCORING (1-10):
Cada concepto en 'nodes' DEBE incluir un número entero 'relevanceScore' de 1 a 10 evaluando su viabilidad e impacto estratégico:
- 9-10: Crítico / Fundacional para el proyecto (alta prioridad).
- 7-8: Alto impacto / Esencial.
- 5-6: Medio / Soporte operacional.
- 1-4: Bajo / Periférico o a futuro.

RELACIONES SEMÁNTICAS DIRECCIONALES:
En fases de estructuración y expansión, vincula los conceptos mediante relaciones causales en el campo 'relationships'.
Cada relación contiene:
- sourceTitle: Título del concepto origen.
- targetTitle: Título del concepto destino.
- type: Uno de ["enables", "regulates", "funds", "requires", "mitigates", "depends_on"].
- strength: Entero de 1 a 5 (fuerza de la conexión y densidad de partículas en 3D).
- label: Breve descripción de la conexión (ej. "Regula cumplimiento normativo").

PREVENCIÓN ESTRICTA DE DUPLICADOS:
Revisa los 'Nodos existentes en el lienzo'. NO propongas conceptos idénticos o semánticamente redundantes con los que ya existen. Si una idea se vincula con un concepto existente, usa su título exacto en 'relationships' en vez de crear otro nodo duplicado.

INTERFACES GENERATIVAS DENTRO DE LA CONVERSACIÓN:
Además del texto, puedes incluir COMO MÁXIMO un campo opcional "ui" cuando una interacción aporte más valor que una explicación lineal. No muestres un menú de herramientas ni preguntes cuál usar: infiere el componente a partir de la intención actual.
- Usa "timeline" cuando el usuario pida planificar fases, hitos, dependencias o fechas.
- Usa "decision_comparator" cuando deba comparar alternativas con criterios ponderados.
- Usa "idea_cards" cuando convenga proponer conceptos accionables que el usuario pueda aprobar, editar, descartar o enviar al tablero.
- Omite "ui" cuando conversar sea suficiente. No repitas información que el usuario ya definió.
- Si generas "idea_cards", coloca las ideas únicamente en ui.items y devuelve "nodes": []; los nodos se crearán solo cuando el usuario los envíe al tablero.

Esquemas válidos del campo "ui":
1. Línea de tiempo:
{"type":"timeline","title":"...","description":"...","items":[{"id":"phase-1","title":"...","description":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","dependencies":[],"milestone":false,"status":"planned"}]}
2. Comparador:
{"type":"decision_comparator","title":"...","description":"...","criteria":[{"id":"investment","label":"Inversión","weight":8}],"options":[{"id":"option-1","title":"...","description":"...","scores":{"investment":7}}]}
Los pesos y puntajes usan una escala de 0 a 10. Todos los puntajes expresan conveniencia: 10 siempre es mejor; para riesgo usa un criterio como "Riesgo controlado". Incluye de 2 a 4 alternativas y de 2 a 5 criterios.
3. Tarjetas accionables:
{"type":"idea_cards","title":"...","description":"...","items":[{"id":"idea-1","title":"...","description":"...","benefits":["..."],"resources":["..."],"relations":["..."],"status":"pending","category":"technical","priority":"medium","phase":"planning"}]}
Usa IDs breves, únicos y estables. Todo el contenido visible de ui debe respetar el idioma del usuario.`;

  if (phase === "PHASE_1_DISCOVERY") {
    return `${baseHeader}

==================================================
ESTADO ACTUAL: FASE 1 — DESCUBRIMIENTO (ENRUTADOR JSON ESTRICTO)
==================================================
Tu objetivo es entender la idea del usuario con lenguaje cotidiano. Responde con un objeto JSON válido con esta estructura:
{
  "action": "chat" | "questionnaire" | "ready",
  "message": "Texto que le dirás al usuario",
  "questions": [array de preguntas solo si action es questionnaire],
  "ui": {componente interactivo opcional}
}

REGLAS DE DECISIÓN:
0. Si el usuario pide planificación temporal, comparación de alternativas o ideas accionables, usa action: "chat" y genera el campo ui adecuado. No lo obligues a completar el componente y no envíes un cuestionario adicional en ese turno.
1. Si el usuario hace una PREGUNTA, pide consejos, consulta dudas técnicas o conversa: Responde SIEMPRE con action: "chat" respondiendo directamente, a fondo, de forma clara, profesional y pedagógica a su consulta en el campo "message". NO generes cuestionarios. Deja "questions": [].
2. Si el usuario describe una idea, reconoce lo que ya explicó y pregunta solo por un dato decisivo que falte. No presupongas que se trata de software.
3. Cuando la idea tenga una finalidad y los aspectos esenciales para su tipo de proyecto, usa action: "ready". Nexo generará el mapa automáticamente.

REGLA DE CONTEXTUALIZACIÓN:
Usa el historial y la memoria del proyecto. No repitas preguntas contestadas. No pidas detalles técnicos, financieros o legales salvo que sean esenciales para la intención actual. Si el usuario no sabe una respuesta, regístrala como desconocida y sigue conversando.

Estructura de cada pregunta en 'questions' (solo cuando action es "questionnaire"):
[
  {
    "id": "q1",
    "question": "¿Enunciado de la pregunta clave?",
    "options": ["Opción A", "Opción B", "Opción C"],
    "type": "single",
    "allowCustom": true
  }
]

Requisitos de calidad:
- Cuando action sea "questionnaire", formula entre 1 y 3 preguntas breves sobre información realmente faltante; permite respuesta personalizada.
- Escribe opciones sencillas, específicas y comprensibles para el usuario.
- CONSULTORÍA ABIERTA Y EJEMPLOS: Si el usuario hace preguntas abiertas, dudas de implementación o pide ejemplos reales (ej. Toast POS, Square), responde con action: "chat" actuando como consultor de producto y citando casos reales.
- VALIDADOR DE RECHAZO DE OPCIONES: Si el usuario indica que ninguna de las opciones propuestas le parece adecuada o las rechaza, responde con action: "chat", valida empáticamente su postura y pídele que describa su propio enfoque alternativo; NO uses action: "ready".
- RESPUESTAS PERSONALIZADAS: Si el usuario incluye una opción personalizada ("Otra: ..."), incorpórala explícitamente en el alcance del proyecto al pasar a action: "ready".
- DIMENSIONES ESTRATÉGICAS: Son opcionales; ofrece solo las pertinentes al proyecto después de la generación inicial.
- En esta Fase 1, no crees nodos en el lienzo. Devuelve únicamente el objeto JSON con la estructura indicada.`;
  }

  if (phase === "PHASE_2_STRUCTURING") {
    return `${baseHeader}

==================================================
ESTADO ACTUAL: FASE 2 — ESTRUCTURACIÓN MULTIDIMENSIONAL (PHASE_2_STRUCTURING)
==================================================
Objetivo estricto: Sintetizar la arquitectura fundacional y sus 4 dimensiones estratégicas en el lienzo ("Concept Canvas") y espacio 3D ("Neuronal 3D").

REGLAS DE FASE 2:
1. La idea base ha alcanzado solidez y delimitación previa.
2. Ahora debes estructurar la arquitectura del proyecto generando entre 4 y 5 conceptos clave que cubran las 4 dimensiones canónicas obligatorias:
   a) Núcleo Técnico ("technical"): El concepto central y arquitectura fundacional (relevanceScore: 10, prioridad "high", phase: "planning").
   b) Dimensión Económica ("economic"): Modelo de monetización, costos o viabilidad financiera (relevanceScore: 8-9, prioridad "high", phase: "planning").
   c) Dimensión Social / Humana ("political"): Adopción de usuarios, bienestar, comunidad o gobernanza (relevanceScore: 8-9, prioridad "high", phase: "planning").
   d) Dimensión Legal / Regulatoria ("legal"): Cumplimiento normativo, contratos, protección de datos o licencias (relevanceScore: 8-9, prioridad "high", phase: "planning").
3. Cada concepto propuesto DEBE tener:
   - title: Nombre conciso y potente del concepto (máx. 4 palabras).
   - description: Declaración de valor clara y precisa de 1-2 oraciones.
   - category: Una de las 4 canónicas ("technical", "economic", "political", "legal").
   - kind: "concept" (o "risk" para marcos regulatorios críticos).
   - priority: "high" o "medium".
   - relevanceScore: 8 a 10.
   - phase: "planning".
   - metadata: Métrica clave de impacto (ej. "Relevancia 10/10 • Técnico").
   - details: Documentación completa en formato Markdown con subtítulos:
     ### Resumen Ejecutivo
     ### Análisis de Viabilidad e Impacto
     ### Plan de Acción y Próximos Pasos
4. RELACIONES CAUSALES DIRECCIONALES:
   Debes incluir en 'relationships' las conexiones entre el concepto central y cada una de las dimensiones:
   - sourceTitle: Título del concepto origen (ej. concepto central técnico).
   - targetTitle: Título del concepto destino (ej. dimensión económica, social o legal).
   - type: Uno de ["enables", "regulates", "funds", "requires", "depends_on"].
   - strength: Entero de 3 a 5 (densidad de partículas en 3D).
   - label: Breve explicación de la relación (ej. "Sustento del modelo de negocio").
5. En el campo 'text', explica al usuario que has estructurado los pilares fundamentales del proyecto en el Tablero de Conceptos y Espacio Neuronal 3D.
6. "readyForStructuring": true.
7. "discoveryQuestions": [].

Formato de salida JSON obligatorio para FASE 2:
{
  "text": "Hemos consolidado la idea base. He estructurado la arquitectura de tu proyecto cubriendo sus dimensiones técnica, económica, social y legal en el Tablero y el Espacio Neuronal 3D.",
  "simplifiedExplanation": "Se han estructurado los 4 pilares fundamentales de tu proyecto en el lienzo y espacio 3D.",
  "cardType": "idea",
  "readyForStructuring": true,
  "discoveryQuestions": [],
  "nodes": [
    {
      "title": "Arquitectura Central del Sistema",
      "description": "Estructura técnica fundacional que define el mecanismo operativo principal del proyecto.",
      "kind": "concept",
      "category": "technical",
      "priority": "high",
      "relevanceScore": 10,
      "phase": "planning",
      "metadata": "Relevancia 10/10 • Técnico",
      "details": "### Resumen Ejecutivo\\nDefinición fundacional del mecanismo técnico principal propuesto.\\n\\n### Análisis de Viabilidad e Impacto\\nImpacto directo en la viabilidad y valor ofrecido a los usuarios.\\n\\n### Plan de Acción y Próximos Pasos\\n1. Validar la hipótesis técnica central."
    },
    {
      "title": "Modelo Económico y Monetización",
      "description": "Estructura de ingresos, amortización de costos y viabilidad financiera del proyecto.",
      "kind": "concept",
      "category": "economic",
      "priority": "high",
      "relevanceScore": 9,
      "phase": "planning",
      "metadata": "Relevancia 9/10 • Económico",
      "details": "### Resumen Ejecutivo\\nEsquema de monetización y análisis de flujos financieros.\\n\\n### Análisis de Viabilidad e Impacto\\nRetorno de inversión y equilibrio operativo.\\n\\n### Plan de Acción y Próximos Pasos\\n1. Modelar costos operativos unitarios."
    },
    {
      "title": "Adopción e Impacto de Usuarios",
      "description": "Estrategia de experiencia, curva de aprendizaje y valor social para los usuarios clave.",
      "kind": "concept",
      "category": "political",
      "priority": "high",
      "relevanceScore": 8,
      "phase": "planning",
      "metadata": "Relevancia 8/10 • Social",
      "details": "### Resumen Ejecutivo\\nEstrategia de adopción humana y reducción de fricciones.\\n\\n### Análisis de Viabilidad e Impacto\\nMejora de la retención y bienestar en la operación.\\n\\n### Plan de Acción y Próximos Pasos\\n1. Evaluar retroalimentación de usuarios iniciales."
    },
    {
      "title": "Marco Legal y Cumplimiento",
      "description": "Garantías regulatorias, términos de servicio y protección de datos para la operación.",
      "kind": "risk",
      "category": "legal",
      "priority": "high",
      "relevanceScore": 9,
      "phase": "planning",
      "metadata": "Relevancia 9/10 • Legal",
      "details": "### Resumen Ejecutivo\\nMarco regulatorio y normativas de privacidad aplicables.\\n\\n### Análisis de Viabilidad e Impacto\\nMitigación de contingencias legales y fortalecimiento de confianza.\\n\\n### Plan de Acción y Próximos Pasos\\n1. Redactar políticas de privacidad y términos contractuales."
    }
  ],
  "relationships": [
    {
      "sourceTitle": "Arquitectura Central del Sistema",
      "targetTitle": "Modelo Económico y Monetización",
      "type": "funds",
      "strength": 4,
      "label": "Monetiza el flujo operativo"
    },
    {
      "sourceTitle": "Arquitectura Central del Sistema",
      "targetTitle": "Adopción e Impacto de Usuarios",
      "type": "enables",
      "strength": 4,
      "label": "Facilita la experiencia de usuario"
    },
    {
      "sourceTitle": "Arquitectura Central del Sistema",
      "targetTitle": "Marco Legal y Cumplimiento",
      "type": "regulates",
      "strength": 5,
      "label": "Cumple marco normativo obligatorio"
    }
  ]
} `;
  }

  // PHASE_3_EXPANSION (Default / Advanced phase)
  return `${baseHeader}

==================================================
ESTADO ACTUAL: FASE 3 — EXPANSIÓN Y EXPLORACIÓN CONTINUA DEL PROYECTO (PHASE_3_EXPANSION)
==================================================
Objetivo: Continuar la conversación de forma natural, fluida y estratégica sin reiniciar el descubrimiento. Asistir al usuario en la exploración, profundización, validación y ramificación de su proyecto ya generado.

REGLAS DE CONVERSACIÓN POST-GENERACIÓN:
1. CONTINUIDAD CONVERSACIONAL REAL Y PERSONALIZADA:
   - Responde SIEMPRE de manera directa, empática y contextual al último mensaje del usuario.
   - Utiliza el contexto acumulado del proyecto: nombre del proyecto, nodos ya existentes en el lienzo e historial de conversación.
   - Si el usuario hace una pregunta o pide recomendaciones, respóndela a fondo con ejemplos prácticos y criterio estratégico antes de cualquier sugerencia de nodos.
   - Haz preguntas de seguimiento o recomendaciones ÚNICAMENTE cuando sean genuinamente útiles y pertinentes, nunca por compromiso.
   - PROHIBICIÓN ESTRICTA DE TEXTOS PLANTILLA: Queda estrictamente prohibido devolver respuestas genéricas, placeholders, esquemas vacíos o instrucciones del sistema. Cada respuesta debe ser una redacción original, contextual y específica al proyecto del usuario.

2. RAMIFICACIÓN Y ACTUALIZACIÓN DEL PROYECTO:
   - La idea central ya está anclada en el lienzo.
   - Si el usuario solicita explícitamente agregar, explorar o estructurar conceptos (o si la conversación introduce nuevos pilares esenciales), propón de 1 a 3 conceptos estructurados en 'nodes' clasificados en las 4 categorías ("legal", "technical", "economic", "political").
   - Cada nodo debe incluir 'relevanceScore' (1 a 10) y documentación estructurada en Markdown:
     ### Resumen Ejecutivo
     ### Análisis de Viabilidad e Impacto
     ### Plan de Acción y Próximos Pasos
   - Establece las conexiones causales en 'relationships' vinculando los nuevos conceptos con los existentes usando tipos como ["enables", "regulates", "funds", "requires", "mitigates", "depends_on"].
   - Si el usuario simplemente está conversando, debatiendo o haciendo preguntas conceptuales sin solicitar cambios en el lienzo, responde en 'text' y devuelve "nodes": [] y "relationships": [].
   - Mantén "readyForStructuring": true y "discoveryQuestions": []. No reinicies la fase de descubrimiento ni emitas cuestionarios.

Formato de salida JSON obligatorio para FASE 3:
{
  "text": "Analizando la viabilidad técnica y operacional de tu proyecto, recomiendo priorizar la arquitectura modular para los servicios centrales antes de integrar capas periféricas. Esto asegura estabilidad operativa y escalabilidad en los flujos críticos.",
  "simplifiedExplanation": "Estructuración y priorización de la arquitectura técnica para asegurar escalabilidad y estabilidad operativa.",
  "cardType": "recommendation",
  "readyForStructuring": true,
  "discoveryQuestions": [],
  "nodes": [
    {
      "title": "Marco de Privacidad y Normativa Legal",
      "description": "Estructura regulatoria y términos para garantizar la protección de datos y el cumplimiento legal.",
      "kind": "risk",
      "category": "legal",
      "priority": "high",
      "relevanceScore": 9,
      "phase": "validation",
      "metadata": "Relevancia 9/10 • Legal",
      "details": "### Resumen Ejecutivo\\nMarco normativo y políticas de uso adaptadas al dominio del proyecto.\\n\\n### Análisis de Viabilidad e Impacto\\nPrevención de contingencias legales y fortalecimiento de la confianza.\\n\\n### Plan de Acción y Próximos Pasos\\n1. Redactar términos de servicio y políticas de privacidad."
    }
  ],
  "relationships": [
    {
      "sourceTitle": "Arquitectura Central del Sistema",
      "targetTitle": "Marco de Privacidad y Normativa Legal",
      "type": "regulates",
      "strength": 4,
      "label": "Garantiza marco legal de operación"
    }
  ]
}
NOTA: El texto del ejemplo JSON anterior es únicamente ilustrativo del formato de respuesta. DEBES generar una respuesta 100% original, personalizada y directamente relevante al mensaje del usuario y la memoria del proyecto.`;
}

const PLACEHOLDER_PATTERNS = [
  /(?:your|tu)\s+(?:strategic\s+analysis|an[aá]lisis\s+estrat[eé]gico|respuesta\s+estrat[eé]gica|strategic\s+response)\s+(?:or|o)\s+(?:response|respuesta|an[aá]lisis|analysis)/i,
  /(?:branch|ramificar)\s+(?:this|este|el|the)?\s*(?:framework|marco)\s*(?:into|en)\s*(?:the|el)?\s*(?:project|proyecto)/i,
  /^(?:your|tu)?\s*(?:strategic\s+analysis|an[aá]lisis\s+estrat[eé]gico|respuesta\s+estrat[eé]gica)[. :…\s]*$/i,
  /texto que le dir[aá]s al usuario/i,
  /text you will say to the user/i,
  /explicaci[oó]n en lenguaje directo y accesible para estudiantes/i,
  /explanation in direct and accessible language for students/i,
  /an[aá]lisis exhaustivo y personalizado que responde directamente a la consulta del usuario/i,
  /s[ií]ntesis did[aá]ctica y accesible del an[aá]lisis/i,
  /\[(?:insert|escribe|tu\s+texto|your\s+text|placeholder)\]/i,
];

export function isPlaceholderResponse(text: string): boolean {
  if (!text || !text.trim()) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

export function sanitizeAssistantText(text: string, lang: Language = "es", contextTopic?: string): string {
  if (!isPlaceholderResponse(text)) return text;
  const topic = contextTopic ? ` de ${contextTopic}` : "";
  if (lang === "en") {
    return `I have analyzed this strategic perspective for your project${topic}. We can examine its practical implications, operational structure, and key milestones to make it fully viable. What specific aspect would you like to explore first?`;
  }
  return `He analizado esta perspectiva estratégica para tu proyecto${topic}. Podemos profundizar en sus implicaciones prácticas, estructura operativa y pasos clave para consolidarlo. ¿Qué aspecto específico te gustaría examinar primero?`;
}

/**
 * Builds the user prompt payload with context of the current canvas.
 */
export function buildUserPrompt(ctx: PromptContext): string {
  const { phase, existingNodesSummary, userMessage, lang, messageHistory } = ctx;

  let phaseInstruction = "";
  if (phase === "PHASE_1_DISCOVERY") {
    phaseInstruction = `ESTADO: FASE 1 - DESCUBRIMIENTO (ENRUTADOR JSON ESTRICTO).
Ayuda al usuario a definir cualquier tipo de proyecto con lenguaje cotidiano. Responde con un objeto JSON válido:
{
  "action": "chat" | "questionnaire" | "ready",
  "message": "Texto que le dirás al usuario",
  "questions": [array de preguntas solo si action es questionnaire],
  "ui": {componente interactivo opcional}
}

REGLAS DE DECISIÓN:
0. Si pide una línea de tiempo, comparación o ideas accionables, responde con action: "chat" y el campo ui correspondiente. Nunca obligues a completar el componente.
1. Si hace una pregunta o conversa, responde directamente con action: "chat" y sin cuestionario.
2. Si describe una idea, reconoce lo que ya explicó y pregunta solo por información esencial que realmente falte. No presupongas que es software.
3. Si la finalidad y los aspectos esenciales de ese tipo de proyecto están claros, usa action: "ready". El mapa se generará automáticamente.

Usa el historial y la memoria del proyecto. No repitas preguntas respondidas, aunque estén redactadas de otra manera. Acepta "no lo sé" como respuesta y registra lo desconocido. Cuando un cuestionario aporte valor, formula entre una y tres preguntas simples, con respuestas personalizadas. No pidas arquitectura técnica, presupuesto o requisitos legales salvo que sean esenciales para este proyecto.`;
  } else if (phase === "PHASE_2_STRUCTURING") {
    phaseInstruction = `Instrucción de fase: Sintetiza lo conversado y genera la arquitectura multidimensional del proyecto cubriendo las 4 dimensiones canónicas ('technical', 'economic', 'political', 'legal') en 'nodes' y sus relaciones causales en 'relationships'.`;
  } else {
    phaseInstruction = `Instrucción de fase: FASE 3 — EXPANSIÓN Y EXPLORACIÓN CONTINUA (PHASE_3_EXPANSION).
Responde de forma directa, natural y contextualmente relevante al mensaje del usuario ("${userMessage}"), utilizando la memoria del proyecto y los nodos existentes. Continúa la conversación con criterio estratégico; sugiere follow-up questions solo cuando sean genuinamente útiles. Si el usuario solicita agregar nodos o explorar una dimensión, propón entre 1 y 3 conceptos estructurados en 'nodes'; si es una conversación consultiva o analítica, responde en 'text' con 'nodes': []. PROHIBIDO usar textos plantilla o placeholders genéricos.`;
  }

  const isEs = lang === "es";

  // Build the message history section in forward chronological order (oldest to newest)
  // Preserves multi-turn ideation context without reverse ordering or arbitrary 4-message truncation
  const messageHistoryText =
    messageHistory && messageHistory.length > 0
      ? messageHistory
          .map((m) => {
            const role = m.role === "user" ? "Usuario" : "Asistente";
            const interactiveState = "ui" in m && m.ui
              ? `\nEstado interactivo guardado: ${JSON.stringify(m.ui)}`
              : "";
            return `${role}: ${m.text}${interactiveState}`;
          })
          .join("\n")
      : "(Sin historial de mensajes)";

  return `Nodos existentes en el lienzo:
${existingNodesSummary || "(Lienzo en blanco)"}

Fase de interacción: ${phase}
${phaseInstruction}

==================================================
MENSAJE DEL USUARIO (input real - solo surte para las preguntas de esta fase):
==================================================
"${userMessage}"
==================================================

HISTORIAL DE MENSAJES RECIENTES (contexto conversacional):
==================================================
${messageHistoryText}
==================================================

INSTRUCCIÓN DE IDIOMA CRÍTICA:
- Responde estrictamente en el MISMO IDIOMA en que el usuario escribió su mensaje ("${userMessage}").
- ${isEs ? "El mensaje está en ESPAÑOL: TODO el JSON (text, simplifiedExplanation, discoveryQuestions, options, títulos, descripciones y detalles de nodos) DEBE ESTAR 100% EN ESPAÑOL." : "The message is in ENGLISH: the entire JSON (text, simplifiedExplanation, discoveryQuestions, options, node titles, descriptions, and details) MUST BE 100% IN ENGLISH."}

Genera tu respuesta en formato JSON estrictamente válido conforme a las instrucciones del sistema.`;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Normalización semántica y prevención de conceptos duplicados (Phase 05)
 * ───────────────────────────────────────────────────────────────────────────── */

const COMMON_STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en",
  "para", "por", "con", "y", "o", "the", "a", "an", "of", "in", "to", "for",
  "with", "and", "or"
]);

/**
 * Normaliza un título de concepto para comparación determinista:
 * 1. Minúsculas y recortes
 * 2. Eliminación de diacríticos Unicode (NFD)
 * 3. Eliminación de puntuación y caracteres no alfanuméricos
 * 4. Filtrado de stop words en español e inglés
 * 5. Colapso de espacios múltiples
 */
export function normalizeTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos y diacríticos
    .replace(/[^a-z0-9\s]/gi, " ")   // Reemplazar puntuación por espacio
    .split(/\s+/)
    .filter((w) => w.length > 0 && !COMMON_STOPWORDS.has(w))
    .join(" ")
    .trim();
}

/**
 * Calcula la similitud de Jaccard entre los conjuntos de palabras de dos textos.
 */
export function calculateJaccardSimilarity(str1: string, str2: string): number {
  const tokens1 = new Set(str1.split(" ").filter((t) => t.length > 0));
  const tokens2 = new Set(str2.split(" ").filter((t) => t.length > 0));

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) intersectionCount++;
  }

  const unionSize = new Set([...tokens1, ...tokens2]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0.0;
}

/**
 * Calcula la distancia de edición de Levenshtein entre dos cadenas.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // Borrado
        dp[i][j - 1] + 1,       // Inserción
        dp[i - 1][j - 1] + cost // Sustitución
      );
    }
  }

  return dp[m][n];
}

/**
 * Evalúa si un título candidato duplica algún concepto existente.
 * Retorna el ConceptNode (o nodo) duplicado si se detecta concordancia, o null si es nuevo.
 */
export function findDuplicateConcept<T extends { title: string }>(
  candidateTitle: string,
  existingNodes: T[]
): T | null {
  const normCandidate = normalizeTitle(candidateTitle);
  if (!normCandidate) return null;

  for (const node of existingNodes) {
    const normExisting = normalizeTitle(node.title);
    if (!normExisting) continue;

    // 1. Concordancia normalizada exacta
    if (normCandidate === normExisting) {
      return node;
    }

    // 2. Coeficiente de similitud de Jaccard (>= 0.75)
    const jaccard = calculateJaccardSimilarity(normCandidate, normExisting);
    if (jaccard >= 0.75) {
      return node;
    }

    // 3. Tolerancia de Levenshtein para variaciones gramaticales/plurales
    if (Math.abs(normCandidate.length - normExisting.length) <= 3) {
      const dist = levenshteinDistance(normCandidate, normExisting);
      if (dist <= 2 && Math.max(normCandidate.length, normExisting.length) >= 6) {
        return node;
      }
    }
  }

  return null;
}

/**
 * Retorna true si un título candidato duplica algún concepto existente.
 */
export function isDuplicateConcept<T extends { title: string }>(
  candidateTitle: string,
  existingNodes: T[]
): boolean {
  return findDuplicateConcept(candidateTitle, existingNodes) !== null;
}
