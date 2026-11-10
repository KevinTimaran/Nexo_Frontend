import type {
  ConceptNode,
  ConceptRelation,
  ContextValidationRecord,
  DiscoveryState,
  EvidenceRecord,
  EvidenceRelationType,
  PreviousSolution,
  ValidationEvidenceLink,
  ValidationStatus,
  ValidationSummaryUIBlock,
  ValidationTrend,
} from "../../domain/types";

/* ----------------------- 1. Geographic Scope Analysis ----------------------- */

export interface GeographicEvaluationInput {
  targetGeography: string;
  evidenceGeographies: string[];
}

/**
 * Evaluates whether evidence matches target geography strictly.
 * Never silently generalizes across borders or municipal boundaries.
 */
export function evaluateGeographicScope(
  targetGeography: string,
  evidenceGeographies: string[]
): { geographicMismatch: boolean; geographicWarning?: string; summary: string } {
  const normTarget = (targetGeography || "general").toLowerCase().trim();
  const isTargetColombia = normTarget.includes("colombia") || normTarget.includes("pasto") || normTarget.includes("pueblo") || normTarget.includes("local");
  const isTargetLocal = normTarget.includes("pasto") || normTarget.includes("pueblo") || normTarget.includes("local") || normTarget.includes("municipio");

  let hasUSOnly = false;
  let hasNationalOnly = false;

  for (const geo of evidenceGeographies) {
    const norm = geo.toLowerCase().trim();
    if (
      norm.includes("estados unidos") ||
      norm.includes("united states") ||
      norm.includes("ee.uu") ||
      norm.includes("internacional") ||
      norm.includes("international") ||
      norm === "us"
    ) {
      hasUSOnly = true;
    }
    if (norm.includes("nacional") || norm.includes("colombia") || norm === "national") {
      hasNationalOnly = true;
    }
  }

  // Cross-country / international mismatch
  if (isTargetColombia && hasUSOnly && !evidenceGeographies.some((g) => g.toLowerCase().includes("colombia") || g.toLowerCase() === "national")) {
    return {
      geographicMismatch: true,
      geographicWarning: "Discrepancia geográfica: La evidencia recuperada proviene de Estados Unidos u otros contextos internacionales. Puede servir como referencia conceptual o teórica, pero no valida directamente la prevalencia ni las condiciones en Colombia.",
      summary: "Evidencia de alcance internacional aplicada a contexto colombiano.",
    };
  }

  // National vs Municipal Local mismatch
  if (isTargetLocal && hasNationalOnly) {
    return {
      geographicMismatch: false, // Related national context, but localized warning required
      geographicWarning: "Limitación territorial: Las estadísticas provienen de agregados nacionales o departamentales. No reflejan necesariamente el volumen de demanda, el tráfico peatonal ni la competencia específica de tu municipio o localidad.",
      summary: "Estadísticas de escala nacional; requieren contrastación empírica en el municipio.",
    };
  }

  return {
    geographicMismatch: false,
    summary: targetGeography || "Alcance general o no especificado.",
  };
}

/* ----------------------- 2. Temporal Scope Analysis ----------------------- */

/**
 * Preserves the time scope of evidence. A 2010 study cannot silently describe 2026.
 */
