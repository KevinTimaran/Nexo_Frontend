import React from "react";
import {
  Sparkles,
  Layers,
  BrainCircuit,
  FileDown,
} from "lucide-react";

export const ONBOARDING_STORAGE_KEY = "nexo.onboarding.completed";

export interface OnboardingStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  highlight: string;
  icon: React.ElementType;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "ideation",
    badge: "Paso 1 de 4",
    title: "1. Ideación IA y Diálogo Estratégico",
    description:
      "Plantea cualquier iniciativa o problema. El Copilot interactivo formula preguntas socráticas para desglosar la viabilidad, riesgos y oportunidades de tu idea.",
    highlight: "Comienza chateando con el Copilot o respondiendo cuestionarios interactivos.",
    icon: Sparkles,
  },
  {
    id: "board",
    badge: "Paso 2 de 4",
    title: "2. Tablero de Conceptos Categorizado",
    description:
      "La IA extrae automáticamente los conceptos rectores y los clasifica en 4 dimensiones estratégicas: Legal, Económica, Política y Técnica con puntajes de relevancia (1–10).",
    highlight: "Visualiza columnas claras sin duplicados ni conceptos aislados.",
    icon: Layers,
  },
  {
    id: "spatial",
    badge: "Paso 3 de 4",
    title: "3. Constelación Neuronal 3D (WebGL)",
    description:
      "Navega por el grafo tridimensional interactivo con órbitas físicas, vínculos semánticos con partículas y editor integrado tipo Notion para cada nodo.",
    highlight: "Haz clic en cualquier nodo para abrir su documento o ampliarlo a pantalla completa.",
    icon: BrainCircuit,
  },
  {
    id: "export",
    badge: "Paso 4 de 4",
    title: "4. Informes Ejecutivos y Exportación a Word",
    description:
      "Transforma tu mapa de conceptos en documentos profesionales de Microsoft Word (.docx). Exporta resúmenes ejecutivos completos o notas individuales con fidelidad tipográfica.",
    highlight: "Descarga archivos .docx limpios compatibles con Word, LibreOffice y Google Docs.",
    icon: FileDown,
  },
];
