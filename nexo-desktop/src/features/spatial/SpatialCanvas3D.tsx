import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import type { ForceGraphMethods, LinkObject, NodeObject } from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { warmLuxuryDark, warmEditorialLight } from "../../theme/tokens";
import {
  getSpatialGroup,
  type SpatialGroupId,
  type SpatialLink,
  type SpatialNode,
} from "../../domain/spatial";
import { playNodeSelectSound } from "../../services/audio/soundEffects";

/* ───────────────────────────── Types ───────────────────────────── */

type SpatialLinkMeta = Omit<SpatialLink, "source" | "target">;
type FGNode = NodeObject<SpatialNode>;
type FGLink = LinkObject<SpatialNode, SpatialLinkMeta>;
type FGMethods = ForceGraphMethods<FGNode, FGLink>;

type Emphasis = "neutral" | "focus" | "dim";

const resolveCssColor = (name: string, fallback: string): string => {
  if (typeof window === "undefined") return fallback;
  try {
    let val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!val) return fallback;
    while (val.startsWith("var(") && val.endsWith(")")) {
      const inner = val.slice(4, -1).trim().split(",")[0].trim();
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(inner).trim();
      if (!resolved || resolved === val) break;
      val = resolved;
    }
    new THREE.Color(val);
    return val;
  } catch {
    return fallback;
  }
};

interface NodeVisual {
  wrapper: THREE.Group;
  floatGroup: THREE.Group;
  meshGroup: THREE.Group;
  haloSprite: THREE.Sprite;
  coreMesh: THREE.Mesh;
  group: string;
  seed: number;
  baseRadius: number;
  orb: THREE.MeshPhysicalMaterial;
  core: THREE.MeshBasicMaterial;
  halo: THREE.SpriteMaterial;
  label: SpriteText;
  light: THREE.PointLight | null;
  lightIntensity: number;

  targetScale: number;
  targetOrbOpacity: number;
  targetCoreOpacity: number;
  targetHaloOpacity: number;
  targetLabelOpacity: number;
  targetEmissive: number;
  targetLightIntensity: number;
}

interface CameraFlight {
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endPos: THREE.Vector3;
  endTarget: THREE.Vector3;
}

const NODE_REL_SIZE = 4;
const LIGHT_IMPORTANCE_THRESHOLD = 0.6;
const DIM_OPACITY = 0.1;
const STAR_COUNT = 1200;

const CAMERA_DISTANCE = 95;
const PARTICLE_SPEED = 0.012;
const LABEL_FONT = 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

const BASE = {
  orbOpacity: 1,
  coreOpacity: 0.95,
  haloOpacity: 0.55,
  labelOpacity: 1,
  emissiveIntensity: 0.6,
} as const;

const nodeRadius = (val: number): number => Math.cbrt(Math.max(val, 1)) * NODE_REL_SIZE;

const emphasisFor = (group: string, filter: string | null): Emphasis =>
  filter === null ? "neutral" : group === filter ? "focus" : "dim";

const hexToRgba = (hex: string, alpha: number): string => {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return `rgba(255,255,255,${alpha})`;
  const [r, g, b] = match.slice(1).map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
};

/** Curva Smootherstep de Ken Perlin: velocidad y aceleración 0 al iniciar y al terminar */
const smootherstep = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

function createHaloTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const c = size / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.2, "rgba(255,255,255,0.6)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.15)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function applyEmphasis(
  visual: NodeVisual,
  emphasis: Emphasis,
  isSelected: boolean,
  isDark: boolean = true
): void {
  const dim = emphasis === "dim";
  const focus = emphasis === "focus";
  const baseEmissive = isDark ? BASE.emissiveIntensity : 0.25;
  const baseHaloOpacity = isDark ? BASE.haloOpacity : BASE.haloOpacity * 0.6;

  visual.targetOrbOpacity = dim ? DIM_OPACITY : BASE.orbOpacity;
  visual.targetEmissive = dim ? 0.08 : focus ? (isDark ? 0.9 : 0.6) : baseEmissive;
  visual.targetCoreOpacity = dim ? DIM_OPACITY : BASE.coreOpacity;
  visual.targetHaloOpacity = dim ? DIM_OPACITY * 0.3 : focus ? (isDark ? 0.8 : 0.5) : baseHaloOpacity;
  visual.targetLabelOpacity = dim ? DIM_OPACITY : BASE.labelOpacity;
  visual.targetLightIntensity = dim ? 0 : visual.lightIntensity;

  visual.targetScale = (dim ? 0.85 : focus ? 1.15 : 1) * (isSelected ? 1.35 : 1);
}

