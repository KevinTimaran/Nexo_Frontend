import assert from "node:assert/strict";
import {
  evaluateGeographicScope,
  evaluateTemporalScope,
  evaluatePopulationScope,
  evaluateTrendSafety,
  classifyEvidenceRelation,
  synthesizeValidation,
  syncValidationToDiscovery,
  generateValidationConceptNode,
} from "../src/services/ai/contextValidation";
import { normalizeGenerativeUIBlock } from "../src/services/ai/generativeUi";
import { mockServices } from "../src/services/mock";
import { normalizeSource } from "../src/services/ai/research";
import type { DiscoveryState, EvidenceRecord } from "../src/domain/types";

console.log("=== PHASE 6 AUTOMATED TEST SUITE: HISTORICAL AND CONTEXT VALIDATION ===\n");

// ---------------------------------------------------------------------------
// 1. SCENARIO A: HARDWARE STORE (National vs. Local Town Reality)
// ---------------------------------------------------------------------------
console.log("[1/12] Testing Scenario A: Hardware Store (Repair Material Confusion)...");
{
  const targetClaim = "La gente en mi pueblo a menudo compra materiales de reparación equivocados porque no saben qué producto necesitan";

  const searchRes = await mockServices.research.search({
    query: "ferretería materiales reparación orientación clientes pueblo",
    targetHypothesisId: "hypo-hardware-advice",
  });

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-hardware-advice",
    targetClaim,
    targetKind: "hypothesis",
    targetGeography: "Pasto, Nariño (pueblo local)",
    evidence: searchRes.evidenceRecords,
  });

  // Result should be partially supported or mixed due to lack of municipal data
  assert.ok(
    validation.validationStatus === "partially_supported" || validation.validationStatus === "mixed",
    `Expected partially_supported or mixed, got: ${validation.validationStatus}`
  );

  // Must have geographic/local limitation warning
  assert.ok(validation.limitations.length > 0, "Must include limitations");
  assert.ok(
    validation.limitations.some(
      (l) => l.includes("escala nacional") || l.includes("territorial") || l.includes("municipio")
    ),
    "Must explicitly flag that national retail stats do not validate local municipal demand"
  );

  // Must NOT invent local Pasto statistics
  assert.strictEqual(
    validation.synthesis.includes("95% de los pastusos") || validation.synthesis.includes("en Pasto se comprobó"),
    false,
    "Nexo must not fabricate local municipal statistics"
  );

  // Unresolved questions should reflect local validation needs
  assert.ok(
    validation.unresolvedQuestions.some((q) => q.toLowerCase().includes("local") || q.toLowerCase().includes("municipio")),
    "Unresolved questions must recommend investigating local conditions"
  );
  console.log("✓ Scenario A verified: Local repair confusion hypothesis validated with honest municipal caveats.");
}

