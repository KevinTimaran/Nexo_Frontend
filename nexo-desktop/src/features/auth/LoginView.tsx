import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export const LoginView: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, isLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("kevin@nexo.ai");
  const [password, setPassword] = useState("nexo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError(t("auth.errors.emailRequired"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.errors.passwordShort"));
      return;
    }

    try {
      await signIn(email, password);
      showToast(t("app.name") + " — Welcome back!");
    } catch {
      setError(t("auth.errors.unknown"));
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-app relative overflow-hidden">
      {/* Background ambient ambient glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-concept-fg/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-concept-fg/5 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-8 shadow-2xl relative z-10 animate-rise-in">
        {/* Brand logo & tagline */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-concept-fg flex items-center justify-center text-white shadow-lg shadow-concept-fg/20 mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t("app.name")}</h1>
          <p className="text-caption text-muted mt-1">{t("app.tagline")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            icon={<Mail className="w-4 h-4" />}
            autoFocus
          />

          <div className="relative">
            <Input
              label={t("auth.password")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              icon={<Lock className="w-4 h-4" />}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-muted hover:text-fg transition-colors"
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
             <div className="p-3 rounded-xl bg-risk-fg/10 border border-risk-fg/20 text-risk-fg text-caption">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            className="w-full mt-2"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {isLoading ? t("auth.submitting") : t("auth.submit")}
          </Button>
        </form>

        {/* Preview build helper hint */}
        <div className="mt-6 p-3 rounded-xl bg-sunken border border-line text-caption text-muted text-center">
          {t("auth.previewNote")}
        </div>
      </div>
    </div>
  );
};