function createEnvironment(
  rimColorHex = 0xe5c158,
  isDark = true
): {
  root: THREE.Group;
  stars: THREE.Points;
  ambient: THREE.AmbientLight;
  keyLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  dispose: () => void;
} {
  const root = new THREE.Group();
  root.name = "nexo-spatial-environment";

  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 900 + Math.random() * 1100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: isDark ? 0xffffff : 0x9e2a2b,
    size: 1.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: isDark ? 0.8 : 0.08,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  root.add(stars);

  const ambient = new THREE.AmbientLight(isDark ? 0xffffff : 0xfaf6f0, isDark ? 0.6 : 1.2);
  const keyLight = new THREE.DirectionalLight(isDark ? 0xffffff : 0xfff8f0, isDark ? 1.4 : 1.0);
  keyLight.position.set(200, 300, 400);
  const rimLight = new THREE.DirectionalLight(rimColorHex, 1.8);
  rimLight.position.set(-300, -150, -400);
  root.add(ambient, keyLight, rimLight);

  return {
    root,
    stars,
    ambient,
    keyLight,
    rimLight,
    dispose: () => {
      starGeometry.dispose();
      starMaterial.dispose();
      ambient.dispose();
      keyLight.dispose();
      rimLight.dispose();
    },
  };
}

function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const width = Math.floor(el.clientWidth);
      const height = Math.floor(el.clientHeight);
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

/* ─────────────────────────── Component ─────────────────────────── */

