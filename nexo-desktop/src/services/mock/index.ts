/**
 * Mock implementations of the service contracts.
 * Simulates latency, offline failures and persistence (created
 * projects survive reloads; workspace edits survive navigation).
 */
import {
  ServiceError,
  type AIResponse,
  type ConceptKind,
  type ConceptMap,
  type ConceptNode,
  type ConceptRelation,
  type Language,
  type Message,
  type Project,
  type ProjectIcon,
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

function resolveSeedMap(seed: SeedProject, lang: Language): ConceptMap {
  return {
    nodes: seed.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      status: n.status,
      x: n.x,
      y: n.y,
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
  async reply({ text, map, lang, replyTo }) {
    await latency(1600);
    if (FAIL_WORDS.test(text)) throw new ServiceError("unknown");

    const now = new Date().toISOString();

    if (map.nodes.length === 0) {
      const core: ConceptNode = {
        id: uid("n"),
        kind: "concept",
        status: "exploring",
        x: 60,
        y: 160,
        title: summarize(text),
        description: pick(aiCopy.coreDescription, lang),
        metadata: pick(aiCopy.coreMetadata, lang),
      };
      const v = nodeTemplates.viability[0];
      const r = nodeTemplates.risk[0];
      const viability: ConceptNode = {
        id: uid("n"),
        kind: "viability",
        status: "exploring",
        x: 60 + GAP_X,
        y: 40,
        title: pick(v.title, lang),
        description: pick(v.description, lang),
        metadata: pick(v.metadata, lang),
      };
      const risk: ConceptNode = {
        id: uid("n"),
        kind: "risk",
        status: "review",
        x: 60 + GAP_X,
        y: 40 + GAP_Y + 40,
        title: pick(r.title, lang),
        description: pick(r.description, lang),
        metadata: pick(r.metadata, lang),
      };
      const response: AIResponse = {
        message: {
          id: uid("m"),
          role: "assistant",
          createdAt: now,
          replyTo,
          text: pick(aiCopy.firstMessage, lang),
          insight: {
            title: pick(aiCopy.firstTitle, lang),
            items: [core, viability, risk].map((n) => ({ nodeId: n.id, kind: n.kind, label: n.title })),
          },
        },
        newNodes: [core, viability, risk],
        newRelations: [
          { id: uid("r"), from: core.id, to: viability.id },
          { id: uid("r"), from: core.id, to: risk.id },
        ],
      };
      return response;
    }

    const kind = detectKind(text);
    const templates = nodeTemplates[kind];
    const sameKind = map.nodes.filter((n) => n.kind === kind).length;
    const template = templates[sameKind % templates.length];
    const anchor = map.nodes.find((n) => n.kind === "concept") ?? map.nodes[0];
    const slot = freeSlot(map.nodes, anchor.x + GAP_X, anchor.y);

    const node: ConceptNode = {
      id: uid("n"),
      kind,
      status: kind === "risk" ? "review" : "exploring",
      x: slot.x,
      y: slot.y,
      title: pick(template.title, lang),
      description: pick(template.description, lang),
      metadata: pick(template.metadata, lang),
    };
    const relation: ConceptRelation = { id: uid("r"), from: anchor.id, to: node.id };
    const related = map.nodes.find((n) => n.kind !== kind && n.id !== anchor.id);
    const items = [node, anchor, ...(related ? [related] : [])].map((n) => ({
      nodeId: n.id,
      kind: n.kind,
      label: n.title,
    }));

    return {
      message: {
        id: uid("m"),
        role: "assistant",
        createdAt: now,
        replyTo,
        text: pick(aiCopy.reply[kind], lang),
        insight: { title: pick(aiCopy.replyTitle[kind], lang), items },
      },
      newNodes: [node],
      newRelations: [relation],
    };
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
