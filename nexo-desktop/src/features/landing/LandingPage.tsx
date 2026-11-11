import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass, Download, Layers, Lightbulb, Scale } from "lucide-react";
import { NexoLogo } from "../../components/brand/NexoLogo";
import { buildReleasesUrl } from "../../config/env";

/**
 * Public presentation page shown only in the web build before signing in.
 * It always renders with the LIGHT theme, whatever the visitor's saved or system theme is,
 * and restores the previous theme when it unmounts (it never writes the saved preference).
 */
function useForcedLightTheme(): void {
  useEffect(() => {
    const root = document.documentElement;
    const previous = {
      className: root.className,
      dataTheme: root.getAttribute("data-theme"),
      colorScheme: root.style.colorScheme,
    };
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    return () => {
      root.className = previous.className;
      if (previous.dataTheme === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previous.dataTheme);
      root.style.colorScheme = previous.colorScheme;
    };
  }, []);
}

const STEP_KEYS = ["idea", "chat", "board", "space"] as const;
const FEATURE_ICONS = [Lightbulb, Compass, Scale, Layers] as const;
const FEATURE_KEYS = ["conversation", "perspectives", "evidence", "views"] as const;

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  useForcedLightTheme();

  const ctaPrimary =
    "btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-chat-sm font-semibold cursor-pointer";
  const ctaSecondary =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-chat-sm font-semibold border border-line bg-surface text-fg hover:bg-surface-elevated transition-colors cursor-pointer";

  return (
    <div className="h-screen w-full overflow-y-auto select-text bg-app text-fg relative" data-testid="landing-page">
      <div aria-hidden="true" className="gradient-mesh pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-70" />

      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <NexoLogo size={30} showText />
        <nav className="flex items-center gap-2" aria-label={t("landing.nav.label", { defaultValue: "Acceso" })}>
          <Link to="/login" className="px-3 sm:px-4 py-2 rounded-xl text-chat-sm font-semibold text-fg hover:bg-surface-elevated transition-colors whitespace-nowrap">
            {t("landing.nav.login", { defaultValue: "Iniciar sesión" })}
          </Link>
          <Link to="/register" className={ctaPrimary}>
            {t("landing.nav.register", { defaultValue: "Registrarse" })}
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-14 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-balance">
            {t("landing.hero.titleStart", { defaultValue: "Convierte una idea difusa en" })}{" "}
            <span className="text-gradient-warm">{t("landing.hero.titleHighlight", { defaultValue: "un proyecto claro" })}</span>
          </h1>
          <p className="mt-5 text-chat text-muted max-w-2xl mx-auto">
            {t("landing.hero.subtitle", {
              defaultValue:
                "Nexo conversa contigo como un asesor multidisciplinario: aclara tu idea, detecta lo que no has considerado, propone alternativas y lo organiza todo en un tablero que puedes explorar en 2D y 3D.",
            })}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className={ctaPrimary}>
              {t("landing.hero.ctaRegister", { defaultValue: "Crear mi cuenta" })}
            </Link>
            <Link to="/login" className={ctaSecondary}>
              {t("landing.hero.ctaLogin", { defaultValue: "Ya tengo cuenta" })}
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-6 pb-20" aria-labelledby="landing-how">
          <h2 id="landing-how" className="text-title-xl text-center">
            {t("landing.how.title", { defaultValue: "Cómo funciona" })}
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEP_KEYS.map((key, index) => (
              <li key={key} className="glass-card p-6 rounded-3xl">
                <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-chat-sm font-bold">{index + 1}</span>
                <h3 className="mt-4 text-chat-sm font-bold">{t(`landing.how.steps.${key}.title`, { defaultValue: key })}</h3>
                <p className="mt-2 text-chat-xs text-muted">{t(`landing.how.steps.${key}.text`, { defaultValue: "" })}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 pb-20" aria-labelledby="landing-features">
          <h2 id="landing-features" className="text-title-xl text-center">
            {t("landing.features.title", { defaultValue: "Pensado para que decidas con criterio" })}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURE_KEYS.map((key, index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <article key={key} className="glass-card p-7 rounded-3xl flex gap-4">
                  <div className="w-11 h-11 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-chat font-bold">{t(`landing.features.items.${key}.title`, { defaultValue: key })}</h3>
                    <p className="mt-1.5 text-chat-sm text-muted">{t(`landing.features.items.${key}.text`, { defaultValue: "" })}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Download */}
        <section className="max-w-4xl mx-auto px-6 pb-24" aria-labelledby="landing-download">
          <div className="glass-card rounded-3xl p-10 text-center">
            <h2 id="landing-download" className="text-title-xl">
              {t("landing.download.title", { defaultValue: "También como app de escritorio" })}
            </h2>
            <p className="mt-3 text-chat-sm text-muted max-w-xl mx-auto">
              {t("landing.download.text", {
                defaultValue: "Descarga Nexo para Windows y entra directo a tus proyectos. Usa la misma cuenta que en la web.",
              })}
            </p>
            <a href={buildReleasesUrl()} target="_blank" rel="noopener noreferrer" className={`${ctaSecondary} mt-6`}>
              <Download className="w-4 h-4" />
              {t("landing.download.button", { defaultValue: "Descargar para Windows" })}
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line py-8 text-center text-chat-xs text-muted">
        {t("landing.footer", { defaultValue: "Nexo — Donde las ideas toman forma." })}
      </footer>
    </div>
  );
};

export default LandingPage;