export function evaluateTemporalScope(
  publicationYears: number[],
  currentYear = new Date().getFullYear()
): {
  earliestYear?: number;
  latestYear?: number;
  isRecent: boolean;
  temporalWarning?: string;
  timeRangeDescription: string;
} {
  const validYears = publicationYears.filter((y) => typeof y === "number" && !isNaN(y) && y > 1900 && y <= currentYear + 1);

  if (validYears.length === 0) {
    return {
      isRecent: false,
      temporalWarning: "No se identificaron fechas explícitas de publicación en las fuentes consultadas. Se aconseja cautela respecto a la vigencia actual.",
      timeRangeDescription: "Sin fechado específico",
    };
  }

  const earliestYear = Math.min(...validYears);
  const latestYear = Math.max(...validYears);
  const ageOfNewest = currentYear - latestYear;

  // Stale evidence rule (e.g. latest is from 2010 in 2026)
  if (ageOfNewest >= 10) {
    return {
      earliestYear,
      latestYear,
      isRecent: false,
      temporalWarning: `Obsolescencia temporal: La evidencia más reciente encontrada data de ${latestYear} (hace ${ageOfNewest} años). No se puede asumir automáticamente que el mismo patrón continúe vigente en ${currentYear}. Se requiere validación actualizada.`,
      timeRangeDescription: earliestYear === latestYear ? `${earliestYear}` : `${earliestYear}–${latestYear}`,
    };
  }

  const isRecent = ageOfNewest <= 4;
  return {
    earliestYear,
    latestYear,
    isRecent,
    temporalWarning: isRecent
      ? undefined
      : `Evidencia de mediana antigüedad (${earliestYear === latestYear ? latestYear : `${earliestYear}–${latestYear}`}); conviene contrastar posibles cambios recientes.`,
    timeRangeDescription: earliestYear === latestYear ? `${earliestYear}` : `${earliestYear}–${latestYear}`,
  };
}

/* ----------------------- 3. Population / Stakeholder Scope ----------------------- */

export function evaluatePopulationScope(
  targetPopulation?: string,
  evidencePopulations: string[] = []
): { populationMismatch: boolean; populationWarning?: string } {
  if (!targetPopulation || evidencePopulations.length === 0) {
    return { populationMismatch: false };
  }

  const normTarget = targetPopulation.toLowerCase();
  const allEvidence = evidencePopulations.join(" ").toLowerCase();

  // University vs High School
  if (normTarget.includes("colegio") || normTarget.includes("secundaria") || normTarget.includes("escolar")) {
    if (allEvidence.includes("universitari") && !allEvidence.includes("colegio") && !allEvidence.includes("secundaria")) {
      return {
        populationMismatch: true,
        populationWarning: "Discrepancia poblacional: El estudio analizó estudiantes universitarios de pregrado; sus conclusiones no son directamente transferibles a estudiantes de secundaria o bachillerato.",
      };
    }
  }

  // Urban vs Rural Microbusiness
  if (normTarget.includes("rural") || normTarget.includes("microferretería") || normTarget.includes("pueblo")) {
    if (allEvidence.includes("grandes empresas") || allEvidence.includes("cadenas retail") || allEvidence.includes("metro")) {
      return {
        populationMismatch: true,
        populationWarning: "Discrepancia de segmento: Los datos corresponden a grandes superficies o cadenas urbanas, cuyas dinámicas difieren de microcomercios en zonas rurales o municipios pequeños.",
      };
    }
  }

  return { populationMismatch: false };
}

/* ----------------------- 4. Trend Safety Rule ----------------------- */

export interface TrendDataPoint {
  year: number;
  value?: number;
  label?: string;
  sourceId?: string;
}

/**
 * Strict trend safety:
 * A single data point is NEVER a trend.
 * Multiple comparable points required to infer increasing/decreasing/stable.
 */
