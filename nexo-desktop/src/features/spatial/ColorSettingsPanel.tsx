import React from "react";
import { motion, type PanInfo, type Variants } from "framer-motion";
import { Glass } from "glisse";
import { X, Filter, RotateCcw, Palette, MousePointerClick } from "lucide-react";
import { DEFAULT_SPATIAL_GROUP_COLORS, SPATIAL_GROUPS, type SpatialGroupId } from "../../domain/spatial";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export const ColorSettingsPanel: React.FC = () => {
  // ⚠️ Lógica del Store intacta para no afectar módulos externos
  const spatialGroupColors = useWorkspaceStore((s) => s.spatialGroupColors);
  const setSpatialGroupColor = useWorkspaceStore((s) => s.setSpatialGroupColor);
  const activeFilter = useWorkspaceStore((s) => s.activeFilter);
  const setActiveFilter = useWorkspaceStore((s) => s.setActiveFilter);
  const setActiveLeftPanel = useWorkspaceStore((s) => s.setActiveLeftPanel);
  const spatialNodes = useWorkspaceStore((s) => s.spatialNodes);

  const close = () => setActiveLeftPanel(null);

  // Glisse swipe-to-dismiss threshold handler
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (
      info.offset.x > 75 ||
      info.velocity.x > 320 ||
      info.offset.y > 75 ||
      info.velocity.y > 320
    ) {
      close();
    }
  };

  const handleResetColors = () => {
    Object.entries(DEFAULT_SPATIAL_GROUP_COLORS).forEach(([groupId, defaultColor]) => {
      setSpatialGroupColor(groupId as SpatialGroupId, defaultColor);
    });
  };

  // Variantes para animación en cascada de las filas al abrir el panel
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <motion.aside
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ right: 0.6, left: 0.1 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, x: -30, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed left-24 top-1/2 -translate-y-1/2 z-40 w-84 max-w-[calc(100vw-7.5rem)] flex flex-col text-fg"
    >
      {/* Contenedor Glass principal con tokens semánticos */}
      <Glass
        className="rounded-3xl overflow-hidden shadow-2xl flex flex-col p-5 space-y-4 border border-border-color"
        style={{
          backgroundColor: "var(--card-bg, rgba(9,9,11,0.6))",
          borderColor: "var(--card-border, rgba(255,255,255,0.1))",
        }}
      >
        
        {/* Handle de arrastre */}
        <div className="w-10 h-1 rounded-full bg-border-color mx-auto -mt-1 cursor-grab active:cursor-grabbing" />

        {/* Header */}
        <div className="flex items-start justify-between pb-1">
          <div>
            <h3 className="text-sm font-semibold text-fg tracking-tight flex items-center gap-2">
              <Palette className="w-4 h-4 text-concept-fg" />
              <span>Filtros y Configuración</span>
            </h3>
            {/* Subtítulo UX para guiar al usuario */}
            <p className="text-[11px] text-muted mt-1 leading-tight">
              Haz clic en un clúster para aislarlo. Usa el selector para cambiar su color.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full bg-surface hover:bg-elevated text-muted hover:text-fg transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-border-color"
            aria-label="Cerrar panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Clústeres Animada */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border-color scrollbar-track-transparent"
        >
          {SPATIAL_GROUPS.map((group) => {
            const currentColor = spatialGroupColors[group.id] ?? group.color;
            const isFiltered = activeFilter === group.id;
            const nodeCount = spatialNodes.filter((n) => n.group === group.id).length;

            return (
              <motion.div
                key={group.id}
                variants={itemVariants}
                className={`flex items-center justify-between gap-3 rounded-2xl p-2.5 transition-colors duration-200 border border-border-color ${
                  isFiltered
                    ? "bg-elevated shadow-lg" 
                    : "bg-surface hover:bg-elevated"
                }`}
              >
                {/* Botón de filtro (Toda la zona izquierda) */}
                <button
                  type="button"
                  onClick={() => setActiveFilter(isFiltered ? null : group.id)}
                  className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer group"
                  title={isFiltered ? "Desactivar aislamiento" : "Aislar este clúster"}
                >
                  {/* Punto de color con animación interna al hover */}
                  <motion.span
                    whileHover={{ scale: 1.2 }}
                    className="w-3 h-3 rounded-full shrink-0 transition-transform"
                    style={{
                      backgroundColor: currentColor,
                      boxShadow: `0 0 8px ${currentColor}80`,
                    }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-fg block truncate group-hover:text-concept-fg transition-colors">
                      {group.label}
                    </span>
                    <span className="text-[10px] text-muted flex items-center gap-1">
                      {nodeCount} nodos 
                      {isFiltered && <span className="text-concept-fg font-medium">• Aislado</span>}
                    </span>
                  </div>
                </button>

                {/* Selector de color (UX mejorada) */}
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="relative w-8 h-8 rounded-xl overflow-hidden bg-surface flex items-center justify-center shadow-inner shrink-0 cursor-pointer group border border-border-color"
                >
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(event) => setSpatialGroupColor(group.id, event.target.value)}
                    className="absolute -inset-2 w-12 h-12 cursor-pointer border-0 p-0 opacity-0 z-20"
                    aria-label={`Cambiar color para ${group.label}`}
                  />
                  {/* Capa visual del color */}
                  <div
                    className="absolute inset-0 rounded-[inherit] transition-opacity group-hover:opacity-40"
                    style={{ backgroundColor: currentColor }}
                  />
                  {/* Icono indicador de que se puede editar */}
                  <MousePointerClick className="w-4 h-4 text-fg opacity-0 group-hover:opacity-100 z-10 transition-opacity duration-200 drop-shadow-md" />
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border-color flex items-center justify-between text-xs">
          {activeFilter ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveFilter(null)}
              className="inline-flex items-center gap-1.5 text-concept-fg hover:brightness-110 transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Restablecer filtro</span>
            </motion.button>
          ) : (
            <span className="text-[11px] text-muted">Todos los clústeres visibles</span>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleResetColors}
            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Colores por defecto</span>
          </motion.button>
        </div>

      </Glass>
    </motion.aside>
  );
};

export default ColorSettingsPanel;