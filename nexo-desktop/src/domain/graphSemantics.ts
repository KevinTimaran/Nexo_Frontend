import type { ConceptNode } from "./types";

/** Compact status and authorship labels shared by the 2D and 3D graph projections. */
export function graphSemanticLabels(node: Pick<ConceptNode, "semanticKind" | "semanticState" | "provenanceOrigin" | "verification" | "origin">): string[] {
  let status: string | undefined;

  if (node.semanticState === "rejected") status = "Rechazado";
  else if (node.semanticKind === "unknown" || node.semanticState === "unknown" || node.verification === "unknown") status = "Por definir";
  else if (node.semanticKind === "hypothesis") status = node.semanticState === "confirmed" ? "Hipótesis confirmada" : "Hipótesis";
  else if (node.semanticKind === "decision_candidate") status = "Decisión propuesta";
  else if (node.semanticKind === "decision") status = "Decisión";
  else if (node.semanticKind === "suggestion") status = node.semanticState === "accepted" ? "Sugerencia aceptada" : "Propuesta de IA";
  else if (node.semanticKind === "user_fact" || node.verification === "confirmed") status = "Confirmado";
  else if (node.semanticState === "proposed" || node.semanticState === "modified" || node.verification === "unconfirmed") status = "Propuesto";

  const labels = status ? [status] : [];
  if (node.provenanceOrigin === "user_message" || node.provenanceOrigin === "questionnaire_answer") labels.push("Aportado por ti");
  else if (node.origin === "user") labels.push("Creado por ti");
  else if (node.origin === "approved") labels.push("Añadido por ti");
  else if (node.origin === "ai_initial" || node.origin === "ai_expansion") labels.push("Estructurado por Nexo");
  return labels;
}
