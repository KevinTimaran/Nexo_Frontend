import React, { forwardRef, useRef, useCallback } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Glass } from "glisse";

export type GlisseCardVariant = "default" | "modal" | "subtle" | "elevated" | "hud";

export interface GlisseCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: React.ReactNode;
  /** Visual variant aligning with Nexo's glassmorphism tokens */
  variant?: GlisseCardVariant;
  /** Enables fluid spring gestures, subtle lift on hover, and tactile spring compression on tap */
  interactive?: boolean;
  /** Adds a specular hairline sheen along the top edge of the card */
  sheen?: boolean;
  /** Custom glow color or boolean flag for ambient accent reflection */
  glow?: boolean | string;
  /** Stops click/pointer/wheel propagation to background 3D canvas (OrbitControls) */
  stopEventPropagation?: boolean;
  /** Optional inner glass refraction overlay (defaults to true) */
  glisseRefraction?: boolean;
  /** Whether text inside the card can be selected (defaults to false for cards, true for text modals) */
  selectable?: boolean;
}

const VARIANT_STYLES: Record<GlisseCardVariant, string> = {
  default:
    "bg-zinc-950/60 backdrop-blur-2xl ring-1 ring-white/10 rounded-2xl p-4 shadow-2xl",
  hud:
    "bg-zinc-950/60 backdrop-blur-2xl ring-1 ring-white/10 rounded-2xl p-4 shadow-2xl",
  modal:
    "bg-zinc-900/80 backdrop-blur-3xl ring-1 ring-white/10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]",
  subtle:
    "bg-zinc-950/40 backdrop-blur-xl ring-1 ring-white/10 rounded-xl p-3 shadow-xl",
  elevated:
    "bg-zinc-950/70 backdrop-blur-2xl ring-1 ring-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)]",
};

/**
 * GlisseCard — Base glassmorphism component fusing Glisse's Apple Liquid Glass
 * physics, dynamic specular rim reflections and interactive gestures with
 * Nexo's dark obsidian glass design recipe.
 */
export const GlisseCard = forwardRef<HTMLDivElement, GlisseCardProps>(
  (
    {
      children,
      className = "",
      variant = "default",
      interactive = false,
      sheen = true,
      glow = false,
      stopEventPropagation = true,
      glisseRefraction = true,
      selectable,
      onPointerMove,
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
      onMouseDown,
      onClick,
      onWheel,
      whileHover,
      whileTap,
      transition,
      style,
      ...motionProps
    },
    forwardedRef
  ) => {
    const isSelectable = selectable ?? (variant === "modal");
    const localRef = useRef<HTMLDivElement | null>(null);
    const glassRef = useRef<HTMLDivElement | null>(null);

    const handleRef = useCallback(
      (node: HTMLDivElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    // Track pointer coordinates relative to card for dynamic specular hotspot
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const el = localRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
          const xStr = `${x.toFixed(2)}%`;
          const yStr = `${y.toFixed(2)}%`;
          el.style.setProperty("--lg-x", xStr);
          el.style.setProperty("--lg-y", yStr);
          if (glassRef.current) {
            glassRef.current.style.setProperty("--lg-x", xStr);
            glassRef.current.style.setProperty("--lg-y", yStr);
          }
        }
      }
      onPointerMove?.(e);
    };

    // Track active press gesture for Glisse's [data-pressed] reflection & physics
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (stopEventPropagation) {
        e.stopPropagation();
      }
      const el = localRef.current;
      if (el) {
        el.dataset.pressed = "";
      }
      if (glassRef.current) {
        glassRef.current.dataset.pressed = "";
      }
      onPointerDown?.(e);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      const el = localRef.current;
      if (el) {
        delete el.dataset.pressed;
      }
      if (glassRef.current) {
        delete glassRef.current.dataset.pressed;
      }
      onPointerUp?.(e);
    };

    const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
      const el = localRef.current;
      if (el) {
        delete el.dataset.pressed;
      }
      if (glassRef.current) {
        delete glassRef.current.dataset.pressed;
      }
      onPointerLeave?.(e);
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
      const el = localRef.current;
      if (el) {
        delete el.dataset.pressed;
      }
      if (glassRef.current) {
        delete glassRef.current.dataset.pressed;
      }
      onPointerCancel?.(e);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (stopEventPropagation) {
        e.stopPropagation();
      }
      onMouseDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (stopEventPropagation) {
        e.stopPropagation();
      }
      onClick?.(e);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (stopEventPropagation) {
        e.stopPropagation();
      }
      onWheel?.(e);
    };

    // Glisse-calibrated spring physics
    const defaultHover = interactive
      ? { scale: 1.008, y: -2, transition: { type: "spring" as const, stiffness: 380, damping: 26 } }
      : undefined;

    const defaultTap = interactive
      ? { scale: 0.985, transition: { type: "spring" as const, stiffness: 440, damping: 24 } }
      : undefined;

    const defaultTransition = {
      type: "spring" as const,
      stiffness: 350,
      damping: 28,
      mass: 0.8,
    };

    const glowStyle =
      glow === true
        ? { boxShadow: "0 0 25px -5px rgba(99, 102, 241, 0.25)" }
        : typeof glow === "string"
        ? { boxShadow: `0 0 25px -5px ${glow}` }
        : undefined;

    return (
      <motion.div
        ref={handleRef}
        className={`lg-glass pointer-events-auto ${isSelectable ? "select-text" : "select-none"} relative overflow-hidden text-white transition-[border-color,box-shadow] duration-200 ${VARIANT_STYLES[variant]} ${className}`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onWheel={handleWheel}
        whileHover={whileHover ?? defaultHover}
        whileTap={whileTap ?? defaultTap}
        transition={transition ?? defaultTransition}
        style={{
          ...glowStyle,
          ...style,
        }}
        {...motionProps}
      >
        {/* Glisse Liquid Glass Live Refraction & Dynamic Specular Rim Engine */}
        {glisseRefraction && (
          <Glass
            ref={glassRef}
            className="absolute inset-0 pointer-events-none rounded-[inherit] -z-10 !bg-transparent"
            aria-hidden="true"
          />
        )}

        {/* Specular hairline sheen along the top edge */}
        {sheen && (
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />
        )}

        {children}
      </motion.div>
    );
  }
);

GlisseCard.displayName = "GlisseCard";

export default GlisseCard;
