import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";
import { playButtonClickSound } from "../../services/audio/soundEffects";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  type OnboardingStep,
} from "./onboardingData";
import { useDialogFocus } from "../../hooks/useDialogFocus";

export { ONBOARDING_STEPS, ONBOARDING_STORAGE_KEY, type OnboardingStep };

export interface OnboardingTourProps {
  forceOpen?: boolean;
  onComplete?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  forceOpen = false,
  onComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check completion status on mount
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed || forceOpen) {
      setIsOpen(true);
    }

    // Listen for custom trigger to re-launch tour from Settings
    const handleReopen = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener("nexo:start-onboarding", handleReopen);
    return () => window.removeEventListener("nexo:start-onboarding", handleReopen);
  }, [forceOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep]);

  const handleDismiss = () => {
    playButtonClickSound();
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setIsOpen(false);
    onComplete?.();
  };

  const handleNext = () => {
    playButtonClickSound();
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    playButtonClickSound();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  useDialogFocus(isOpen, dialogRef, { onEscape: handleDismiss, trap: true });

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop Glassmorphism */}
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-step-title"
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-lg rounded-3xl bg-surface/95 dark:bg-zinc-950/90 border border-line dark:border-white/10 shadow-2xl p-6 sm:p-8 backdrop-blur-2xl text-fg overflow-hidden"
          style={{
            boxShadow:
              "0 24px 48px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          {/* Ambient Corner Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-60 h-60 rounded-full bg-primary/20 blur-3xl"
          />

          {/* Close / Skip button */}
          <button
            type="button"
            onClick={handleDismiss}
            data-dialog-initial-focus
            aria-label="Cerrar guía"
            className="absolute top-5 right-5 text-muted hover:text-fg p-1.5 rounded-full hover:bg-surface/60 dark:hover:bg-surface/20 transition-colors cursor-pointer"
            title="Cerrar guía (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step Badge & Icon Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 dark:bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <StepIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
                {step.badge}
              </span>
              <h2 id="onboarding-step-title" className="text-lg font-bold text-fg tracking-tight leading-snug">
                {step.title}
              </h2>
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-3.5 mb-7">
            <p className="text-sm text-fg/90 leading-relaxed">{step.description}</p>
            <div className="p-3 rounded-xl bg-sunken/60 dark:bg-white/[0.04] border border-line/60 dark:border-white/5 text-xs text-muted leading-normal flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-positive shrink-0 mt-0.5" />
              <span>{step.highlight}</span>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-line/60 dark:border-white/10">
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {ONBOARDING_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    playButtonClickSound();
                    setCurrentStep(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentStep === idx
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted/30 hover:bg-muted/60"
                  }`}
                  title={`Ir al paso ${idx + 1}`}
                  aria-label={`Ir al paso ${idx + 1}: ${s.title}`}
                  aria-current={currentStep === idx ? "step" : undefined}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="h-9 px-3.5 rounded-xl text-xs font-semibold text-muted hover:text-fg bg-surface/60 hover:bg-surface border border-line/60 dark:border-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:brightness-110 shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isLast ? "Comenzar a idear" : "Siguiente"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
