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
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-app relative overflow-hidden select-none">
      {/* Apple-style subtle ambient gradients */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-concept-fg/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] bg-concept-fg/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md glass border border-line rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 animate-rise-in backdrop-blur-2xl">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-concept-fg flex items-center justify-center text-white shadow-lg shadow-concept-fg/25 mb-4 ring-4 ring-concept-fg/15 transition-transform hover:scale-105 duration-300">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">{t("app.name")}</h1>
          <p className="text-caption text-muted mt-1.5 max-w-xs leading-relaxed">
            {t("app.tagline")}
          </p>
        </div>

        {/* Login form */}
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
              className="absolute right-3 top-8 text-muted hover:text-fg p-1 rounded-md transition-colors focus-ring"
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-risk-fg/10 border border-risk-fg/25 text-risk-fg text-caption flex items-start gap-2 animate-fade-in"
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
            className="w-full mt-3 shadow-md shadow-concept-fg/20 hover:shadow-lg transition-all"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {isLoading ? t("auth.submitting") : t("auth.submit")}
          </Button>
        </form>

        {/* Development & security note */}
        <div className="mt-6 p-3 rounded-xl bg-sunken/80 border border-line-soft text-[11px] text-muted flex items-start gap-2.5 leading-normal">
          <ShieldCheck className="w-4 h-4 text-positive-fg shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-fg">Ambiente seguro de desarrollo: </span>
            {t("auth.previewNote")}
          </div>
        </div>
      </div>
    </div>
  );
};