export function evaluateTrendSafety(dataPoints: TrendDataPoint[]): ValidationTrend {
  if (!dataPoints || dataPoints.length < 2) {
    return {
      hasComparableDataPoints: false,
      direction: undefined,
      dataPointsCount: dataPoints ? dataPoints.length : 0,
      explanation: "Un único punto de datos o información aislada no constituye una tendencia histórica. Se requieren al menos dos mediciones temporales comparables para establecer una dirección fundada.",
    };
  }

  // Sort by year
  const sorted = [...dataPoints].sort((a, b) => a.year - b.year);
  const years = sorted.map((p) => p.year);

  // Check if all have values for numerical comparison
  const hasNumericValues = sorted.every((p) => typeof p.value === "number" && !isNaN(p.value));

  if (hasNumericValues) {
    const firstVal = sorted[0].value!;
    const lastVal = sorted[sorted.length - 1].value!;
    const delta = lastVal - firstVal;

    let direction: "increasing" | "decreasing" | "stable" | "inconclusive" = "stable";
    if (delta > 0.05 * Math.abs(firstVal || 1)) {
      direction = "increasing";
    } else if (delta < -0.05 * Math.abs(firstVal || 1)) {
      direction = "decreasing";
    }

    return {
      hasComparableDataPoints: true,
      direction,
      dataPointsCount: sorted.length,
      explanation: `Serie temporal comparable (${years[0]} a ${years[years.length - 1]}). La tasa o métrica analizada muestra un comportamiento ${direction === "increasing" ? "creciente" : direction === "decreasing" ? "decreciente" : "estable"}.`,
    };
  }

  return {
    hasComparableDataPoints: true,
    direction: "inconclusive",
    dataPointsCount: sorted.length,
    explanation: `Se identificaron menciones en distintos años (${years.join(", ")}), pero las metodologías o unidades de medida no son cuantitativamente comparables para asegurar una tendencia unívoca.`,
  };
}

/* ----------------------- 5. Evidence Classification ----------------------- */

/**
 * Strictly classifies an evidence item relative to a target claim.
 * Actively distinguishes supports vs challenges vs contextualizes vs inconclusive.
 */
export function classifyEvidenceRelation(
  targetClaim: string,
  evidence: EvidenceRecord
): { relationType: EvidenceRelationType; rationale: string } {
  const normClaim = targetClaim.toLowerCase();
  const normAddressed = evidence.claimAddressed.toLowerCase();
  const normInterp = evidence.aiInterpretation.toLowerCase();
  const state = evidence.validationState;

  // Challenges
  if (state === "challenges" || normInterp.includes("desafía") || normInterp.includes("contradice") || normInterp.includes("no es la causa principal")) {
    return {
      relationType: "challenges",
      rationale: `Desafía la afirmación: La evidencia demuestra explicaciones alternativas o resultados no concluyentes sobre «${evidence.claimAddressed}».`,
    };
  }

  // Multi-causal / Mixed
  if (state === "mixed" || normInterp.includes("multicausal") || normInterp.includes("múltiples factores") || normInterp.includes("no es el único")) {
    return {
      relationType: "challenges",
      rationale: `Desafía la exclusividad: Si bien respalda la existencia del fenómeno, demuestra que intervienen otras causas determinantes (no es un factor único).`,
    };
  }

  // Contextualizes (macro data, broad statistics, regulations that don't isolate the local target cause)
  if (
    evidence.scope === "national" && (normClaim.includes("local") || normClaim.includes("pueblo") || normClaim.includes("municipio")) ||
    normAddressed.includes("marco normativo") ||
    normAddressed.includes("estándares técnicos") ||
    normAddressed.includes("censo económico")
  ) {
    return {
      relationType: "contextualizes",
      rationale: `Contextualiza: Aporta el marco normativo o estadístico general, pero no aísla empíricamente la causa específica en la población objetivo.`,
    };
  }

  // Direct Support
  if (state === "supports") {
    return {
      relationType: "supports",
      rationale: `Respalda: Los hallazgos de la fuente son consistentes con la hipótesis evaluada.`,
    };
  }

  return {
    relationType: "inconclusive",
    rationale: `Inconcluso: Los datos de la fuente no permiten confirmar ni refutar la hipótesis con suficiente precisión metodológica.`,
  };
}

/* ----------------------- 6. Historical & Context Validation Synthesis ----------------------- */

export interface ValidationSynthesisInput {
  targetSemanticId: string;
  targetClaim: string;
  targetKind?: ContextValidationRecord["targetKind"];
  targetGeography?: string;
  targetPopulation?: string;
  evidence: EvidenceRecord[];
  trendPoints?: TrendDataPoint[];
  previousSolutions?: PreviousSolution[];
  alternativeExplanations?: string[];
  unresolvedQuestions?: string[];
}

