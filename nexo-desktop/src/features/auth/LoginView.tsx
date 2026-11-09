import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User as UserIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { NexoLogo } from "../../components/brand/NexoLogo";
import {
  loginSchema,
  registerSchema,
  type LoginFormData,
  type RegisterFormData,
} from "./authValidations";

export const LoginView: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, signUp, isLoading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  // Form for Login
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Form for Register
  const {
    register: registerSignUp,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
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

  const onLogin = async (data: LoginFormData) => {
    setSubmitError(null);
    try {
      const user = await signIn(data.email.trim(), data.password);
      showToast(`${t("app.name")} — Bienvenido, ${user.name}`, "info");
      navigate(fromPath, { replace: true });
    } catch {
      setSubmitError(
        t("auth.errors.unknown", {
          defaultValue: "Credenciales inválidas o error de conexión.",
        })
      );
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setSubmitError(null);
    try {
      const user = await signUp(data.name.trim(), data.email.trim(), data.password);
      showToast(`${t("app.name")} — Cuenta creada con éxito. Bienvenido, ${user.name}`, "info");
      navigate(fromPath, { replace: true });
    } catch {
      setSubmitError(
        t("auth.errors.registerFailed", {
          defaultValue: "No se pudo crear la cuenta. Intenta nuevamente.",
        })
      );
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setSubmitError(null);
    setMode(newMode);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-app dark:bg-app text-fg dark:text-fg relative overflow-hidden select-none font-sans">
      {/* ─── 1. Elegant Mesh Gradient & VisionOS Ambient Orbs ─── */}
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full blur-[140px] bg-violet-200/35 dark:bg-purple-900/20 z-0"
      />

      {/* ─── 2. Floating Glass Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[430px]"
      >
        <div
          className="
            relative rounded-3xl overflow-hidden
            bg-surface/70 backdrop-blur-2xl border border-line/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]
            dark:bg-app/20 dark:border-line/10 dark:shadow-2xl
            text-fg dark:text-fg select-text
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
            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="
                  relative w-15 h-15 rounded-2xl
                  bg-surface/80 dark:bg-surface-primary
                  flex items-center justify-center text-fg
                  shadow-lg ring-1 ring-line/40
                  transition-transform duration-300 hover:scale-[1.03]
                  mb-3
                "
              >
                <NexoLogo size={36} />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-surface/25 blur-md"
                />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-fg dark:text-fg">
                {t("app.name")}
              </h1>
              <p className="text-xs text-muted dark:text-muted mt-1 max-w-[280px] leading-relaxed">
                {t("app.tagline")}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-sunken/50 dark:bg-surface/5 rounded-2xl mb-5 border border-line/70 dark:border-line/10 relative">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  mode === "login"
                    ? "bg-surface dark:bg-surface/15 text-fg dark:text-fg shadow-xs"
                    : "text-muted hover:text-fg dark:text-muted dark:hover:text-fg"
                }`}
              >
                {t("auth.loginTab", { defaultValue: "Iniciar sesión" })}
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  mode === "register"
                    ? "bg-surface dark:bg-surface/15 text-fg dark:text-fg shadow-xs"
                    : "text-muted hover:text-fg dark:text-muted dark:hover:text-fg"
                }`}
              >
                {t("auth.registerTab", { defaultValue: "Crear cuenta" })}
              </button>
            </div>

            {/* Mode: Login */}
            {mode === "login" ? (
              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4" noValidate>
                <div className="space-y-1">
                  <Input
                    label={t("auth.email")}
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    icon={<Mail className="w-4 h-4 text-muted dark:text-muted" />}
                    autoComplete="email"
                    autoFocus
                    disabled={isLoading}
                    error={loginErrors.email?.message}
                    aria-invalid={!!loginErrors.email}
                    {...loginRegister("email")}
                  />
                </div>

                <div className="space-y-1">
                  <Input
                    label={t("auth.password")}
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder")}
                    icon={<Lock className="w-4 h-4 text-muted dark:text-muted" />}
                    autoComplete="current-password"
                    disabled={isLoading}
                    error={loginErrors.password?.message}
                    aria-invalid={!!loginErrors.password}
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
                    {...loginRegister("password")}
                  />
                </div>

                {/* Forgot password */}
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    className="text-xs font-medium text-primary dark:text-primary hover:underline underline-offset-4 transition-all rounded-md px-1 cursor-pointer"
                  >
                    {t("auth.forgotPassword", { defaultValue: "¿Olvidaste tu contraseña?" })}
                  </button>
                </div>

                {/* Submit Error */}
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

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full mt-2 !rounded-xl !bg-primary hover:!bg-primary !text-fg shadow-[0_4px_16px_rgba(37,99,235,0.3)] cursor-pointer"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {isLoading ? t("auth.submitting") : t("auth.submit")}
                </Button>
              </form>
            ) : (
              /* Mode: Register */
              <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-3.5" noValidate>
                <div className="space-y-1">
                  <Input
                    label={t("auth.name", { defaultValue: "Nombre completo" })}
                    type="text"
                    placeholder={t("auth.namePlaceholder", { defaultValue: "Ej. Kevin Rivera" })}
                    icon={<UserIcon className="w-4 h-4 text-muted dark:text-muted" />}
                    autoComplete="name"
                    autoFocus
                    disabled={isLoading}
                    error={registerErrors.name?.message}
                    aria-invalid={!!registerErrors.name}
                    {...registerSignUp("name")}
                  />
                </div>

                <div className="space-y-1">
                  <Input
                    label={t("auth.email", { defaultValue: "Correo electrónico" })}
                    type="email"
                    placeholder={t("auth.emailPlaceholder", { defaultValue: "kevin@nexo.ai" })}
                    icon={<Mail className="w-4 h-4 text-muted dark:text-muted" />}
                    autoComplete="email"
                    disabled={isLoading}
                    error={registerErrors.email?.message}
                    aria-invalid={!!registerErrors.email}
                    {...registerSignUp("email")}
                  />
                </div>

                <div className="space-y-1">
                  <Input
                    label={t("auth.password", { defaultValue: "Contraseña" })}
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder", { defaultValue: "Mín. 8 car., 1 mayúscula, 1 número, 1 símbolo" })}
                    icon={<Lock className="w-4 h-4 text-muted dark:text-muted" />}
                    autoComplete="new-password"
                    disabled={isLoading}
                    error={registerErrors.password?.message}
                    aria-invalid={!!registerErrors.password}
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
                    {...registerSignUp("password")}
                  />
                </div>

                <div className="space-y-1">
                  <Input
                    label={t("auth.confirmPassword", { defaultValue: "Confirmar contraseña" })}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("auth.confirmPasswordPlaceholder", { defaultValue: "Repite tu contraseña" })}
                    icon={<Lock className="w-4 h-4 text-muted dark:text-muted" />}
                    autoComplete="new-password"
                    disabled={isLoading}
                    error={registerErrors.confirmPassword?.message}
                    aria-invalid={!!registerErrors.confirmPassword}
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
                    {...registerSignUp("confirmPassword")}
                  />
                </div>

                {/* Submit Error */}
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
            )}

            {/* Divider */}
            <div className="mt-5 flex items-center gap-3 text-xs text-muted dark:text-muted">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent" />
              <span className="tracking-wider uppercase font-semibold text-[10px]">
                {t("auth.or", { defaultValue: "o" })}
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 dark:via-white/10 to-transparent" />
            </div>

            {/* Bottom Toggle Prompt */}
            <p className="mt-3.5 text-center text-xs text-muted dark:text-muted">
              {mode === "login" ? (
                <>
                  {t("auth.noAccount", { defaultValue: "¿No tienes cuenta?" })}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-semibold text-primary dark:text-primary hover:underline underline-offset-4 cursor-pointer"
                  >
                    {t("auth.requestAccess", { defaultValue: "Crea una cuenta" })}
                  </button>
                </>
              ) : (
                <>
                  {t("auth.hasAccount", { defaultValue: "¿Ya tienes cuenta?" })}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-primary dark:text-primary hover:underline underline-offset-4 cursor-pointer"
                  >
                    {t("auth.loginAction", { defaultValue: "Inicia sesión" })}
                  </button>
                </>
              )}
            </p>

          </div>
        </div>
      </motion.div>
    </div>
  );
};