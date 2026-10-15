# Plan de Refactorización y Elevación UI/UX — Nexo Desktop

**Autor:** Principal Frontend Engineer, Software Architect & Senior UI/UX Designer  
**Proyecto:** Nexo Desktop (`nexo-desktop`)  
**Tecnologías:** React 19, TypeScript, Tauri v2, Vite 8, Tailwind CSS v4, React Router v7, Zustand  
**Fecha de Auditoría:** 15 de Octubre de 2026  
**Rama:** `main` (Sincronizada con `origin/main`)

---

## 1. Hallazgos Verificados de la Auditoría del Repositorio

Tras una inspección exhaustiva del código fuente, dependencias, estilos y configuración del proyecto, se determinaron los siguientes hechos técnicos:

1. **Estado del Repositorio y Git:**
   - Repositorio: `git@github.com:KevinTimaran/Nexo_Frontend.git` en rama `main`.
   - Conectividad y permisos SSH verificados (`git push --dry-run` exitoso).
   - Árbol de trabajo limpio inicialmente.

2. **Falla de Compilación Activa (`npm run build`):**
   - El comando de build fallaba con código 2 debido a TypeScript `strict` y `noUnusedLocals: true` en `tsconfig.json`:
     `src/features/dashboard/DashboardView.tsx:43:9 - error TS6133: 'user' is declared but its value is never read.`
   - Se debe corregir integrando el usuario en el saludo del Dashboard ("Bienvenido, {user.name}") para cumplir con tipado estricto sin variables muertas.

3. **Arquitectura de Estado y Dependencias:**
   - `package.json` incluye `"zustand": "^5.0.15"`, pero no existía ningún store implementado en el frontend; el estado del espacio de trabajo residía disperso en `useState` locales dentro de `WorkspaceView.tsx`.
   - Esto impedía la sincronización reactiva inmediata entre el asistente de IA (`AIChatDrawer.tsx`) y el lienzo (`ConceptCanvas.tsx`).

4. **Flujo de Autenticación y Rutas:**
   - En `AuthContext.tsx`, el usuario se inicializaba por defecto con un mock (`Kevin Timaran`) en lugar de arrancar en estado nulo si no había sesión explícita, impidiendo probar el flujo de login natural.
   - `App.tsx` no utilizaba rutas protegidas (`ProtectedRoute`) de React Router v7; en su lugar, realizaba un condicional en bloque (`if (!isAuthenticated) return <LoginView />`), imposibilitando URLs directas hacia `/login`, preservación de destino (`location.state.from`) y transiciones de vista limpias.

5. **Lienzo Conceptual (`ConceptCanvas.tsx`):**
   - El lienzo sólo contaba con un modo espacial plano sin control segmentado de vistas.
   - Faltaba el modo editorial de conocimiento (`notion`), la distinción por fases de investigación (**Planificación / Emerald**, **Ejecución / Blue**, **Validación / Amber**), y el panel de lectura profunda de documentos para los nodos seleccionados.

6. **Chat de IA (`AIChatDrawer.tsx`):**
   - Los mensajes de IA se mostraban como bloques de texto genéricos.
   - No existían tarjetas estructuradas para ideas y recomendaciones con acción de inserción directa al lienzo.
   - Faltaba la acción estilo ghost `"No entiendo esto, explícamelo"` con icono `HelpCircle` que brinde explicaciones contextuales simplificadas.

---

## 2. Estrategia de Implementación y Arquitectura

### 2.1 Modelo de Dominio y Tipos Estrictos (`src/domain/types.ts`)
- `CanvasMode`: `'notion' | 'graph'`
- `ResearchPhase`: `'planning' | 'execution' | 'validation'`
- Extensión de `ConceptNode`: adición de campos `phase?: ResearchPhase`, `details?: string`, `tags?: string[]`.
- Extensión de `AssistantMessage`: soporte para tipo de tarjeta (`idea`, `explanation`, `recommendation`), explicaciones simplificadas contextuales y acciones de mapeo a lienzo.