// ---------------------------------------------------------------------------
// 2. SCENARIO B: ACADEMIC THESIS (Multi-Causal Student Attrition)
// ---------------------------------------------------------------------------
console.log("\n[2/12] Testing Scenario B: Academic Thesis (Dropout in Software Engineering)...");
{
  const targetClaim = "Los estudiantes de ingeniería de software abandonan principalmente porque programar es muy difícil";

  const searchRes = await mockServices.research.search({
    query: "deserción estudiantes ingeniería software programación difícil causas",
    targetHypothesisId: "hypo-cs-dropout",
  });

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-cs-dropout",
    targetClaim,
    targetKind: "hypothesis",
    targetGeography: "Colombia",
    targetPopulation: "Estudiantes universitarios de pregrado",
    evidence: searchRes.evidenceRecords,
    alternativeExplanations: [
      "Presión financiera y necesidad de empleo temprano (42% según UNESCO)",
      "Desajuste vocacional e integración institucional débil (33%)",
      "Sobrecarga mental y métodos pedagógicos tradicionales",
    ],
    previousSolutions: [
      {
        solution: "Cursos propedéuticos de nivelación de algoritmos",
        context: "Universidades públicas y privadas (2018–2022)",
        outcome: "Reducción leve de la tasa de reprobación en primer semestre (-8%)",
        limitations: "No resolvió la deserción por factores económicos ni el desánimo en semestres posteriores",
      },
    ],
  });

  // Must conclude mixed (or partially_supported)
  assert.ok(
    validation.validationStatus === "mixed" || validation.validationStatus === "partially_supported",
    `Expected mixed or partially_supported, got ${validation.validationStatus}`
  );

  // Both supporting and challenging/alternative evidence co-exist
  assert.ok(validation.supportingEvidenceIds.length > 0, "Must have supporting evidence for academic difficulty");
  assert.ok(
    validation.challengingEvidenceIds.length > 0 || (validation.alternativeExplanations && validation.alternativeExplanations.length > 0),
    "Must expose alternative explanations / multi-causal reality"
  );

  // Cautious synthesis does not claim one single cause
  assert.ok(
    validation.synthesis.includes("multicausal") || validation.synthesis.includes("mixta") || validation.synthesis.includes("alternativas"),
    "Synthesis must reflect multi-causal reality"
  );
  console.log("✓ Scenario B verified: Academic multi-causality preserved; single universal cause rejected.");
}

// ---------------------------------------------------------------------------
// 3. SCENARIO C: SOFTWARE PRODUCT (Student Task Planning & Deadlines)
// ---------------------------------------------------------------------------
console.log("\n[3/12] Testing Scenario C: Software Product (Deadline Planning vs Procrastination)...");
{
  const targetClaim = "Los estudiantes no cumplen entregas porque las herramientas de planificación existentes son demasiado difíciles de usar";

  const searchRes = await mockServices.research.search({
    query: "planificación de tareas estudiantes entrega plazos herramientas complejas",
    targetHypothesisId: "hypo-planning-tools",
  });

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-planning-tools",
    targetClaim,
    targetKind: "hypothesis",
    targetGeography: "General",
    targetPopulation: "Estudiantes universitarios",
    evidence: searchRes.evidenceRecords,
    alternativeExplanations: [
      "Procrastinación conductual y subestimación del esfuerzo",
      "Agrupamiento simultáneo de fechas límite al final del periodo académico",
      "Fatiga de ingreso manual de tareas en interfaces de calendario",
    ],
    previousSolutions: [
      {
        solution: "Adopción de Trello y Notion con plantillas predefinidas",
        context: "Cohortes de estudiantes universitarios",
        outcome: "Alta adopción inicial pero 65% de abandono al mes",
        limitations: "Requiere alta disciplina y mantenimiento manual constante",
      },
    ],
  });

  // Expected: mixed or challenged because usability alone explains very little
  assert.ok(
    validation.validationStatus === "mixed" || validation.validationStatus === "challenged",
    `Expected mixed or challenged, got: ${validation.validationStatus}`
  );

  // Previous solution context captured
  assert.ok(validation.previousSolutions && validation.previousSolutions.length > 0);
  assert.strictEqual(validation.previousSolutions[0].solution.includes("Trello"), true);
  console.log("✓ Scenario C verified: Usability assumption challenged; previous tools contextualized.");
}