/**
 * Orchestrates Phase 6 Historical and Context Validation over Phase 5 evidence.
 */
export function synthesizeValidation(input: ValidationSynthesisInput): ContextValidationRecord {
  const {
    targetSemanticId,
    targetClaim,
    targetKind = "hypothesis",
    targetGeography = "Colombia",
    targetPopulation,
    evidence,
    trendPoints = [],
    previousSolutions = [],
    alternativeExplanations = [],
    unresolvedQuestions = [],
  } = input;

  // 1. Classify all evidence
  const evidenceLinks: ValidationEvidenceLink[] = [];
  const supportingIds: string[] = [];
  const challengingIds: string[] = [];
  const contextualIds: string[] = [];

  for (const ev of evidence) {
    const classification = classifyEvidenceRelation(targetClaim, ev);
    evidenceLinks.push({
      evidenceId: ev.id,
      sourceId: ev.source.id,
      relationType: classification.relationType,
      rationale: classification.rationale,
    });

    if (classification.relationType === "supports") supportingIds.push(ev.id);
    else if (classification.relationType === "challenges") challengingIds.push(ev.id);
    else if (classification.relationType === "contextualizes") contextualIds.push(ev.id);
  }

  // 2. Geographic Scope
  const evidenceGeos = evidence.map((e) => e.scope);
  const geoResult = evaluateGeographicScope(targetGeography, evidenceGeos);

  // 3. Temporal Scope
  const pubYears = evidence
    .map((e) => {
      if (e.source.publicationDate) {
        const match = e.source.publicationDate.match(/\b(19\d\d|20\d\d)\b/);
        if (match) return parseInt(match[1], 10);
      }
      return undefined;
    })
    .filter((y): y is number => typeof y === "number");

  const temporalResult = evaluateTemporalScope(pubYears);

  // 4. Population Scope
  const popResult = evaluatePopulationScope(targetPopulation, evidence.map((e) => e.claimAddressed));

  // 5. Trend Safety
  const trendAnalysis = evaluateTrendSafety(trendPoints);

  // 6. Aggregate Limitations
  const limitations: string[] = [];
  if (geoResult.geographicWarning) limitations.push(geoResult.geographicWarning);
  if (temporalResult.temporalWarning) limitations.push(temporalResult.temporalWarning);
  if (popResult.populationWarning) limitations.push(popResult.populationWarning);

  for (const ev of evidence) {
    if (ev.limitations && !limitations.includes(ev.limitations)) limitations.push(ev.limitations);
    if (ev.localContextWarning && !limitations.includes(ev.localContextWarning)) limitations.push(ev.localContextWarning);
  }

  // 7. Determine Validation Status
  let validationStatus: ValidationStatus = "insufficient_evidence";
  let confidence: "high" | "medium" | "low" | "insufficient" = "insufficient";

  if (evidence.length === 0) {
    validationStatus = "insufficient_evidence";
    confidence = "insufficient";
  } else if (supportingIds.length > 0 && challengingIds.length > 0) {
    validationStatus = "mixed";
    confidence = "medium";
  } else if (challengingIds.length > 0 && supportingIds.length === 0) {
    validationStatus = "challenged";
    confidence = "medium";
  } else if (supportingIds.length > 0 && challengingIds.length === 0) {
    if (geoResult.geographicMismatch || !temporalResult.isRecent || popResult.populationMismatch) {
      validationStatus = "partially_supported";
      confidence = "medium";
    } else {
      validationStatus = "supported";
      confidence = "high";
    }
  } else if (contextualIds.length > 0) {
    validationStatus = "partially_supported";
    confidence = "low";
  }

  // 8. Cautious Synthesis (never "your idea is correct")
  let synthesis = "";
  if (validationStatus === "insufficient_evidence") {
    synthesis = `Evidencia insuficiente: No se identificaron estudios rigurosos ni datos públicos confiables que respalden o refuten «${targetClaim}». Esta premisa permanece como hipótesis no contrastada que requiere validación primaria de campo.`;
  } else if (validationStatus === "mixed") {
    synthesis = `Evidencia mixta y multicausal: Las fuentes analizadas respaldan parcialmente la relevancia del problema, pero demuestran que no es la única causa ni necesariamente la predominante. Se identificaron explicaciones alternativas que deben ser consideradas para evitar sesgos de confirmación.`;
  } else if (validationStatus === "challenged") {
    synthesis = `Evidencia en contradicción: Los hallazgos externos desafían el supuesto planteado, señalando factores divergentes o falta de efecto en la población evaluada. Conviene revisar las premisas antes de comprometer recursos.`;
  } else if (validationStatus === "partially_supported") {
    synthesis = `Respaldo parcial con limitaciones de alcance: La evidencia externa respalda la existencia general de la necesidad o fenómeno, pero presenta discrepancias geográficas, temporales o poblacionales frente a tu caso puntual.`;
  } else {
    synthesis = `Respaldo empírico identificado: Múltiples fuentes de alta confiabilidad documentan la existencia y relevancia de la afirmación dentro del alcance analizado.`;
  }

  // Gather default unresolved questions if none provided
  const unresolved = [...unresolvedQuestions];
  if (validationStatus === "insufficient_evidence" || limitations.length > 0) {
    if (!unresolved.some((q) => q.includes("local"))) {
      unresolved.push("¿Cuál es la magnitud real del problema en la comunidad o municipio de destino?");
    }
    if (!unresolved.some((q) => q.includes("alternativas"))) {
      unresolved.push("¿Cómo resuelven actualmente los afectados esta necesidad en ausencia de tu solución?");
    }
  }

  return {
    id: `val-${Date.now()}-${Math.abs(hashString(targetClaim))}`,
    targetSemanticId,
    targetClaim,
    targetKind,
    validationStatus,
    scope: {
      geographic: geoResult.summary,
      geographicMismatch: geoResult.geographicMismatch,
      geographicWarning: geoResult.geographicWarning,
      temporal: {
        earliestYear: temporalResult.earliestYear,
        latestYear: temporalResult.latestYear,
        isRecent: temporalResult.isRecent,
        temporalWarning: temporalResult.temporalWarning,
        timeRangeDescription: temporalResult.timeRangeDescription,
      },
      population: targetPopulation,
      populationMismatch: popResult.populationMismatch,
      populationWarning: popResult.populationWarning,
    },
    supportingEvidenceIds: supportingIds,
    challengingEvidenceIds: challengingIds,
    contextualEvidenceIds: contextualIds,
    evidenceLinks,
    alternativeExplanations: alternativeExplanations.length > 0 ? alternativeExplanations : undefined,
    previousSolutions: previousSolutions.length > 0 ? previousSolutions : undefined,
    trendAnalysis: trendAnalysis.hasComparableDataPoints ? trendAnalysis : undefined,
    unresolvedQuestions: unresolved,
    synthesis,
    limitations,
    evidenceConfidence: confidence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evaluationVersion: "1.0",
    status: "active",
  };
}

