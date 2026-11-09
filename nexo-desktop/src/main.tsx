import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import "./styles/index.css";
import { initPreferences } from "./services/preferences";
import { getGeminiApiKey, setGeminiConfig } from "./services/gemini";

initPreferences();

// Ensure Gemini API key is initialized into storage on app start
const activeGeminiKey = getGeminiApiKey();
if (activeGeminiKey) {
  setGeminiConfig(activeGeminiKey);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);
