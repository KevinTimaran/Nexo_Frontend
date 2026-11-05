import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Glass } from "glisse";
import { Bot, Palette, ListTree, Flower2 } from "lucide-react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface MagneticDockButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  tint?: string;
  shortcut?: string;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  tabIndex?: number;
}

const MagneticDockButton: React.FC<MagneticDockButtonProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
  tint,
  shortcut,
  buttonRef,
  onKeyDown,
  onFocus,
  tabIndex,
}) => {
  const localRef = useRef<HTMLButtonElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const shouldReduce = useReducedMotion();

  // Configuración magnética fluida
  const springConfig = { stiffness: 420, damping: 22, mass: 0.6 };
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const setRef = (node: HTMLButtonElement | null) => {
    localRef.current = node;
    buttonRef?.(node);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = localRef.current;
    if (!el || shouldReduce) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) * 0.32);
    mouseY.set((e.clientY - centerY) * 0.32);
  };

  const resetMagnetic = () => {
    mouseX.set(0);
    mouseY.set(0);
    const el = localRef.current;
    if (el) delete el.dataset.pressed;
  };

  return (
    <div className="relative flex items-center justify-center">
      <motion.button
        ref={setRef}
        type="button"
        style={{ x: springX, y: springY }}
        whileHover={shouldReduce ? undefined : { scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        onPointerEnter={() => setShowTooltip(true)}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          setShowTooltip(false);
          resetMagnetic();
        }}
        onFocus={(e) => {
          setShowTooltip(true);
          onFocus?.(e);
        }}
        onBlur={() => {
          setShowTooltip(false);
          resetMagnetic();
        }}
        onPointerDown={() => {
          const el = localRef.current;
          if (el) el.dataset.pressed = "";
        }}
        onPointerUp={() => {
          const el = localRef.current;
          if (el) delete el.dataset.pressed;
        }}
        onClick={onClick}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
        aria-label={label}
        aria-pressed={isActive}
        aria-keyshortcuts={shortcut}
        className={`group relative w-11 h-11 rounded-full flex items-center justify-center cursor-pointer outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-concept-fg ${
          isActive
            ? "text-fg"
            : "bg-surface text-muted hover:text-fg hover:bg-elevated"
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="spatial-dock-active-pill"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-elevated shadow-md border border-border-color"
          />
        )}

        {isActive && (
          <span
            className="absolute left-1 w-1 h-3 rounded-full bg-primary shadow-[0_0_8px_var(--accent)]"
            style={
              tint
                ? { backgroundColor: tint, boxShadow: `0 0 8px ${tint}` }
                : undefined
            }
            aria-hidden="true"
          />
        )}

        <div className="relative z-10 flex items-center justify-center pointer-events-none">
          {icon}
        </div>
      </motion.button>

      {/* Tooltip (Card de texto) con animación súper rápida y fluida */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="pointer-events-none absolute left-14 z-50 flex items-center gap-2 whitespace-nowrap rounded-xl bg-app/90 backdrop-blur-xl px-3 py-1.5 text-xs font-medium text-fg shadow-xl ring-1 ring-line/10"
          >
            <span>{label}</span>
            {shortcut && (
              <kbd className="rounded-md bg-surface/15 px-1.5 py-0.5 text-[10px] font-semibold text-fg">
                {shortcut}
              </kbd>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type DockItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  isActive?: boolean;
  onClick: () => void;
  tint?: string;
};

export const SpatialDock: React.FC = () => {
  const activeLeftPanel = useWorkspaceStore((s) => s.activeLeftPanel);
  const setActiveLeftPanel = useWorkspaceStore((s) => s.setActiveLeftPanel);
  const toggleZenMode = useWorkspaceStore((s) => s.toggleZenMode);

  const togglePanel = useCallback(
    (panel: "chat" | "filters" | "nodelist") => {
      setActiveLeftPanel(activeLeftPanel === panel ? null : panel);
    },
    [activeLeftPanel, setActiveLeftPanel]
  );

  const panelItems: DockItem[] = [
    {
      key: "chat",
      icon: <Bot className="w-5 h-5" />,
      label: "Abrir Chat de IA",
      shortcut: "1",
      isActive: activeLeftPanel === "chat",
      onClick: () => togglePanel("chat"),
    },
    {
      key: "filters",
      icon: <Palette className="w-5 h-5" />,
      label: "Filtros y Configuración de Color",
      shortcut: "2",
      isActive: activeLeftPanel === "filters",
      onClick: () => togglePanel("filters"),
    },
    {
      key: "nodelist",
      icon: <ListTree className="w-5 h-5" />,
      label: "Explorador de Nodos",
      shortcut: "3",
      isActive: activeLeftPanel === "nodelist",
      onClick: () => togglePanel("nodelist"),
    },
  ];

  const zenItem: DockItem = {
    key: "zen",
    icon: <Flower2 className="w-5 h-5 text-positive" />,
    label: "Modo Zen",
    shortcut: "Z",
    onClick: toggleZenMode,
    tint: "#34d399",
  };

  const allItems = [...panelItems, zenItem];
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const focusButton = (index: number) => {
    const total = allItems.length;
    const next = ((index % total) + total) % total;
    setFocusedIndex(next);
    buttonRefs.current[next]?.focus();
  };

  const makeKeyHandler =
    (index: number): React.KeyboardEventHandler<HTMLButtonElement> =>
    (e) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          focusButton(index + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          focusButton(index - 1);
          break;
        case "Home":
          e.preventDefault();
          focusButton(0);
          break;
        case "End":
          e.preventDefault();
          focusButton(allItems.length - 1);
          break;
      }
    };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "1") {
        e.preventDefault();
        togglePanel("chat");
      } else if (key === "2") {
        e.preventDefault();
        togglePanel("filters");
      } else if (key === "3") {
        e.preventDefault();
        togglePanel("nodelist");
      } else if (key === "z" || key === "4") {
        e.preventDefault();
        toggleZenMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePanel, toggleZenMode]);

  return (
    <nav
      aria-label="Barra de herramientas espacial"
      role="toolbar"
      aria-orientation="vertical"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-50 select-none pointer-events-auto"
    >
      {/* Animación única y sólida para todo el dock */}
      <motion.div
        initial={{ opacity: 0, x: -24, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        className="sidebar-glass relative rounded-[2rem] p-2 flex flex-col gap-2.5"
        style={{
          backgroundColor: "var(--card-bg, rgba(9,9,11,0.6))",
          borderColor: "var(--card-border, rgba(255,255,255,0.1))",
        }}
      >
        <Glass
          className="absolute inset-0 rounded-[inherit] pointer-events-none !bg-transparent !border-0 !ring-0 !shadow-none"
          aria-hidden="true"
        />

        <LayoutGroup>
          {panelItems.map((item, i) => (
            <MagneticDockButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              isActive={item.isActive}
              onClick={item.onClick}
              tint={item.tint}
              tabIndex={i === focusedIndex ? 0 : -1}
              onFocus={() => setFocusedIndex(i)}
              onKeyDown={makeKeyHandler(i)}
              buttonRef={(node) => {
                buttonRefs.current[i] = node;
              }}
            />
          ))}
        </LayoutGroup>

        <div className="h-1.5" aria-hidden="true" />

        <MagneticDockButton
          icon={zenItem.icon}
          label={zenItem.label}
          shortcut={zenItem.shortcut}
          onClick={zenItem.onClick}
          tint={zenItem.tint}
          tabIndex={focusedIndex === panelItems.length ? 0 : -1}
          onFocus={() => setFocusedIndex(panelItems.length)}
          onKeyDown={makeKeyHandler(panelItems.length)}
          buttonRef={(node) => {
            buttonRefs.current[panelItems.length] = node;
          }}
        />
      </motion.div>
    </nav>
  );
};

export default SpatialDock;