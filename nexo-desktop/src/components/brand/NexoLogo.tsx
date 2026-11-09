import React from "react";

export interface NexoLogoProps {
  /** Size in pixels (applies to width and height). Default: 24 */
  size?: number | string;
  /** Custom CSS classes for the container or SVG */
  className?: string;
  /** Whether to render the brand wordmark "NEXO" alongside the mark */
  showText?: boolean;
  /** Custom CSS classes for the wordmark text */
  textClassName?: string;
}

/**
 * NexoLogo — Official brand mark for NEXO.
 * Represents interconnected conceptual nodes forming an architectural 'N' nexus.
 */
export const NexoLogo: React.FC<NexoLogoProps> = ({
  size = 24,
  className = "",
  showText = false,
  textClassName = "",
}) => {
  const numericSize = typeof size === "number" ? size : parseInt(size, 10) || 24;

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      data-testid="nexo-logo"
    >
      <svg
        width={numericSize}
        height={numericSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nexo-grad-main" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--accent-primary, #E5C158)" />
            <stop offset="50%" stopColor="var(--accent-secondary, #D4AF37)" />
            <stop offset="100%" stopColor="var(--primary, #9E4733)" />
          </linearGradient>
          <linearGradient id="nexo-grad-glow" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--accent-primary, #E5C158)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--primary, #9E4733)" stopOpacity="0.2" />
          </linearGradient>
          <filter id="nexo-blur-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Neural Back-glow */}
        <circle cx="16" cy="16" r="13" fill="url(#nexo-grad-glow)" opacity="0.12" />

        {/* Outer Hexagonal Shield Bounds */}
        <path
          d="M16 2.5 L28 9.5 L28 22.5 L16 29.5 L4 22.5 L4 9.5 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeLinejoin="round"
        />

        {/* Connecting Neural Nexus Paths (The 'N' Lattice) */}
        {/* Left vertical pillar */}
        <line
          x1="9"
          y1="9"
          x2="9"
          y2="23"
          stroke="url(#nexo-grad-main)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Right vertical pillar */}
        <line
          x1="23"
          y1="9"
          x2="23"
          y2="23"
          stroke="url(#nexo-grad-main)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Central diagonal nexus traversal */}
        <line
          x1="9"
          y1="9"
          x2="23"
          y2="23"
          stroke="url(#nexo-grad-main)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Cross-axial concept link to central hub */}
        <line
          x1="9"
          y1="23"
          x2="16"
          y2="16"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="1.5 2"
        />
        <line
          x1="23"
          y1="9"
          x2="16"
          y2="16"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="1.5 2"
        />

        {/* Peripheral Node Spheres */}
        {/* Top-Left Concept Node */}
        <circle cx="9" cy="9" r="3" fill="var(--surface-primary, #2A1412)" stroke="url(#nexo-grad-main)" strokeWidth="1.8" />
        <circle cx="9" cy="9" r="1.2" fill="var(--accent-primary, #E5C158)" />

        {/* Bottom-Left Concept Node */}
        <circle cx="9" cy="23" r="2.6" fill="var(--surface-primary, #2A1412)" stroke="url(#nexo-grad-main)" strokeWidth="1.8" />
        <circle cx="9" cy="23" r="1" fill="var(--accent-secondary, #D4AF37)" />

        {/* Top-Right Concept Node */}
        <circle cx="23" cy="9" r="2.6" fill="var(--surface-primary, #2A1412)" stroke="url(#nexo-grad-main)" strokeWidth="1.8" />
        <circle cx="23" cy="9" r="1" fill="var(--accent-secondary, #D4AF37)" />

        {/* Bottom-Right Concept Node */}
        <circle cx="23" cy="23" r="3" fill="var(--surface-primary, #2A1412)" stroke="url(#nexo-grad-main)" strokeWidth="1.8" />
        <circle cx="23" cy="23" r="1.2" fill="var(--accent-primary, #E5C158)" />

        {/* Central Synthesis Hub Node */}
        <circle cx="16" cy="16" r="3.2" fill="url(#nexo-grad-main)" />
        <circle cx="16" cy="16" r="1.2" fill="#FFFFFF" />
      </svg>

      {showText && (
        <span
          className={`font-bold tracking-wider text-fg uppercase ${
            textClassName || "text-sm sm:text-base"
          }`}
        >
          NEXO
        </span>
      )}
    </div>
  );
};
