import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Moon,
  Monitor,
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
import { useTheme } from "../../app/providers/ThemeProvider";
import { currentLanguage, setLanguage } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import type { Language, ThemeMode } from "../../domain/types";
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
  const { theme, setTheme } = useTheme();
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

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: "light", label: t("settings.themes.light"), icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { mode: "dark", label: t("settings.themes.dark"), icon: <Moon className="w-4 h-4 text-blue-500" /> },
    { mode: "system", label: t("settings.themes.system"), icon: <Monitor className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.title")}
      maxWidth="lg"
    >
      <div className="space-y-6 max-h-[68vh] overflow-y-auto pr-2 pb-6 text-slate-800 dark:text-zinc-100">
        {/* Appearance Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">{t("settings.appearance")}</h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{t("settings.themeDescription")}</p>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => setTheme(opt.mode)}
                className={`
                  p-3.5 rounded-2xl border flex flex-col items-center gap-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer
                  ${
                    theme === opt.mode
                      ? "bg-blue-50/80 dark:bg-blue-500/15 border-blue-500/80 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/30"
                      : "bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                  }
                `}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">{t("settings.language")}</h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{t("settings.languageDescription")}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleLangChange("en")}
              className={`
                p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all duration-200 cursor-pointer
                ${
                  lang === "en"
                    ? "bg-blue-50/80 dark:bg-blue-500/15 border-blue-500/80 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/30"
                    : "bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                English
              </span>
              {lang === "en" && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </button>

            <button
              onClick={() => handleLangChange("es")}
              className={`
                p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all duration-200 cursor-pointer
                ${
                  lang === "es"
                    ? "bg-blue-50/80 dark:bg-blue-500/15 border-blue-500/80 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/30"
                    : "bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Español
              </span>
              {lang === "es" && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </button>
          </div>
        </div>

        {/* Interface Preferences */}
        <div className="space-y-3 pt-3 border-t border-white/60 dark:border-white/10">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{t("settings.interface")}</h4>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-zinc-100">{t("settings.reduceMotion")}</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">{t("settings.reduceMotionDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-zinc-100">{t("settings.desktopNotifications")}</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">{t("settings.desktopNotificationsDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-zinc-100">{t("settings.sound")}</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">{t("settings.soundDescription")}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Google Gemini AI Configuration */}
        <div className="pt-3 border-t border-white/60 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Google Gemini AI</h4>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Motor Gemini Activo</span>
              <input
                type="checkbox"
                checked={geminiEnabled}
                onChange={(e) => handleToggleGemini(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Conecta directamente con la API de Google Gemini para alimentar el Chat Copilot, el modo Tutor pedagógico y la generación inteligente del mapa conceptual.
          </p>

          {/* API Key Input (Sunken recipe) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                Clave API de Gemini
              </label>
              {isFromEnv && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
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
                  text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500
                  bg-slate-100/50 dark:bg-black/40
                  border border-slate-200 dark:border-white/5
                  shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                  transition-all duration-200
                "
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={showKey ? "Ocultar clave" : "Mostrar clave"}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Model Selection and Test Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                Modelo de Gemini
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="
                  w-full text-xs px-3 py-2 rounded-xl
                  text-slate-800 dark:text-zinc-100
                  bg-slate-100/50 dark:bg-black/40
                  border border-slate-200 dark:border-white/5
                  shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                  cursor-pointer
                "
              >
                <option value="gemini-2.5-flash" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-zinc-100">gemini-2.5-flash (Rápido y eficiente)</option>
                <option value="gemini-2.5-pro" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-zinc-100">gemini-2.5-pro (Razonamiento profundo)</option>
                <option value="gemini-flash-latest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-zinc-100">gemini-flash-latest (Última versión)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !apiKey}
                className="
                  h-[38px] px-3.5 rounded-xl
                  border border-white/80 dark:border-white/10
                  bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15
                  text-xs font-semibold text-slate-700 dark:text-zinc-200
                  flex items-center justify-center gap-2 shadow-xs
                  transition-all active:scale-95 disabled:opacity-50 cursor-pointer
                "
              >
                {testing ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
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
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
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
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Ajustes guardados correctamente
              </span>
            ) : (
              <span />
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveGemini}
              className="!rounded-xl !bg-blue-600 hover:!bg-blue-500 !text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] cursor-pointer"
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Guardar Ajustes de Gemini
            </Button>
          </div>
        </div>

        {/* Account Section */}
        {user && (
          <div className="pt-3 border-t border-white/60 dark:border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{t("settings.account")}</h4>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{user.email}</p>
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
        <div className="text-center pt-2 text-[11px] font-mono text-slate-400 dark:text-zinc-500">
          {t("settings.version", { version: "1.0.0" })}
        </div>
      </div>
    </Modal>
  );
};

