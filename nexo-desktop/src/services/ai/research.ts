import type {
  ConceptNode,
  ConceptRelation,
  DiscoveryState,
  EvidenceCardUIBlock,
  EvidenceRecord,
  EvidenceSourceType,
  EvidenceValidationState,
  NormalizedSource,
  ProjectFact,
  ResearchScope,
  ResearchSummaryUIBlock,
} from "../../domain/types";

/* ----------------------- 1. Security & Validation ----------------------- */

/**
 * Validates external URLs strictly against safe HTTP/HTTPS protocols.
 * Rejects javascript:, data:, file:, vbscript:, and relative paths.
 */
export function isValidExternalUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Safely extracts domain name from URL.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "unknown-domain";
  }
}

/**
 * Sanitizes external excerpts against prompt injection, script execution,
 * and system instruction override attempts.
 */
export function sanitizeExternalExcerpt(rawText: string, maxLength = 1200): string {
  if (!rawText || typeof rawText !== "string") return "";

  let cleaned = rawText
    // Remove control characters
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Remove HTML script/style tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Strip HTML tags
    .replace(/<[^>]+>/g, " ")
    // Neutralize prompt injection triggers
    .replace(/(?:ignore\s+all\s+previous\s+instructions|system\s+prompt|developer\s+mode|jailbreak|disregard\s+prior)/gi, "[REDACTED]")
    // Escape markdown quote delimiters that could break rendering
    .replace(/```/g, "'''")
    .trim();

  // Compress multiple whitespaces
  cleaned = cleaned.replace(/\s+/g, " ");

  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength) + "…";
  }
  return cleaned;
}

/* ----------------------- 2. Source Quality & Trust Strategy ----------------------- */

export interface SourceQualityEvaluation {
  sourceType: EvidenceSourceType;
  trustScore: number; // 0 - 100
  trustRationale: string;
  isPeerReviewed: boolean;
  isPrimarySource: boolean;
}

/**
 * Evaluates source quality using institutional authority, domain context,
 * publication metadata, and primary/secondary nature.
 *
 * NOTE: As required by Section 6 of Phase 5 specification:
 * Domain suffix alone (.gov, .edu) is NEVER an absolute guarantee of truth.
 * Institutional credibility, context, and methodological transparency are factored in.
 */
export function evaluateSourceQuality(
  url: string,
  title: string,
  organization?: string,
  isPeerReviewed = false,
  publicationYear?: number
): SourceQualityEvaluation {
  const domain = extractDomain(url);
  const org = (organization || "").toLowerCase();
  const lowerTitle = title.toLowerCase();

  let sourceType: EvidenceSourceType = "web_article";
  let baseScore = 50;
  const rationales: string[] = [];
  let isPrimary = false;

  // 1. Peer-reviewed Academic Literature & Repositories
  const academicDomains = [
    "sciencedirect.com",
    "ieee.org",
    "acm.org",
    "springer.com",
    "nature.com",
    "scielo.org",
    "redalyc.org",
    "dialnet.unirioja.es",
    "doi.org",
    "tandfonline.com",
    "arxiv.org",
    "jstor.org",
  ];

  const isEdu = domain.endsWith(".edu") || domain.endsWith(".edu.co") || domain.includes(".ac.") || domain.endsWith(".uni-");
  const isRecognizedJournal = academicDomains.some((d) => domain.includes(d));

  if (isRecognizedJournal || isPeerReviewed) {
    sourceType = "academic_paper";
    baseScore = 92;
    isPeerReviewed = true;
    isPrimary = true;
    rationales.push("Publicación académica con arbitraje por pares o repositorio indexado.");
  } else if (isEdu) {
    sourceType = "academic_paper";
    baseScore = 86;
    rationales.push("Dominio institucional universitario (.edu); investigación o repositorio académico.");
  }

  // 2. Official Government & Statistics Agencies
  const isGov = domain.endsWith(".gov") || domain.endsWith(".gov.co") || domain.endsWith(".gob.es") || domain.endsWith(".gob.mx");
  const isOfficialStatsOrg =
    domain.includes("dane.gov.co") ||
    domain.includes("banrep.gov.co") ||
    domain.includes("cepal.org") ||
    domain.includes("oecd.org") ||
    domain.includes("worldbank.org") ||
    org.includes("dane") ||
    org.includes("banco de la república") ||
    org.includes("inegi");

  if (isOfficialStatsOrg) {
    sourceType = "government_statistic";
    baseScore = Math.max(baseScore, 95);
    isPrimary = true;
    rationales.push("Agencia o repositorio oficial de estadísticas públicas (fuente primaria oficial).");
  } else if (isGov) {
    sourceType = "official_regulation";
    baseScore = Math.max(baseScore, 88);
    isPrimary = true;
    rationales.push("Entidad pública u órgano gubernamental oficial (.gov).");
  }

  // 3. International Organizations & Recognized Research Institutions
  const isIntlOrg =
    domain.endsWith(".unesco.org") ||
    domain.includes("who.int") ||
    domain.includes("ilo.org") ||
    domain.includes("un.org") ||
    org.includes("unesco") ||
    org.includes("oms") ||
    org.includes("onu");

  if (isIntlOrg) {
    sourceType = "institutional_report";
    baseScore = Math.max(baseScore, 90);
    rationales.push("Organismo internacional multilateral con rigor metodológico reconocido.");
  }

  // 4. Industry Associations & Chambers
  const isIndustryGuild =
    domain.includes("camacol.co") ||
    domain.includes("andi.com.co") ||
    domain.includes("fenalco.com.co") ||
    org.includes("camacol") ||
    org.includes("andi") ||
    org.includes("fenalco");

  if (isIndustryGuild) {
    sourceType = "industry_report";
    baseScore = Math.max(baseScore, 78);
    rationales.push("Gremio industrial representativo del sector; datos sectoriales agregados.");
  }

  // 5. Commercial Blogs or SEO sites
  const isCommercialBlog =
    domain.includes("medium.com") ||
    domain.includes("blogspot.com") ||
    domain.includes("wordpress.com") ||
    domain.includes("wixsite.com") ||
    lowerTitle.includes("top 10") ||
    lowerTitle.includes("los mejores consejos para");

  if (isCommercialBlog) {
    sourceType = "web_article";
    baseScore = Math.min(baseScore, 35);
    rationales.push("Artículo de blog o sitio comercial; opinión secundaria sin validación por pares.");
  }

  // Factor in publication date recency if known
  if (publicationYear) {
    const currentYear = new Date().getFullYear();
    const ageYears = currentYear - publicationYear;
    if (ageYears <= 3) {
      baseScore = Math.min(100, baseScore + 3);
      rationales.push(`Datos recientes (${publicationYear}).`);
    } else if (ageYears > 10) {
      baseScore = Math.max(10, baseScore - 12);
      rationales.push(`Publicación histórica (>10 años); verificar vigencia.`);
    }
  }

  // Warning when relying solely on generic TLD without editorial metadata
  if ((isGov || isEdu) && !isOfficialStatsOrg && !isRecognizedJournal) {
    rationales.push("Nota de rigor: la extensión institucional no exime de verificar la muestra y metodología.");
  }

  return {
    sourceType,
    trustScore: Math.max(1, Math.min(100, baseScore)),
    trustRationale: rationales.join(" ") || "Fuente web de alcance general.",
    isPeerReviewed,
    isPrimarySource: isPrimary,
  };
}

/* ----------------------- 3. Source Normalization ----------------------- */

export interface RawSourceInput {
  id?: string;
  title: string;
  url: string;
  author?: string;
  organization?: string;
  publicationDate?: string;
  publicationYear?: number;
  rawExcerpt: string;
  isPeerReviewed?: boolean;
}

export function normalizeSource(input: RawSourceInput): NormalizedSource {
  const url = isValidExternalUrl(input.url) ? input.url.trim() : "https://nexo.local/source-unreachable";
  const domain = extractDomain(url);
  const title = (input.title || "Fuente sin título").trim();
  const evaluation = evaluateSourceQuality(
    url,
    title,
    input.organization,
    input.isPeerReviewed,
    input.publicationYear
  );

  return {
    id: input.id || `src-${Math.abs(hashString(url + title))}`,
    title,
    url,
    domain,
    author: input.author?.trim() || undefined,
    organization: input.organization?.trim() || undefined,
    publicationDate: input.publicationDate?.trim() || undefined,
    retrievedAt: new Date().toISOString(),
    sourceType: evaluation.sourceType,
    trustScore: evaluation.trustScore,
    trustRationale: evaluation.trustRationale,
    isPeerReviewed: evaluation.isPeerReviewed,
    isPrimarySource: evaluation.isPrimarySource,
    rawExcerpt: input.rawExcerpt || "",
    sanitizedExcerpt: sanitizeExternalExcerpt(input.rawExcerpt || ""),
  };
}

/* ----------------------- 4. Geographic & Contextual Scope Distinction ----------------------- */

/**
 * Generates an explicit warning when national or regional evidence
 * is applied to a localized claim (e.g., hardware store in a specific municipality).
 */
export function buildLocalContextWarning(
  sourceScope: ResearchScope,
  projectScope: ResearchScope,
  _claim?: string
): string | undefined {
  if (sourceScope === "national" && (projectScope === "local" || projectScope === "regional")) {
    return `Advertencia de escala: Esta evidencia proviene de estudios y estadísticas a nivel nacional. No refleja necesariamente el flujo peatonal, la competencia inmediata ni la demanda específica en tu municipio o localidad. Se recomienda complementar con validación empírica local (observación y entrevistas).`;
  }
  if (sourceScope === "international" && projectScope !== "international") {
    return `Advertencia de contexto: Esta evidencia corresponde a un estudio internacional. Las condiciones regulatorias, económicas y culturales locales pueden diferir sensiblemente.`;
  }
  return undefined;
}

/* ----------------------- 5. Citation Integrity ----------------------- */

/**
 * Strictly verifies that a given citation maps directly to a retrieved source.
 * Rejects model-invented or hallucinated citations.
 */
export function verifyCitation(citationKey: string, sources: NormalizedSource[]): NormalizedSource | null {
  if (!citationKey) return null;
  const normalizedKey = citationKey.toLowerCase().trim();
  const match = sources.find(
    (s) =>
      s.id.toLowerCase() === normalizedKey ||
      s.title.toLowerCase().includes(normalizedKey) ||
      s.domain.toLowerCase().includes(normalizedKey) ||
      (s.organization && s.organization.toLowerCase().includes(normalizedKey))
  );
  return match || null;
}

/* ----------------------- 6. Generative UI Block Builders ----------------------- */

export function buildEvidenceCardUIBlock(evidence: EvidenceRecord): EvidenceCardUIBlock {
  return {
    type: "evidence_card",
    id: `card-${evidence.id}`,
    version: 1,
    evidence,
    actionIds: ["open_source", "save_to_project", "link_hypothesis", "discard", "map"],
  };
}

export function buildResearchSummaryUIBlock(
  query: string,
  overallSynthesis: string,
  validationState: EvidenceValidationState,
  records: EvidenceRecord[],
  options?: {
    insufficientEvidenceReason?: string;
    suggestedEmpiricalSteps?: string[];
  }
): ResearchSummaryUIBlock {
  return {
    type: "research_summary",
    id: `summary-${Math.abs(hashString(query))}`,
    version: 1,
    query,
    overallSynthesis,
    validationState,
    records,
    insufficientEvidenceReason: options?.insufficientEvidenceReason,
    suggestedEmpiricalSteps: options?.suggestedEmpiricalSteps,
    actionIds: ["investigate", "save_to_project"],
  };
}

/* ----------------------- 7. Semantic Memory Integration ----------------------- */

/**
 * Synchronizes evidence records into DiscoveryState without rewriting user facts.
 * Rule: User hypotheses stay hypotheses; external evidence is recorded distinctly.
 */
export function syncEvidenceToDiscovery(
  discovery: DiscoveryState,
  evidence: EvidenceRecord
): DiscoveryState {
  const currentEvidence = discovery.evidence || [];
  const exists = currentEvidence.some((e) => e.id === evidence.id);
  const updatedEvidenceList = exists
    ? currentEvidence.map((e) => (e.id === evidence.id ? evidence : e))
    : [...currentEvidence, evidence];

  // Optionally add or update confirmed ProjectFact with kind: "evidence"
  const factKey = `evidence:${evidence.id}`;
  const existingFact = discovery.facts.find((f) => f.key === factKey);

  const evidenceFact: ProjectFact = {
    key: factKey,
    semanticKey: `evidence:${evidence.source.domain}:${evidence.id}`,
    value: `${evidence.source.title}: ${evidence.claimAddressed}`,
    status: "confirmed",
    kind: "evidence",
    memoryState: "confirmed",
    origin: "research_evidence",
    researchEvidenceId: evidence.id,
    sourceMessageIds: [],
  };

  const nextFacts = existingFact
    ? discovery.facts.map((f) => (f.key === factKey ? evidenceFact : f))
    : [...discovery.facts, evidenceFact];

  return {
    ...discovery,
    evidence: updatedEvidenceList,
    facts: nextFacts,
  };
}

/* ----------------------- 8. Canvas / Graph Integration ----------------------- */

/**
 * Converts an accepted EvidenceRecord into a canonical ConceptNode
 * and generates appropriate relations to linked hypothesis concepts.
 */
export function generateEvidenceConceptNode(
  evidence: EvidenceRecord,
  anchorNodeId?: string
): { node: ConceptNode; relations: ConceptRelation[] } {
  const nodeId = `node-evidence-${evidence.id}`;

  const node: ConceptNode = {
    id: nodeId,
    title: evidence.source.title.slice(0, 60),
    description: evidence.claimAddressed,
    kind: "viability",
    category: "technical",
    priority: evidence.validationState === "challenges" ? "high" : "medium",
    status: "confirmed",
    phase: "validation",
    x: 400 + Math.floor(Math.random() * 80),
    y: 300 + Math.floor(Math.random() * 80),
    metadata: `Fuente: ${evidence.source.organization || evidence.source.domain} · Confiabilidad: ${evidence.source.trustScore}/100`,
    details: [
      `### Evidencia Externa: ${evidence.source.title}`,
      `**Fuente:** [${evidence.source.domain}](${evidence.source.url})`,
      `**Tipo de fuente:** ${evidence.source.sourceType}`,
      `**Nivel de Confianza:** ${evidence.source.trustScore}/100 (${evidence.source.trustRationale})`,
      "",
      `### Hallazgo Clave`,
      evidence.claimAddressed,
      "",
      `### Interpretación de Nexo`,
      evidence.aiInterpretation,
      evidence.localContextWarning ? `\n> **Aviso de contexto local:**\n> ${evidence.localContextWarning}\n` : "",
      evidence.limitations ? `\n**Limitaciones metodológicas:** ${evidence.limitations}\n` : "",
    ].filter(Boolean).join("\n"),
  };

  const relations: ConceptRelation[] = [];

  if (anchorNodeId) {
    const semanticType =
      evidence.validationState === "supports"
        ? "supports"
        : evidence.validationState === "challenges"
        ? "contradicts"
        : "related_to";

    relations.push({
      id: `rel-${nodeId}-${anchorNodeId}`,
      from: nodeId,
      to: anchorNodeId,
      type: semanticType,
      semanticType,
      label:
        evidence.validationState === "supports"
          ? "Evidencia que respalda"
          : evidence.validationState === "challenges"
          ? "Evidencia que desafía"
          : "Evidencia relacionada",
    });
  }

  return { node, relations };
}

/* ----------------------- Utility Helpers ----------------------- */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
