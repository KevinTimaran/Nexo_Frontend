import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Globe, Bell, Volume2, Eye, EyeOff, LogOut, User as UserIcon, Check,
  Sparkles, Key, Cpu, Zap, RotateCw, CheckCircle2, AlertCircle, Save,
  Sun, Moon, Palette, SlidersHorizontal, Gauge, BrainCircuit, Rocket, HelpCircle,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { currentLanguage, setLanguage } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import type { Language } from "../../domain/types";
import {
  getGeminiApiKey, getGeminiModel, setGeminiConfig, isGeminiEnabled,
  setGeminiEnabled, testGeminiConnection, type GeminiTestResult,
} from "../../services/gemini";
import {
  getOpenAIApiKey, getOpenAIModel, setOpenAIConfig, isOpenAIEnabled,
  setOpenAIEnabled, testOpenAIConnection, type OpenAITestResult,
} from "../../services/openai";
import { registry, getAiProvider, setAiProvider, type AIProvider } from "../../services/registry";
import { useConnectivityStore } from "../../store/useConnectivityStore";
import { getPreferences, savePreferences } from "../../services/preferences";
import { setSoundEnabled } from "../../services/audio/soundEffects";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SectionId = "appearance" | "interface" | "language" | "ai" | "account";
type ThemeMode = "light" | "dark";

/* ────────────────────────────────────────────────────────────────────────────
 * ModelCard
 * ──────────────────────────────────────────────────────────────────────────── */
interface ModelOption {
  value: string;
  label: string;
  hint: string;
  icon: React.ElementType;
}

const MODEL_OPTIONS: ModelOption[] = [
  { value: "gemini-2.5-flash", label: "gemini-2.5-flash", hint: "Rápido y eficiente", icon: Gauge },
  { value: "gemini-2.5-pro",   label: "gemini-2.5-pro",   hint: "Razonamiento profundo", icon: BrainCircuit },
  { value: "gemini-flash-latest", label: "gemini-flash-latest", hint: "Última versión", icon: Rocket },
];

const OPENAI_MODEL_OPTIONS: ModelOption[] = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini", hint: "Rápido, económico y de alta precisión", icon: Gauge },
  { value: "gpt-4o",      label: "gpt-4o",      hint: "Razonamiento profundo y máxima capacidad", icon: BrainCircuit },
];

