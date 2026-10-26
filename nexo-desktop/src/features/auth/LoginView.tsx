import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export const LoginView: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, isLoading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("kevin@nexo.ai");
  const [password, setPassword] = useState("nexo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("auth.errors.emailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(t("auth.errors.emailInvalid"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.errors.passwordShort"));
      return;
    }

    try {
      const user = await signIn(trimmedEmail, password);
      showToast(`${t("app.name")} — Bienvenido, ${user.name}`, "info");
      navigate(fromPath, { replace: true });
    } catch {
      setError(t("auth.errors.unknown"));
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-zinc-100 relative overflow-hidden select-none font-sans">
      {/* ─── 1. Elegant Mesh Gradient & VisionOS Ambient Orbs ─── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 w-[620px] h-[620px] rounded-full blur-[120px] bg-blue-200/50 dark:bg-indigo-900/40 z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 w-[620px] h-[620px] rounded-full blur-[120px] bg-emerald-200/50 dark:bg-emerald-900/30 z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full blur-[140px] bg-violet-200/35 dark:bg-purple-900/20 z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.18),rgba(0,0,0,0))] z-0"
      />

      {/* ─── 2. Floating Glass Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div
          className="
            relative rounded-3xl overflow-hidden
            bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
            dark:bg-black/20 dark:border-white/10 dark:shadow-2xl
            text-slate-800 dark:text-zinc-100 select-text
          "
        >
          {/* Specular hairline top reflection */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/20 to-transparent z-20"
          />

          {/* Card Content */}
          <div className="relative p-7 sm:p-9">
            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div
                className="
                  relative w-16 h-16 rounded-2xl
                  bg-gradient-to-br from-blue-600 to-indigo-600
                  flex items-center justify-center text-white
                  shadow-lg shadow-blue-500/25 ring-1 ring-white/40
                  transition-transform duration-300 hover:scale-[1.03]
                  mb-4
                "
              >
                <Sparkles className="w-7 h-7 drop-shadow-sm" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-white/25 blur-md"
                />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">
                {t("app.name")}
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 max-w-[280px] leading-relaxed">
                {t("app.tagline")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1">
                <Input
                  label={t("auth.email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  icon={<Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500" />}
                  autoComplete="email"
                  autoFocus
                  disabled={isLoading}
                  aria-invalid={!!error && !email}
                />
              </div>

              <div className="space-y-1 relative">
                <Input
                  label={t("auth.password")}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  icon={<Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500" />}
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={!!error && password.length < 6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="
                    absolute right-2.5 top-8.5
                    w-8 h-8 flex items-center justify-center
                    rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200
                    hover:bg-white/40 dark:hover:bg-white/10 active:scale-95
                    transition-all duration-200 cursor-pointer
                    disabled:opacity-50
                  "
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 transition-all rounded-md px-1 cursor-pointer"
                >
                  {t("auth.forgotPassword", { defaultValue: "¿Olvidaste tu contraseña?" })}
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="
                    p-3 rounded-xl
                    bg-rose-500/10 border border-rose-500/25
                    text-rose-600 dark:text-rose-400 text-xs font-medium
                    flex items-start gap-2 backdrop-blur-sm
                  "
                >
                  <span className="font-semibold text-xs leading-none mt-0.5">•</span>
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                className="w-full mt-2 !rounded-xl !bg-blue-600 hover:!bg-blue-500 !text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] cursor-pointer"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isLoading ? t("auth.submitting") : t("auth.submit")}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-5 flex items-center gap-3 text-xs text-slate-400 dark:text-zinc-500">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
              <span className="tracking-wider uppercase font-semibold text-[10px]">
                {t("auth.or", { defaultValue: "o" })}
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 dark:via-white/10 to-transparent" />
            </div>

            <p className="mt-3.5 text-center text-xs text-slate-500 dark:text-zinc-400">
              {t("auth.noAccount", { defaultValue: "¿No tienes cuenta?" })}{" "}
              <button
                type="button"
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 cursor-pointer"
              >
                {t("auth.requestAccess", { defaultValue: "Solicita acceso" })}
              </button>
            </p>

            {/* Adapter transparency note (Sub-tarjeta de cristal) */}
            <div
              className="
                mt-6 p-3.5 rounded-2xl
                bg-white/40 dark:bg-white/5
                border border-white/50 dark:border-white/10
                backdrop-blur-md
                text-xs text-slate-600 dark:text-zinc-400
                flex items-start gap-2.5 leading-normal shadow-xs
              "
            >
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-zinc-100">
                  {t("auth.adapterTitle", { defaultValue: "Adaptador de Autenticación:" })}{" "}
                </span>
                <span>
                  {t("auth.adapterDescription", {
                    defaultValue:
                      "Modo activo gestionado por el registro de servicios. En entorno local utiliza simulación determinista para desarrollo y pruebas de interfaz.",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};