### 2.2 Gestión de Estado Centralizada con Zustand (`src/store/useWorkspaceStore.ts`)
- Creación de un store unificado reactivo que gobierne:
  - `canvasMode`: Modo visual activo (`notion` vs `graph`).
  - `workspace`: Proyecto, nodos, relaciones y mensajes.
  - `selectedNodeId`: Nodo seleccionado para inspección o vista profunda de documento.
  - `isThinking`: Estado de procesamiento de IA.
  - `isChatOpen`: Visibilidad del cajón lateral de chat.
  - Acciones atómicas: `setCanvasMode`, `selectNode`, `addNode`, `updateNode`, `removeNode`, `moveNode`, `addMessage`, `addNodeFromChat`, etc.

### 2.3 Autenticación Robusta y Rutas Protegidas
- Creación de `src/features/auth/ProtectedRoute.tsx`:
  - Manejo de estados de carga (`isLoading`).
  - Redirección con estado preservado a `/login` para accesos no autenticados.
- Refinamiento de `LoginView.tsx`:
  - Diseño estilo Apple: vidrio esmerilado (`glass`), tipografía refinada, estados de validación accesibles, feedback de carga y prevención de reenvíos.
- Aislamiento en `src/services/mock/index.ts` y `AuthContext.tsx` con frontera limpia para futuros backends JWT/OAuth.

### 2.4 Chat de IA Enriquecido (`AIChatDrawer.tsx`)
- Renderizado de tarjetas enriquecidas diferenciadas (Ideas de concepto, Recomendaciones accionables, Explicaciones técnicas).
- Botón interactivo `"No entiendo esto, explícamelo"` con `HelpCircle` de Lucide: genera o despliega una explicación simplificada en español sin mutar el mensaje original.
- Botón de acción directa `"Mapear al lienzo"` que genera nodos con identificador único, fase y coordenadas óptimas en el store Zustand.

### 2.5 Lienzo Dual-Mode (`ConceptCanvas.tsx`)
- **Control Segmentado Flotante:** Centrado en la parte superior, estilo iOS/macOS, con atajos de teclado y persistencia en Zustand.
- **Modo Conocimiento (`notion`):**
  - Vista en mosaico/tablero estructurado agrupado por fases de investigación.
  - Tarjetas editoriales con tipografía cuidada, métricas y etiquetas.
  - Al hacer clic, abre un panel lateral sustancial o modal documental con formato enriquecido (encabezados, puntos clave, señales de validación y botón de cierre/Escape).
- **Modo Grafo (`graph`):**
  - Lienzo espacial con curvas Bezier cúbicas fluidas en SVG.
  - Codificación cromática estricta por fases de investigación:
    - **Planificación:** Esmeralda (`emerald-500`)
    - **Ejecución:** Azul (`blue-500`)
    - **Validación:** Ámbar (`amber-500`)
  - Resaltado de nodos conectados al seleccionar y leyenda explicativa de fases.
  - Manejo de estados vacíos y nodos desconectados.

---

