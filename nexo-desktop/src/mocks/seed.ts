/**
 * Seed content for the preview build.
 * Content is stored in both languages so the demo reads naturally in
 * English and Spanish. Services resolve it to plain domain strings,
 * so nothing outside `src/mocks` and `src/services` knows it exists.
 */
import type {
  ConceptKind,
  ConceptStatus,
  Language,
  ProjectIcon,
  ProjectStatus,
} from "../domain/types";

export interface L {
  en: string;
  es: string;
}

export const pick = (text: L, lang: Language): string => text[lang];

export interface SeedNode {
  id: string;
  kind: ConceptKind;
  status: ConceptStatus;
  x: number;
  y: number;
  title: L;
  description: L;
  metadata: L;
}

export interface SeedMessage {
  id: string;
  role: "user" | "assistant";
  minutesAgo: number;
  text: L;
  insight?: { title: L; items: { nodeId: string; kind: ConceptKind; label: L }[] };
}

export interface SeedProject {
  id: string;
  icon: ProjectIcon;
  status: ProjectStatus;
  minutesAgo: number;
  name: L;
  description: L;
  nodes: SeedNode[];
  relations: [string, string][];
  messages: SeedMessage[];
}

export const seedProjects: SeedProject[] = [
  {
    id: "campus-market",
    icon: "leaf",
    status: "active",
    minutesAgo: 14,
    name: { en: "Campus Circular Market", es: "Mercado circular universitario" },
    description: {
      en: "A trusted resale network where students buy and sell used items on campus.",
      es: "Una red de reventa confiable donde estudiantes compran y venden artículos usados en el campus.",
    },
    nodes: [
      {
        id: "cm-core",
        kind: "concept",
        status: "confirmed",
        x: 60,
        y: 250,
        title: { en: "Peer-to-peer student resale", es: "Reventa entre estudiantes" },
        description: {
          en: "Students trade books, electronics and furniture inside a verified campus network.",
          es: "Estudiantes intercambian libros, electrónicos y muebles dentro de una red universitaria verificada.",
        },
        metadata: { en: "Core idea", es: "Idea central" },
      },
      {
        id: "cm-identity",
        kind: "concept",
        status: "confirmed",
        x: 400,
        y: 20,
        title: { en: "Verified campus identity", es: "Identidad universitaria verificada" },
        description: {
          en: "University email sign-in builds trust and keeps the market local.",
          es: "El acceso con correo institucional genera confianza y mantiene el mercado local.",
        },
        metadata: { en: "Trust layer", es: "Capa de confianza" },
      },
      {
        id: "cm-demand",
        kind: "viability",
        status: "confirmed",
        x: 400,
        y: 250,
        title: { en: "Strong semester-start demand", es: "Alta demanda al inicio del semestre" },
        description: {
          en: "68% of 212 surveyed students bought or sold used items last term.",
          es: "El 68% de 212 estudiantes encuestados compró o vendió artículos usados el último periodo.",
        },
        metadata: { en: "Score 74/100", es: "Puntaje 74/100" },
      },
      {
        id: "cm-payments",
        kind: "risk",
        status: "review",
        x: 400,
        y: 480,
        title: { en: "Payments and consumer law", es: "Pagos y protección al consumidor" },
        description: {
          en: "Handling payments may require a licensed provider and clear refund terms.",
          es: "Gestionar pagos puede requerir un proveedor autorizado y reglas claras de reembolso.",
        },
        metadata: { en: "Legal review", es: "Revisión legal" },
      },
      {
        id: "cm-impact",
        kind: "concept",
        status: "exploring",
        x: 740,
        y: 0,
        title: { en: "Measurable sustainability impact", es: "Impacto sostenible medible" },
        description: {
          en: "Each resale avoids about 4 kg of waste — a story for university partners.",
          es: "Cada reventa evita cerca de 4 kg de residuos: un argumento para aliados universitarios.",
        },
        metadata: { en: "Impact metric", es: "Métrica de impacto" },
      },
      {
        id: "cm-cac",
        kind: "viability",
        status: "exploring",
        x: 740,
        y: 230,
        title: { en: "Low acquisition cost", es: "Bajo costo de adquisición" },
        description: {
          en: "Student unions and residence halls offer free distribution channels.",
          es: "Centros de estudiantes y residencias ofrecen canales de difusión gratuitos.",
        },
        metadata: { en: "CAC ≈ $1.80", es: "CAC ≈ $1,80" },
      },
      {
        id: "cm-safety",
        kind: "risk",
        status: "exploring",
        x: 740,
        y: 460,
        title: { en: "Safety of in-person exchanges", es: "Seguridad en entregas presenciales" },
        description: {
          en: "Meetups need safe zones and reporting to prevent harm and liability.",
          es: "Los encuentros requieren zonas seguras y reportes para evitar daños y responsabilidades.",
        },
        metadata: { en: "2 mitigations", es: "2 mitigaciones" },
      },
      {
        id: "cm-points",
        kind: "concept",
        status: "exploring",
        x: 1080,
        y: 360,
        title: { en: "Staffed safe-exchange points", es: "Puntos de entrega supervisados" },
        description: {
          en: "Libraries and cafés act as staffed handoff locations.",
          es: "Bibliotecas y cafeterías funcionan como puntos de entrega con personal.",
        },
        metadata: { en: "Proposed", es: "Propuesto" },
      },
    ],
    relations: [
      ["cm-core", "cm-identity"],
      ["cm-core", "cm-demand"],
      ["cm-core", "cm-payments"],
      ["cm-identity", "cm-impact"],
      ["cm-demand", "cm-cac"],
      ["cm-payments", "cm-safety"],
      ["cm-safety", "cm-points"],
      ["cm-cac", "cm-points"],
    ],
    messages: [
      {
        id: "cm-m1",
        role: "user",
        minutesAgo: 32,
        text: {
          en: "I want to build a marketplace where students resell things on campus. Where should I start?",
          es: "Quiero crear un mercado donde los estudiantes revendan cosas en el campus. ¿Por dónde empiezo?",
        },
      },
      {
        id: "cm-m2",
        role: "assistant",
        minutesAgo: 31,
        text: {
          en: "The core concept is solid and early demand is clear. Payments are the part to validate first — they carry legal exposure.",
          es: "El concepto central es sólido y la demanda inicial es clara. Lo primero a validar son los pagos: implican exposición legal.",
        },
        insight: {
          title: { en: "Structure of your idea", es: "Estructura de tu idea" },
          items: [
            { nodeId: "cm-core", kind: "concept", label: { en: "Peer-to-peer student resale", es: "Reventa entre estudiantes" } },
            { nodeId: "cm-demand", kind: "viability", label: { en: "Semester-start demand", es: "Demanda al inicio del semestre" } },
            { nodeId: "cm-payments", kind: "risk", label: { en: "Payments and consumer law", es: "Pagos y protección al consumidor" } },
          ],
        },
      },
      {
        id: "cm-m3",
        role: "user",
        minutesAgo: 16,
        text: { en: "How do we keep exchanges safe?", es: "¿Cómo mantenemos seguras las entregas?" },
      },
      {
        id: "cm-m4",
        role: "assistant",
        minutesAgo: 15,
        text: {
          en: "Safety is the main trust risk. Staffed handoff points turn it into a feature people can rely on.",
          es: "La seguridad es el principal riesgo de confianza. Los puntos de entrega supervisados la convierten en una ventaja.",
        },
        insight: {
          title: { en: "Risk with a mitigation", es: "Riesgo con mitigación" },
          items: [
            { nodeId: "cm-safety", kind: "risk", label: { en: "Safety of in-person exchanges", es: "Seguridad en entregas presenciales" } },
            { nodeId: "cm-points", kind: "concept", label: { en: "Staffed safe-exchange points", es: "Puntos de entrega supervisados" } },
          ],
        },
      },
    ],
  },
  {
    id: "legal-aid",
    icon: "scale",
    status: "active",
    minutesAgo: 60 * 5,
    name: { en: "Legal Aid Assistant", es: "Asistente de orientación legal" },
    description: {
      en: "Plain-language guidance that helps people understand their rights before seeing a lawyer.",
      es: "Orientación en lenguaje sencillo para entender tus derechos antes de acudir a un abogado.",
    },
    nodes: [
      {
        id: "la-core",
        kind: "concept",
        status: "confirmed",
        x: 60,
        y: 160,
        title: { en: "Plain-language legal guidance", es: "Orientación legal en lenguaje claro" },
        description: {
          en: "Explains tenant, labor and consumer rights in everyday language.",
          es: "Explica derechos de arrendatarios, laborales y del consumidor en lenguaje cotidiano.",
        },
        metadata: { en: "Core idea", es: "Idea central" },
      },
      {
        id: "la-intake",
        kind: "concept",
        status: "exploring",
        x: 400,
        y: 20,
        title: { en: "Guided intake questions", es: "Preguntas guiadas de admisión" },
        description: {
          en: "A short questionnaire routes each case to the right topic.",
          es: "Un cuestionario breve dirige cada caso al tema adecuado.",
        },
        metadata: { en: "Flow", es: "Flujo" },
      },
      {
        id: "la-ngo",
        kind: "viability",
        status: "exploring",
        x: 400,
        y: 260,
        title: { en: "NGO partnership interest", es: "Interés de ONG aliadas" },
        description: {
          en: "Two legal-aid NGOs agreed to pilot with 150 cases.",
          es: "Dos ONG de asistencia legal aceptaron un piloto con 150 casos.",
        },
        metadata: { en: "Score 66/100", es: "Puntaje 66/100" },
      },
      {
        id: "la-upl",
        kind: "risk",
        status: "review",
        x: 740,
        y: 140,
        title: { en: "Unauthorized practice of law", es: "Ejercicio no autorizado de la abogacía" },
        description: {
          en: "Guidance must stay informational and route people to licensed lawyers.",
          es: "La orientación debe ser informativa y derivar a abogados habilitados.",
        },
        metadata: { en: "Legal review", es: "Revisión legal" },
      },
      {
        id: "la-data",
        kind: "risk",
        status: "review",
        x: 740,
        y: 380,
        title: { en: "Sensitive personal data", es: "Datos personales sensibles" },
        description: {
          en: "Case details require consent, encryption and retention limits.",
          es: "Los detalles del caso requieren consentimiento, cifrado y límites de conservación.",
        },
        metadata: { en: "Privacy", es: "Privacidad" },
      },
    ],
    relations: [
      ["la-core", "la-intake"],
      ["la-core", "la-ngo"],
      ["la-core", "la-upl"],
      ["la-upl", "la-data"],
    ],
    messages: [],
  },
  {
    id: "study-planner",
    icon: "book",
    status: "active",
    minutesAgo: 60 * 26,
    name: { en: "Adaptive Study Planner", es: "Planificador de estudio adaptativo" },
    description: {
      en: "Weekly study plans that adapt to grades, deadlines and available time.",
      es: "Planes de estudio semanales que se adaptan a notas, entregas y tiempo disponible.",
    },
    nodes: [
      {
        id: "sp-core",
        kind: "concept",
        status: "confirmed",
        x: 60,
        y: 120,
        title: { en: "Adaptive weekly plan", es: "Plan semanal adaptativo" },
        description: {
          en: "Rebuilds the study plan every week from grades and upcoming deadlines.",
          es: "Reconstruye el plan cada semana a partir de notas y próximas entregas.",
        },
        metadata: { en: "Core idea", es: "Idea central" },
      },
      {
        id: "sp-lms",
        kind: "viability",
        status: "exploring",
        x: 400,
        y: 10,
        title: { en: "Works with existing LMS data", es: "Usa datos del LMS existente" },
        description: {
          en: "Calendar and grade exports are available at most universities.",
          es: "La mayoría de universidades permite exportar calendario y notas.",
        },
        metadata: { en: "Score 61/100", es: "Puntaje 61/100" },
      },
      {
        id: "sp-privacy",
        kind: "risk",
        status: "review",
        x: 400,
        y: 240,
        title: { en: "Student record privacy", es: "Privacidad de expedientes" },
        description: {
          en: "Academic records are protected and need institutional agreements.",
          es: "Los expedientes académicos están protegidos y requieren convenios institucionales.",
        },
        metadata: { en: "Compliance", es: "Cumplimiento" },
      },
    ],
    relations: [
      ["sp-core", "sp-lms"],
      ["sp-core", "sp-privacy"],
    ],
    messages: [],
  },
  {
    id: "rooftop-farms",
    icon: "compass",
    status: "draft",
    minutesAgo: 60 * 24 * 3,
    name: { en: "Urban Rooftop Farms", es: "Huertos urbanos en azoteas" },
    description: {
      en: "Turning unused rooftops into community vegetable gardens.",
      es: "Convertir azoteas sin uso en huertos comunitarios.",
    },
    nodes: [],
    relations: [],
    messages: [],
  },
  {
    id: "indie-hardware",
    icon: "rocket",
    status: "archived",
    minutesAgo: 60 * 24 * 21,
    name: { en: "Indie Hardware Launch", es: "Lanzamiento de hardware independiente" },
    description: {
      en: "Go-to-market exploration for a small-batch synthesizer.",
      es: "Exploración comercial para un sintetizador de producción limitada.",
    },
    nodes: [],
    relations: [],
    messages: [],
  },
];

