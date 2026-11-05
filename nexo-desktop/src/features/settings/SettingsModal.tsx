import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Globe,
  Bell,
  Volume2,
  Eye,
  EyeOff,
  LogOut,
  User as UserIcon,
  Check,
  Sparkles,
  Key,
  Cpu,
  Zap,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { currentLanguage, setLanguage } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import type { Language } from "../../domain/types";
import {
  getGeminiApiKey,
  getGeminiModel,
  setGeminiConfig,
  isGeminiEnabled,
  setGeminiEnabled,
  testGeminiConnection,
  type GeminiTestResult,
} from "../../services/gemini";
import { registry } from "../../services/registry";
import { useConnectivityStore } from "../../store/useConnectivityStore";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const lang = currentLanguage();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);

  // Gemini state
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY || "";
  const [apiKey, setApiKey] = useState(getGeminiApiKey);
  const [model, setModel] = useState(getGeminiModel);
  const [showKey, setShowKey] = useState(false);
  const [geminiEnabled, setGeminiEnabledState] = useState(isGeminiEnabled);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<GeminiTestResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isFromEnv = Boolean(envKey && apiKey === envKey);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiConnection(apiKey, model);
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveGemini = () => {
    setGeminiConfig(apiKey, model);
    setGeminiEnabled(geminiEnabled);
    registry.notify();
    useConnectivityStore.getState().refreshAiStatus();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleToggleGemini = (enabled: boolean) => {
    setGeminiEnabledState(enabled);
    setGeminiEnabled(enabled);
    registry.notify();
    useConnectivityStore.getState().refreshAiStatus();
  };

  const handleLangChange = (newLang: Language) => {
    void setLanguage(newLang);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.title")}
      maxWidth="xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 pb-6 text-fg dark:text-fg">
        {/* Language Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted mb-1">{t("settings.language")}</h4>
          <p className="text-xs text-muted dark:text-muted mb-3">{t("settings.languageDescription")}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleLangChange("en")}
              className={`
                p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all duration-200 cursor-pointer
                ${
                  lang === "en"
                    ? "bg-primary/80 dark:bg-primary/15 border-primary/80 dark:border-primary text-primary dark:text-primary shadow-sm ring-1 ring-primary/30"
                    : "bg-surface/50 dark:bg-surface/5 border-line/80 dark:border-line/10 text-muted dark:text-muted hover:bg-surface/80 dark:hover:bg-surface/10 hover:text-fg dark:hover:text-fg"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary dark:text-primary" />
                English
              </span>
              {lang === "en" && <Check className="w-4 h-4 text-primary dark:text-primary" />}
            </button>

            <button
              onClick={() => handleLangChange("es")}
              className={`
                p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all duration-200 cursor-pointer
                ${
                  lang === "es"
                    ? "bg-primary/80 dark:bg-primary/15 border-primary/80 dark:border-primary text-primary dark:text-primary shadow-sm ring-1 ring-primary/30"
                    : "bg-surface/50 dark:bg-surface/5 border-line/80 dark:border-line/10 text-muted dark:text-muted hover:bg-surface/80 dark:hover:bg-surface/10 hover:text-fg dark:hover:text-fg"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary dark:text-primary" />
                Español
              </span>
              {lang === "es" && <Check className="w-4 h-4 text-primary dark:text-primary" />}
            </button>
          </div>
        </div>

        {/* Interface Preferences */}
        <div className="space-y-3 pt-3 border-t border-line/60 dark:border-line/10">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted">{t("settings.interface")}</h4>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-muted dark:text-muted" />
              <div>
                <p className="text-xs font-semibold text-fg dark:text-fg">{t("settings.reduceMotion")}</p>
                <p className="text-[11px] text-muted dark:text-muted">{t("settings.reduceMotionDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="w-4 h-4 rounded border-line dark:border-line/10 text-primary accent-primary focus:ring-accent cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted dark:text-muted" />
              <div>
                <p className="text-xs font-semibold text-fg dark:text-fg">{t("settings.desktopNotifications")}</p>
                <p className="text-[11px] text-muted dark:text-muted">{t("settings.desktopNotificationsDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-line dark:border-line/10 text-primary accent-primary focus:ring-accent cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-muted dark:text-muted" />
              <div>
                <p className="text-xs font-semibold text-fg dark:text-fg">{t("settings.sound")}</p>
                <p className="text-[11px] text-muted dark:text-muted">{t("settings.soundDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="w-4 h-4 rounded border-line dark:border-line/10 text-primary accent-primary focus:ring-accent cursor-pointer"
            />
          </div>
        </div>

        {/* Google Gemini AI Configuration */}
        <div className="pt-3 border-t border-line/60 dark:border-line/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-bold text-fg dark:text-fg">Google Gemini AI</h4>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-muted dark:text-muted font-medium">Motor Gemini Activo</span>
              <input
                type="checkbox"
                checked={geminiEnabled}
                onChange={(e) => handleToggleGemini(e.target.checked)}
                className="w-4 h-4 rounded border-line dark:border-line/10 text-primary accent-primary focus:ring-accent cursor-pointer"
              />
            </label>
          </div>

          <p className="text-xs text-muted dark:text-muted leading-relaxed">
            Conecta directamente con la API de Google Gemini para alimentar el Chat Copilot, el modo Tutor pedagógico y la generación inteligente del mapa conceptual.
          </p>

          {/* API Key Input (Sunken recipe) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-fg dark:text-muted flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-muted dark:text-muted" />
                Clave API de Gemini
              </label>
              {isFromEnv && (
                <span className="text-[10px] font-medium text-positive dark:text-positive bg-positive/10 px-2 py-0.5 rounded-full border border-positive/20">
                  Cargada desde .env.local
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="
                  w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl
                  text-fg dark:text-fg placeholder:text-muted dark:placeholder:text-muted
                  bg-sunken/50 dark:bg-app/40
                  border border-line dark:border-line/5
                  shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
                  focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-primary dark:focus:border-primary
                  transition-all duration-200
                "
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg dark:hover:text-fg p-1 rounded-lg hover:bg-surface/40 dark:hover:bg-surface/10 transition-colors cursor-pointer"
                title={showKey ? "Ocultar clave" : "Mostrar clave"}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Model Selection and Test Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-fg dark:text-muted mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-muted dark:text-muted" />
                Modelo de Gemini
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="
                  w-full text-xs px-3 py-2 rounded-xl
                  text-fg dark:text-fg
                  bg-sunken/50 dark:bg-app/40
                  border border-line dark:border-line/5
                  shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
                  focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-primary dark:focus:border-primary
                  cursor-pointer
                "
              >
                <option value="gemini-2.5-flash" className="bg-surface dark:bg-surface text-fg dark:text-fg">gemini-2.5-flash (Rápido y eficiente)</option>
                <option value="gemini-2.5-pro" className="bg-surface dark:bg-surface text-fg dark:text-fg">gemini-2.5-pro (Razonamiento profundo)</option>
                <option value="gemini-flash-latest" className="bg-surface dark:bg-surface text-fg dark:text-fg">gemini-flash-latest (Última versión)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !apiKey}
                className="
                  h-[38px] px-3.5 rounded-xl
                  border border-line/80 dark:border-line/10
                  bg-surface/60 dark:bg-surface/10 hover:bg-surface/90 dark:hover:bg-surface/15
                  text-xs font-semibold text-fg dark:text-fg
                  flex items-center justify-center gap-2 shadow-xs
                  transition-all active:scale-95 disabled:opacity-50 cursor-pointer
                "
              >
                {testing ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-primary dark:text-primary" />
                    <span>Probando API...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Probar Conexión</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test Results Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all backdrop-blur-sm ${
                testResult.ok
                  ? "bg-positive/10 border-positive/30 text-positive dark:text-positive"
                  : "bg-danger/10 border-danger/30 text-danger dark:text-danger"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-positive dark:text-positive shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-danger dark:text-danger shrink-0" />
                )}
                <span className="font-medium">
                  {testResult.ok
                    ? `Conexión exitosa con ${testResult.model} (${testResult.latencyMs} ms)`
                    : testResult.error}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-xs opacity-70 hover:opacity-100 ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-xs font-semibold text-positive dark:text-positive flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Ajustes guardados correctamente
              </span>
            ) : (
              <span />
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveGemini}
              className="!rounded-xl !bg-primary hover:!bg-primary !text-fg shadow-[0_4px_16px_rgba(37,99,235,0.25)] cursor-pointer"
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Guardar Ajustes de Gemini
            </Button>
          </div>
        </div>

        {/* Account Section */}
        {user && (
          <div className="pt-3 border-t border-line/60 dark:border-line/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted">{t("settings.account")}</h4>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 backdrop-blur-md shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-primary flex items-center justify-center font-bold">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-fg dark:text-fg truncate">{user.name}</p>
                  <p className="text-[11px] text-muted dark:text-muted truncate">{user.email}</p>
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  void signOut();
                }}
                className="!rounded-xl"
                icon={<LogOut className="w-3.5 h-3.5" />}
              >
                {t("settings.signOut")}
              </Button>
            </div>
          </div>
        )}

        {/* Footer Version Info */}
        <div className="text-center pt-2 text-[11px] font-mono text-muted dark:text-muted">
          {t("settings.version", { version: "1.0.0" })}
        </div>
      </div>
    </Modal>
  );
};
