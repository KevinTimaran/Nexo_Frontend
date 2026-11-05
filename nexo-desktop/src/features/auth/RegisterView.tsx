import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Eye, EyeOff, Lock, Mail, User as UserIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { registerSchema, type RegisterFormData } from "./authValidations";

export const RegisterView: React.FC = () => {
  const { t } = useTranslation();
  const { signUp, isLoading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError(null);
    try {
      const user = await signUp(data.name.trim(), data.email.trim(), data.password);
      showToast(`${t("app.name")} — Cuenta creada con éxito. Bienvenido, ${user.name}`, "info");
      navigate(fromPath, { replace: true });
    } catch {
      setSubmitError(
        t("auth.errors.registerFailed", {
          defaultValue: "No se pudo registrar la cuenta. Intenta de nuevo.",
        })
      );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-app dark:bg-app text-fg dark:text-fg relative overflow-hidden select-none font-sans">
      {/* ─── Ambient Orbs & Mesh Gradient ─── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(191,219,254,0.45)_0px,transparent_50%),radial-gradient(at_100%_0%,rgba(167,243,208,0.4)_0px,transparent_50%),radial-gradient(at_100%_100%,rgba(233,213,255,0.35)_0px,transparent_50%),radial-gradient(at_0%_100%,rgba(254,205,211,0.3)_0px,transparent_50%)] dark:bg-[radial-gradient(at_0%_0%,rgba(49,46,129,0.35)_0px,transparent_50%),radial-gradient(at_100%_0%,rgba(6,78,59,0.25)_0px,transparent_50%),radial-gradient(at_100%_100%,rgba(88,28,135,0.25)_0px,transparent_50%),radial-gradient(at_0%_100%,rgba(131,24,67,0.18)_0px,transparent_50%)] z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 w-[620px] h-[620px] rounded-full blur-[120px] bg-primary/20 dark:bg-surface/40 z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 w-[620px] h-[620px] rounded-full blur-[120px] bg-positive/15 dark:bg-surface/30 z-0"
      />

      {/* ─── Floating Glass Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div
          className="
            relative rounded-3xl overflow-hidden
            bg-surface/70 backdrop-blur-2xl border border-line/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
            dark:bg-app/20 dark:border-line/10 dark:shadow-2xl
            text-fg dark:text-fg select-text
          "
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/20 to-transparent z-20"
          />

          <div className="relative p-7 sm:p-9">
            {/* Brand Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className="
                  relative w-14 h-14 rounded-2xl
                  bg-gradient-to-br from-blue-600 to-indigo-600
                  flex items-center justify-center text-fg
                  shadow-lg shadow-blue-500/25 ring-1 ring-line/40
                  transition-transform duration-300 hover:scale-[1.03]
                  mb-3
                "
              >
                <Sparkles className="w-6 h-6 drop-shadow-sm" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-fg dark:text-fg">
                {t("auth.registerTitle", { defaultValue: "Crear Cuenta en Nexo" })}
              </h1>
              <p className="text-xs text-muted dark:text-muted mt-1 max-w-[280px] leading-relaxed">
                {t("auth.registerSubtitle", { defaultValue: "Estructura tus ideas de negocio e innovación con IA" })}
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
              {/* Name input */}
              <div className="space-y-1">
                <Input
                  label={t("auth.name", { defaultValue: "Nombre completo" })}
                  type="text"
                  placeholder={t("auth.namePlaceholder", { defaultValue: "Ej. Kevin Rivera" })}
                  icon={<UserIcon className="w-4 h-4 text-muted dark:text-muted" />}
                  autoComplete="name"
                  autoFocus
                  disabled={isLoading}
                  error={errors.name?.message}
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
              </div>

              {/* Email input */}
              <div className="space-y-1">
                <Input
                  label={t("auth.email", { defaultValue: "Correo electrónico" })}
                  type="email"
                  placeholder={t("auth.emailPlaceholder", { defaultValue: "kevin@nexo.ai" })}
                  icon={<Mail className="w-4 h-4 text-muted dark:text-muted" />}
                  autoComplete="email"
                  disabled={isLoading}
                  error={errors.email?.message}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>

              {/* Password input */}
              <div className="space-y-1">
                <Input
                  label={t("auth.password", { defaultValue: "Contraseña" })}
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder", { defaultValue: "Mínimo 8 car., 1 mayúscula, 1 número, 1 símbolo" })}
                  icon={<Lock className="w-4 h-4 text-muted dark:text-muted" />}
                  autoComplete="new-password"
                  disabled={isLoading}
                  error={errors.password?.message}
                  aria-invalid={!!errors.password}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="
                        w-8 h-8 flex items-center justify-center
                        rounded-lg text-muted hover:text-fg dark:hover:text-fg
                        hover:bg-surface/40 dark:hover:bg-surface/10 active:scale-95
                        transition-all duration-200 cursor-pointer
                        disabled:opacity-50
                      "
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  {...register("password")}
                />
              </div>

              {/* Confirm Password input */}
              <div className="space-y-1">
                <Input
                  label={t("auth.confirmPassword", { defaultValue: "Confirmar contraseña" })}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.confirmPasswordPlaceholder", { defaultValue: "Repite tu contraseña" })}
                  icon={<Lock className="w-4 h-4 text-muted dark:text-muted" />}
                  autoComplete="new-password"
                  disabled={isLoading}
                  error={errors.confirmPassword?.message}
                  aria-invalid={!!errors.confirmPassword}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className="
                        w-8 h-8 flex items-center justify-center
                        rounded-lg text-muted hover:text-fg dark:hover:text-fg
                        hover:bg-surface/40 dark:hover:bg-surface/10 active:scale-95
                        transition-all duration-200 cursor-pointer
                        disabled:opacity-50
                      "
                      aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  {...register("confirmPassword")}
                />
              </div>

              {/* Global Submit Error Message */}
              <AnimatePresence mode="wait">
                {submitError && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="
                      p-3 rounded-xl
                      bg-danger/10 border border-danger/25
                      text-danger dark:text-danger text-xs font-medium
                      flex items-start gap-2 backdrop-blur-sm
                    "
                  >
                    <span className="font-semibold text-xs leading-none mt-0.5">•</span>
                    <span>{submitError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                className="w-full mt-2 !rounded-xl !bg-primary hover:!bg-primary !text-fg shadow-[0_4px_16px_rgba(37,99,235,0.3)] cursor-pointer"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isLoading ? t("auth.submitting") : t("auth.registerButton", { defaultValue: "Registrarse" })}
              </Button>
            </form>

            {/* Back to Login */}
            <p className="mt-4 text-center text-xs text-muted dark:text-muted">
              {t("auth.hasAccount", { defaultValue: "¿Ya tienes cuenta?" })}{" "}
              <Link
                to="/login"
                className="font-semibold text-primary dark:text-primary hover:underline underline-offset-4 cursor-pointer"
              >
                {t("auth.loginAction", { defaultValue: "Inicia sesión" })}
              </Link>
            </p>

            {/* Security Note */}
            <div
              className="
                mt-5 p-3.5 rounded-2xl
                bg-surface/40 dark:bg-surface/5
                border border-line/50 dark:border-line/10
                backdrop-blur-md
                text-xs text-muted dark:text-muted
                flex items-start gap-2.5 leading-normal shadow-xs
              "
            >
              <ShieldCheck className="w-4 h-4 text-primary dark:text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-fg dark:text-fg">
                  {t("auth.securityTitle", { defaultValue: "Validación Estricta:" })}{" "}
                </span>
                <span>
                  {t("auth.securityDesc", {
                    defaultValue:
                      "Tus datos son validados de forma segura en cliente y servidor para proteger la integridad de tus proyectos.",
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