// ---------------------------------------------------------------------------
// 4. GEOGRAPHIC MISMATCH TEST (Section 33)
// ---------------------------------------------------------------------------
console.log("\n[4/12] Testing Geographic Mismatch (Colombia Target vs US Evidence)...");
{
  const searchRes = await mockServices.research.search({
    query: "us_only_geo retail hardware store",
  });

  const geoCheck = evaluateGeographicScope("Colombia", searchRes.evidenceRecords.map((e) => e.scope));

  assert.strictEqual(geoCheck.geographicMismatch, true, "Must flag geographic mismatch when target is Colombia and evidence is US");
  assert.ok(geoCheck.geographicWarning, "Must produce geographic warning");
  assert.ok(
    geoCheck.geographicWarning.includes("Estados Unidos") && geoCheck.geographicWarning.includes("Colombia"),
    "Warning must explicitly name both contexts"
  );

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-colombia-test",
    targetClaim: "Comportamiento del consumidor en Colombia",
    targetGeography: "Colombia",
    evidence: searchRes.evidenceRecords,
  });

  assert.strictEqual(validation.scope.geographicMismatch, true);
  assert.ok(validation.limitations.some((l) => l.includes("Discrepancia geográfica")));
  console.log("✓ Geographic Mismatch test passed: US evidence explicitly separated from Colombian reality.");
}

// ---------------------------------------------------------------------------
// 5. TIME MISMATCH TEST (Section 34)
// ---------------------------------------------------------------------------
console.log("\n[5/12] Testing Time Mismatch (Current Condition vs 2010 Evidence)...");
{
  const searchRes = await mockServices.research.search({
    query: "stale_2010 estudio antiguo de ferreterías",
  });

  const temporalCheck = evaluateTemporalScope([2010], 2026);

  assert.strictEqual(temporalCheck.isRecent, false, "2010 evidence in 2026 cannot be marked recent");
  assert.ok(temporalCheck.temporalWarning, "Must generate temporal warning");
  assert.ok(
    temporalCheck.temporalWarning.includes("2010") && temporalCheck.temporalWarning.includes("Obsolescencia temporal"),
    "Warning must explicitly state the age and obsolescence concern"
  );

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-time-test",
    targetClaim: "Condiciones comerciales actuales de ferreterías",
    evidence: searchRes.evidenceRecords,
  });

  assert.strictEqual(validation.scope.temporal.isRecent, false);
  assert.ok(validation.limitations.some((l) => l.includes("Obsolescencia temporal")));
  console.log("✓ Time Mismatch test passed: 2010 evidence not silently equated to 2026 conditions.");
}

// ---------------------------------------------------------------------------
// 6. POPULATION MISMATCH TEST (Section 10)
// ---------------------------------------------------------------------------
console.log("\n[6/12] Testing Population Mismatch (High School vs University)...");
{
  const popCheck = evaluatePopulationScope(
    "Estudiantes de colegio y secundaria",
    ["Deserción de estudiantes universitarios de pregrado en ingenierías"]
  );

  assert.strictEqual(popCheck.populationMismatch, true, "Must flag mismatch between high school and university");
  assert.ok(popCheck.populationWarning);
  assert.ok(popCheck.populationWarning.includes("universitarios") && popCheck.populationWarning.includes("secundaria"));
  console.log("✓ Population Mismatch test passed: College data not transferred to high school.");
}

// ---------------------------------------------------------------------------
// 7. CONFLICTING EVIDENCE TEST (Section 35)
// ---------------------------------------------------------------------------
console.log("\n[7/12] Testing Conflicting Evidence (Source A Supports, Source B Challenges)...");
{
  const searchRes = await mockServices.research.search({
    query: "conflicting_fixture",
  });

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-conflicting",
    targetClaim: "Efecto comprobado de la intervención",
    evidence: searchRes.evidenceRecords,
  });

  // MUST be mixed
  assert.strictEqual(validation.validationStatus, "mixed", "Conflicting sources must result in 'mixed' status");
  assert.notStrictEqual(validation.validationStatus, "supported", "Conflicting sources must NEVER be marked 'supported'");
  assert.notStrictEqual(validation.validationStatus, "challenged", "Conflicting sources must NEVER be unilaterally 'challenged'");

  assert.ok(validation.supportingEvidenceIds.length >= 1, "Must track supporting evidence ID");
  assert.ok(validation.challengingEvidenceIds.length >= 1, "Must track challenging evidence ID");
  console.log("✓ Conflicting Evidence test passed: Result strictly 'mixed' without biased confirmation.");
}