/* ------------------------------------------------------------------ */
/* Templates used by the mock AI to grow the map during a conversation */
/* ------------------------------------------------------------------ */

export interface NodeTemplate {
  title: L;
  description: L;
  metadata: L;
}

export const nodeTemplates: Record<ConceptKind, NodeTemplate[]> = {
  concept: [
    {
      title: { en: "Focused first audience", es: "Audiencia inicial enfocada" },
      description: {
        en: "Start with the segment where the need is sharpest, then expand.",
        es: "Empieza por el segmento con la necesidad más clara y luego expande.",
      },
      metadata: { en: "Proposed", es: "Propuesto" },
    },
    {
      title: { en: "Core value loop", es: "Ciclo de valor central" },
      description: {
        en: "What people get every time they return — the habit that drives growth.",
        es: "Lo que las personas obtienen cada vez que vuelven: el hábito que impulsa el crecimiento.",
      },
      metadata: { en: "Proposed", es: "Propuesto" },
    },
    {
      title: { en: "Differentiating angle", es: "Ángulo diferenciador" },
      description: {
        en: "What makes this meaningfully different from the closest alternative.",
        es: "Lo que lo hace realmente distinto de la alternativa más cercana.",
      },
      metadata: { en: "Proposed", es: "Propuesto" },
    },
  ],
  viability: [
    {
      title: { en: "Willingness to pay", es: "Disposición a pagar" },
      description: {
        en: "Early interviews suggest people would pay for a premium tier.",
        es: "Las primeras entrevistas sugieren que pagarían por un plan premium.",
      },
      metadata: { en: "Score 64/100", es: "Puntaje 64/100" },
    },
    {
      title: { en: "Lean launch path", es: "Lanzamiento ligero" },
      description: {
        en: "A first version is feasible in six to eight weeks with existing tools.",
        es: "Una primera versión es viable en seis a ocho semanas con herramientas existentes.",
      },
      metadata: { en: "≈ 7 weeks", es: "≈ 7 semanas" },
    },
    {
      title: { en: "Partner channel", es: "Canal con aliados" },
      description: {
        en: "An established partner could bring the first 500 users.",
        es: "Un aliado establecido podría aportar los primeros 500 usuarios.",
      },
      metadata: { en: "Score 70/100", es: "Puntaje 70/100" },
    },
  ],
  risk: [
    {
      title: { en: "Regulatory exposure", es: "Exposición regulatoria" },
      description: {
        en: "Check local consumer, data and licensing rules before launch.",
        es: "Revisa normas locales de consumo, datos y licencias antes de lanzar.",
      },
      metadata: { en: "Legal review", es: "Revisión legal" },
    },
    {
      title: { en: "Competitive response", es: "Reacción de la competencia" },
      description: {
        en: "A larger player could copy the core feature quickly.",
        es: "Un actor más grande podría copiar la función principal rápidamente.",
      },
      metadata: { en: "Watch", es: "Vigilar" },
    },
    {
      title: { en: "Data protection", es: "Protección de datos" },
      description: {
        en: "Personal data needs consent, minimization and secure storage.",
        es: "Los datos personales requieren consentimiento, minimización y almacenamiento seguro.",
      },
      metadata: { en: "Privacy", es: "Privacidad" },
    },
  ],
};

