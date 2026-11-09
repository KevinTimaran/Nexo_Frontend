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
  type Folder,
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
  FolderService,
  ProjectService,
  Services,
  WorkspaceService,
} from "../contracts";

const CREATED_KEY = "nexo.mock.projects";
const FOLDERS_KEY = "nexo.mock.folders";

const DEFAULT_FOLDERS: Folder[] = [
  {
    id: "f-investigacion",
    name: "Investigación",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    color: "#E5C158",
  },
];

let memoryFolders: Folder[] = [...DEFAULT_FOLDERS];

function readFolders(): Folder[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(FOLDERS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage errors in test runners
  }
  return memoryFolders;
}

function writeFolders(foldersList: Folder[]) {
  memoryFolders = [...foldersList];
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(foldersList));
    }
  } catch {
    // Ignore storage errors in test runners
  }
}

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

let memoryCreated: Project[] = [];
const DELETED_PROJECTS_KEY = "nexo.mock.projects.deleted.v1";
let memoryDeletedProjects: string[] = [];

function readDeletedProjectIds(): Set<string> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(DELETED_PROJECTS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // Ignore storage errors in test runners
  }
  return new Set(memoryDeletedProjects);
}

function writeDeletedProjectIds(ids: Set<string>) {
  memoryDeletedProjects = Array.from(ids);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DELETED_PROJECTS_KEY, JSON.stringify(memoryDeletedProjects));
    }
  } catch {
    // Ignore storage errors in test runners
  }
}

function readCreated(): Project[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CREATED_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage errors in test runners
  }
  return memoryCreated;
}

function writeCreated(projects: Project[]) {
  memoryCreated = [...projects];
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CREATED_KEY, JSON.stringify(projects));
    }
  } catch {
    // Ignore storage errors in test runners
  }
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
  async signUp(name, email) {
    await latency(800);
    return { id: uid("user"), name: name.trim() || email, email };
  },
  async signOut() {
    await latency(150);
  },
};

const ICONS: ProjectIcon[] = ["lightbulb", "leaf", "scale", "rocket", "book", "compass"];

function normalizeFolderName(name: string): string {
  return name.trim().normalize("NFC").toLowerCase();
}

const projects: ProjectService = {
  async list(lang, folderId) {
    await latency(450);
    const created = readCreated();
    const createdIds = new Set(created.map((p) => p.id));
    const deletedIds = readDeletedProjectIds();
    const seeds = seedProjects
      .filter((s) => !createdIds.has(s.id) && !deletedIds.has(s.id))
      .map((s) => resolveSeedProject(s, lang));
    let all = [...created.filter((p) => !deletedIds.has(p.id)), ...seeds].map(withSession);
    if (folderId && folderId !== "all") {
      if (folderId === "root" || folderId === "none") {
        all = all.filter((p) => !p.folderId);
      } else {
        all = all.filter((p) => p.folderId === folderId);
      }
    }
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
      icon: input.icon || ICONS[hash % ICONS.length],
      updatedAt: new Date().toISOString(),
      nodeCount: 0,
      folderId: input.folderId ?? null,
    };
    writeCreated([project, ...readCreated()]);
    return project;
  },
  async update(id, updates) {
    await latency(150);
    const created = readCreated();
    let target = created.find((p) => p.id === id);
    if (!target) {
      const seed = seedProjects.find((s) => s.id === id);
      if (seed) {
        target = {
          id: seed.id,
          name: typeof seed.name === "string" ? seed.name : seed.name.es,
          description: typeof seed.description === "string" ? seed.description : seed.description.es,
          status: seed.status,
          icon: seed.icon,
          updatedAt: new Date().toISOString(),
          nodeCount: seed.nodes.length,
        };
        created.unshift(target);
      }
    }
    if (!target) throw new Error("Proyecto no encontrado");
    Object.assign(target, updates, { updatedAt: new Date().toISOString() });
    writeCreated(created);
    return target;
  },
  async delete(id) {
    await latency(150);
    const created = readCreated().filter((p) => p.id !== id);
    writeCreated(created);
    const deleted = readDeletedProjectIds();
    deleted.add(id);
    writeDeletedProjectIds(deleted);
  },
};