## 3. Matriz de Archivos Afectados

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/domain/types.ts` | Modificar | Definición de `CanvasMode`, `ResearchPhase`, enriquecimiento de nodos y mensajes. |
| `src/store/useWorkspaceStore.ts` | Crear | Store global Zustand para el espacio de trabajo, lienzo y chat. |
| `src/features/auth/ProtectedRoute.tsx` | Crear | Protección de rutas en React Router v7 con preservación de redirección. |
| `src/features/auth/LoginView.tsx` | Modificar | Rediseño premium Apple, validaciones accesibles y retorno a ruta previa. |
| `src/context/AuthContext.tsx` | Modificar | Inicio de sesión limpio sin mock automático predeterminado en falso. |
| `src/App.tsx` | Modificar | Reestructuración de rutas con `/login`, rutas protegidas y transiciones suaves. |
| `src/features/dashboard/DashboardView.tsx` | Modificar | Corrección del error TS6133, saludo personalizado e integración visual. |
| `src/features/workspace/ConceptCanvas.tsx` | Modificar | Control segmentado, Modo Notion (editorial) y Modo Grafo (curvas Bezier y fases). |
| `src/features/workspace/DocumentDetailOverlay.tsx` | Crear | Vista profunda de documento tipo Notion para nodos seleccionados. |
| `src/features/workspace/AIChatDrawer.tsx` | Modificar | Tarjetas estructuradas de IA, acción "No entiendo esto, explícamelo" y botón de mapeo. |
| `src/features/workspace/WorkspaceView.tsx` | Modificar | Adaptación al store centralizado Zustand y orquestación de subcomponentes. |
| `src/mocks/seed.ts` | Modificar | Enriquecimiento de datos semilla con fases (`planning`, `execution`, `validation`) y detalles. |
| `src/i18n/locales/es/translation.json` | Modificar | Textos en español para modos de lienzo, fases de investigación y acciones de IA. |
| `src/i18n/locales/en/translation.json` | Modificar | Textos en inglés de respaldo para consistencia i18n. |

---

## 4. Hitos de Entrega Incremental y Estrategia Git

1. **Hito 1: Plan y Tipos de Dominio con Store Zustand**
   - Documento `PLAN_REFACTORIZACION.md`.
   - Extensión de `types.ts` y creación de `useWorkspaceStore.ts`.
   - Actualización de datos semilla (`seed.ts`) con fases y detalles enriquecidos.
   - Commit: `docs: create frontend refactoring plan and setup workspace store`
   - Sincronización: `git push origin main`.

2. **Hito 2: Autenticación Premium y Rutas Protegidas**
   - Creación de `ProtectedRoute.tsx`.
   - Refactorización de `LoginView.tsx`, corrección en `DashboardView.tsx` y reconfiguración de `App.tsx`.
   - Commit: `feat: implement protected routes and refine apple-style login view`
   - Sincronización: `git push origin main`.

3. **Hito 3: Chat de IA Interactivo con Tarjetas Enriquecidas y Explicación Contextual**
   - Tarjetas semánticas (ideas, recomendaciones, explicaciones).
   - Botón ghost `"No entiendo esto, explícamelo"` con `HelpCircle` y respuesta contextual simplificada.
   - Acción directa de añadir nodos al lienzo desde el chat vía Zustand.
   - Commit: `feat: add rich ai message cards and contextual explanation action`
   - Sincronización: `git push origin main`.

4. **Hito 4: Lienzo Dual-Mode (Modo Documental Notion + Grafo con Curvas Bezier y Fases)**
   - Segmented control flotante superior (`notion` / `graph`).
   - Modo Notion con visualización editorial de tarjetas y panel profundo de lectura (`DocumentDetailOverlay.tsx`).
   - Modo Grafo con curvas Bezier cúbicas fluidas y colores por fase (Planificación: Esmeralda, Ejecución: Azul, Validación: Ámbar).
   - Preservación íntegra de estado entre ambos modos.
   - Commit: `feat: implement dual-mode concept canvas with notion board and bezier graph`
   - Sincronización: `git push origin main`.

5. **Hito 5: Validación Visual (QA con Browser Subagent), Corrección de Defectos y Pulido**
   - Inspección visual en navegador (`http://localhost:1420`) de login, dashboard, chat y ambos modos de canvas.
   - Corrección de espaciados, contrastes y comportamiento en temas claro/oscuro.
   - Ejecución de `npm run build` y verificación de tipos.
   - Commit: `style: refine desktop aesthetics, typography and visual qa corrections`
   - Sincronización: `git push origin main`.

---

## 5. Criterios de Aceptación y QA Visual

- [x] **Compilación sin errores:** `npm run build` (`tsc && vite build`) exitoso con 0 warnings/errores de TypeScript.
- [x] **Rutas Protegidas:** Acceso a `/workspace/campus-market` sin sesión redirige a `/login`; tras autenticarse, vuelve automáticamente al espacio.
- [x] **IA Chat:**
  - Muestra tarjetas estructuradas para ideas y recomendaciones.
  - Al pulsar `"No entiendo esto, explícamelo"`, despliega la tarjeta de explicación simplificada en español.
  - Al pulsar `"Mapear al lienzo"`, el nuevo nodo aparece inmediatamente en el lienzo y se selecciona.
- [x] **Lienzo Dual:**
  - Alternar entre `Notion` y `Grafo` preserva todos los nodos, posiciones y relaciones.
  - En `Notion`, seleccionar una tarjeta abre el panel documental con tipografía y jerarquía claras.
  - En `Grafo`, las conexiones son curvas Bezier suaves y las fases se diferencian por Esmeralda / Azul / Ámbar con su leyenda.
- [x] **Consistencia Visual:** Estilo desktop refinado (Apple HIG), soporte de modo claro/oscuro y ausencia de elementos meramente decorativos no funcionales.
