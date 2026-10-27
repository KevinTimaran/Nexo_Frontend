/**
 * Mock implementations of the service contracts.
 * Simulates latency, offline failures and persistence (created
 * projects survive reloads; workspace edits survive navigation).
 */
import {
  ServiceError,
  type ChatPhase,
  type ConceptKind,
  type ConceptMap,
  type ConceptNode,
  type ConceptRelation,
  type ConceptStatus,
  type Language,
  type Message,
  type NodeCategory,
  type NodePriority,
  type Project,
  type ProjectIcon,
  type ResearchPhase,
  type Workspace,
} from "../../domain/types";
import { aiCopy, nodeTemplates, pick, seedProjects, type SeedProject } from "../../mocks/seed";
import type {
  AIService,
  AuthService,
  DocumentService,
  ProjectService,
  Services,
  WorkspaceService,
} from "../contracts";

const CREATED_KEY = "nexo.mock.projects";

const uid = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

async function latency(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ServiceError("offline");
  }
}

/* ---------------------------- in-memory db ---------------------------- */

interface Session {
  map: ConceptMap;
  messages: Message[];
  updatedAt: string;
}

const sessions = new Map<string, Session>();

function readCreated(): Project[] {
  try {
    const raw = localStorage.getItem(CREATED_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function writeCreated(projects: Project[]) {
  localStorage.setItem(CREATED_KEY, JSON.stringify(projects));
}

function resolveSeedProject(seed: SeedProject, lang: Language): Project {
  return {
    id: seed.id,
    name: pick(seed.name, lang),
    description: pick(seed.description, lang),
    status: seed.status,
    icon: seed.icon,
    updatedAt: minutesAgo(seed.minutesAgo),
    nodeCount: seed.nodes.length,
  };
}

function inferCategory(id: string, kind: ConceptKind): NodeCategory {
  const lower = id.toLowerCase();
  if (lower.includes("legal") || lower.includes("pay") || lower.includes("reg") || lower.includes("law")) return "legal";
  if (lower.includes("cac") || lower.includes("demand") || lower.includes("market") || lower.includes("cost") || lower.includes("eco")) return "economic";
  if (lower.includes("identity") || lower.includes("safety") || lower.includes("impact") || lower.includes("social")) return "political";
  if (kind === "viability") return "economic";
  if (kind === "risk") return "legal";
  return "technical";
}

function inferPriority(kind: ConceptKind, status: ConceptStatus): NodePriority {
  if (kind === "risk" || status === "review") return "high";
  if (kind === "viability" || status === "confirmed") return "medium";
  return "low";
}

function resolveSeedMap(seed: SeedProject, lang: Language): ConceptMap {
  return {
    nodes: seed.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      category: n.category ?? inferCategory(n.id, n.kind),
      priority: n.priority ?? inferPriority(n.kind, n.status),
      status: n.status,
      x: n.x,
      y: n.y,
      phase:
        n.phase ??
        (n.kind === "concept"
          ? "planning"
          : n.kind === "viability"
          ? "execution"
          : "validation"),
      details: n.details
        ? pick(n.details, lang)
        : `${pick(n.title, lang)}\n\n${pick(n.description, lang)}\n\n### Evidencia y Métricas\n- Estado de validación: ${n.status}\n- Respaldo empírico: ${pick(n.metadata, lang)}\n\n### Próximos Pasos\n- Conectar con actores clave de la comunidad estudiantil.\n- Ejecutar prueba de concepto piloto para validar hipótesis de tracción.`,
      title: pick(n.title, lang),
      description: pick(n.description, lang),
      metadata: pick(n.metadata, lang),
    })),
    relations: seed.relations.map(([from, to]) => ({ id: `${from}->${to}`, from, to })),
  };
}

function resolveSeedMessages(seed: SeedProject, lang: Language): Message[] {
  return seed.messages.map((m): Message =>
    m.role === "user"
      ? { id: m.id, role: "user", createdAt: minutesAgo(m.minutesAgo), text: pick(m.text, lang) }
      : {
          id: m.id,
          role: "assistant",
          createdAt: minutesAgo(m.minutesAgo),
          text: pick(m.text, lang),
          insight: m.insight && {
            title: pick(m.insight.title, lang),
            items: m.insight.items.map((i) => ({ nodeId: i.nodeId, kind: i.kind, label: pick(i.label, lang) })),
          },
        },
  );
}