const folders: FolderService = {
  async list() {
    await latency(150);
    return readFolders();
  },
  async create(name, color) {
    await latency(200);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("El nombre de la carpeta no puede estar vacío");
    }
    if ([...trimmed].length > 50) {
      throw new Error("El nombre de la carpeta no puede superar los 50 caracteres");
    }
    const normalized = normalizeFolderName(trimmed);
    const current = readFolders();
    if (current.some((f) => normalizeFolderName(f.name) === normalized)) {
      throw new Error(`Ya existe una carpeta con el nombre '${trimmed}'`);
    }
    const folder: Folder = {
      id: uid("f"),
      name: trimmed,
      createdAt: new Date().toISOString(),
      color: color || "#E5C158",
    };
    const updated = [...current, folder];
    writeFolders(updated);
    return folder;
  },
  async rename(id, name) {
    await latency(200);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("El nombre de la carpeta no puede estar vacío");
    }
    if ([...trimmed].length > 50) {
      throw new Error("El nombre de la carpeta no puede superar los 50 caracteres");
    }
    const current = readFolders();
    const existing = current.find((f) => f.id === id);
    if (!existing) {
      throw new Error("Carpeta no encontrada");
    }
    const normalized = normalizeFolderName(trimmed);
    if (current.some((f) => f.id !== id && normalizeFolderName(f.name) === normalized)) {
      throw new Error(`Ya existe una carpeta con el nombre '${trimmed}'`);
    }
    existing.name = trimmed;
    existing.updatedAt = new Date().toISOString();
    writeFolders(current);
    return existing;
  },
  async delete(id) {
    await latency(200);
    const current = readFolders();
    const filtered = current.filter((f) => f.id !== id);
    writeFolders(filtered);

    // Non-destructive: remove folderId from any created projects in this folder
    const created = readCreated().map((p) =>
      p.folderId === id ? { ...p, folderId: null, updatedAt: new Date().toISOString() } : p
    );
    writeCreated(created);
  },
  async moveProject(projectId, folderId) {
    await latency(150);
    const created = readCreated();
    const target = created.find((p) => p.id === projectId);
    if (target) {
      target.folderId = folderId;
      target.updatedAt = new Date().toISOString();
      writeCreated(created);
      return target;
    }
    // Check seed projects
    const seed = seedProjects.find((s) => s.id === projectId);
    if (seed) {
      const project: Project = {
        id: seed.id,
        name: typeof seed.name === "string" ? seed.name : seed.name.es,
        description: typeof seed.description === "string" ? seed.description : seed.description.es,
        status: seed.status,
        icon: seed.icon,
        updatedAt: new Date().toISOString(),
        nodeCount: seed.nodes.length,
        folderId,
      };
      writeCreated([project, ...created]);
      return project;
    }
    throw new Error("Proyecto no encontrado");
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
const OFF_TOPIC_WORDS =
  /receta|recipe|chiste|joke|clima|weather|hor[oó]scop|poema|poem|canci[oó]n|song|capital de|f[uú]tbol|football|soccer|cu[eé]ntame un chiste|off-topic|off topic/i;

function detectKind(text: string): ConceptKind {
  if (RISK_WORDS.test(text)) return "risk";
  if (VIABILITY_WORDS.test(text)) return "viability";
  return "concept";
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

function extractCleanTopic(text: string, lang: Language): string {
  let cleaned = text
    .replace(/^estructura\s+(el\s+proyecto|la\s+idea\s+base).*?:\s*/i, "")
    .replace(/^(quiero\s+crear|quiero\s+hacer|me\s+gustar[ií]a\s+crear|me\s+gustar[ií]a\s+hacer|tengo\s+una\s+idea\s+de|app\s+de|plataforma\s+de|sistema\s+de|empresa\s+de)\s+/i, "")
    .replace(/\s+y\s+sus\s+dimensiones\s+estrat[eé]gicas.*$/i, "")
    .replace(/[¿?¡!.,;:]/g, "")
    .trim();
  if (!cleaned) return lang === "es" ? "Arquitectura del Proyecto" : "Project Architecture";
  const words = cleaned.split(/\s+/).filter(Boolean);
  const head = words.slice(0, 6).join(" ");
  return head.charAt(0).toUpperCase() + head.slice(1);
}

function buildMultidimensionalNodes(text: string, lang: Language, history?: Message[]) {
  const userHistoryText = (history ?? [])
    .filter((m) => m.role === "user")
    .map((m) => ("text" in m ? String((m as any).text ?? "") : String((m as any).content ?? "")))
    .join(" ");
  const fullContext = `${text} ${userHistoryText}`;

  const currentTextHasRestaurantSignal = /restauran|meser|cocina|comanda|kds|pos|hardware|pizzer|comida|delivery|reparto/i.test(text);
  const currentTextHasOtherDomainSignal =
    /transporte|flota|bus|buses|taxi|rutas?|pasajer|movilidad|veh[ií]cul|tr[aá]nsito|doctor|m[eé]dic|salud|cl[ií]nic|paciente|telemedicina|cita|dating|pareja|match|m[uú]sic|streaming|audio|creador|artista|abogado|law|legal|asesor|consultorio/i.test(text);

  const isTransport = /transporte|flota|bus|buses|taxi|rutas?|pasajer|movilidad|veh[ií]cul|tr[aá]nsito/i.test(fullContext);
  const isRestaurant =
    currentTextHasRestaurantSignal ||
    (!isTransport && !currentTextHasOtherDomainSignal && /restauran|meser|cocina|comanda|kds|pos|hardware|pizzer|comida|delivery|reparto/i.test(userHistoryText));
  const isDoctor =
    !isTransport &&
    !isRestaurant &&
    (/doctor|m[eé]dic|salud|cl[ií]nic|paciente|telemedicina/i.test(fullContext) ||
      /cita(s)?\s+m[eé]dica/i.test(fullContext));
  const isDating =
    !isTransport &&
    !isRestaurant &&
    !isDoctor &&
    !/m[eé]dic|doctor|cl[ií]nic|salud|paciente/i.test(fullContext) &&
    /cita(s)?(\s+rom[aá]ntica|\s+a\s+ciegas|\s+casual)?|dating|pareja|match/i.test(fullContext);
  const isMusic = !isTransport && !isRestaurant && !isDoctor && !isDating && /m[uú]sic|streaming|audio|creador|artista/i.test(fullContext);

  let coreTitle = "";
  let coreDesc = "";
  let coreDetails = "";

  let ecoTitle = "";
  let ecoDesc = "";
  let ecoDetails = "";

  let socTitle = "";
  let socDesc = "";
  let socDetails = "";

  let legTitle = "";
  let legDesc = "";
  let legDetails = "";

  let rel1Label = "";
  let rel2Label = "";
  let rel3Label = "";
  let rel4Label = "";

  if (isTransport) {
    coreTitle = "Despacho y Telemetría de Flotas GPS";
    coreDesc = "Monitoreo en tiempo real de unidades con GPS, optimización de frecuencias de ruta y telemetría de mantenimiento vehicular.";
    coreDetails = "### Resumen Ejecutivo\nInfraestructura central de despacho y telemetría vehicular para el monitoreo en tiempo real de rutas, velocidad y paradas.\n\n### Análisis de Viabilidad e Impacto\nReducción de hasta 22% en tiempos muertos y optimización del consumo de combustible.\n\n### Plan de Acción y Próximos Pasos\n1. Integrar dispositivos telemáticos OBD/GPS en las unidades piloto.\n2. Configurar servidor de telemetría y panel de despacho en tiempo real.";

    ecoTitle = "Recaudo Digital y Tarifas de Transporte";
    ecoDesc = "Validadores contactless NFC, recaudo mediante app con código QR, estructura tarifaria integrada y liquidación a concesionarios.";
    ecoDetails = "### Resumen Ejecutivo\nModelo financiero y de recaudo digital integrado con validadores a bordo y liquidación automatizada por kilómetro o pasajero.\n\n### Análisis de Viabilidad e Impacto\nEliminación de fugas de efectivo y aceleración del abordaje en horas pico.\n\n### Plan de Acción y Próximos Pasos\n1. Diseñar matriz tarifaria (plana, zonal o transbordos integrados).\n2. Homologar pasarela de recaudo digital y tarjetas contactless.";

    socTitle = "Accesibilidad y Frecuencia de Rutas para Pasajeros";
    socDesc = "Tiempos estimados de llegada (ETA) en vivo, accesibilidad inclusiva en unidades y seguridad para los usuarios del transporte.";
    socDetails = "### Resumen Ejecutivo\nImpacto directo en la calidad de vida y movilidad urbana de los pasajeros, reduciendo la incertidumbre y tiempos de espera en paradas.\n\n### Análisis de Viabilidad e Impacto\nMayor confianza ciudadana, incremento en la demanda del servicio y reducción de la congestión vial.\n\n### Plan de Acción y Próximos Pasos\n1. Lanzar app de consulta de rutas y tiempos estimados en tiempo real.\n2. Habilitar canal de reporte de incidencias y objetos perdidos.";

    legTitle = "Regulación de Tránsito y Seguros de Pasajeros";
    legDesc = "Cumplimiento normativo ante el ministerio de transporte, pólizas obligatorias de accidentes (SOAT/contractual) y concesiones viales.";
    legDetails = "### Resumen Ejecutivo\nCumplimiento riguroso del marco normativo de transporte público de pasajeros, licencias operativas y pólizas de seguros.\n\n### Análisis de Viabilidad e Impacto\nBlindaje legal contra suspensiones operativas, sanciones administrativas o litigios por siniestralidad.\n\n### Plan de Acción y Próximos Pasos\n1. Tramitar o auditar permisos de operación y habilitación de rutas.\n2. Contratar pólizas colectivas de responsabilidad civil y contractual.";

    rel1Label = "Sustenta recaudo y operación financiera";
    rel2Label = "Optimiza frecuencias y tiempos para pasajeros";
    rel3Label = "Regulado por normas de tránsito y licencias";
    rel4Label = "Alineación tarifaria y pólizas de seguro";
  } else if (isRestaurant) {
    coreTitle = "Arquitectura POS y Comandas KDS";
    coreDesc = "Plataforma central de toma de pedidos para meseros, sincronización en tiempo real y pantallas KDS de cocina.";
    coreDetails = "### Resumen Ejecutivo\nNúcleo de software operativo gastronómico para salón y cocina con arquitectura local y resiliencia offline.\n\n### Análisis de Viabilidad e Impacto\nImpacto directo en la reducción de tiempos de servicio y control de comandas.\n\n### Plan de Acción y Próximos Pasos\n1. Desplegar nodo central y validar flujo de pedidos.\n2. Integrar hardware de impresión y comanderas táctiles.";

    ecoTitle = "Modelo de Suscripción y Hardware";
    ecoDesc = "Estructura de cobro SaaS por sede, financiamiento de comanderas y control de comisiones por mesa.";
    ecoDetails = "### Resumen Ejecutivo\nModelo de negocio escalable con ingresos recurrentes por local y márgenes operativos optimizados.\n\n### Análisis de Viabilidad e Impacto\nRetorno de inversión estimado en menos de 3 meses por reducción de mermas y errores.\n\n### Plan de Acción y Próximos Pasos\n1. Definir tarifas por sede y comisiones de pasarela.\n2. Negociar paquetes de hardware POS por volumen.";

    socTitle = "Bienestar y Adopción de Meseros";
    socDesc = "Ergonomía táctil para meseros, reducción de gritos entre cocina y salón, y transparencia en propinas.";
    socDetails = "### Resumen Ejecutivo\nEnfoque humano centrado en el personal de sala y cocina para facilitar la adopción sin fricciones.\n\n### Análisis de Viabilidad e Impacto\nMayor retención de personal, menor fatiga en horas pico y mejor clima laboral.\n\n### Plan de Acción y Próximos Pasos\n1. Diseñar interfaz simplificada con curva de aprendizaje menor a 15 minutos.\n2. Establecer módulo de visualización transparente de turnos y propinas.";

    legTitle = "Facturación Fiscal y Normativa Laboral";
    legDesc = "Integración fiscal para facturación electrónica reglamentaria y registro legal de jornadas laborales.";
    legDetails = "### Resumen Ejecutivo\nCumplimiento estricto de obligaciones tributarias (tickets electrónicos/DGI/DIAN) y legislación laboral.\n\n### Análisis de Viabilidad e Impacto\nMitigación total de multas por evasión o cierres tributarios del local.\n\n### Plan de Acción y Próximos Pasos\n1. Conectar API de proveedor de facturación electrónica homologado.\n2. Parametrizar impuestos y propinas según la jurisdicción del local.";

    rel1Label = "Sustenta viabilidad financiera";
    rel2Label = "Empodera trabajo de meseros";
    rel3Label = "Regulado por normativa fiscal";
    rel4Label = "Alineación tributaria y laboral";
  } else if (isDoctor) {
    coreTitle = "Plataforma de Videoconsultas y Telemetría Clínica";
    coreDesc = "Infraestructura de atención médica remota, historiales clínicos electrónicos y agendamiento inteligente.";
    coreDetails = "### Resumen Ejecutivo\nPlataforma de salud digital orientada a optimizar la consulta clínica y la interoperabilidad médica.\n\n### Análisis de Viabilidad e Impacto\nMayor cobertura de pacientes y optimización de agendas profesionales.\n\n### Plan de Acción y Próximos Pasos\n1. Validar protocolos de seguridad y encriptación médica.\n2. Integrar agenda y módulo de prescripción digital.";

    ecoTitle = "Monetización por Consulta y Suscripciones Médicas";
    ecoDesc = "Modelo mixto de suscripción para profesionales y comisiones por consulta agendada.";
    ecoDetails = "### Resumen Ejecutivo\nEstructura de cobro recurrente para clínicas y médicos independientes.\n\n### Análisis de Viabilidad e Impacto\nIngresos recurrentes previsibles y bajo costo de adquisición.\n\n### Plan de Acción y Próximos Pasos\n1. Establecer planes de precios escalonados.\n2. Habilitar pasarela de cobro para pacientes.";

    socTitle = "Acceso a la Salud y Adopción del Paciente";
    socDesc = "Democratización de la atención médica con telemedicina accesible y seguimiento oportuno.";
    socDetails = "### Resumen Ejecutivo\nEnfoque centrado en la empatía y la accesibilidad para pacientes vulnerables o en zonas remotas.\n\n### Análisis de Viabilidad e Impacto\nReducción del ausentismo a citas y atención médica temprana.\n\n### Plan de Acción y Próximos Pasos\n1. Diseñar interfaz simplificada para adultos mayores.\n2. Implementar recordatorios automatizados por SMS y WhatsApp.";

    legTitle = "Cumplimiento HIPAA / GDPR y Secreto Profesional";
    legDesc = "Bóveda cifrada de historiales clínicos, consentimiento informado digital y privacidad estricta.";
    legDetails = "### Resumen Ejecutivo\nCumplimiento estricto de normativas de datos sensibles de salud.\n\n### Análisis de Viabilidad e Impacto\nCero riesgo de vulneración de privacidad médica.\n\n### Plan de Acción y Próximos Pasos\n1. Realizar auditoría de cumplimiento HIPAA/GDPR.\n2. Implementar cifrado de extremo a extremo en consultas.";

    rel1Label = "Viabilidad financiera de consultas";
    rel2Label = "Adopción de pacientes y doctores";
    rel3Label = "Regulado por secreto profesional";
    rel4Label = "Cumplimiento de pagos y normativa";
  } else if (isDating) {
    coreTitle = "Motor de Match y Algoritmos de Compatibilidad";
    coreDesc = "Algoritmos de afinidad contextual, filtros geográficos y sistema de mensajería cifrada.";
    coreDetails = "### Resumen Ejecutivo\nNúcleo tecnológico de emparejamiento inteligente basado en compatibilidad y preferencias.\n\n### Análisis de Viabilidad e Impacto\nMayor tasa de matches significativos y retención de usuarios activos.\n\n### Plan de Acción y Próximos Pasos\n1. Entrenar modelo de afinidad.\n2. Validar latencia de mensajería en tiempo real.";

    ecoTitle = "Modelo Freemium y Microtransacciones";
    ecoDesc = "Suscripciones premium con ventajas de visibilidad, boosts temporales y funcionalidades exclusivas.";
    ecoDetails = "### Resumen Ejecutivo\nEstrategia de monetización basada en micropagos y suscripciones de alto valor.\n\n### Análisis de Viabilidad e Impacto\nConversión estimada de 4-6% a usuarios de pago con alto LTV.\n\n### Plan de Acción y Próximos Pasos\n1. Diseñar funnel de conversión a premium.\n2. Integrar pasarelas de pago móvil.";

    socTitle = "Seguridad Ciudadana y Confianza Comunitaria";
    socDesc = "Verificación obligatoria de perfiles, sistema de reporte comunitario y filtros de seguridad en citas.";
    socDetails = "### Resumen Ejecutivo\nEnfoque prioritario en la protección física y digital de los usuarios durante interacciones.\n\n### Análisis de Viabilidad e Impacto\nEntorno confiable que atrae y retiene a un público exigente.\n\n### Plan de Acción y Próximos Pasos\n1. Implementar verificación de identidad fotográfica.\n2. Crear botón de alerta de seguridad en encuentros.";

    legTitle = "Privacidad de Datos y Verificación de Identidad";
    legDesc = "Protección de datos personales, términos de servicio transparentes y moderación de contenido.";
    legDetails = "### Resumen Ejecutivo\nMarco legal robusto para la gestión de datos íntimos y prevención de perfiles fraudulentos.\n\n### Análisis de Viabilidad e Impacto\nPrevención de fraudes y cumplimiento de leyes de privacidad.\n\n### Plan de Acción y Próximos Pasos\n1. Redactar políticas de privacidad claras.\n2. Integrar API de detección de cuentas falsas.";

    rel1Label = "Monetización de funciones premium";
    rel2Label = "Confianza y comunidad activa";
    rel3Label = "Protección legal y privacidad";
    rel4Label = "Cumplimiento normativo y transacciones";
  } else if (isMusic) {
    coreTitle = "CDN de Streaming y Transcodificación";
    coreDesc = "Distribución global de audio adaptativo, catálogo de pistas y transcodificación de alta fidelidad.";
    coreDetails = "### Resumen Ejecutivo\nPlataforma de streaming y distribución musical con baja latencia y alta fidelidad sonora.\n\n### Análisis de Viabilidad e Impacto\nMayor fidelización de usuarios y soporte para creadores independientes.\n\n### Plan de Acción y Próximos Pasos\n1. Integrar CDN de distribución de audio.\n2. Diseñar reproductor con soporte offline.";

    ecoTitle = "Reparto de Regalías y Suscripciones";
    ecoDesc = "Modelo de suscripción recurrente, micro-propinas a artistas y cálculo automatizado de regalías.";
    ecoDetails = "### Resumen Ejecutivo\nEstructura de monetización transparente para creadores musicales.\n\n### Análisis de Viabilidad e Impacto\nRetención de artistas por distribución equitativa de ingresos.\n\n### Plan de Acción y Próximos Pasos\n1. Diseñar matriz de regalías por stream.\n2. Conectar pasarela de cobro recurrente.";

    socTitle = "Comunidad de Creadores y Descubrimiento";
    socDesc = "Algoritmos de recomendación curatorial, perfiles de artistas y comunidad de oyentes.";
    socDetails = "### Resumen Ejecutivo\nEspacio colaborativo que impulsa el descubrimiento de artistas independientes.\n\n### Análisis de Viabilidad e Impacto\nCrecimiento orgánico de la base de usuarios y engagement diario.\n\n### Plan de Acción y Próximos Pasos\n1. Implementar motor de recomendaciones musicales.\n2. Habilitar perfiles de creadores con feed de lanzamientos.";

    legTitle = "Derechos de Autor y Licenciamiento Musical";
    legDesc = "Gestión de contratos editoriales, licencias de reproducción mecánica y sincronización.";
    legDetails = "### Resumen Ejecutivo\nBlindaje legal en contratos de distribución musical y derechos de autor.\n\n### Análisis de Viabilidad e Impacto\nCero contingencias por infracción de copyright.\n\n### Plan de Acción y Próximos Pasos\n1. Parametrizar contratos de licenciamiento digital.\n2. Auditar cumplimiento de sociedades de gestión colectiva.";

    rel1Label = "Monetización y reparto de regalías";
    rel2Label = "Comunidad y descubrimiento de artistas";
    rel3Label = "Licenciamiento y derechos de autor";
    rel4Label = "Cumplimiento normativo y financiero";
  } else {
    const topic = extractCleanTopic(fullContext, lang);
    coreTitle = `Arquitectura Central de ${topic}`;
    coreDesc = `Plataforma y motor operativo central diseñado a medida para ${topic}.`;
    coreDetails = `### Resumen Ejecutivo\nArquitectura tecnológica diseñada para sustentar los flujos clave y la escalabilidad de ${topic}.\n\n### Análisis de Viabilidad e Impacto\nAutomatización operativa y reducción de costos técnicos.\n\n### Plan de Acción y Próximos Pasos\n1. Diseñar el esquema de base de datos y microservicios.\n2. Desplegar MVP inicial para validación de mercado.`;

    ecoTitle = `Modelo Financiero de ${topic}`;
    ecoDesc = `Estructura de monetización, costos de infraestructura y proyecciones de rentabilidad para ${topic}.`;
    ecoDetails = `### Resumen Ejecutivo\nAnálisis de viabilidad financiera, ingresos recurrentes y márgenes de rentabilidad para ${topic}.\n\n### Análisis de Viabilidad e Impacto\nRetorno de inversión sólido y sostenibilidad económica.\n\n### Plan de Acción y Próximos Pasos\n1. Establecer precios y planes de monetización.\n2. Calcular costos operativos por unidad o usuario.`;

    socTitle = `Impacto Social y Usuarios de ${topic}`;
    socDesc = `Adopción comunitaria, reducción de fricciones y experiencia de usuario en ${topic}.`;
    socDetails = `### Resumen Ejecutivo\nEnfoque centrado en las personas para asegurar una adopción intuitiva y un impacto positivo en ${topic}.\n\n### Análisis de Viabilidad e Impacto\nFidelización de usuarios y recomendación orgánica.\n\n### Plan de Acción y Próximos Pasos\n1. Realizar pruebas de usabilidad con usuarios representativos.\n2. Incorporar retroalimentación directa en el ciclo de desarrollo.`;

    legTitle = `Marco Regulatorio y Legal de ${topic}`;
    legDesc = `Garantía de cumplimiento normativo, privacidad de datos y protección legal aplicada a ${topic}.`;
    legDetails = `### Resumen Ejecutivo\nBlindaje normativo y contractual para operar con total seguridad y transparencia en ${topic}.\n\n### Análisis de Viabilidad e Impacto\nPrevención de contingencias legales y cumplimiento regulatorio.\n\n### Plan de Acción y Próximos Pasos\n1. Auditar normativas aplicables al sector.\n2. Redactar términos de servicio y contratos comerciales.`;

    rel1Label = "Sustenta viabilidad financiera";
    rel2Label = "Facilita adopción por usuarios";
    rel3Label = "Alineado con marco regulatorio";
    rel4Label = "Sustento normativo y económico";
  }

  const core: ConceptNode = {
    id: uid("n"),
    kind: "concept",
    status: "confirmed",
    phase: "planning",
    category: "technical",
    priority: "high",
    relevanceScore: 10,
    val: 18,
    importance: 0.9,
    x: 60,
    y: 160,
    z: 0,
    title: coreTitle,
    description: coreDesc,
    metadata: "Relevancia 10/10 • Técnico",
    details: coreDetails,
  };

  const economicNode: ConceptNode = {
    id: uid("n"),
    kind: "viability",
    status: "exploring",
    phase: "execution",
    category: "economic",
    priority: "high",
    relevanceScore: 9,
    val: 14,
    importance: 0.8,
    x: 400,
    y: 160,
    z: 15,
    title: ecoTitle,
    description: ecoDesc,
    metadata: "Relevancia 9/10 • Económico",
    details: ecoDetails,
  };

  const socialNode: ConceptNode = {
    id: uid("n"),
    kind: "concept",
    status: "exploring",
    phase: "planning",
    category: "political",
    priority: "medium",
    relevanceScore: 8,
    val: 12,
    importance: 0.7,
    x: 60,
    y: 400,
    z: -15,
    title: socTitle,
    description: socDesc,
    metadata: "Relevancia 8/10 • Social",
    details: socDetails,
  };

  const legalNode: ConceptNode = {
    id: uid("n"),
    kind: "risk",
    status: "review",
    phase: "validation",
    category: "legal",
    priority: "high",
    relevanceScore: 9,
    val: 14,
    importance: 0.8,
    x: 400,
    y: 400,
    z: 5,
    title: legTitle,
    description: legDesc,
    metadata: "Relevancia 9/10 • Legal",
    details: legDetails,
  };

  const rel1: ConceptRelation = {
    id: uid("r"),
    from: core.id,
    to: economicNode.id,
    source: core.id,
    target: economicNode.id,
    type: "funds",
    value: 4,
    label: rel1Label,
  };

  const rel2: ConceptRelation = {
    id: uid("r"),
    from: core.id,
    to: socialNode.id,
    source: core.id,
    target: socialNode.id,
    type: "enables",
    value: 5,
    label: rel2Label,
  };

  const rel3: ConceptRelation = {
    id: uid("r"),
    from: core.id,
    to: legalNode.id,
    source: core.id,
    target: legalNode.id,
    type: "regulates",
    value: 4,
    label: rel3Label,
  };

  const rel4: ConceptRelation = {
    id: uid("r"),
    from: economicNode.id,
    to: legalNode.id,
    source: economicNode.id,
    target: legalNode.id,
    type: "depends_on",
    value: 3,
    label: rel4Label,
  };

  const newNodes = [core, economicNode, socialNode, legalNode];
  const newRelations = [rel1, rel2, rel3, rel4];

  return { core, economicNode, socialNode, legalNode, newNodes, newRelations };
}

const ai: AIService = {
  async reply({ text, map, lang, replyTo, chatPhase, messageHistory }) {
    await latency(1200);
    if (FAIL_WORDS.test(text)) throw new ServiceError("unknown");

    const now = new Date().toISOString();
    const activePhase: ChatPhase =
      chatPhase || (map.nodes.length > 0 ? "PHASE_3_EXPANSION" : "PHASE_1_DISCOVERY");

    if (activePhase === "PHASE_1_DISCOVERY") {
      const trimmedText = text.trim();
      const isGreeting = /^(hola|buenas|buenos d[ií]as|buenas tardes|hey|hello|hi|que tal|saludos)[!.]*$/i.test(trimmedText);
      const isVagueShort = /^(tengo una idea|quiero hacer una app|quiero crear una aplicaci[oó]n|ayuda|no s[eé]|quiero programar algo|app|proyecto)[!.]*$/i.test(trimmedText);

      const userHistoryText = (messageHistory ?? [])
        .filter((m) => m.role === "user")
        .map((m) => ("text" in m ? String((m as any).text ?? "") : String((m as any).content ?? "")))
        .join(" ");

      const currentTextSignals = `${text} ${userHistoryText}`;
      const fullConversation = currentTextSignals;
      const currentTextHasRestaurantSignal = /restauran|meser[oa]|comanda|\bcocina\b|\bkitchen\b|gastronom|bar|cafeter[ií]a|sede|franquicia|pos|men[uú]|mesa|kds|pizzer|comida|delivery|reparto/i.test(text);
      const currentTextHasOtherDomainSignal =
        /transporte|flota|bus|buses|taxi|rutas?|pasajer|movilidad|veh[ií]cul|tr[aá]nsito|cita|dating|pareja|match|doctor|m[eé]dic|salud|cl[ií]nic|paciente|m[uú]sic|streaming|audio|creador|artista|abogado|law|legal|asesor|consultorio|cliente|paciente/i.test(text);

      const isTransport = /transporte|flota|bus|buses|taxi|rutas?|pasajer|movilidad|veh[ií]cul|tr[aá]nsito/i.test(currentTextSignals);
      const isRestaurant =
        currentTextHasRestaurantSignal ||
        (!currentTextHasOtherDomainSignal && !isTransport && /restauran|meser[oa]|comanda|\bcocina\b|\bkitchen\b|gastronom|bar|cafeter[ií]a|sede|franquicia|pos|men[uú]|mesa|kds|pizzer|comida|delivery|reparto/i.test(userHistoryText));
      const isDoctor =
        !isTransport &&
        (/doctor|m[eé]dic|salud|cl[ií]nic|paciente|telemedicina/i.test(currentTextSignals) ||
          /cita(s)?\s+m[eé]dica/i.test(currentTextSignals));
      const isDating =
        !isTransport &&
        !isDoctor &&
        !/m[eé]dic|doctor|cl[ií]nic|salud|paciente/i.test(currentTextSignals) &&
        /cita(s)?(\s+rom[aá]ntica|\s+a\s+ciegas|\s+casual)?|dating|pareja|match/i.test(currentTextSignals);
      const isMusic = !isTransport && !isDoctor && !isDating && /m[uú]sic|streaming|audio|creador|artista/i.test(currentTextSignals);
      const isSoftwareConcept = /(app|plataforma|sistema|diseñar|desarrollar|crear|empresa)\s+(de\s+)?(transporte|flota|bus|movilidad|citas|m[uú]sica|doctores|salud|streaming|gesti[oó]n|restauran|meser|inventario|log[ií]stica|educaci[oó]n|finanzas|tienda|ecommerce|erp|crm|pos|reservas|pizzer|comida)/i.test(trimmedText);

      const isReadyCommand =
        /^(listo|generar|generar arquitectura|adelante|comenzar|perfecto|estructurar|empezar|crear proyecto)[!.,\s]*$/i.test(trimmedText) ||
        /(listo.*generar|generar.*arquitectura|estoy listo|está listo|todo definido|generar proyecto|crear arquitectura|generar arquitectura multidimensional)/i.test(trimmedText);

      const isQuestionnaireSubmission =
        /respuestas?\s*(al)?\s*cuestionario/i.test(trimmedText) ||
        /(^|\n)\d+\.\s*¿.*?\?.*->/i.test(trimmedText) ||
        /(^|\n)\d+\.\s+.*?->/i.test(trimmedText);

      let totalQuestionsInSubmission = 0;
      let rejectedQuestionsCount = 0;
      const acceptedAnswers: string[] = [];
      const rejectedQuestions: string[] = [];

      if (isQuestionnaireSubmission) {
        const lines = trimmedText.split("\n");
        for (const line of lines) {
          const match = /(\d+)\.\s*(.*?)\s*->\s*(.*)/.exec(line);
          if (match) {
            totalQuestionsInSubmission += 1;
            const qTitle = match[2].trim();
            const qAnswer = match[3].trim();
            const isLineReject =
              /(ninguna\s+de\s+las\s+(opciones|anteriores)|no\s+me\s+(parece|gusta|convence|sirve)\s+ninguna|ninguna\s+me\s+parece|no\s+aplica\s+ninguna|ninguna\s+opci[oó]n)/i.test(qAnswer) &&
              !/otra:\s*\S+/i.test(qAnswer);
            if (isLineReject) {
              rejectedQuestionsCount += 1;
              rejectedQuestions.push(qTitle);
            } else {
              acceptedAnswers.push(qAnswer);
            }
          }
        }
      }

      const isRejectingOptions =
        /(ninguna\s+de\s+las\s+(opciones|anteriores)|no\s+me\s+(parece|gusta|convence|sirve)\s+ninguna|ninguna\s+me\s+parece|no\s+aplica\s+ninguna|ninguna\s+opci[oó]n|no\s+me\s+sirve)/i.test(trimmedText) &&
        !/otra:\s*\S+/i.test(trimmedText);

      const isChangeIdea = /(cambiar|otra idea|nueva idea|mejor quiero|en vez de|en lugar de)/i.test(trimmedText);
      const hasExplicitKeywords = /transporte|flota|bus|gps|telemetr[ií]a|recaudo|nfc|qr|doctores|usuarios comunes|ambos|ninguna de las anteriores|opci[oó]n \d|algoritmo|telemedicina|presencial|h[ií]brida|b[oó]veda|suscripci[oó]n|comisi[oó]n|tarifa plana|afinidad|biom[eé]trica|freemium|regal[ií]as|cdn|streaming|superadmin|franquicia|gerente de sede|multi-tenant|impresoras t[eé]rmicas|hardware pos|offline-first|rbac|meser|\bcocina\b|comanda/i.test(trimmedText);

      const isTotalRejection = isQuestionnaireSubmission
        ? (totalQuestionsInSubmission > 0 && rejectedQuestionsCount === totalQuestionsInSubmission)
        : (isRejectingOptions && !hasExplicitKeywords && !isQuestionnaireSubmission);

      const isPartialQuestionnaireAnswer = isQuestionnaireSubmission && acceptedAnswers.length > 0 && rejectedQuestionsCount > 0;

      const lastAssistantMsg = messageHistory && messageHistory.length > 0 ? messageHistory[messageHistory.length - 1] : null;
      const isImmediatelyAfterQuestionnaire = Boolean(
        lastAssistantMsg &&
        lastAssistantMsg.role === "assistant" &&
        (lastAssistantMsg as any).discoveryQuestions?.length > 0
      );

      // Preguntas y aclaraciones abiertas en el chat
      const isQuestionOrClarification =
        !isQuestionnaireSubmission &&
        (/[¿?]|(^|[^\wáéíóúÁÉÍÓÚñÑ])(qu[eé]\s+(es|significa|diferencia|ventaja|desventaja|opinas|recomiendas)|c[oó]mo\s+(se|funciona|hace|conectar|integrar)|por\s*qu[eé]|cu[aá]l\s+(es|ser[ií]a)|no\s+entend[ií]|expl[ií]came|aclara|duda|pregunta|diferencia\s+entre)([^\wáéíóúÁÉÍÓÚñÑ]|$)/i.test(trimmedText));

      // Consultoría abierta, preguntas sobre implementación y ejemplos de la industria (Toast POS, Square, pros/contras)
      const isConsultingOrExamples =
        !isQuestionnaireSubmission &&
        /(ejemplo|similar|toast|square|opentable|pros y contras|ventajas|desventajas|recomiend|qu[eé] me recomiendas|consejo|arquitectura recomendada|diferencia entre|como se hace|c[oó]mo se hace)/i.test(trimmedText);

      const isExploringDimension =
        /(explorar punto de vista|punto de vista|dimensi[oó]n|ver desde el punto de vista)\s*(econ[oó]mic|social|t[eé]cnic|legal|humano|mesero|pasajer)/i.test(trimmedText);

      const isExplicitAnswer = !isChangeIdea && !isSoftwareConcept && !isQuestionOrClarification && !isTotalRejection && (hasExplicitKeywords || (isQuestionnaireSubmission && acceptedAnswers.length > 0));

      const isAnswerToQuestionnaire =
        (isQuestionnaireSubmission && !isTotalRejection) ||
        isExplicitAnswer ||
        (isImmediatelyAfterQuestionnaire && !isChangeIdea && !isSoftwareConcept && !isReadyCommand && !isQuestionOrClarification && !isConsultingOrExamples && !isTotalRejection);

      // El filtro fuera de contexto NUNCA debe actuar sobre cuestionarios, respuestas, comandos ni ideas de software legítimas
      const isOffTopic =
        !isQuestionnaireSubmission &&
        !isAnswerToQuestionnaire &&
        !isReadyCommand &&
        !isExploringDimension &&
        !isSoftwareConcept &&
        !isRestaurant &&
        !isTransport &&
        !isTotalRejection &&
        OFF_TOPIC_WORDS.test(text);

      // Regla 1: Idea vaga o fuera de tema genuino (ej. recetas, chistes, deportes no relacionados)
      if (isGreeting || isVagueShort || isOffTopic) {
        return {
          message: {
            id: uid("m"),
            role: "assistant",
            createdAt: now,
            replyTo,
            cardType: isOffTopic ? "warning" : "idea",
            chatPhase: "PHASE_1_DISCOVERY",
            action: "chat",
            readyForStructuring: false,
            text: isOffTopic
              ? (lang === "es"
                  ? "Tu mensaje parece estar fuera del alcance de este proyecto de software. Como tu arquitecto consultor, cuéntame: ¿qué tipo de proyecto o aplicación digital te gustaría construir?"
                  : "Your message seems outside the scope of this software project. As your consultant architect, tell me: what kind of digital project or app would you like to build?")
              : (lang === "es"
                  ? "¡Hola! Cuéntame, ¿qué tipo de proyecto o aplicación de software tienes en mente? ¿Qué problema resolverá y quiénes serán sus usuarios?"
                  : "Hello! Tell me, what kind of software project or app do you have in mind? What problem will it solve and who will use it?"),
            simplifiedExplanation: isOffTopic
              ? (lang === "es" ? "Mensaje fuera de contexto detectado." : "Off-topic message detected.")
              : (lang === "es"
                  ? "Exploremos tu idea de software con preguntas abiertas antes de definir cuestionarios específicos."
                  : "Let's explore your software idea with open questions before defining questionnaires."),
            discoveryQuestions: [],
          },
          newNodes: [],
          newRelations: [],
        };
      }

      // Validador de Evento: El usuario indica que ninguna de las opciones le parece adecuada (Rechazo total)
      if (isTotalRejection) {
        return {
          message: {
            id: uid("m"),
            role: "assistant",
            createdAt: now,
            replyTo,
            cardType: "idea",
            chatPhase: "PHASE_1_DISCOVERY",
            action: "chat",
            readyForStructuring: false,
            text:
              lang === "es"
                ? "Entiendo perfectamente que ninguna de las opciones propuestas se ajusta a lo que buscas. En el diseño de software cada proyecto tiene matices y requerimientos únicos. Cuéntame con tus propias palabras: ¿cómo te imaginas esta parte o qué enfoque alternativo prefieres? Como tu arquitecto consultor, podemos explorar otros modelos o ejemplos reales para definirlo a tu medida."
                : "I understand that none of the proposed options match what you're looking for. In software architecture, every project has unique requirements. Tell me in your own words: how do you envision this part or what alternative approach do you prefer? As your consultant architect, we can explore other models or real-world examples to tailor it to your vision.",
            simplifiedExplanation:
              lang === "es"
                ? "Rechazo de opciones detectado: abriendo consultoría para redefinir el enfoque según tu visión."
                : "Option rejection detected: opening consultation to redefine the approach to your vision.",
            discoveryQuestions: [],
          },
          newNodes: [],
          newRelations: [],
        };
      }

      // Consultoría técnica y aclaraciones con ejemplos del mundo real
      if (isConsultingOrExamples || isQuestionOrClarification) {
        let consultText = "";
        const isMultiTenantQ = /multi-tenant|aislad|base de datos|sincronizac/i.test(trimmedText);
        const isOfflineQ = /offline|sin internet|red local|wifi|desconexi[oó]n/i.test(trimmedText);
        const isHardwareQ = /hardware|impresora|pos|kds|pantalla|comanda/i.test(trimmedText);

        if (isMultiTenantQ) {
          consultText =
            lang === "es"
              ? "En cuanto a la arquitectura de datos para restaurantes:\n\n- **Multi-tenant con particionado lógico**: Es el estándar de plataformas como Toast y Square. Permite que todas las sedes compartan la infraestructura base pero con datos estrictamente aislados por identificador de local, reduciendo los costos operativos y permitiendo actualizaciones globales instantáneas.\n- **Bases de datos aisladas por local**: Ofrecen máximo aislamiento físico, pero incrementan los costos de servidores y complican los reportes consolidados para franquicias.\n\nRecomendamos iniciar con un modelo multi-tenant híbrido con caché local. ¿Deseas profundizar en este enfoque o explorar la parte de hardware?"
              : "Regarding data architecture: multi-tenant architecture with logical partitioning provides lower costs and centralized updates, while isolated databases offer maximum physical separation.";
        } else if (isOfflineQ) {
          consultText =
            lang === "es"
              ? "La arquitectura **Offline-First** es crítica en gastronomía:\n\nSi el internet del local falla durante una hora pico, las comandas no se pueden detener. Los meseros registran los pedidos en la base de datos local de la tablet (ej. SQLite / PouchDB) y los paquetes se envían por la red Wi-Fi local directamente a la pantalla KDS de la cocina o a la impresora térmica mediante WebSockets o MQTT local. Al recuperar la conexión a internet, todo se sincroniza silenciosamente con la nube.\n\n¿Quieres que incorporemos esta resiliencia técnica como requerimiento central?"
              : "Offline-First architecture ensures waitstaff can continue tableside ordering over local Wi-Fi even during internet outages, syncing automatically once reconnected.";
        } else if (isHardwareQ || isRestaurant || /restauran|meser|cocina|comanda|kds|pos|toast|square/i.test(trimmedText)) {
          consultText =
            lang === "es"
              ? "En la industria de restaurantes, plataformas líderes como **Toast POS** y **Square for Restaurants** combinan tres pilares esenciales:\n\n1. **Comanderas móviles táctiles para meseros**: Toman el pedido al pie de la mesa y cobran de inmediato con lectores chip/contactless, reduciendo tiempos de servicio en más de un 25%.\n2. **KDS (Kitchen Display System) en cocina**: Sustituye comandas de papel por pantallas digitales que priorizan comandas según tiempos de cocción y alertan a los meseros cuando el plato está listo para servir.\n3. **Resiliencia Offline-First**: Si el internet del local falla, el salón y la cocina continúan comunicándose por red local (LAN) para que ningún pedido se pierda ni se detenga el servicio.\n\n¿Deseas que prioricemos la sincronización local offline para meseros o prefieres explorar el modelo de comisiones y facturación fiscal?"
              : "In the restaurant industry, leading platforms like Toast POS and Square for Restaurants rely on three core components: mobile tableside ordering for waitstaff, synchronized kitchen display systems (KDS), and offline-first local network resilience. Which aspect would you like to prioritize?";
        } else {
          consultText =
            lang === "es"
              ? "Para este tipo de plataforma, la mejor práctica en la industria es iniciar con una arquitectura modular desacoplada: un núcleo operativo central con sincronización reactiva y servicios independientes para negocio, experiencia de usuario y cumplimiento legal.\n\n¿Qué módulo o aspecto te gustaría profundizar?"
              : "For this platform, industry best practices recommend a modular decoupled architecture focusing on high-value user workflows first. What specific aspect would you like to dive into?";
        }

        return {
          message: {
            id: uid("m"),
            role: "assistant",
            createdAt: now,
            replyTo,
            cardType: "idea",
            chatPhase: "PHASE_1_DISCOVERY",
            action: "chat",
            readyForStructuring: false,
            text: consultText,
            simplifiedExplanation:
              lang === "es"
                ? "Consultoría técnica y funcional con ejemplos del mundo real para guiar las decisiones del proyecto."
                : "Technical consulting with real-world examples to guide project decisions.",
            discoveryQuestions: [],
          },
          newNodes: [],
          newRelations: [],
        };
      }

      // Siguiente caso: Explorar una perspectiva estratégica individual
      if (isExploringDimension) {
        const multidim = buildMultidimensionalNodes(text, lang, messageHistory);
        const isEconomic = /econ[oó]mic/i.test(trimmedText);
        const isSocial = /social|human|meser|pasajer/i.test(trimmedText);
        const isTechnical = /t[eé]cnic/i.test(trimmedText);
        const targetedNode = isEconomic
          ? multidim.economicNode
          : isSocial
            ? multidim.socialNode
            : isTechnical
              ? multidim.core
              : multidim.legalNode;

        const populateNodes = map.nodes.length === 0;
        const newNodes = populateNodes ? multidim.newNodes : [];
        const newRelations = populateNodes ? multidim.newRelations : [];

        const contextTopic = extractCleanTopic(fullConversation, lang);
        let dimText = "";
        if (isEconomic) {
          dimText = isTransport
            ? (lang === "es"
                ? "💼 **Perspectiva Económica (Transporte y Movilidad)**:\n- **Tarifas y Recaudo**: Esquema tarifario por distancia, zona o tarifa plana con pasarelas digitales (QR/NFC) que eliminan la evasión.\n- **Liquidación Operativa**: Compensación automática a concesionarios de ruta por kilómetro recorrido o pasajero transportado.\n- **ROI**: Retorno de inversión acelerado mediante la reducción de fugas de efectivo y optimización de flotas.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D (nodo: Recaudo Digital y Tarifas de Transporte) para que explores la viabilidad financiera.*"
                : "💼 **Economic Perspective**: Digital ticketing and fare collection.")
            : isRestaurant
              ? (lang === "es"
                  ? "💼 **Perspectiva Económica**:\n- **Monetización**: Suscripción mensual SaaS por sede ($49-$99/mes) + comisiones por procesamiento de pago con tarjeta (1.5% - 2.5%).\n- **Hardware**: Costo amortizado de comanderas táctiles portátiles e impresoras térmicas ESC/POS.\n- **ROI**: Retorno de inversión en ~60 días gracias a un 15% más de rotación de mesas y cero platos perdidos.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D (nodo: Modelo Económico y Costos) para que puedas explorar su viabilidad financiera.*"
                  : "💼 **Economic Perspective**: SaaS subscription per location + card processing margin.")
              : (lang === "es"
                  ? `💼 **Perspectiva Económica**:\n- **Modelo de Ingresos**: Estructura de monetización y tarifas para ${contextTopic}.\n- **Costos Operativos**: Inversión en infraestructura tecnológica y mantenimiento.\n- **Proyecciones**: Estimación de viabilidad y punto de equilibrio financiero.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D.*`
                  : `💼 **Economic Perspective**: Monetization and operational costs for ${contextTopic}.`);
        } else if (isSocial) {
          dimText = isTransport
            ? (lang === "es"
                ? "👥 **Perspectiva Social y Humana (Pasajeros y Conductores)**:\n- **Tiempos de Espera**: Estimaciones de llegada (ETA) en vivo para reducir la incertidumbre en paradas.\n- **Accesibilidad Inclusiva**: Cobertura para zonas de difícil acceso y rampas para pasajeros con movilidad reducida.\n- **Seguridad**: Botones de asistencia en app y reportes comunitarios de incidencias en trayectos.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos (columna Político/Social) y en la Vista Neuronal 3D (nodo: Accesibilidad y Frecuencia de Rutas para Pasajeros) para que veas su articulación en el sistema.*"
                : "👥 **Social Perspective**: Passenger ETA, accessibility, and community mobility safety.")
            : isRestaurant
              ? (lang === "es"
                  ? "👥 **Perspectiva Social y Humana (Meseros y Cocina)**:\n- **Reducción del estrés**: Elimina los gritos y carreras entre salón y cocina; el KDS avisa silenciosamente al mesero.\n- **Curva de aprendizaje**: Interfaz ultra-intuitiva estilo smartphone para que un mesero nuevo opere en menos de 15 minutos.\n- **Transparencia en Propinas**: Registro auditable de propinas asignadas por mesa y turno, fomentando la confianza del equipo.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos (columna Político/Social) y en la Vista Neuronal 3D (nodo: Bienestar y Adopción de Meseros) para que veas su articulación en el sistema.*"
                  : "👥 **Social & Human Perspective**: Reduces kitchen-floor friction and ensures fair tip distribution.")
              : (lang === "es"
                  ? `👥 **Perspectiva Social y de Usuarios**:\n- **Adopción**: Curva de aprendizaje intuitiva y reducción de fricciones para los usuarios de ${contextTopic}.\n- **Impacto Comunitario**: Beneficio directo y mejora en la calidad de vida de los usuarios.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D.*`
                  : `👥 **Social Perspective**: User adoption and social impact for ${contextTopic}.`);
        } else if (isTechnical) {
          dimText = isTransport
            ? (lang === "es"
                ? "⚙️ **Perspectiva Técnica (Flotas y Telemetría)**:\n- **Telemetría GPS**: Transmisión de coordenadas en tiempo real cada 3-5 segundos vía MQTT/WebSockets.\n- **Algoritmo de Despacho**: Balanceo automático de intervalos entre buses para evitar pelotones o huecos en ruta.\n- **Modo Offline**: Almacenamiento local de validaciones en buses con sincronización automática en patios de recarga o paraderos con Wi-Fi.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D (nodo: Despacho y Telemetría de Flotas GPS) para que explores la infraestructura.*"
                : "⚙️ **Technical Perspective**: Real-time GPS telemetry and fleet dispatch algorithms.")
            : isRestaurant
              ? (lang === "es"
                  ? "⚙️ **Perspectiva Técnica**:\n- **Offline-First**: Base de datos local (SQLite/PouchDB) sincronizada por WebSockets/MQTT en la red Wi-Fi del restaurante.\n- **Impresión térmica**: Controladores ESC/POS directos en red para barra y cocina.\n- **KDS reactivo**: Pantallas táctiles de cocina actualizadas en menos de 200ms al enviar la comanda.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D (nodo: Arquitectura Central) para que explores la infraestructura.*"
                  : "⚙️ **Technical Perspective**: Offline-first SQLite replication, direct thermal printer integration, and real-time KDS screens.")
              : (lang === "es"
                  ? `⚙️ **Perspectiva Técnica**:\n- **Arquitectura**: Microservicios escalables, APIs reactivas y sincronización de datos para ${contextTopic}.\n- **Disponibilidad**: Resiliencia y alta disponibilidad para operaciones críticas.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D.*`
                  : `⚙️ **Technical Perspective**: Scalable architecture and APIs for ${contextTopic}.`);
        } else {
          dimText = isTransport
            ? (lang === "es"
                ? "⚖️ **Perspectiva Legal y Regulatoria (Transporte)**:\n- **Licencias y Rutas**: Habilitación oficial de rutas ante autoridades municipales o el ministerio de transporte.\n- **Seguros Obligatorios**: Pólizas contractuales y extracontractuales (SOAT y responsabilidad civil para pasajeros).\n- **Normativa Laboral**: Turnos máximos de conducción y control de fatiga para chóferes.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D (nodo: Regulación de Tránsito y Seguros de Pasajeros) para que explores el marco regulatorio.*"
                : "⚖️ **Legal Perspective**: Transit regulatory compliance and mandatory passenger insurance policies.")
            : isRestaurant
              ? (lang === "es"
                  ? "⚖️ **Perspectiva Legal y Regulatoria**:\n- **Facturación electrónica**: Integración directa con las autoridades tributarias para tickets y facturas con código QR.\n- **Normativa laboral**: Control horario de fichajes de meseros conforme a la regulación de jornadas.\n- **Protección de datos**: Cumplimiento de normativas de privacidad en datos de comensales y reservas.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D (nodo: Facturación Fiscal y Normativa) para que explores el marco regulatorio.*"
                  : "⚖️ **Legal Perspective**: Fiscal electronic invoicing compliance and labor regulations for waitstaff shifts.")
              : (lang === "es"
                  ? `⚖️ **Perspectiva Legal y Regulatoria**:\n- **Cumplimiento**: Normativa sectorial y protección de datos aplicables a ${contextTopic}.\n- **Contratos y Términos**: Blindaje legal de acuerdos de servicio y responsabilidades.\n\n✨ *He estructurado los conceptos clave en tu Tablero de Conceptos y Espacio Neuronal 3D.*`
                  : `⚖️ **Legal Perspective**: Regulatory compliance for ${contextTopic}.`);
        }

        return {
          message: {
            id: uid("m"),
            role: "assistant",
            createdAt: now,
            replyTo,
            cardType: "idea",
            chatPhase: "PHASE_1_DISCOVERY",
            action: "ready",
            readyForStructuring: true,
            dimensions: ["economic", "social", "technical", "legal"],
            text: dimText,
            simplifiedExplanation:
              lang === "es"
                ? "Análisis detallado de la perspectiva estratégica seleccionada y reflejo en el Tablero y Vista 3D."
                : "Detailed analysis of the selected strategic perspective reflected in Board and 3D View.",
            discoveryQuestions: [],
            actionableNode: {
              title: targetedNode.title,
              description: targetedNode.description,
              kind: targetedNode.kind,
              category: targetedNode.category,
              priority: targetedNode.priority,
              phase: targetedNode.phase || "planning",
              metadata: targetedNode.metadata,
              details: targetedNode.details,
            },
          },
          newNodes,
          newRelations,
        };
      }

      // Regla 3: Usuario respondió cuestionario o idea está 100% clara y lista para generar
      if (isReadyCommand || isAnswerToQuestionnaire) {
        const hasCustomAnswer = /otra:\s*([^\n,]+)/i.exec(trimmedText);
        const customDetail = hasCustomAnswer ? hasCustomAnswer[1].trim() : "";
        let readyText = "";
        if (isPartialQuestionnaireAnswer) {
          readyText = lang === "es"
            ? `¡Excelente! He registrado tus decisiones y requerimientos técnicos:\n\n${acceptedAnswers.map((ans) => `• **${ans}**`).join("\n")}\n\nRespecto a la pregunta donde ninguna opción propuesta se ajustaba (${rejectedQuestions.map((q) => `"${q}"`).join(", ")}), mantendremos esa capa completamente flexible y abierta para adaptarla sobre la marcha.\n\nCon esta base clara, podemos examinar tu proyecto desde diferentes puntos de vista estratégicos (Económico, Social, Técnico y Legal) o pasar directamente a generar la arquitectura en el Tablero de Conceptos y la Vista Neuronal 3D.`
            : `Great! I noted your technical decisions:\n\n${acceptedAnswers.map((ans) => `• **${ans}**`).join("\n")}\n\nRegarding the question where none of the options fit, we'll keep that layer open and tailored as we proceed. The core idea is ready to be structured into its strategic dimensions.`;
        } else if (customDetail) {
          readyText = lang === "es"
            ? `¡Excelente! He integrado tus requerimientos y enfoque personalizado ("${customDetail}"). La idea base está claramente delimitada y podemos analizarla desde diferentes puntos de vista estratégicos (Económico, Social, Técnico y Legal). Puedes explorar una perspectiva en detalle o generar la arquitectura multidimensional completa en el Tablero y Vista 3D.`
            : `Great! I integrated your custom requirements ("${customDetail}"). The core idea is clearly defined and we can explore it through multiple strategic perspectives (Economic, Social, Technical, and Legal). You can explore a perspective in detail or generate the complete architecture for the Board and 3D Canvas.`;
        } else {
          readyText = lang === "es"
            ? "¡Excelente! Tenemos los requerimientos y el alcance bien definidos. La idea base está clara y podemos verla desde diferentes puntos de vista estratégicos (Económico, Social, Técnico y Legal). Puedes explorar una perspectiva en detalle o pulsar para generar la arquitectura multidimensional completa en el Tablero y Vista 3D."
            : "Great! We have defined the scope and requirements. The core idea is clear and we can examine it from multiple strategic perspectives (Economic, Social, Technical, and Legal). You can explore a perspective in detail or generate the complete architecture for the Board and 3D Canvas.";
        }

        return {
          message: {
            id: uid("m"),
            role: "assistant",
            createdAt: now,
            replyTo,
            cardType: "idea",
            chatPhase: "PHASE_1_DISCOVERY",
            action: "ready",
            readyForStructuring: true,
            dimensions: ["economic", "social", "technical", "legal"],
            text: readyText,
            simplifiedExplanation:
              lang === "es"
                ? "Tu idea está delimitada. Puedes explorar puntos de vista específicos o pulsar el botón para desbloquear el tablero y generar la arquitectura multidimensional."
                : "Your idea is defined. You can explore specific perspectives or click the button to unlock the board and generate the multidimensional architecture.",
            discoveryQuestions: [],
          },
          newNodes: [],
          newRelations: [],
        };
      }

      // Regla 2: Idea clara -> Generar exactamente 3 preguntas clave hiper-personalizadas al dominio
      let discoveryQuestions = [];
      if (isTransport) {
        discoveryQuestions = [
          {
            id: "q-1",
            type: "single" as const,
            allowCustom: true,
            question:
              lang === "es"
                ? "¿Cómo se gestionará la operación, el despacho y la supervisión de las unidades de transporte?"
                : "How will fleet operations, dispatch, and unit supervision be managed?",
            options: [
              lang === "es"
                ? "Despacho centralizado con seguimiento telemático GPS en tiempo real y asignación dinámica de frecuencias"
                : "Centralized dispatch with real-time GPS telemetry and dynamic route frequency allocation",
              lang === "es"
                ? "Gestión por itinerarios fijos con control de salidas en cabeceras de ruta y terminales"
                : "Fixed schedule management with departure control at route terminals",
              lang === "es"
                ? "Monitoreo cooperativo entre conductores con reportes automáticos de demoras e incidentes viales"
                : "Cooperative driver monitoring with automated incident and delay reporting",
            ],
          },
          {
            id: "q-2",
            type: "multiple" as const,
            allowCustom: true,
            question:
              lang === "es"
                ? "¿Qué esquema de recaudo, pago y tarifas adoptará el sistema de transporte?"
                : "What fare collection, payment, and ticketing model will the transit system adopt?",
            options: [
              lang === "es"
                ? "Validadores contactless NFC para tarjetas inteligentes de transporte y tarjetas bancarias"
                : "Contactless NFC validators for smart transit cards and bank cards",
              lang === "es"
                ? "Recaudo digital mediante app móvil con códigos QR dinámicos y billeteras electrónicas"
                : "Digital fare collection via mobile app with dynamic QR codes and e-wallets",
              lang === "es"
                ? "Tarifa integrada multimodal con transbordos bonificados y pago mixto a bordo"
                : "Multimodal integrated fare with discounted transfers and mixed onboard payment",
            ],
          },
          {
            id: "q-3",
            type: "multiple" as const,
            allowCustom: true,
            question:
              lang === "es"
                ? "¿Qué herramientas y servicios de cara al pasajero priorizará la plataforma?"
                : "What passenger-facing tools and services will the platform prioritize?",
            options: [
              lang === "es"
                ? "App ciudadana en tiempo real con tiempos estimados de llegada (ETA) y alertas de saturación"
                : "Real-time citizen app with estimated time of arrival (ETA) and overcrowding alerts",
              lang === "es"
                ? "Pantallas informativas sincronizadas en estaciones, paradas clave y dentro de los buses"
                : "Synchronized digital info screens at stations, key stops, and inside buses",
              lang === "es"
                ? "Módulos de accesibilidad inclusiva, reporte comunitario de seguridad y objetos perdidos"
                : "Inclusive accessibility features, community safety reporting, and lost & found module",
            ],
          },
        ];
      } else if (isRestaurant) {
        discoveryQuestions = [
          {
            id: "q-1",
            type: "single" as const,
            allowCustom: true,
            question:
              lang === "es"
                ? "¿Cómo se estructurará la jerarquía de roles y permisos operativos en el restaurante?"
                : "How will the hierarchy of roles and operational permissions be structured in the restaurant?",
            options: [
              lang === "es"
                ? "Jerarquía entre Superadmin de franquicia, Gerente de sede, Meseros y Cocina"
                : "Hierarchy between Franchise Superadmin, Branch Manager, Waiters, and Kitchen",
              lang === "es"
                ? "Control operativo por turno: Administrador de local, Cajero y Meseros de salón"
                : "Shift-based operational control: Store Admin, Cashier, and Floor Waiters",
              lang === "es"
                ? "Acceso rápido por PIN operativo para meseros en piso y pantallas de cocina (KDS)"
                : "Fast operational PIN access for floor waiters and kitchen display systems (KDS)",
            ],
          },
          {
            id: "q-2",
            type: "multiple" as const,
            allowCustom: true,
            question:
              lang === "es"
                ? "¿Qué arquitectura de datos y sincronización requerirá la operación entre áreas o sedes?"
                : "What data architecture and synchronization will operations across areas or branches require?",
            options: [
              lang === "es"
                ? "Sincronización multi-tenant en tiempo real entre sedes, salón y cocina"
                : "Real-time multi-tenant synchronization across branches, dining floor, and kitchen",
              lang === "es"
                ? "Bases de datos aisladas por sede con consolidación al cierre de caja"
                : "Isolated per-branch databases with consolidation at register close",
              lang === "es"
                ? "Arquitectura híbrida Offline-First para operar sin cortes ante fallos de red"
                : "Hybrid Offline-First architecture for uninterrupted floor operation during network outages",
            ],
          },
          {
            id: "q-3",
            type: "multiple" as const,
            allowCustom: true,
            question:
              lang === "es"
                ? "¿Cómo se integrará la operación de comandas y meseros con el hardware del local?"
                : "How will waiter order management integrate with on-premise hardware?",
            options: [
              lang === "es"
                ? "Integración con hardware POS e impresoras térmicas de barra y cocina"
                : "Integration with POS hardware and thermal printers for bar and kitchen",
              lang === "es"
                ? "Operación 100% cloud en tablets y móviles con pantallas digitales en cocina (KDS)"
                : "100% cloud operation on tablets and mobile devices with digital kitchen displays (KDS)",
              lang === "es"
                ? "Ecosistema mixto: toma de pedidos móvil, cobro en mesa y facturación electrónica"
                : "Mixed ecosystem: mobile order taking, tableside payment, and electronic invoicing",
            ],
          },
        ];
      } else if (isDoctor && !isDating) {
        discoveryQuestions = [
          {
            id: "q-1",
            question:
              lang === "es"
                ? "¿Qué modalidad de atención y agendamiento de citas priorizará la app?"
                : "What consultation and appointment model will the app prioritize?",
            options: [
              lang === "es"
                ? "Telemedicina y videoconsultas virtuales integradas"
                : "Integrated telemedicine and virtual video visits",
              lang === "es"
                ? "Agendamiento presencial en consultorios y clínicas"
                : "In-person scheduling for clinics and offices",
              lang === "es"
                ? "Modalidad híbrida con triaje y recordatorios automatizados"
                : "Hybrid model with automated triage and reminders",
            ],
          },
          {
            id: "q-2",
            question:
              lang === "es"
                ? "¿Cómo se gestionarán los historiales médicos y la privacidad de datos?"
                : "How will medical records and health data privacy be managed?",
            options: [
              lang === "es"
                ? "Bóveda cifrada compatible con normativas de salud (HIPAA / GDPR)"
                : "Encrypted vault compliant with health standards (HIPAA / GDPR)",
              lang === "es"
                ? "Almacenamiento local en dispositivo con sincronización protegida"
                : "Local on-device storage with protected sync",
              lang === "es"
                ? "Integración vía API con sistemas de historias clínicas existentes"
                : "API integration with existing electronic health record systems",
            ],
          },
          {
            id: "q-3",
            question:
              lang === "es"
                ? "¿Cuál será el esquema de monetización del servicio médico?"
                : "What will be the monetization model for the medical service?",
            options: [
              lang === "es"
                ? "Suscripción profesional mensual para doctores y clínicas"
                : "Monthly professional subscription for doctors and clinics",
              lang === "es"
                ? "Comisión por cada consulta agendada exitosamente"
                : "Fee per successfully scheduled consultation",
              lang === "es"
                ? "Tarifa plana institucional por volumen de pacientes"
                : "Institutional flat fee by patient volume",
            ],
          },
        ];
      } else if (isDating) {
        discoveryQuestions = [
          {
            id: "q-1",
            question:
              lang === "es"
                ? "¿Qué algoritmo o enfoque de match utilizará la plataforma?"
                : "What matching algorithm or approach will the platform use?",
            options: [
              lang === "es"
                ? "Algoritmo de afinidad por intereses y estilo de vida"
                : "Affinity algorithm by interests and lifestyle",
              lang === "es"
                ? "Filtros de compatibilidad geográfica y preferencias directas"
                : "Geographic compatibility and direct preferences filters",
              lang === "es"
                ? "Cuestionarios socráticos guiados y valores compartidos"
                : "Guided questionnaires and shared values",
            ],
          },
          {
            id: "q-2",
            question:
              lang === "es"
                ? "¿Cómo se gestionará la verificación y seguridad de los perfiles?"
                : "How will profile verification and security be managed?",
            options: [
              lang === "es"
                ? "Verificación fotográfica o biométrica obligatoria"
                : "Mandatory photo or biometric verification",
              lang === "es"
                ? "Sistema de reputación y validación comunitaria"
                : "Community reputation and validation system",
              lang === "es"
                ? "Filtros de privacidad y perfiles semianónimos"
                : "Privacy filters and semi-anonymous profiles",
            ],
          },
          {
            id: "q-3",
            question:
              lang === "es"
                ? "¿Cuál será el modelo de negocio o monetización principal?"
                : "What will be the primary business or monetization model?",
            options: [
              lang === "es"
                ? "Suscripción premium recurrente (freemium)"
                : "Recurring premium subscription (freemium)",
              lang === "es"
                ? "Micropagos por funciones destacadas o boosts temporales"
                : "Micropayments for featured perks or temporary boosts",
              lang === "es"
                ? "Acceso gratuito con acuerdos de marca y alianzas de valor"
                : "Free access with brand partnerships and value alliances",
            ],
          },
        ];
      } else if (isMusic) {
        discoveryQuestions = [
          {
            id: "q-1",
            question:
              lang === "es"
                ? "¿Qué modelo de distribución y reparto de ingresos utilizará la plataforma?"
                : "What distribution and revenue share model will the platform use?",
            options: [
              lang === "es"
                ? "Reparto directo de regalías basado en reproducciones de usuarios"
                : "User-centric royalty distribution based on direct streams",
              lang === "es"
                ? "Suscripciones mensuales y propinas directas a creadores"
                : "Monthly creator subscriptions and direct tipping",
              lang === "es"
                ? "Marketplace de licencias comerciales y sincronización musical"
                : "Commercial licensing marketplace and sync royalties",
            ],
          },
          {
            id: "q-2",
            question:
              lang === "es"
                ? "¿Cómo se gestionará la infraestructura técnica y distribución de audio?"
                : "How will technical infrastructure and audio streaming be handled?",
            options: [
              lang === "es"
                ? "Red CDN global con streaming adaptativo HLS"
                : "Global CDN network with adaptive HLS streaming",
              lang === "es"
                ? "Almacenamiento en la nube con transcodificación en tiempo real"
                : "Cloud storage with real-time multi-bitrate transcoding",
              lang === "es"
                ? "Arquitectura distribuida con soporte para audio de alta fidelidad"
                : "Distributed architecture supporting lossless high-fidelity audio",
            ],
          },
          {
            id: "q-3",
            question:
              lang === "es"
                ? "¿Qué mecanismo impulsará el descubrimiento de artistas emergentes?"
                : "What mechanism will drive emerging artist discovery?",
            options: [
              lang === "es"
                ? "Algoritmo de recomendación contextual basado en preferencias"
                : "Contextual recommendation algorithm based on listening habits",
              lang === "es"
                ? "Listas curatoriales colaborativas gestionadas por la comunidad"
                : "Community-driven collaborative curatorial playlists",
              lang === "es"
                ? "Tendencias regionales y desafíos creativos semanales"
                : "Regional trends and weekly creative challenges",
            ],
          },
        ];
      } else {
        discoveryQuestions = [
          {
            id: "q-1",
            question:
              lang === "es"
                ? "¿Cómo se estructurarán los roles, jerarquías y permisos dentro del sistema?"
                : "How will roles, hierarchies, and permissions be structured within the system?",
            options: [
              lang === "es"
                ? "Jerarquía multinivel con Superadmin, Gerentes de área y Operadores"
                : "Multi-level hierarchy with Superadmin, Area Managers, and Operators",
              lang === "es"
                ? "Control de acceso basado en roles (RBAC) con permisos granulares por módulo"
                : "Role-based access control (RBAC) with granular per-module permissions",
              lang === "es"
                ? "Flujo operativo directo entre administradores y especialistas de campo"
                : "Direct operational workflow between administrators and field specialists",
            ],
          },
          {
            id: "q-2",
            question:
              lang === "es"
                ? "¿Qué arquitectura de datos y sincronización requerirá la operación del negocio?"
                : "What data architecture and synchronization will business operations require?",
            options: [
              lang === "es"
                ? "Sincronización multi-tenant en tiempo real con estado compartido en la nube"
                : "Real-time multi-tenant synchronization with shared cloud state",
              lang === "es"
                ? "Instancias de datos aisladas por unidad operativa con auditoría dedicada"
                : "Isolated data instances per operational unit with dedicated auditing",
              lang === "es"
                ? "Arquitectura híbrida Offline-First con sincronización automática al reconectar"
                : "Hybrid Offline-First architecture with automatic sync upon reconnection",
            ],
          },
          {
            id: "q-3",
            question:
              lang === "es"
                ? "¿Cómo se integrará el flujo de trabajo con dispositivos e infraestructura externa?"
                : "How will the workflow integrate with devices and external infrastructure?",
            options: [
              lang === "es"
                ? "Integración directa mediante APIs con hardware, terminales o sistemas ERP"
                : "Direct API integration with hardware terminals or ERP systems",
              lang === "es"
                ? "Operación 100% cloud optimizada para tablets, móviles y paneles de control"
                : "100% cloud operation optimized for tablets, mobile devices, and control panels",
              lang === "es"
                ? "Ecosistema modular con automatización de procesos y reportes en tiempo real"
                : "Modular ecosystem with workflow automation and real-time reporting",
            ],
          },
        ];
      }

      return {
        message: {
          id: uid("m"),
          role: "assistant",
          createdAt: now,
          replyTo,
          cardType: "idea",
          chatPhase: "PHASE_1_DISCOVERY",
          action: "questionnaire",
          readyForStructuring: false,
          text:
            lang === "es"
              ? "Entiendo tu idea inicial. Para delimitar el núcleo del proyecto y estructurar su arquitectura, responde a estas 3 preguntas clave:"
              : "I understand your initial idea. To delimit the core of the project and structure its architecture, please answer these 3 key questions:",
          simplifiedExplanation:
            lang === "es"
              ? "En Fase 1 delimitamos el alcance técnico y de negocio con 3 preguntas clave antes de generar la arquitectura."
              : "In Phase 1 we delimit the technical and business scope with 3 key questions before generating the architecture.",
          discoveryQuestions,
        },
        newNodes: [],
        newRelations: [],
      };
    }

    if (activePhase === "PHASE_2_STRUCTURING") {
      const { core, newNodes, newRelations } = buildMultidimensionalNodes(text, lang, messageHistory);

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
              ? "Hemos consolidado la idea base y sus dimensiones estratégicas. He generado los conceptos clave en tu lienzo (Técnico, Económico, Social y Legal) para que el proyecto cobre vida de forma integral en el Tablero y la Vista Neuronal 3D."
              : "We consolidated the core idea and its strategic dimensions. I generated the key concepts on your canvas (Technical, Economic, Social, and Legal) to bring the project to life in both the Board and 3D Neural View.",
          simplifiedExplanation:
            lang === "es"
              ? "Se han estructurado los 4 pilares fundamentales de tu proyecto en el lienzo y espacio 3D."
              : "The 4 fundamental pillars of your project have been structured in the canvas and 3D space.",
          insight: {
            title: lang === "es" ? "Arquitectura multidimensional establecida" : "Multidimensional architecture established",
            items: newNodes.map((n) => ({ nodeId: n.id, kind: n.kind, label: n.title })),
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
        newNodes,
        newRelations,
      };
    }

    if (OFF_TOPIC_WORDS.test(text)) {
      return {
        message: {
          id: uid("m"),
          role: "assistant",
          createdAt: now,
          replyTo,
          cardType: "warning",
          chatPhase: activePhase,
          readyForStructuring: false,
          text:
            lang === "es"
              ? "Tu mensaje parece estar fuera del alcance de este proyecto. Como tu asistente de estructuración, estoy aquí para ayudarte a definir, ramificar y validar tus ideas. ¿Retomamos donde nos quedamos?"
              : "Your message seems outside the scope of this project. As your ideation assistant, I am here to help you define, branch, and validate your ideas. Shall we pick up where we left off?",
          simplifiedExplanation:
            lang === "es" ? "Mensaje fuera de contexto detectado." : "Off-topic message detected.",
          discoveryQuestions: [],
        },
        newNodes: [],
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

export const mockServices: Services = { auth, projects, folders, workspace, ai, documents };
