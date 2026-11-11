import type { TFunction } from "i18next";
import { ServiceError } from "../../domain/types";

/** Turns an auth failure into a message that tells the person what actually happened and what to do. */
export function authErrorMessage(error: unknown, t: TFunction, action: "login" | "register"): string {
  const code = error instanceof ServiceError ? error.code : "unknown";
  switch (code) {
    case "invalid-credentials":
      return t("auth.errors.invalidCredentials", { defaultValue: "Correo o contraseña incorrectos." });
    case "email-not-confirmed":
      return t("auth.errors.emailNotConfirmed", {
        defaultValue: "Aún no confirmas tu correo. Abre el enlace que te enviamos y luego inicia sesión.",
      });
    case "already-registered":
      return t("auth.errors.alreadyRegistered", {
        defaultValue: "Ya existe una cuenta con este correo. Inicia sesión.",
      });
    case "weak-password":
      return t("auth.errors.weakPassword", { defaultValue: "La contraseña es demasiado débil. Usa una más segura." });
    case "invalid-email":
      return t("auth.errors.emailInvalid", { defaultValue: "Escribe un correo válido, como nombre@ejemplo.com." });
    case "rate-limited":
      return t("auth.errors.rateLimited", {
        defaultValue: "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.",
      });
    case "signup-disabled":
      return t("auth.errors.signupDisabled", { defaultValue: "El registro de cuentas nuevas está desactivado." });
    case "offline":
      return t("auth.errors.offline", {
        defaultValue: "No se pudo conectar con Nexo. Revisa tu conexión e inténtalo de nuevo.",
      });
    default:
      return action === "register"
        ? t("auth.errors.registerFailed", { defaultValue: "No se pudo crear la cuenta. Intenta nuevamente." })
        : t("auth.errors.unknown", { defaultValue: "Algo salió mal. Inténtalo de nuevo." });
  }
}
