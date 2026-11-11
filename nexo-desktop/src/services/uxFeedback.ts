import type { Language } from "../domain/types";

export type SaveFeedbackState = "saved" | "saving" | "error";

export function userFacingError(error: unknown, lang: Language = "es"): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const value = raw.toLocaleLowerCase("es");
  const en = lang === "en";

  if (/assistant_response_rejected/.test(value)) {
    return en
      ? "I could not produce a reliable answer about your project this time. Your message is saved; you can retry or rephrase it."
      : "No pude generar una respuesta fiable sobre tu proyecto esta vez. Tu mensaje está guardado; puedes reintentar o reformularlo.";
  }
  if (/api[_ -]?key|clave|unauthoriz|401|403/.test(value)) {
    return en
      ? "The AI service is not configured on this device. Open Settings to review the provider."
      : "El servicio de IA no está configurado en este dispositivo. Abre Ajustes para revisar el proveedor.";
  }
  if (/429|quota|cuota|rate.?limit|resource_exhausted/.test(value)) {
    return en
      ? "The AI provider is temporarily busy. Your message is saved; try again in a moment."
      : "El proveedor de IA está temporalmente ocupado. Tu mensaje está guardado; inténtalo de nuevo en un momento.";
  }
  if (/network|fetch|offline|conexi[oó]n|timeout|timed out|econn/.test(value)) {
    return en
      ? "I could not connect to the service. Your information remains saved and you can retry."
      : "No pude conectar con el servicio. Tu información sigue guardada y puedes reintentar.";
  }
  if (/422|malformed|invalid (?:json|response)|parse|schema/.test(value)) {
    return en
      ? "I could not interpret that response. Your information remains saved; please try again."
      : "No pude interpretar esa respuesta. Tu información sigue guardada; puedes intentarlo nuevamente.";
  }
  return en
    ? "I could not complete the action. Your information remains saved; please try again."
    : "No pude completar la acción. Tu información sigue guardada; puedes intentarlo nuevamente.";
}

export function saveFeedbackLabel(state: SaveFeedbackState, lang: Language = "es"): string {
  const en = lang === "en";
  if (state === "saving") return en ? "Saving…" : "Guardando…";
  if (state === "error") return en ? "Not saved" : "Sin guardar";
  return en ? "Saved" : "Guardado";
}