/* ----------------------- 7. Generative UI Builder ----------------------- */

export function buildValidationSummaryUIBlock(
  validation: ContextValidationRecord
): ValidationSummaryUIBlock {
  return {
    type: "validation_summary",
    id: `summary-${validation.id}`,
    version: 1,
    validation,
    actionIds: [
      "view_evidence",
      "investigate_further",
      "keep_hypothesis",
      "update_assumption",
      "map_to_canvas",
      "dismiss",
    ],
  };
}

/* ----------------------- 8. Semantic Memory & Graph Integration ----------------------- */

/**
 * Synchronizes validation record into DiscoveryState without rewriting user facts.
 * Rule: User hypotheses stay hypotheses with linked validation.
 */
export function syncValidationToDiscovery(
  discovery: DiscoveryState,
  validation: ContextValidationRecord
): DiscoveryState {
  const currentValidations = discovery.validations || [];
  const exists = currentValidations.some((v) => v.id === validation.id);
  const updatedValidations = exists
    ? currentValidations.map((v) => (v.id === validation.id ? validation : v))
    : [...currentValidations, validation];

  return {
    ...discovery,
    validations: updatedValidations,
  };
}

/**
 * Maps a ContextValidationRecord to a canonical ConceptNode and generates
 * relations to anchor concepts or linked hypotheses.
 */
