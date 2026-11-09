import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Glass } from "glisse";
import { Search, X, Network, Filter, MoreVertical, Trash2, Edit2, Check } from "lucide-react";
import { getSpatialGroup } from "../../domain/spatial";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { countCodePoints, MAX_NODE_NAME_CHARS } from "../../domain/constants";

export const NodeListPanel: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Estados para el nuevo menú de opciones
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const spatialNodes = useWorkspaceStore((s) => s.spatialNodes);
  const spatialGroupColors = useWorkspaceStore((s) => s.spatialGroupColors);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const focusSpatialNode = useWorkspaceStore((s) => s.focusSpatialNode);
  const setActiveLeftPanel = useWorkspaceStore((s) => s.setActiveLeftPanel);
  
  // Asegúrate de tener estas o equivalentes en tu store para que funcione la lógica
  const removeSpatialNode = useWorkspaceStore((s) => s.removeSpatialNode); 
  const updateSpatialNode = useWorkspaceStore((s) => s.updateSpatialNode); 

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(spatialNodes.map((node) => node.group)));
  }, [spatialNodes]);

  const filteredNodes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    
    return spatialNodes.filter((node) => {
      const matchesQuery =
        !normalized ||
        node.name.toLowerCase().includes(normalized) ||
        node.group.toLowerCase().includes(normalized) ||
        (node.desc && node.desc.toLowerCase().includes(normalized));
      
      const matchesGroup = !activeFilter || node.group === activeFilter;

      return matchesQuery && matchesGroup;
    });
  }, [spatialNodes, query, activeFilter]);

  const close = () => setActiveLeftPanel(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 75 || info.velocity.x > 320) {
      close();
    }
  };

  const handleSelectNode = (nodeId: string) => {
    // Si estamos editando o interactuando con el menú, no cambiamos el foco principal
    if (!activeMenu) {
      focusSpatialNode(nodeId);
    }
  };

  const handleToggleMenu = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (activeMenu === nodeId) {
      setActiveMenu(null);
      setDeleteConfirm(null);
      setRenameId(null);
    } else {
      setActiveMenu(nodeId);
      setDeleteConfirm(null);
      setRenameId(null);
    }
  };

  const handleConfirmDelete = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (removeSpatialNode) removeSpatialNode(nodeId);
    setDeleteConfirm(null);
    setActiveMenu(null);
  };

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent, nodeId: string) => {
    e.stopPropagation();
    const trimmed = renameValue.trim();
    if (trimmed && countCodePoints(trimmed) <= MAX_NODE_NAME_CHARS && updateSpatialNode) {
      updateSpatialNode(nodeId, { name: trimmed });
      setRenameId(null);
      setActiveMenu(null);
    }
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
      className="fixed left-24 top-1/2 -translate-y-1/2 z-40 w-96 max-w-[calc(100vw-7.5rem)] h-[72vh] rounded-3xl backdrop-blur-2xl border border-border-color p-5 flex flex-col gap-3.5 shadow-2xl select-none overflow-hidden text-fg"
      style={{
        borderRadius: "var(--radius-card, 24px)",
        backgroundColor: "var(--card-bg, rgba(9,9,11,0.6))",
        borderColor: "var(--card-border, rgba(255,255,255,0.1))",
      }}
    >
      <Glass
        className="absolute inset-0 pointer-events-none rounded-[inherit] -z-10 !bg-transparent"
        aria-hidden="true"
      />

      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-10 h-1 rounded-full bg-border-color mx-auto -mt-1 cursor-grab active:cursor-grabbing" />

      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-concept-fg" />
          <h3 className="text-sm font-semibold text-fg tracking-tight">
            Explorador de Nodos
          </h3>
          <motion.span 
            layout
            className="text-[11px] font-mono text-muted bg-surface px-2 py-0.5 rounded-full border border-border-color"
          >
            {filteredNodes.length}
          </motion.span>
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

      {/* Search Input & Filter Button */}
      <div className="flex gap-2">
        <div className="relative flex-1 flex items-center rounded-2xl bg-surface border border-border-color px-3.5 py-2.5 transition-all focus-within:border-concept-fg focus-within:bg-elevated">
          <Search className="w-4 h-4 text-muted shrink-0 mr-2.5" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nodo por nombre o clúster..."
            className="w-full bg-transparent text-xs text-fg placeholder:text-muted outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted hover:text-fg transition-colors p-0.5 cursor-pointer absolute right-3"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`shrink-0 flex items-center justify-center w-[42px] rounded-2xl transition-all cursor-pointer ring-1 ${
            isFilterOpen || activeFilter
              ? "bg-surface ring-line/40 text-fg"
              : "bg-surface/80 ring-line/15 text-muted hover:text-fg hover:bg-surface hover:ring-line/30"
          }`}
          aria-label="Filtros"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 8 }} // mb-8 da más espacio con las cards
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="relative p-3 rounded-2xl bg-surface/80 ring-1 ring-line/15 mt-1">
              <p className="text-[11px] font-medium text-muted mb-2">Filtrar por clúster:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveFilter(null)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-lg transition-colors ring-1 ${
                    activeFilter === null
                      ? "bg-surface/20 text-fg ring-line/40 shadow-sm"
                      : "bg-surface/5 text-muted ring-line/10 hover:bg-surface/10 hover:text-fg"
                  }`}
                >
                  Todos
                </button>
                {uniqueGroups.map((group) => {
                  const meta = getSpatialGroup(group);
                  return (
                    <button
                      key={group}
                      onClick={() => setActiveFilter(group)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg transition-colors ring-1 ${
                        activeFilter === group
                          ? "bg-surface/20 text-fg ring-line/40 shadow-sm"
                          : "bg-surface/5 text-muted ring-line/10 hover:bg-surface/10 hover:text-fg"
                      }`}
                    >
                      {meta.label || group}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Mini-Cards List */}
      <motion.div 
        layout 
        // Se añade pt-2 y -mt-2 para dar padding superior sin mover el bloque, evitando que el borde se corte
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden -mr-2 pr-3 pl-2 -ml-2 pt-2 -mt-2 space-y-2 pb-2"
      >
        <AnimatePresence mode="popLayout">
          {filteredNodes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-muted text-xs"
            >
              No se encontraron nodos coincidentes.
            </motion.div>
          ) : (
            filteredNodes.map((node) => {
              const meta = getSpatialGroup(node.group);
              const color = spatialGroupColors[node.group] ?? meta.color;
              const isSelected = selectedNodeId === node.id;
              const isMenuOpen = activeMenu === node.id;

              return (
                <motion.div
                  key={node.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  // Animación al eliminar: se desplaza a la izquierda y se encoge sutilmente
                  exit={{ opacity: 0, scale: 0.85, x: -30, transition: { duration: 0.2, type: "spring" } }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onClick={() => handleSelectNode(node.id)}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left rounded-xl p-2.5 transition-colors cursor-pointer border relative overflow-hidden flex flex-col ${
                    isSelected
                      ? "bg-elevated border-concept-fg shadow-md"
                      : isMenuOpen 
                        ? "bg-elevated border-border-color"
                        : "bg-surface hover:bg-elevated border-border-color"
                  }`}
                >
                  {/* Fila Principal de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2.5 relative z-10">
                    <div className="flex items-center gap-2 min-w-0 flex-1 pt-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                        style={{ backgroundColor: color, color }}
                      />
                      <span className="text-xs font-semibold text-fg truncate">
                        {node.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded-md border border-border-color">
                        {meta.label}
                      </span>
                      {/* Botón de Menú de Opciones */}
                      <button 
                        onClick={(e) => handleToggleMenu(e, node.id)}
                        className={`p-1 rounded-md transition-colors ${
                          isMenuOpen ? "bg-surface/20 text-fg" : "text-muted hover:text-fg hover:bg-surface/10"
                        }`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {node.desc && !isMenuOpen && (
                    <p className="text-[11px] text-muted line-clamp-1 mt-1 pl-4 relative z-10 leading-snug">
                      {node.desc}
                    </p>
                  )}

                  {/* Panel de Opciones Expandible */}
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <div 
                          className="relative p-2.5 rounded-xl bg-app/60 ring-1 ring-line/10 flex flex-col gap-2"
                          onClick={(e) => e.stopPropagation()} // Evita seleccionar el nodo al interactuar con opciones
                        >
                          <Glass className="absolute inset-0 rounded-[inherit] -z-10 !bg-transparent opacity-30" />
                          
                          <AnimatePresence mode="wait">
                            {deleteConfirm === node.id ? (
                              <motion.div 
                                key="delete"
                                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col gap-2.5"
                              >
                                <p className="text-[11px] text-muted leading-snug">
                                  ¿Eliminar <span className="text-fg font-semibold">{node.name}</span>? Esta acción es irreversible.
                                </p>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => handleConfirmDelete(e, node.id)}
                                    className="flex-1 bg-red-500/20 hover:bg-red-500/35 text-red-200 ring-1 ring-red-500/30 rounded-lg py-1.5 text-[10px] font-semibold transition-colors"
                                  >
                                    Sí, eliminar
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                                    className="flex-1 bg-surface/5 hover:bg-surface/15 text-muted ring-1 ring-line/10 rounded-lg py-1.5 text-[10px] font-medium transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </motion.div>

                            ) : renameId === node.id ? (
                              <motion.div 
                                key="rename"
                                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col gap-1.5"
                              >
                                <div className="flex gap-1.5 items-center">
                                  <input 
                                    autoFocus
                                    value={renameValue}
                                    maxLength={MAX_NODE_NAME_CHARS}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[\r\n]+/g, " ");
                                      if (countCodePoints(val) <= MAX_NODE_NAME_CHARS) {
                                        setRenameValue(val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(e, node.id);
                                      if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        setRenameId(null);
                                      }
                                    }}
                                    className="flex-1 bg-surface/80 text-fg text-[11px] px-2.5 py-1.5 rounded-lg ring-1 ring-line/20 outline-none focus:ring-line/50 transition-all shadow-inner"
                                    placeholder="Nuevo nombre (máx. 80)..."
                                  />
                                  <button 
                                    onClick={(e) => handleSaveRename(e, node.id)}
                                    disabled={!renameValue.trim() || countCodePoints(renameValue.trim()) > MAX_NODE_NAME_CHARS}
                                    className="p-1.5 bg-surface/15 hover:bg-surface/25 disabled:opacity-40 rounded-lg ring-1 ring-line/20 text-fg transition-colors cursor-pointer"
                                    aria-label="Confirmar renombrado"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setRenameId(null); }}
                                    className="p-1.5 bg-surface/5 hover:bg-red-500/20 rounded-lg ring-1 ring-line/10 text-muted hover:text-red-300 transition-colors cursor-pointer"
                                    aria-label="Cancelar renombrado"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted px-1">
                                  <span>{countCodePoints(renameValue)}/{MAX_NODE_NAME_CHARS}</span>
                                  {countCodePoints(renameValue) >= MAX_NODE_NAME_CHARS && (
                                    <span className="text-amber-500 font-medium">Límite de 80 caracteres</span>
                                  )}
                                </div>
                              </motion.div>

                            ) : (
                              <motion.div 
                                key="options"
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                className="flex gap-2"
                              >
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setRenameId(node.id); 
                                    setRenameValue(node.name); 
                                  }} 
                                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface/5 hover:bg-surface/15 text-fg ring-1 ring-line/10 rounded-lg py-1.5 text-[10px] font-medium transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" /> Renombrar
                                </button>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setDeleteConfirm(node.id); 
                                  }} 
                                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface/5 hover:bg-red-500/20 text-muted hover:text-red-300 ring-1 ring-line/10 hover:ring-red-500/40 rounded-lg py-1.5 text-[10px] font-medium transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" /> Eliminar
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>
    </motion.aside>
  );
};

export default NodeListPanel;