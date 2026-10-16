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
      {/* ─── Ambient iOS-style wallpaper: multi-color soft orbs ─── */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full blur-[160px] opacity-70 bg-concept-fg/25" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[640px] h-[640px] rounded-full blur-[160px] opacity-60 bg-concept-fg/20" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[200px] opacity-40 bg-concept-fg/10" />

      {/* Fine grain noise for the frosted look */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ─── Outer glass card (iOS sheet) ─── */}
      <div className="relative z-10 w-full max-w-[420px] animate-rise-in">
        {/* Soft halo behind the card */}
        <div className="pointer-events-none absolute -inset-8 rounded-[56px] bg-concept-fg/10 blur-3xl opacity-60" />

        <div
          className="
            relative rounded-[40px]
            border border-white/40 dark:border-white/10
            bg-white/55 dark:bg-white/[0.06]
            backdrop-blur-3xl backdrop-saturate-[180%]
            shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25),0_8px_24px_-8px_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.6)]
            overflow-hidden
          "
        >
          {/* Top specular highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/50 to-transparent dark:from-white/10"
          />
          {/* Inner thin ring */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[1px] rounded-[39px] border border-white/25 dark:border-white/5"
          />

          {/* ─── Content ─── */}
          <div className="relative p-7 sm:p-9">
            {/* Brand */}
            <div className="flex flex-col items-center text-center mb-7">
              <div
                className="
                  relative w-16 h-16 rounded-[22px]
                  bg-gradient-to-b from-concept-fg to-concept-fg/85
                  flex items-center justify-center text-white
                  shadow-[0_8px_24px_-6px_var(--concept-fg),inset_0_1px_0_0_rgba(255,255,255,0.35)]
                  ring-1 ring-white/30
                  transition-transform duration-500 hover:scale-[1.04]
                  mb-4
                "
              >
                <Sparkles className="w-7 h-7 drop-shadow-sm" />
                {/* Glossy top sheen */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-white/25 blur-md"
                />
              </div>

              <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg">
                {t("app.name")}
              </h1>
              <p className="text-caption text-muted mt-1.5 max-w-[280px] leading-relaxed">
                {t("app.tagline")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
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
                    rounded-full text-muted hover:text-fg
                    hover:bg-white/40 dark:hover:bg-white/10
                    transition-all duration-200 focus-ring
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
                  className="text-[12px] font-medium text-concept-fg hover:opacity-80 transition-opacity focus-ring rounded-md px-1"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="
                    p-3 rounded-2xl
                    bg-risk-fg/10 border border-risk-fg/25
                    text-risk-fg text-caption
                    flex items-start gap-2 animate-fade-in
                    backdrop-blur-sm
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
                className="
                  group w-full mt-3
                  !rounded-2xl
                  shadow-[0_10px_30px_-10px_var(--concept-fg),inset_0_1px_0_0_rgba(255,255,255,0.3)]
                  hover:shadow-[0_14px_36px_-10px_var(--concept-fg),inset_0_1px_0_0_rgba(255,255,255,0.4)]
                  hover:-translate-y-[1px]
                  active:translate-y-0
                  transition-all duration-200
                "
                icon={
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                }
              >
                {isLoading ? t("auth.submitting") : t("auth.submit")}
              </Button>
            </form>

            {/* Divider + secondary hint */}
            <div className="mt-5 flex items-center gap-3 text-[11px] text-muted">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-line to-transparent" />
              <span className="tracking-wide uppercase">o</span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-line to-transparent" />
            </div>

            <p className="mt-3 text-center text-[12px] text-muted">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                className="font-medium text-concept-fg hover:underline underline-offset-4 focus-ring rounded"
              >
                Solicita acceso
              </button>
            </p>

            {/* Secure dev note */}
            <div
              className="
                mt-6 p-3 rounded-2xl
                bg-white/40 dark:bg-white/[0.04]
                border border-white/50 dark:border-white/10
                backdrop-blur-xl
                text-[11px] text-muted
                flex items-start gap-2.5 leading-normal
              "
            >
              <ShieldCheck className="w-4 h-4 text-positive-fg shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-fg">Ambiente seguro de desarrollo: </span>
                {t("auth.previewNote")}
              </div>
            </div>
          </div>

          {/* Bottom specular reflection */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 bottom-0 h-24 bg-gradient-to-t from-white/20 to-transparent dark:from-white/5"
          />
        </div>

        {/* iOS home indicator */}
        <div className="mx-auto mt-5 h-[5px] w-32 rounded-full bg-fg/20 backdrop-blur-sm" />
      </div>
    </div>
  );
};