export function generateValidationConceptNode(
  validation: ContextValidationRecord,
  anchorNodeId?: string
): { node: ConceptNode; relations: ConceptRelation[] } {
  const nodeId = `node-validation-${validation.id}`;

  const node: ConceptNode = {
    id: nodeId,
    title: `Validación: ${validation.targetClaim.slice(0, 50)}`,
    description: validation.synthesis,
    kind: "viability",
    category: "technical",
    priority: validation.validationStatus === "challenged" || validation.validationStatus === "mixed" ? "high" : "medium",
    status: "confirmed",
    phase: "validation",
    x: 450 + Math.floor(Math.random() * 60),
    y: 350 + Math.floor(Math.random() * 60),
    metadata: `Estado: ${validation.validationStatus} · Confianza: ${validation.evidenceConfidence}`,
    semanticKey: `validation:${validation.id}`,
    semanticState: "confirmed",
    provenanceOrigin: "research_evidence",
    verification: "confirmed",
    contextValidationStatus: validation.validationStatus,
    sourceFactIds: [validation.targetSemanticId, ...validation.supportingEvidenceIds, ...validation.challengingEvidenceIds],
    details: [
      `### Validación de Contexto e Histórico`,
      `**Premisa Evaluada:** ${validation.targetClaim}`,
      `**Resultado de Validación:** \`${validation.validationStatus}\``,
      `**Nivel de Confianza en Evidencia:** ${validation.evidenceConfidence}`,
      "",
      `### Síntesis Cauta`,
      validation.synthesis,
      "",
      validation.scope.geographicWarning ? `> **Limitación Geográfica:**\n> ${validation.scope.geographicWarning}\n` : "",
      validation.scope.temporal.temporalWarning ? `> **Limitación Temporal:**\n> ${validation.scope.temporal.temporalWarning}\n` : "",
      validation.scope.populationWarning ? `> **Limitación Poblacional:**\n> ${validation.scope.populationWarning}\n` : "",
      validation.alternativeExplanations && validation.alternativeExplanations.length > 0
        ? `\n### Explicaciones Alternativas Documentadas\n${validation.alternativeExplanations.map((e) => `- ${e}`).join("\n")}\n`
        : "",
      validation.previousSolutions && validation.previousSolutions.length > 0
        ? `\n### Intentos y Soluciones Previas\n${validation.previousSolutions.map((s) => `- **${s.solution}** (${s.context}): ${s.outcome}. *Limitación:* ${s.limitations}`).join("\n")}\n`
        : "",
      validation.unresolvedQuestions.length > 0
        ? `\n### Preguntas no Resueltas por la Evidencia\n${validation.unresolvedQuestions.map((q) => `- ${q}`).join("\n")}\n`
        : "",
    ].filter(Boolean).join("\n"),
  };

  const relations: ConceptRelation[] = [];

  if (anchorNodeId) {
    const semanticType =
      validation.validationStatus === "supported"
        ? "validates"
        : validation.validationStatus === "challenged"
        ? "contradicts"
        : "supports";

    relations.push({
      id: `rel-${nodeId}-${anchorNodeId}`,
      from: nodeId,
      to: anchorNodeId,
      type: semanticType,
      semanticType,
      label:
        validation.validationStatus === "supported"
          ? "Valida supuesto"
          : validation.validationStatus === "challenged"
          ? "Desafía supuesto"
          : "Validación contextual",
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