// ---------------------------------------------------------------------------
// 8. INSUFFICIENT EVIDENCE TEST (Section 36)
// ---------------------------------------------------------------------------
console.log("\n[8/12] Testing Insufficient Evidence (Hyper-local Unindexed Claim)...");
{
  const searchRes = await mockServices.research.search({
    query: "Los carpinteros de San Juan de Nepomuceno no tienen taladros de impacto",
  });

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-carpenters",
    targetClaim: "Los carpinteros de San Juan de Nepomuceno no tienen taladros de impacto",
    evidence: searchRes.evidenceRecords,
  });

  assert.strictEqual(validation.validationStatus, "insufficient_evidence");
  assert.strictEqual(validation.evidenceConfidence, "insufficient");
  assert.strictEqual(validation.supportingEvidenceIds.length, 0);
  assert.strictEqual(validation.challengingEvidenceIds.length, 0);

  // Must suggest empirical field validation
  assert.ok(validation.unresolvedQuestions.length >= 2);
  assert.ok(
    validation.synthesis.includes("insuficiente") && validation.synthesis.includes("validación primaria"),
    "Must honestly report insufficient evidence and guide to primary validation"
  );
  console.log("✓ Insufficient Evidence test passed: Honest non-fabrication with empirical next steps.");
}

// ---------------------------------------------------------------------------
// 9. HISTORICAL TREND SAFETY TEST (Section 37)
// ---------------------------------------------------------------------------
console.log("\n[9/12] Testing Historical Trend Safety (Multiple Comparable Points vs Single Point)...");
{
  // Multi-point trend
  const multiPoints = [
    { year: 2018, value: 45.2, label: "Tasa deserción" },
    { year: 2020, value: 47.8, label: "Tasa deserción" },
    { year: 2024, value: 52.1, label: "Tasa deserción" },
  ];

  const trendResult = evaluateTrendSafety(multiPoints);
  assert.strictEqual(trendResult.hasComparableDataPoints, true);
  assert.strictEqual(trendResult.direction, "increasing");
  assert.strictEqual(trendResult.dataPointsCount, 3);

  // Single point safety: CANNOT infer a trend
  const singlePoint = [{ year: 2020, value: 47.8, label: "Tasa deserción" }];
  const singleTrend = evaluateTrendSafety(singlePoint);

  assert.strictEqual(singleTrend.hasComparableDataPoints, false, "Single data point must NOT be considered a trend");
  assert.strictEqual(singleTrend.direction, undefined, "Direction must be undefined for single point");
  assert.ok(
    singleTrend.explanation.includes("Un único punto de datos") && singleTrend.explanation.includes("no constituye una tendencia"),
    "Must explain that 1 point cannot form a trend"
  );
  console.log("✓ Trend Safety test passed: Single point strictly prohibited from becoming a trend.");
}

// ---------------------------------------------------------------------------
// 10. PREVIOUS SOLUTIONS TEST (Section 38)
// ---------------------------------------------------------------------------
console.log("\n[10/12] Testing Previous Solutions Contextualization...");
{
  const prevSolutions = [
    {
      solution: "Tutorías obligatorias de fin de semana",
      context: "Universidad Tecnológica (2019)",
      outcome: "Disminuyó la reprobación un 6%, pero incrementó el ausentismo laboral",
      limitations: "Incompatible con estudiantes que trabajan jornadas completas",
      keyDifferenceFromTarget: "Nuestra propuesta ofrece soporte asíncrono interactivo",
    },
  ];

  const validation = synthesizeValidation({
    targetSemanticId: "hypo-solution-test",
    targetClaim: "Soporte interactivo para estudiantes",
    evidence: [],
    previousSolutions: prevSolutions,
  });

  assert.ok(validation.previousSolutions && validation.previousSolutions.length === 1);
  assert.strictEqual(validation.previousSolutions[0].limitations.includes("Incompatible con estudiantes que trabajan"), true);
  console.log("✓ Previous Solutions test passed: Past interventions contextualized with outcomes and limits.");
}