export const aiCopy = {
  firstMessage: {
    en: "I mapped your idea into a core concept, an early viability signal and a risk to validate. Select any item to find it on the canvas.",
    es: "Organicé tu idea en un concepto central, una señal de viabilidad y un riesgo por validar. Selecciona cualquier elemento para verlo en el lienzo.",
  },
  firstTitle: { en: "Structure of your idea", es: "Estructura de tu idea" },
  coreDescription: {
    en: "Your starting idea, as described in the conversation.",
    es: "Tu idea inicial, tal como la describiste en la conversación.",
  },
  coreMetadata: { en: "Core idea", es: "Idea central" },
  reply: {
    concept: {
      en: "I added a concept that sharpens the idea and linked it to the concept it builds on.",
      es: "Agregué un concepto que precisa la idea y lo conecté con el concepto en el que se apoya.",
    },
    viability: {
      en: "Here is a viability signal worth testing. It's connected to the concept it supports.",
      es: "Aquí hay una señal de viabilidad que vale la pena probar. Está conectada al concepto que respalda.",
    },
    risk: {
      en: "I flagged a risk to validate early. It's linked to the concept it affects.",
      es: "Señalé un riesgo que conviene validar pronto. Está vinculado al concepto que afecta.",
    },
  },
  replyTitle: {
    concept: { en: "New concept", es: "Nuevo concepto" },
    viability: { en: "Viability signal", es: "Señal de viabilidad" },
    risk: { en: "Risk to validate", es: "Riesgo por validar" },
  },
  documentTitle: { en: "Concept brief", es: "Resumen conceptual" },
} satisfies Record<string, unknown>;
