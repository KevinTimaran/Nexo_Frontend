import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { Language } from "../domain/types";
import en from "./locales/en/translation.json";
import es from "./locales/es/translation.json";

export const LANGUAGES: Language[] = ["en", "es"];
const STORAGE_KEY = "nexo.language";

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

const syncDocument = (lng: string) => {
  document.documentElement.lang = lng;
};
syncDocument(i18n.language);
i18n.on("languageChanged", syncDocument);

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === "es" ? "es" : "en";
}

export async function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* storage unavailable */
  }
  await i18n.changeLanguage(language);
}

export default i18n;