/** Apply session edits (node count, last update) on top of a project. */
function withSession(project: Project): Project {
  const session = sessions.get(project.id);
  if (!session) return project;
  return { ...project, nodeCount: session.map.nodes.length, updatedAt: session.updatedAt };
}

/* ------------------------------ services ------------------------------ */

const auth: AuthService = {
  async signIn(email) {
    await latency(800);
    const local = email.split("@")[0] ?? "";
    const name = local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return { id: uid("user"), name: name || email, email };
  },
  async signOut() {
    await latency(150);
  },
};

const ICONS: ProjectIcon[] = ["lightbulb", "leaf", "scale", "rocket", "book", "compass"];

const projects: ProjectService = {
  async list(lang) {
    await latency(450);
    const all = [...readCreated(), ...seedProjects.map((s) => resolveSeedProject(s, lang))].map(withSession);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async create(input) {
    await latency(600);
    const hash = [...input.name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const project: Project = {
      id: uid("p"),
      name: input.name.trim(),
      description: input.description.trim(),
      status: "draft",
      icon: ICONS[hash % ICONS.length],
      updatedAt: new Date().toISOString(),
      nodeCount: 0,
    };
    writeCreated([project, ...readCreated()]);
    return project;
  },
};

const workspace: WorkspaceService = {
  async load(projectId, lang) {
    await latency(350);
    const seed = seedProjects.find((s) => s.id === projectId);
    const created = readCreated().find((p) => p.id === projectId);
    const base = seed ? resolveSeedProject(seed, lang) : created;
    if (!base) return null;

    const session = sessions.get(projectId);
    const result: Workspace = {
      project: withSession(base),
      map: session?.map ?? (seed ? resolveSeedMap(seed, lang) : { nodes: [], relations: [] }),
      messages: session?.messages ?? (seed ? resolveSeedMessages(seed, lang) : []),
    };
    return result;
  },
  save(projectId, map, messages) {
    sessions.set(projectId, { map, messages, updatedAt: new Date().toISOString() });
  },
};

/* ------------------------------- mock AI ------------------------------ */

const RISK_WORDS = /risk|riesg|legal|law|ley|privac|safe|segur|danger|peligr|regul|compli|cumpl/i;
const VIABILITY_WORDS = /viab|market|mercad|cost|price|precio|demand|revenue|ingres|money|dinero|scale|escal|pay|pag|business|negocio/i;
const FAIL_WORDS = /simulate error|simular error/i;

function detectKind(text: string): ConceptKind {
  if (RISK_WORDS.test(text)) return "risk";
  if (VIABILITY_WORDS.test(text)) return "viability";
  return "concept";
}

function summarize(text: string): string {
  const words = text.replace(/[¿?¡!.,;:]/g, "").trim().split(/\s+/).filter(Boolean);
  const head = words.slice(0, 6).join(" ");
  const title = head.charAt(0).toUpperCase() + head.slice(1);
  return words.length > 6 ? `${title}…` : title;
}

const NODE_W = 256;
const NODE_H = 190;
const GAP_X = 340;
const GAP_Y = 230;

function freeSlot(nodes: ConceptNode[], x: number, y: number) {
  let candidateY = y;
  const collides = (cy: number) =>
    nodes.some((n) => Math.abs(n.x - x) < NODE_W + 24 && Math.abs(n.y - cy) < NODE_H);
  let guard = 0;
  while (collides(candidateY) && guard < 20) {
    candidateY += GAP_Y;
    guard += 1;
  }
  return { x, y: candidateY };
}

const ai: AIService = {
  async reply({ text, map, lang, replyTo, chatPhase }) {
    await latency(1200);
    if (FAIL_WORDS.test(text)) throw new ServiceError("unknown");

    const now = new Date().toISOString();
    const activePhase: ChatPhase =
      chatPhase || (map.nodes.length > 0 ? "PHASE_3_EXPANSION" : "PHASE_1_DISCOVERY");

    if (activePhase === "PHASE_1_DISCOVERY") {
      const isReady = text.length > 35 || /modelo|b2b|b2c|estudiante|cliente|directo|consumidor/i.test(text);
      return {
        message: {
          id: uid("m"),
          role: "assistant",
          createdAt: now,
          replyTo,
          cardType: "idea",
          chatPhase: "PHASE_1_DISCOVERY",
          readyForStructuring: isReady,
          text:
            lang === "es"
              ? "Entiendo tu idea inicial. Para delimitar el núcleo del proyecto sin apresurar conclusiones técnicas, respondamos a estas preguntas clave:"
              : "I understand your initial idea. To delimit the core of the project without jumping to technical conclusions, let's answer these key questions:",
          simplifiedExplanation:
            lang === "es"
              ? "En Fase 1 estamos explorando las bases de tu idea para que el concepto central en el lienzo sea sólido."
              : "In Phase 1 we are defining the foundation of your idea before adding the central concept.",
          discoveryQuestions: [
            {
              id: "q-1",
              question:
                lang === "es"
                  ? "¿Cuál es el modelo de distribución o negocio principal?"
                  : "What is the primary distribution or business model?",
              options: [
                lang === "es" ? "B2B (Directo a empresas y restaurantes)" : "B2B (Direct to businesses)",
                lang === "es" ? "B2C (Directo al consumidor final)" : "B2C (Direct to consumer)",
                lang === "es" ? "P2P (Comunidad entre usuarios)" : "P2P (Peer-to-peer community)",
              ],
            },
            {
              id: "q-2",
              question:
                lang === "es"
                  ? "¿Quién es el usuario prioritario en la versión piloto?"
                  : "Who is the primary user for the pilot version?",
              options: [
                lang === "es" ? "Estudiantes universitarios verificados" : "Verified university students",
                lang === "es" ? "Pequeños productores y proveedores locales" : "Small local producers",
                lang === "es" ? "Público general urbano" : "General urban audience",
              ],
            },
          ],
        },
        newNodes: [],
        newRelations: [],
      };
    }

    if (activePhase === "PHASE_2_STRUCTURING") {
      const core: ConceptNode = {
        id: uid("n"),
        kind: "concept",
        status: "exploring",
        phase: "planning",
        category: "technical",
        priority: "high",
        x: 60,
        y: 160,
        title: summarize(text),
        description: pick(aiCopy.coreDescription, lang),
        metadata: pick(aiCopy.coreMetadata, lang),
        details: `${summarize(text)}\n\n${pick(aiCopy.coreDescription, lang)}\n\n### Hipótesis de Partida\n- Los usuarios necesitan un canal verificado y de proximidad.\n- Las alternativas actuales carecen de confianza y transparencia.\n\n### Plan de Validación\n1. Entrevistar a los primeros 20 usuarios potenciales.\n2. Probar la adopción inicial con un grupo piloto.`,
      };

      return {
        message: {
          id: uid("m"),
          role: "assistant",
          createdAt: now,
          replyTo,
          cardType: "idea",
          chatPhase: "PHASE_2_STRUCTURING",
          readyForStructuring: true,
          text:
            lang === "es"
              ? "Hemos consolidado la idea base. He generado el concepto central en tu lienzo para que sea el ancla de todo el proyecto."
              : "We consolidated the core idea. I generated the central concept on your canvas as the anchor.",
          simplifiedExplanation:
            lang === "es"
              ? "Este es el concepto central que guiará las demás ramas de tu proyecto."
              : "This is the central concept that will guide all other branches.",
          insight: {
            title: lang === "es" ? "Concepto central establecido" : "Core concept established",
            items: [{ nodeId: core.id, kind: core.kind, label: core.title }],
          },
          actionableNode: {
            title: core.title,
            description: core.description,
            kind: "concept",
            phase: "planning",
            category: "technical",
            priority: "high",
            metadata: core.metadata,
            details: core.details,
          },
        },
        newNodes: [core],
        newRelations: [],
      };
    }

    const kind = detectKind(text);
    const templates = nodeTemplates[kind];
    const sameKind = map.nodes.filter((n) => n.kind === kind).length;
    const template = templates[sameKind % templates.length];
    const anchor = map.nodes.find((n) => n.kind === "concept") ?? map.nodes[0];
    const slot = freeSlot(map.nodes, anchor.x + GAP_X, anchor.y);

    const phase: ResearchPhase =
      kind === "concept" ? "planning" : kind === "viability" ? "execution" : "validation";
    const cardType =
      kind === "concept" ? "idea" : kind === "viability" ? "recommendation" : "explanation";

    const node: ConceptNode = {
      id: uid("n"),
      kind,
      status: kind === "risk" ? "review" : "exploring",
      phase,
      x: slot.x,
      y: slot.y,
      title: pick(template.title, lang),
      description: pick(template.description, lang),
      metadata: pick(template.metadata, lang),
      details: `${pick(template.title, lang)}\n\n${pick(template.description, lang)}\n\n### Análisis Profundo\n- Fase: ${phase.toUpperCase()}\n- Evaluación contextual: Respaldado por patrones de ideación ágil y métricas preliminares.`,
    };
    const relation: ConceptRelation = { id: uid("r"), from: anchor.id, to: node.id };
    const related = map.nodes.find((n) => n.kind !== kind && n.id !== anchor.id);
    const items = [node, anchor, ...(related ? [related] : [])].map((n) => ({
      nodeId: n.id,
      kind: n.kind,
      label: n.title,
    }));

    const simplifiedExplanations = {
      risk:
        lang === "es"
          ? "En palabras simples: Este punto te avisa de un posible tropiezo legal o financiero. Te conviene resolver las reglas antes de lanzar para evitar reclamos."
          : "Simply put: This warns you of a potential regulatory or financial hiccup. Establish clear terms before launch to avoid disputes.",
      viability:
        lang === "es"
          ? "En palabras simples: Esta tarjeta analiza si los números y la demanda tienen sentido. Nos dice que el costo de conseguir clientes es favorable."
          : "Simply put: This looks at whether the math and demand make sense. It shows your acquisition costs are low enough to scale.",
      concept:
        lang === "es"
          ? "En palabras simples: Esta es la esencia de tu propuesta: qué valor tangible le ofreces a las personas para que elijan tu solución."
          : "Simply put: This is the core value proposition: why users will choose your product over existing options.",
    };

    return {
      message: {
        id: uid("m"),
        role: "assistant",
        createdAt: now,
        replyTo,
        cardType,
        chatPhase: "PHASE_3_EXPANSION",
        readyForStructuring: true,
        text: pick(aiCopy.reply[kind], lang),
        simplifiedExplanation: simplifiedExplanations[kind],
        insight: { title: pick(aiCopy.replyTitle[kind], lang), items },
        actionableNode: {
          title: node.title,
          description: node.description,
          kind: node.kind,
          category: node.category,
          priority: node.priority,
          phase: node.phase ?? "planning",
          metadata: node.metadata,
          details: node.details,
        },
      },
      newNodes: [node],
      newRelations: [relation],
    };
  },

  async explain(request) {
    await latency(900);
    const { messageText, conceptTitle, lang } = request;
    if (lang === "es") {
      if (conceptTitle) {
        return `Explicación didáctica sobre «${conceptTitle}»:\n\n1. ¿Qué significa?\nEste concepto busca aterrizar un componente clave de tu modelo para que sea viable técnica y económicamente.\n\n2. Ejemplo cotidiano:\nImagina que estás abriendo una cafetería en la facultad; antes de comprar máquinas caras, haces una encuesta rápida para saber si los estudiantes prefieren café para llevar o mesas de estudio.\n\n3. Paso siguiente recomendado:\nDiseña una pequeña prueba de concepto con un grupo reducido de usuarios para validar esta hipótesis.`;
      }
      return `Explicación sencilla paso a paso:\n\n1. Enfoque clave:\nEl mensaje anterior analiza: "${messageText.slice(0, 90)}..."\n\n2. ¿Por qué importa?\nTe ayuda a priorizar los aspectos críticos de riesgo y viabilidad antes de invertir tiempo en desarrollo.\n\n3. Próximo paso:\nAgrégalo como concepto al lienzo para evaluar sus relaciones y dependencias con otras áreas.`;
    }
    return `Tutor explanation for "${conceptTitle || 'this concept'}":\n\n1. Core Idea: Breaks down your proposal into measurable milestones.\n2. Simple Analogy: Testing a recipe for 5 friends before printing restaurant menus.\n3. Recommended next step: Validate this assumption with your core user base.`;
  },
};

const documents: DocumentService = {
  async generate(projectId, projectName, lang) {
    await latency(1400);
    return {
      id: uid("doc"),
      projectId,
      title: `${pick(aiCopy.documentTitle, lang)} — ${projectName}`,
      createdAt: new Date().toISOString(),
    };
  },
};

export const mockServices: Services = { auth, projects, workspace, ai, documents };