export const SpatialCanvas3D: React.FC = () => {
  const spatialNodes = useWorkspaceStore((s) => s.spatialNodes);
  const spatialLinks = useWorkspaceStore((s) => s.spatialLinks);
  const spatialGroupColors = useWorkspaceStore((s) => s.spatialGroupColors);
  const activeFilter = useWorkspaceStore((s) => s.activeFilter);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNode = useWorkspaceStore((s) => s.setSelectedNode);
  const cameraFlightCount = useWorkspaceStore((s) => s.cameraFlightCount);

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateTheme = () => {
      setIsDarkTheme(document.documentElement.classList.contains("dark"));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const appBgColor = isDarkTheme
    ? resolveCssColor("--bg-main", warmLuxuryDark.bgMain)
    : resolveCssColor("--bg-main", warmEditorialLight.bgMain);
  const fgColor = isDarkTheme
    ? resolveCssColor("--text-primary", warmLuxuryDark.textPrimary)
    : resolveCssColor("--text-primary", warmEditorialLight.textPrimary);
  const accentColorHex = useMemo(() => {
    const fallback = isDarkTheme ? warmLuxuryDark.accentPrimary : warmEditorialLight.accentPrimary;
    const raw = resolveCssColor("--accent-primary", fallback);
    try {
      return new THREE.Color(raw).getHex();
    } catch {
      return new THREE.Color(fallback).getHex();
    }
  }, [isDarkTheme]);

  const resolveGroupColor = useCallback(
    (groupId: string) => {
      const fromStore = spatialGroupColors[groupId as SpatialGroupId];
      return fromStore ?? getSpatialGroup(groupId).color;
    },
    [spatialGroupColors]
  );

  const fgRef = useRef<FGMethods | undefined>(undefined);
  const [containerRef, size] = useElementSize<HTMLDivElement>();

  const visualsRef = useRef(new Map<string, NodeVisual>());
  const activeFilterRef = useRef<string | null>(activeFilter);
  const selectedIdRef = useRef<string | null>(selectedNodeId);
  const haloTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);

  // Motor de vuelo de cámara propio y libre de conflictos con OrbitControls
  const flightRef = useRef<CameraFlight | null>(null);
  const zoomOutImpulseRef = useRef(0);

  const graphData = useMemo(
    () => ({
      nodes: spatialNodes.map((n) => ({ ...n })),
      links: spatialLinks.map((l) => ({ ...l })),
    }),
    [spatialNodes, spatialLinks]
  );

  const nodeById = useMemo(() => {
    const map = new Map<string, FGNode>();
    graphData.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graphData]);

  const nodeByIdRef = useRef(nodeById);
  nodeByIdRef.current = nodeById;

  const getHaloTexture = useCallback((): THREE.CanvasTexture => {
    if (!haloTextureRef.current) haloTextureRef.current = createHaloTexture();
    return haloTextureRef.current;
  }, []);

  /* ── Configuración inicial de los OrbitControls ── */
  useEffect(() => {
    let raf: number;
    const setupControls = () => {
      const fg = fgRef.current;
      if (!fg) return;
      const controls = fg.controls() as any;
      if (controls) {
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.rotateSpeed = 0.8;
        controls.zoomSpeed = 1.6;
        controls.minDistance = 15;
        controls.maxDistance = 3500;
      } else {
        raf = requestAnimationFrame(setupControls);
      }
    };
    setupControls();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* ── Interrupción limpia de vuelo + Asistente para alejarse con la rueda ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const cancelFlight = () => {
      flightRef.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
      // Cancelar el vuelo inmediatamente evita cualquier temblor o pelea con la cámara
      flightRef.current = null;

      // Si el usuario gira la rueda para alejarse (deltaY > 0) estando cerca de un nodo,
      // añadimos un impulso suave hacia atrás para que no se sienta atascado.
      if (e.deltaY > 0) {
        const fg = fgRef.current;
        const cam = fg?.camera?.();
        const controls = fg?.controls?.() as any;
        if (cam && controls?.target) {
          const dist = cam.position.distanceTo(controls.target);
          if (dist < 260) {
            zoomOutImpulseRef.current = Math.min(35, zoomOutImpulseRef.current + (260 - dist) * 0.08 + 6);
          }
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: true });
    el.addEventListener("pointerdown", cancelFlight, { passive: true });
    el.addEventListener("touchstart", cancelFlight, { passive: true });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("pointerdown", cancelFlight);
      el.removeEventListener("touchstart", cancelFlight);
    };
  }, []);

  /* ── Bucle Maestro: Vuelo Cinemático + Zoom Boost + Físicas de Nodos + Movimiento Vivo ── */
  useEffect(() => {
    let rafId: number;
    const dirVec = new THREE.Vector3();

    const animate = () => {
      const now = performance.now();
      const time = now * 0.001;
      const fg = fgRef.current;

      // 1. Vuelo de cámara sin usar el TWEEN interno de ForceGraph
      if (flightRef.current && fg) {
        const cam = fg.camera?.();
        const controls = fg.controls?.() as any;
        if (cam && controls?.target) {
          const { startTime, duration, startPos, startTarget, endPos, endTarget } = flightRef.current;
          const rawT = Math.min(1, (now - startTime) / duration);
          const t = smootherstep(rawT);

          cam.position.lerpVectors(startPos, endPos, t);
          controls.target.lerpVectors(startTarget, endTarget, t);

          if (rawT >= 1) {
            flightRef.current = null;
          }
        }
      }

      // 2. Impulso suave de retroceso al usar la rueda del ratón cerca de un nodo
      if (zoomOutImpulseRef.current > 0.05 && fg) {
        const cam = fg.camera?.();
        const controls = fg.controls?.() as any;
        if (cam && controls?.target) {
          dirVec.copy(cam.position).sub(controls.target);
          if (dirVec.lengthSq() < 1e-4) dirVec.set(0, 0, 1);
          dirVec.normalize();

          const step = zoomOutImpulseRef.current * 0.18;
          cam.position.addScaledVector(dirVec, step);
          zoomOutImpulseRef.current *= 0.82;
        }
      } else {
        zoomOutImpulseRef.current = 0;
      }

      // 3. Rotación ambiental del universo de estrellas
      if (starsRef.current) {
        starsRef.current.rotation.y = time * 0.015;
        starsRef.current.rotation.x = Math.sin(time * 0.01) * 0.05;
      }

      // 4. Interpolación de materiales y movimiento orgánico ("respiración") de los nodos
      visualsRef.current.forEach((v) => {
        const ease = 0.09;

        if (Math.abs(v.targetScale - v.floatGroup.scale.x) > 0.001) {
          v.floatGroup.scale.setScalar(v.floatGroup.scale.x + (v.targetScale - v.floatGroup.scale.x) * ease);
        }
        if (Math.abs(v.targetOrbOpacity - v.orb.opacity) > 0.001) {
          v.orb.opacity += (v.targetOrbOpacity - v.orb.opacity) * ease;
        }
        if (Math.abs(v.targetEmissive - v.orb.emissiveIntensity) > 0.001) {
          v.orb.emissiveIntensity += (v.targetEmissive - v.orb.emissiveIntensity) * ease;
        }
        if (Math.abs(v.targetCoreOpacity - v.core.opacity) > 0.001) {
          v.core.opacity += (v.targetCoreOpacity - v.core.opacity) * ease;
        }
        if (Math.abs(v.targetHaloOpacity - v.halo.opacity) > 0.001) {
          v.halo.opacity += (v.targetHaloOpacity - v.halo.opacity) * ease;
        }
        if (Math.abs(v.targetLabelOpacity - v.label.material.opacity) > 0.001) {
          v.label.material.opacity += (v.targetLabelOpacity - v.label.material.opacity) * ease;
        }
        if (v.light && Math.abs(v.targetLightIntensity - v.light.intensity) > 0.001) {
          v.light.intensity += (v.targetLightIntensity - v.light.intensity) * ease;
        }

        // Flotación orgánica en 3 ejes (órbita suave para que nunca parezcan estáticos)
        v.floatGroup.position.y = Math.sin(time * 1.4 + v.seed) * 2.4;
        v.floatGroup.position.x = Math.cos(time * 0.9 + v.seed) * 1.6;
        v.floatGroup.position.z = Math.sin(time * 1.1 + v.seed * 1.7) * 1.6;

        // Pulso de respiración en el halo luminoso y el núcleo interno
        const pulse = 1 + Math.sin(time * 2.2 + v.seed) * 0.12;
        v.haloSprite.scale.setScalar(v.baseRadius * 5 * pulse);
        v.coreMesh.scale.setScalar(0.92 + Math.sin(time * 2.2 + v.seed) * 0.08);
      });

      rafId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* ── Creación de cada Nodo 3D ── */
  const buildNodeObject = useCallback(
    (node: FGNode): THREE.Object3D => {
      const color = new THREE.Color(resolveGroupColor(node.group));
      const radius = nodeRadius(node.val);

      const wrapper = new THREE.Group();
      const floatGroup = new THREE.Group();
      const meshGroup = new THREE.Group();

      wrapper.add(floatGroup);
      floatGroup.add(meshGroup);

      const orb = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: isDarkTheme ? BASE.emissiveIntensity : 0.25,
        transmission: 0.9,
        roughness: isDarkTheme ? 0.1 : 0.25,
        metalness: 0,
        ior: 1.5,
        thickness: radius * 0.6,
        transparent: true,
        opacity: BASE.orbOpacity,
      });
      meshGroup.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), orb));

      const core = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: BASE.coreOpacity,
      });
      const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.42, 24, 24), core);
      meshGroup.add(coreMesh);

      const halo = new THREE.SpriteMaterial({
        map: getHaloTexture(),
        color,
        transparent: true,
        opacity: isDarkTheme ? BASE.haloOpacity : BASE.haloOpacity * 0.6,
        depthWrite: false,
        blending: isDarkTheme ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const haloSprite = new THREE.Sprite(halo);
      haloSprite.scale.setScalar(radius * 5);
      haloSprite.raycast = () => {};
      floatGroup.add(haloSprite);

      const label = new SpriteText(node.name, 3.4, fgColor);
      label.fontFace = LABEL_FONT;
      label.fontWeight = "600";
      label.material.transparent = true;
      label.material.depthWrite = false;
      label.position.set(0, radius + 4, 0);
      floatGroup.add(label);

      let light: THREE.PointLight | null = null;
      let lightIntensity = 0;
      if (node.importance > LIGHT_IMPORTANCE_THRESHOLD) {
        lightIntensity = 30 * node.importance;
        light = new THREE.PointLight(color, lightIntensity, radius * 15, 1);
        floatGroup.add(light);
      }

      const visual: NodeVisual = {
        wrapper,
        floatGroup,
        meshGroup,
        haloSprite,
        coreMesh,
        baseRadius: radius,
        group: node.group,
        orb,
        core,
        halo,
        label,
        light,
        lightIntensity,
        seed: Math.random() * 100,
        targetScale: 1,
        targetOrbOpacity: BASE.orbOpacity,
        targetCoreOpacity: BASE.coreOpacity,
        targetHaloOpacity: isDarkTheme ? BASE.haloOpacity : BASE.haloOpacity * 0.6,
        targetLabelOpacity: BASE.labelOpacity,
        targetEmissive: isDarkTheme ? BASE.emissiveIntensity : 0.25,
        targetLightIntensity: lightIntensity,
      };

      const id = String(node.id);
      visualsRef.current.set(id, visual);
      applyEmphasis(
        visual,
        emphasisFor(node.group, activeFilterRef.current),
        selectedIdRef.current === id,
        isDarkTheme
      );

      return wrapper;
    },
    [getHaloTexture, resolveGroupColor, fgColor, isDarkTheme]
  );

  useEffect(() => {
    visualsRef.current.forEach((visual) => {
      const colorHex = resolveGroupColor(visual.group);
      const color = new THREE.Color(colorHex);
      visual.orb.color.copy(color);
      visual.orb.emissive.copy(color);
      visual.core.color.copy(color);
      visual.halo.color.copy(color);
      if (visual.light) {
        visual.light.color.copy(color);
      }
    });
    fgRef.current?.refresh?.();
  }, [resolveGroupColor]);

  // Synchronize SpriteText labels in real time upon node rename
  useEffect(() => {
    const activeIds = new Set(spatialNodes.map((n) => String(n.id)));
    for (const [id] of visualsRef.current.entries()) {
      if (!activeIds.has(id)) {
        visualsRef.current.delete(id);
      }
    }

    spatialNodes.forEach((node) => {
      const visual = visualsRef.current.get(String(node.id));
      if (visual && visual.label && visual.label.text !== node.name) {
        visual.label.text = node.name;
      }
    });

    fgRef.current?.refresh?.();
  }, [spatialNodes]);

  useEffect(() => {
    activeFilterRef.current = activeFilter;
    selectedIdRef.current = selectedNodeId;
    visualsRef.current.forEach((visual, id) => {
      applyEmphasis(
        visual,
        emphasisFor(visual.group, activeFilter),
        id === selectedNodeId,
        isDarkTheme
      );
    });
  }, [activeFilter, selectedNodeId, isDarkTheme]);

  const linkEmphasis = useCallback(
    (link: FGLink): { emphasis: Emphasis; color: string } => {
      const srcEnd = link.source;
      const tgtEnd = link.target;
      const source = (typeof srcEnd === "object" && srcEnd !== null ? srcEnd : nodeById.get(String(srcEnd))) as FGNode | undefined;
      const target = (typeof tgtEnd === "object" && tgtEnd !== null ? tgtEnd : nodeById.get(String(tgtEnd))) as FGNode | undefined;
      const sourceColor = source ? resolveGroupColor(source.group) : fgColor;
      if (!activeFilter) return { emphasis: "neutral", color: sourceColor };
      const touchesFilter = source?.group === activeFilter || target?.group === activeFilter;
      return touchesFilter
        ? { emphasis: "focus", color: resolveGroupColor(activeFilter) }
        : { emphasis: "dim", color: sourceColor };
    },
    [nodeById, activeFilter, resolveGroupColor, fgColor]
  );

  const linkColor = useCallback(
    (link: FGLink): string => {
      const { emphasis, color } = linkEmphasis(link);
      if (emphasis === "dim") {
        return isDarkTheme ? "rgba(255,255,255,0.04)" : "rgba(45,21,18,0.06)";
      }
      return hexToRgba(color, emphasis === "focus" ? 0.85 : 0.35);
    },
    [linkEmphasis, isDarkTheme]
  );

  const linkWidth = useCallback(
    (link: FGLink): number => {
      const { emphasis } = linkEmphasis(link);
      return emphasis === "focus" ? 1.4 : emphasis === "dim" ? 0.2 : 0.6;
    },
    [linkEmphasis]
  );

  const linkParticles = useCallback(
    (link: FGLink): number => {
      const { emphasis } = linkEmphasis(link);
      const base = Math.max(1, Math.round(link.value ?? 1));
      return emphasis === "dim" ? 0 : emphasis === "focus" ? base + 2 : base;
    },
    [linkEmphasis]
  );

  const linkParticleWidth = useCallback(
    (link: FGLink): number => (linkEmphasis(link).emphasis === "focus" ? 2.2 : 1.4),
    [linkEmphasis]
  );

  const linkParticleColor = useCallback((link: FGLink): string => linkEmphasis(link).color, [linkEmphasis]);

  /* ── Vuelo de Cámara Suave (Cerca y Lejos) ── */
  const flyToNode = useCallback((node: FGNode) => {
    const fg = fgRef.current;
    if (!fg) return;

    const cam = fg.camera?.();
    const controls = fg.controls?.() as any;
    if (!cam || !controls?.target) return;

    const endTarget = new THREE.Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    const startPos = cam.position.clone();
    const startTarget = controls.target.clone();

    const dir = startPos.clone().sub(endTarget);
    const distFromNode = dir.length();

    if (distFromNode < 1e-4) {
      dir.set(0, 0, 1);
    } else {
      dir.normalize();
    }

    const stopDist = CAMERA_DISTANCE + nodeRadius(node.val) * 2.5;
    const endPos = endTarget
      .clone()
      .addScaledVector(dir, stopDist)
      .add(new THREE.Vector3(0, stopDist * 0.12, 0));

    const travelDistance = startPos.distanceTo(endPos) + startTarget.distanceTo(endTarget) * 0.5;
    // Escalado con raíz cuadrada: suave de cerca (~1.1s) y majestuoso de lejos (~2.4s máx)
    const duration = Math.min(2400, Math.max(1050, 700 + Math.sqrt(travelDistance) * 42));

    zoomOutImpulseRef.current = 0;
    flightRef.current = {
      startTime: performance.now(),
      duration,
      startPos,
      startTarget,
      endPos,
      endTarget,
    };
  }, []);

  const handleNodeClick = useCallback(
    (node: FGNode) => {
      playNodeSelectSound();
      const id = String(node.id);
      if (selectedIdRef.current === id) {
        flyToNode(node);
      } else {
        setSelectedNode(id);
      }
    },
    [flyToNode, setSelectedNode]
  );

  const handleBackgroundClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  // Dispara un único vuelo limpio cuando cambia el nodo seleccionado o se pulsa en la lista
  useEffect(() => {
    if (!selectedNodeId) return;
    const node = nodeByIdRef.current.get(selectedNodeId);
    if (!node) return;
    flyToNode(node);
  }, [selectedNodeId, cameraFlightCount, flyToNode]);

  const envRef = useRef<ReturnType<typeof createEnvironment> | null>(null);

  useEffect(() => {
    let disposed = false;
    let scene: THREE.Scene | null = null;
    let frameAttempts = 0;
    let rafId: number;

    const setupScene = () => {
      const fg = fgRef.current;
      if (!fg) return false;
      const sc = fg.scene?.();
      if (!sc) return false;
      scene = sc;
      if (!envRef.current) {
        envRef.current = createEnvironment(accentColorHex, isDarkTheme);
        starsRef.current = envRef.current.stars;
        scene.add(envRef.current.root);
        scene.background = new THREE.Color(appBgColor);
      }
      return true;
    };

    const attemptSetup = () => {
      if (disposed) return;
      if (!setupScene()) {
        frameAttempts++;
        if (frameAttempts < 60) {
          rafId = requestAnimationFrame(attemptSetup);
        }
      }
    };

    attemptSetup();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      starsRef.current = null;
      if (scene && envRef.current) {
        scene.remove(envRef.current.root);
        envRef.current.dispose();
        envRef.current = null;
      }
    };
  }, []);

  // Synchronize 3D WebGL scene background, lighting, and materials whenever theme changes
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const scene = fg.scene?.();
    if (scene) {
      scene.background = new THREE.Color(appBgColor);
    }
    if (!envRef.current && scene) {
      envRef.current = createEnvironment(accentColorHex, isDarkTheme);
      starsRef.current = envRef.current.stars;
      scene.add(envRef.current.root);
    }
    if (envRef.current) {
      envRef.current.rimLight.color.setHex(accentColorHex);
      envRef.current.ambient.color.setHex(isDarkTheme ? 0xffffff : 0xfaf6f0);
      envRef.current.ambient.intensity = isDarkTheme ? 0.6 : 1.2;
      envRef.current.keyLight.color.setHex(isDarkTheme ? 0xffffff : 0xfff8f0);
      envRef.current.keyLight.intensity = isDarkTheme ? 1.4 : 1.0;

      if (envRef.current.stars.material instanceof THREE.PointsMaterial) {
        envRef.current.stars.material.color.setHex(isDarkTheme ? 0xffffff : 0x9e2a2b);
        envRef.current.stars.material.opacity = isDarkTheme ? 0.8 : 0.08;
        envRef.current.stars.material.needsUpdate = true;
      }
    }

    visualsRef.current.forEach((vis) => {
      vis.label.color = fgColor;
      vis.orb.emissiveIntensity = isDarkTheme ? BASE.emissiveIntensity : 0.25;
      vis.targetEmissive = isDarkTheme ? BASE.emissiveIntensity : 0.25;
      vis.orb.needsUpdate = true;

      vis.halo.blending = isDarkTheme ? THREE.AdditiveBlending : THREE.NormalBlending;
      vis.halo.opacity = isDarkTheme ? BASE.haloOpacity : BASE.haloOpacity * 0.6;
      vis.targetHaloOpacity = isDarkTheme ? BASE.haloOpacity : BASE.haloOpacity * 0.6;
      vis.halo.needsUpdate = true;
    });

    fg.refresh?.();
  }, [isDarkTheme, appBgColor, fgColor, accentColorHex]);

  useEffect(
    () => () => {
      haloTextureRef.current?.dispose();
      haloTextureRef.current = null;
    },
    []
  );

  const noTooltip = useCallback(() => "", []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: appBgColor }}
      data-glisse-backdrop="true"
    >
      <ForceGraph3D<SpatialNode, SpatialLinkMeta>
        ref={fgRef}
        width={size.width || undefined}
        height={size.height || undefined}
        graphData={graphData}
        backgroundColor={appBgColor}
        controlType="orbit"
        showNavInfo={false}
        nodeId="id"
        nodeRelSize={NODE_REL_SIZE}
        nodeVal="val"
        nodeLabel={noTooltip}
        nodeThreeObject={buildNodeObject}
        nodeThreeObjectExtend={false}
        linkOpacity={1}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalParticles={linkParticles}
        linkDirectionalParticleSpeed={PARTICLE_SPEED}
        linkDirectionalParticleWidth={linkParticleWidth}
        linkDirectionalParticleColor={linkParticleColor}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
      />
    </div>
  );
};

export default SpatialCanvas3D;