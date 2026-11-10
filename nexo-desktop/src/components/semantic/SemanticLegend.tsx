import React from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import {
  perspectiveVisuals,
  relationVisuals,
  semanticStatusVisuals,
  type PerspectiveVisualToken,
} from "../../theme/semanticVisuals";
import { SemanticBadge } from "./SemanticBadges";
import { SemanticIcon } from "./SemanticIcon";

interface SemanticLegendProps {
  perspectives?: PerspectiveVisualToken[];
  className?: string;
  floating?: boolean;
}

export const SemanticLegend: React.FC<SemanticLegendProps> = ({
  perspectives = [perspectiveVisuals.economic, perspectiveVisuals.human, perspectiveVisuals.technical, perspectiveVisuals.legal],
  className = "",
  floating = false,
}) => (
  <details
    className={`${floating ? "absolute bottom-5 right-5 z-20 w-[min(340px,calc(100%-2rem))]" : "w-full"} group rounded-2xl border border-line/70 bg-surface/90 backdrop-blur-xl shadow-lg ${className}`}
  >
    <summary className="list-none cursor-pointer select-none px-3 py-2.5 flex items-center justify-between gap-3 text-[11px] font-bold text-fg focus-ring rounded-2xl">
      <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-primary" />Leyenda semántica</span>
      <ChevronDown className="w-3.5 h-3.5 text-muted transition-transform group-open:rotate-180" />
    </summary>
    <div className="border-t border-line/60 p-3 space-y-3 text-[10px]">
      <div>
        <p className="font-bold text-fg mb-1.5">Perspectiva · acento e icono</p>
        <div className="flex flex-wrap gap-1.5">
          {perspectives.slice(0, 8).map((item) => <SemanticBadge key={item.id} token={item} compact />)}
        </div>
      </div>
      <div>
        <p className="font-bold text-fg mb-1.5">Estado · etiqueta y borde</p>
        <div className="flex flex-wrap gap-1.5">
          {[semanticStatusVisuals.confirmed, semanticStatusVisuals.hypothesis, semanticStatusVisuals.unknown, semanticStatusVisuals.mixed].map((item) => (
            <SemanticBadge key={item.id} token={item} borderStyle={item.borderStyle} compact />
          ))}
        </div>
      </div>
      <div>
        <p className="font-bold text-fg mb-1.5">Relaciones · trazo y dirección</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(relationVisuals).map((item) => (
            <span key={item.id} className="flex items-center gap-1.5 text-muted">
              <SemanticIcon name={item.icon} className="w-3 h-3" />
              <span className="w-6 border-t-2" style={{ borderColor: item.dark, borderTopStyle: item.lineStyle }} />
              {item.shortLabel}
            </span>
          ))}
        </div>
      </div>
      <p className="text-muted leading-relaxed">El color indica perspectiva; el icono y la forma indican tipo; la etiqueta y el borde indican certeza.</p>
    </div>
  </details>
);