const ModelCard: React.FC<{
  option: ModelOption;
  selected: boolean;
  onSelect: () => void;
}> = ({ option, selected, onSelect }) => {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`
        group relative flex items-start gap-2.5 p-2.5 rounded-xl border text-left
        transition-all duration-200 cursor-pointer
        ${
          selected
            ? "border-primary bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/20 shadow-sm"
            : "border-line/60 dark:border-line/10 bg-surface/30 dark:bg-surface/5 hover:bg-surface/60 dark:hover:bg-surface/10 hover:border-line dark:hover:border-line/25"
        }
      `}
    >
      <div
        className={`
          w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5
          transition-colors
          ${selected ? "bg-primary/15 text-primary" : "bg-surface/70 dark:bg-surface/10 text-muted"}
        `}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-bold truncate leading-tight ${selected ? "text-primary" : "text-fg dark:text-fg"}`}>
          {option.label}
        </p>
        <p className="text-[10px] text-muted dark:text-muted leading-snug truncate">
          {option.hint}
        </p>
      </div>

      {selected && (
        <span className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
 * ToggleRow
 * ──────────────────────────────────────────────────────────────────────────── */
const ToggleRow: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ icon: Icon, title, description, checked, onChange, disabled }) => (
  <label
    className="
      flex items-center justify-between gap-3 p-3 rounded-xl
      bg-surface/40 dark:bg-surface/5
      border border-line/50 dark:border-line/10
      backdrop-blur-md
      transition-colors duration-200
      hover:bg-surface/60 dark:hover:bg-surface/10
      cursor-pointer
    "
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-7 h-7 rounded-lg bg-surface/70 dark:bg-surface/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted dark:text-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-fg dark:text-fg leading-tight">{title}</p>
        <p className="text-[10px] text-muted dark:text-muted leading-snug">{description}</p>
      </div>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-3.5 h-3.5 rounded border-line dark:border-line/10 text-primary accent-primary focus:ring-accent cursor-pointer shrink-0 disabled:opacity-50"
    />
  </label>
);

/* ────────────────────────────────────────────────────────────────────────────
 * SettingsModal
 * ──────────────────────────────────────────────────────────────────────────── */
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const lang = currentLanguage();

  const [activeSection, setActiveSection] = useState<SectionId>("appearance");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [notifications, setNotificationsState] = useState(true);
  const [sound, setSoundState] = useState(true);

  /* ─── Tema ─── */
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    if (isOpen) {
      if (typeof document !== "undefined") {
        setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
      }
      const prefs = getPreferences();
      setReduceMotionState(prefs.reduceMotion);
      setNotificationsState(prefs.desktopNotifications);
      setSoundState(prefs.sound);
    }
  }, [isOpen]);

  const handleReduceMotionChange = (val: boolean) => {
    setReduceMotionState(val);
    savePreferences({ reduceMotion: val });
  };

  const handleSoundChange = (val: boolean) => {
    setSoundState(val);
    savePreferences({ sound: val });
    setSoundEnabled(val);
  };

  const handleNotificationsChange = (val: boolean) => {
    setNotificationsState(val);
    savePreferences({ desktopNotifications: val });
  };

  const handleRestartOnboarding = () => {
    try {
      localStorage.removeItem("nexo.onboarding.completed");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexo:start-onboarding"));
      }
      onClose();
    } catch {
      /* ignore */
    }
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      const isDark = newTheme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.style.colorScheme = newTheme;
      try {
        localStorage.setItem("theme", newTheme);
        localStorage.setItem("nexo.theme", newTheme);
      } catch {
        /* ignore */
      }
    }
  };

  /* ─── AI Provider & State ─── */
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(getAiProvider);

  // OpenAI state
  const envOpenAIKey =
    (import.meta as unknown as { env?: { VITE_OPENAI_API_KEY?: string } }).env
      ?.VITE_OPENAI_API_KEY || "";
  const [openaiApiKey, setOpenaiApiKey] = useState(getOpenAIApiKey);
  const [openaiModel, setOpenaiModel] = useState(getOpenAIModel);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [openaiEnabled, setOpenaiEnabledState] = useState(isOpenAIEnabled);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testOpenAIResult, setTestOpenAIResult] = useState<OpenAITestResult | null>(null);
  const [savedOpenAISuccess, setSavedOpenAISuccess] = useState(false);

  const isOpenAIFromEnv = Boolean(envOpenAIKey && openaiApiKey === envOpenAIKey);

  const handleTestOpenAIConnection = async () => {
    setTestingOpenAI(true);
    setTestOpenAIResult(null);
    try {
      const res = await testOpenAIConnection(openaiApiKey, openaiModel);
      setTestOpenAIResult(res);
    } finally {
      setTestingOpenAI(false);
    }
  };

  const handleSaveOpenAI = () => {
    setOpenAIConfig(openaiApiKey, openaiModel);
    setOpenAIEnabled(openaiEnabled);
    setAiProvider("openai");
    setSelectedProvider("openai");
    registry.notify();
    useConnectivityStore.getState().refreshAiStatus();
    setSavedOpenAISuccess(true);
    setTimeout(() => setSavedOpenAISuccess(false), 2500);
  };

  const handleToggleOpenAI = (enabled: boolean) => {
    setOpenaiEnabledState(enabled);
    setOpenAIEnabled(enabled);
    if (enabled) {
      setAiProvider("openai");
      setSelectedProvider("openai");
    }
    registry.notify();
    useConnectivityStore.getState().refreshAiStatus();
  };

  /* ─── Gemini state ─── */
  const envKey =
    (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env
      ?.VITE_GEMINI_API_KEY || "";
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
    setAiProvider("gemini");
    setSelectedProvider("gemini");
    registry.notify();
    useConnectivityStore.getState().refreshAiStatus();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleToggleGemini = (enabled: boolean) => {
    setGeminiEnabledState(enabled);
    setGeminiEnabled(enabled);
    if (enabled) {
      setAiProvider("gemini");
      setSelectedProvider("gemini");
    }
    registry.notify();
    useConnectivityStore.getState().refreshAiStatus();
  };

  const handleLangChange = (newLang: Language) => {
    void setLanguage(newLang);
  };

  const sections = [
    { id: "appearance" as const, label: t("settings.appearance", { defaultValue: "Apariencia" }), icon: Palette },
    { id: "interface"  as const, label: t("settings.interface",  { defaultValue: "Interfaz" }),   icon: SlidersHorizontal },
    { id: "language"   as const, label: t("settings.language",   { defaultValue: "Idioma" }),     icon: Globe },
    { id: "ai"         as const, label: t("settings.ai",         { defaultValue: "Motor de IA" }), icon: Sparkles },
    { id: "account"    as const, label: t("settings.account",    { defaultValue: "Cuenta" }),     icon: UserIcon },
  ];

  /* ──────────────────────────────────────────────────────────────────────────
   * Panels
   * ────────────────────────────────────────────────────────────────────────── */
  const renderAppearance = () => (
    <div className="space-y-4">
      <header>
        <h3 className="text-xs font-bold text-fg dark:text-fg mb-0.5">
          {t("settings.appearance", { defaultValue: "Apariencia" })}
        </h3>
        <p className="text-[10px] text-muted dark:text-muted leading-snug">
          Personaliza el aspecto visual de la aplicación.
        </p>
      </header>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted dark:text-muted">
          Tema
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { mode: "light" as const, label: t("settings.themeLight", { defaultValue: "Claro" }), icon: Sun },
            { mode: "dark" as const,  label: t("settings.themeDark",  { defaultValue: "Oscuro" }), icon: Moon },
          ].map(({ mode, label, icon: Icon }) => {
            const selected = theme === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleThemeChange(mode)}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selected
                    ? "border-primary bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/20"
                    : "border-line/60 dark:border-line/10 bg-surface/30 dark:bg-surface/5 hover:bg-surface/60 dark:hover:bg-surface/10"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${selected ? "text-primary" : "text-muted"}`} />
                  <span className={`text-[11px] font-semibold ${selected ? "text-primary" : "text-fg dark:text-fg"}`}>
                    {label}
                  </span>
                </span>
                {selected && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted dark:text-muted">
          Accesibilidad
        </p>
        <ToggleRow
          icon={Eye}
          title={t("settings.reduceMotion")}
          description={t("settings.reduceMotionDescription")}
          checked={reduceMotion}
          onChange={handleReduceMotionChange}
        />
      </div>
    </div>
  );

  const renderInterface = () => (
    <div className="space-y-4">
      <header>
        <h3 className="text-xs font-bold text-fg dark:text-fg mb-0.5">
          {t("settings.interface", { defaultValue: "Interfaz" })}
        </h3>
        <p className="text-[10px] text-muted dark:text-muted leading-snug">
          Notificaciones, experiencia sonora y guías interactivas.
        </p>
      </header>
      <div className="space-y-2">
        <ToggleRow
          icon={Bell}
          title={t("settings.desktopNotifications")}
          description={t("settings.desktopNotificationsDescription")}
          checked={notifications}
          onChange={handleNotificationsChange}
        />
        <ToggleRow
          icon={Volume2}
          title={t("settings.sound")}
          description={t("settings.soundDescription")}
          checked={sound}
          onChange={handleSoundChange}
        />

        <div className="pt-2">
          <button
            type="button"
            onClick={handleRestartOnboarding}
            className="w-full p-2.5 rounded-xl border border-line/60 dark:border-line/10 bg-surface/30 dark:bg-surface/5 hover:bg-surface/60 dark:hover:bg-surface/10 text-[11px] font-semibold text-fg dark:text-fg flex items-center justify-between transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>{t("settings.restartOnboarding", { defaultValue: "Reiniciar guía de bienvenida" })}</span>
            </span>
            <span className="text-[10px] text-primary font-bold">Ver tour →</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderLanguage = () => (
    <div className="space-y-4">
      <header>
        <h3 className="text-xs font-bold text-fg dark:text-fg mb-0.5">
          {t("settings.language")}
        </h3>
        <p className="text-[10px] text-muted dark:text-muted leading-snug">
          {t("settings.languageDescription")}
        </p>
      </header>
      <div className="space-y-2">
        {[
          { code: "en" as const, label: "English" },
          { code: "es" as const, label: "Español" },
        ].map((opt) => {
          const selected = lang === opt.code;
          return (
            <button
              key={opt.code}
              onClick={() => handleLangChange(opt.code)}
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-semibold transition-all cursor-pointer ${
                selected
                  ? "bg-primary/10 dark:bg-primary/15 border-primary text-primary dark:text-primary ring-1 ring-primary/20"
                  : "bg-surface/40 dark:bg-surface/5 border-line/60 dark:border-line/10 text-muted dark:text-muted hover:bg-surface/70 dark:hover:bg-surface/10 hover:text-fg dark:hover:text-fg"
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                {opt.label}
              </span>
              {selected && <Check className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderAI = () => (
    <div className="space-y-3">
      {/* Selector de Proveedor de IA */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10">
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("openai");
            setAiProvider("openai");
            useConnectivityStore.getState().refreshAiStatus();
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            selectedProvider === "openai"
              ? "bg-primary text-primary-fg shadow-sm"
              : "text-muted hover:text-fg hover:bg-surface/40"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>OpenAI (GPT)</span>
          {openaiEnabled && <span className="w-1.5 h-1.5 rounded-full bg-positive" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("gemini");
            setAiProvider("gemini");
            useConnectivityStore.getState().refreshAiStatus();
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            selectedProvider === "gemini"
              ? "bg-primary text-primary-fg shadow-sm"
              : "text-muted hover:text-fg hover:bg-surface/40"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Google Gemini</span>
          {geminiEnabled && <span className="w-1.5 h-1.5 rounded-full bg-positive" />}
        </button>
      </div>

      {selectedProvider === "openai" ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-fg dark:text-fg mb-0.5">OpenAI GPT</h3>
              <p className="text-[10px] text-muted dark:text-muted leading-snug">
                Ideación conversacional, cuestionarios inteligentes y tutor pedagógico.
              </p>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0 pt-0.5">
              <span className="text-[10px] text-muted dark:text-muted font-semibold">
                {t("settings.aiActive", { defaultValue: "Activo" })}
              </span>
              <input
                type="checkbox"
                checked={openaiEnabled}
                onChange={(e) => handleToggleOpenAI(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-line dark:border-line/10 text-primary accent-primary focus:ring-accent cursor-pointer"
              />
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <label className="font-semibold text-fg dark:text-muted flex items-center gap-1">
                <Key className="w-3 h-3 text-muted dark:text-muted" />
                Clave API (OpenAI)
              </label>
              {isOpenAIFromEnv && (
                <span className="text-[9px] font-medium text-positive dark:text-positive bg-positive/10 px-1.5 py-0.5 rounded-full border border-positive/20">
                  .env.local
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showOpenAIKey ? "text" : "password"}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="
                  w-full text-[11px] font-mono px-2.5 py-1.5 pr-8 rounded-lg
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
                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg dark:hover:text-fg p-1 rounded-md hover:bg-surface/40 dark:hover:bg-surface/10 transition-colors cursor-pointer"
                title={showOpenAIKey ? "Ocultar clave" : "Mostrar clave"}
              >
                {showOpenAIKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-fg dark:text-muted flex items-center gap-1">
              <Cpu className="w-3 h-3 text-muted dark:text-muted" />
              Modelo
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {OPENAI_MODEL_OPTIONS.map((opt) => (
                <ModelCard
                  key={opt.value}
                  option={opt}
                  selected={openaiModel === opt.value}
                  onSelect={() => setOpenaiModel(opt.value)}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestOpenAIConnection}
            disabled={testingOpenAI || !openaiApiKey}
            className="
              w-full h-8 px-2.5 rounded-lg
              border border-line/80 dark:border-line/10
              bg-surface/60 dark:bg-surface/10 hover:bg-surface/90 dark:hover:bg-surface/15
              text-[11px] font-semibold text-fg dark:text-fg
              flex items-center justify-center gap-1.5
              transition-all active:scale-95 disabled:opacity-50 cursor-pointer
            "
          >
            {testingOpenAI ? (
              <>
                <RotateCw className="w-3 h-3 animate-spin text-primary dark:text-primary" />
                <span>Probando conexión con OpenAI...</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Probar Conexión con OpenAI</span>
              </>
            )}
          </button>

          {testOpenAIResult && (
            <div
              className={`p-2 rounded-lg border text-[10px] flex items-center justify-between ${
                testOpenAIResult.ok
                  ? "bg-positive/10 border-positive/30 text-positive dark:text-positive"
                  : "bg-danger/10 border-danger/30 text-danger dark:text-danger"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {testOpenAIResult.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                <span className="font-medium truncate">
                  {testOpenAIResult.ok ? `OK — ${testOpenAIResult.model} (${testOpenAIResult.latencyMs} ms)` : testOpenAIResult.error}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTestOpenAIResult(null)}
                className="text-[10px] opacity-70 hover:opacity-100 ml-1.5 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {savedOpenAISuccess ? (
              <span className="text-[10px] font-semibold text-positive dark:text-positive flex items-center gap-1">
                <Check className="w-3 h-3" /> Guardado
              </span>
            ) : (
              <span />
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveOpenAI}
              className="!rounded-lg !bg-primary hover:!bg-primary !text-fg shadow-[0_4px_16px_rgba(37,99,235,0.25)] cursor-pointer !text-[11px] !py-1.5 !px-2.5"
              icon={<Save className="w-3 h-3" />}
            >
              {t("settings.saveOpenAI", { defaultValue: "Guardar" })}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-fg dark:text-fg mb-0.5">Google Gemini AI</h3>
              <p className="text-[10px] text-muted dark:text-muted leading-snug">
                Chat Copilot, Tutor pedagógico y mapa conceptual.
              </p>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0 pt-0.5">
              <span className="text-[10px] text-muted dark:text-muted font-semibold">
                {t("settings.aiActive", { defaultValue: "Activo" })}
              </span>
              <input
                type="checkbox"
                checked={geminiEnabled}
                onChange={(e) => handleToggleGemini(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-line dark:border-line/10 text-primary accent-primary focus:ring-accent cursor-pointer"
              />
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <label className="font-semibold text-fg dark:text-muted flex items-center gap-1">
                <Key className="w-3 h-3 text-muted dark:text-muted" />
                Clave API
              </label>
              {isFromEnv && (
                <span className="text-[9px] font-medium text-positive dark:text-positive bg-positive/10 px-1.5 py-0.5 rounded-full border border-positive/20">
                  .env.local
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
                  w-full text-[11px] font-mono px-2.5 py-1.5 pr-8 rounded-lg
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
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg dark:hover:text-fg p-1 rounded-md hover:bg-surface/40 dark:hover:bg-surface/10 transition-colors cursor-pointer"
                title={showKey ? "Ocultar clave" : "Mostrar clave"}
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-fg dark:text-muted flex items-center gap-1">
              <Cpu className="w-3 h-3 text-muted dark:text-muted" />
              Modelo
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {MODEL_OPTIONS.map((opt) => (
                <ModelCard
                  key={opt.value}
                  option={opt}
                  selected={model === opt.value}
                  onSelect={() => setModel(opt.value)}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !apiKey}
            className="
              w-full h-8 px-2.5 rounded-lg
              border border-line/80 dark:border-line/10
              bg-surface/60 dark:bg-surface/10 hover:bg-surface/90 dark:hover:bg-surface/15
              text-[11px] font-semibold text-fg dark:text-fg
              flex items-center justify-center gap-1.5
              transition-all active:scale-95 disabled:opacity-50 cursor-pointer
            "
          >
            {testing ? (
              <>
                <RotateCw className="w-3 h-3 animate-spin text-primary dark:text-primary" />
                <span>Probando...</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Probar Conexión</span>
              </>
            )}
          </button>

          {testResult && (
            <div
              className={`p-2 rounded-lg border text-[10px] flex items-center justify-between ${
                testResult.ok
                  ? "bg-positive/10 border-positive/30 text-positive dark:text-positive"
                  : "bg-danger/10 border-danger/30 text-danger dark:text-danger"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {testResult.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                <span className="font-medium truncate">
                  {testResult.ok ? `OK — ${testResult.model} (${testResult.latencyMs} ms)` : testResult.error}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-[10px] opacity-70 hover:opacity-100 ml-1.5 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-[10px] font-semibold text-positive dark:text-positive flex items-center gap-1">
                <Check className="w-3 h-3" /> Guardado
              </span>
            ) : (
              <span />
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveGemini}
              className="!rounded-lg !bg-primary hover:!bg-primary !text-fg shadow-[0_4px_16px_rgba(37,99,235,0.25)] cursor-pointer !text-[11px] !py-1.5 !px-2.5"
              icon={<Save className="w-3 h-3" />}
            >
              {t("settings.saveGemini", { defaultValue: "Guardar" })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-4">
      <header>
        <h3 className="text-xs font-bold text-fg dark:text-fg mb-0.5">
          {t("settings.account")}
        </h3>
        <p className="text-[10px] text-muted dark:text-muted leading-snug">
          Sesión y datos de tu cuenta actual.
        </p>
      </header>
      {user ? (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface/40 dark:bg-surface/5 border border-line/50 dark:border-line/10 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary flex items-center justify-center shrink-0">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="truncate min-w-0">
              <p className="text-[11px] font-bold text-fg dark:text-fg truncate">{user.name}</p>
              <p className="text-[10px] text-muted dark:text-muted truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onClose();
              void signOut();
            }}
            className="!rounded-lg shrink-0 !text-[11px] !py-1.5 !px-2.5"
            icon={<LogOut className="w-3 h-3" />}
          >
            {t("settings.signOut")}
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-muted dark:text-muted">No hay sesión activa.</p>
      )}
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "appearance": return renderAppearance();
      case "interface":  return renderInterface();
      case "language":   return renderLanguage();
      case "ai":         return renderAI();
      case "account":    return renderAccount();
    }
  };

  /* ──────────────────────────────────────────────────────────────────────────
   * Render principal
   * ────────────────────────────────────────────────────────────────────────── */
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.title")} maxWidth="lg">
      <div className="flex flex-col sm:h-[56vh] max-h-[62vh] text-fg dark:text-fg">
        <div className="flex flex-col sm:flex-row sm:gap-3 flex-1 min-h-0">
          {/* ─── Mobile: horizontal icon-only tabs ─── */}
          <aside className="sm:hidden flex gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-line/60 dark:border-line/10 -mx-1 px-1">
            {sections.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  title={s.label}
                  aria-label={s.label}
                  className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/15 dark:bg-primary/20 text-primary dark:text-primary ring-1 ring-primary/25"
                      : "text-muted dark:text-muted hover:bg-surface/60 dark:hover:bg-surface/10 hover:text-fg dark:hover:text-fg"
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                </button>
              );
            })}
          </aside>

          {/* ─── Desktop: rail flotante, centrado verticalmente ─── */}
          <aside
            className="
              group hidden sm:flex flex-col shrink-0
              w-12 hover:w-44 transition-[width] duration-300 ease-out
              rounded-2xl
              bg-surface/60 dark:bg-surface/10
              border border-line/80 dark:border-line/30
              ring-1 ring-black/[0.02] dark:ring-white/5
              shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]
              dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.25)]
              backdrop-blur-md
              p-1.5 gap-1
              overflow-hidden
              self-center
            "
          >
            {sections.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  title={s.label}
                  aria-label={s.label}
                  className={`
                    flex items-center rounded-xl transition-colors cursor-pointer
                    overflow-hidden shrink-0
                    ${
                      isActive
                        ? "bg-primary/15 dark:bg-primary/20 text-primary dark:text-primary ring-1 ring-primary/25"
                        : "text-muted dark:text-muted hover:bg-surface/70 dark:hover:bg-surface/15 hover:text-fg dark:hover:text-fg"
                    }
                  `}
                >
                  <span className="w-8 h-8 flex items-center justify-center shrink-0">
                    <s.icon className="w-4 h-4" />
                  </span>
                  <span
                    className="
                      pl-1.5 text-[11px] font-semibold whitespace-nowrap
                      text-left overflow-hidden
                      max-w-0 opacity-0
                      group-hover:max-w-[110px] group-hover:opacity-100
                      transition-all duration-300
                    "
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* ─── Panel ─── */}
          <div className="flex-1 min-w-0 overflow-y-auto sm:pr-1 -mx-1 sm:mx-0 px-1 sm:px-0">
            {renderSection()}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="text-center pt-2.5 mt-2.5 border-t border-line/60 dark:border-line/10 text-[10px] font-mono text-muted dark:text-muted shrink-0">
          {t("settings.version", { version: "1.0.0" })}
        </div>
      </div>
    </Modal>
  );
};