// ---------------------------------------------------------------------------
// 11. SEMANTIC INTEGRITY & PERSISTENCE (Section 26, 39)
// ---------------------------------------------------------------------------
console.log("\n[11/12] Testing Semantic Integrity, User Ownership, and Discovery State Sync...");
{
  const initialDiscovery: DiscoveryState = {
    lifecycle: "discovering",
    archetype: "business",
    facts: [
      {
        key: "hypo-user-hardware",
        value: "La gente compra materiales equivocados",
        status: "unconfirmed",
        kind: "hypothesis",
        memoryState: "proposed",
        origin: "user_message",
        sourceMessageIds: ["m-100"],
      },
    ],
    requiredTopics: [],
    askedQuestionKeys: [],
    answeredQuestionKeys: [],
    generationLedger: {},
    tombstones: [],
    validations: [],
  };

  const validationRecord = synthesizeValidation({
    targetSemanticId: "hypo-user-hardware",
    targetClaim: "La gente compra materiales equivocados",
    evidence: [],
  });

  const nextDiscovery = syncValidationToDiscovery(initialDiscovery, validationRecord);

  // RULE: The original hypothesis MUST NOT mutate into user_fact
  const originalHypo = nextDiscovery.facts.find((f) => f.key === "hypo-user-hardware");
  assert.ok(originalHypo);
  assert.strictEqual(originalHypo.kind, "hypothesis", "Hypothesis kind must remain 'hypothesis'");
  assert.notStrictEqual(originalHypo.kind, "user_fact", "Hypothesis kind must NEVER silently become user_fact");

  // Validations persisted in discovery
  assert.strictEqual(nextDiscovery.validations?.length, 1);
  assert.strictEqual(nextDiscovery.validations[0].id, validationRecord.id);

  // Idempotency check: repeated sync does not duplicate
  const secondSync = syncValidationToDiscovery(nextDiscovery, validationRecord);
  assert.strictEqual(secondSync.validations?.length, 1, "Repeated sync must not duplicate records");
  console.log("✓ Semantic integrity and idempotency verified: User hypothesis preserved; validation cleanly synced.");
}

// ---------------------------------------------------------------------------
// 12. CANONICAL GRAPH INTEGRATION & GENERATIVE UI NORMALIZER
// ---------------------------------------------------------------------------
console.log("\n[12/12] Testing Canonical Graph Mapping and Generative UI Normalizer...");
{
  const validationRecord = synthesizeValidation({
    targetSemanticId: "hypo-graph-test",
    targetClaim: "Validación de arquitectura",
    evidence: [],
  });

  // Graph Node Generation
  const { node, relations } = generateValidationConceptNode(validationRecord, "anchor-concept-node");

  assert.strictEqual(node.kind, "viability");
  assert.strictEqual(node.phase, "validation");
  assert.ok(node.details?.includes("Validación de Contexto e Histórico"));
  assert.strictEqual(relations.length, 1);
  assert.strictEqual(relations[0].semanticType, "supports");
  assert.strictEqual(relations[0].to, "anchor-concept-node");

  // Generative UI Normalizer
  const normalizedBlock = normalizeGenerativeUIBlock({
    type: "validation_summary",
    id: "summary-val-1",
    validation: validationRecord,
    actionIds: ["view_evidence", "investigate_further"],
  });

  assert.ok(normalizedBlock, "Must normalize validation_summary block");
  assert.strictEqual(normalizedBlock.type, "validation_summary");
  console.log("✓ Canonical graph integration and Generative UI normalizer verified.");
}

console.log("\n=======================================================");
console.log("✨ ALL 12 PHASE 6 HISTORICAL & CONTEXT TESTS PASSED! ✨");
console.log("=======================================================");
