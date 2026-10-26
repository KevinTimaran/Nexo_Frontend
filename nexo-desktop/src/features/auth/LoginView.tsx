import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-app relative overflow-hidden select-none">
      {/* Ambient background soft light orbs for Creative Glass depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 w-[680px] h-[680px] rounded-full blur-[160px] opacity-60 dark:opacity-30 bg-concept-fg/25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 w-[680px] h-[680px] rounded-full blur-[160px] opacity-50 dark:opacity-25 bg-concept-fg/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full blur-[200px] opacity-30 dark:opacity-15 bg-concept-fg/10"
      />

      {/* Outer Creative Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] animate-rise-in">
        {/* Soft luminous halo */}
        <div className="pointer-events-none absolute -inset-6 rounded-[48px] bg-concept-fg/10 blur-3xl opacity-60" />

        <div
          className="
            relative rounded-[36px] overflow-hidden
            border border-line/80 dark:border-white/12
            bg-surface/90 dark:bg-zinc-950/90
            backdrop-blur-3xl backdrop-saturate-[180%]
            shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)]
            dark:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)]
          "
        >
          {/* Specular hairline top reflection */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-20"
          />

          {/* Card Content */}
          <div className="relative p-7 sm:p-9">
            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div
                className="
                  relative w-16 h-16 rounded-[22px]
                  bg-gradient-to-b from-concept-fg to-concept-fg/85
                  flex items-center justify-center text-white
                  shadow-[0_8px_24px_-6px_rgba(37,99,235,0.45),inset_0_1px_0_0_rgba(255,255,255,0.4)]
                  ring-1 ring-white/30
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

              <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-fg">
                {t("app.name")}
              </h1>
              <p className="text-caption text-muted mt-1.5 max-w-[280px] leading-relaxed">
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
                  icon={<Mail className="w-4 h-4 text-muted" />}
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
                  icon={<Lock className="w-4 h-4 text-muted" />}
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={!!error && password.length < 6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="
                    absolute right-2.5 top-8
                    w-8 h-8 flex items-center justify-center
                    rounded-lg text-muted hover:text-fg
                    hover:bg-hover active:scale-95
                    transition-all duration-200 focus-ring cursor-pointer
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
                  className="text-[12px] font-medium text-concept-fg hover:underline underline-offset-4 transition-all focus-ring rounded-md px-1 cursor-pointer"
                >
                  {t("auth.forgotPassword", { defaultValue: "¿Olvidaste tu contraseña?" })}
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="
                    p-3 rounded-2xl
                    bg-danger-fg/10 border border-danger-fg/25
                    text-danger-fg text-caption font-medium
                    flex items-start gap-2 animate-fade-in backdrop-blur-sm
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
                className="w-full mt-2 !rounded-2xl"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isLoading ? t("auth.submitting") : t("auth.submit")}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-5 flex items-center gap-3 text-[11px] text-muted">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-line to-transparent" />
              <span className="tracking-wider uppercase font-semibold text-[10px]">
                {t("auth.or", { defaultValue: "o" })}
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-line to-transparent" />
            </div>

            <p className="mt-3.5 text-center text-[12px] text-muted">
              {t("auth.noAccount", { defaultValue: "¿No tienes cuenta?" })}{" "}
              <button
                type="button"
                className="font-semibold text-concept-fg hover:underline underline-offset-4 focus-ring rounded cursor-pointer"
              >
                {t("auth.requestAccess", { defaultValue: "Solicita acceso" })}
              </button>
            </p>

            {/* Adapter transparency note */}
            <div
              className="
                mt-6 p-3 rounded-2xl
                bg-surface/60 dark:bg-white/[0.04]
                border border-line/60 dark:border-white/10
                backdrop-blur-md
                text-[11px] text-slate-600 dark:text-slate-300
                flex items-start gap-2.5 leading-normal shadow-2xs
              "
            >
              <ShieldCheck className="w-4 h-4 text-concept-fg shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-fg">
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
      </div>
    </div>
  );
};