# Plan Integral de Refactorización y Elevación UI/UX — Nexo Desktop

**Rol:** Principal Frontend Engineer, Senior UI/UX Designer & Software Architect  
**Proyecto:** Nexo Desktop (`nexo-desktop`) — Aplicación de escritorio para investigación, ideación y exploración conceptual  
**Stack Tecnológico:** React 19, TypeScript, Tauri v2, Vite 8, Tailwind CSS v4, React Router v7, Zustand, Lucide Icons, i18next  
**Fecha:** 24 de Octubre de 2026  
**Rama:** `main` (Sincronizada con `origin/main`)

---

## 1. Hallazgos Verificados de la Auditoría del Repositorio

Tras una inspección completa del código fuente, configuración, dependencias y estado en Git, se determinaron los siguientes hechos técnicos:

1. **Estado de Compilación y Git:**
   - El proyecto compila limpiamente (`npm run build` con `tsc && vite build` exitoso).
   - Git está en rama `main` sincronizado con `git@github.com:KevinTimaran/Nexo_Frontend.git`. Árbol limpio de trabajo.

2. **Sistema de Tokens y Temas:**
   - `src/theme/tokens.ts` contiene una paleta básica no tipada rígidamente con solo 3 categorías históricas (`concept`, `viability`, `risk`).
   - La nueva especificación de diseño exige una paleta semántica explícita para:
     - **Roles primarios:** Claro `#1E293B`, Oscuro `#0F172A`.
     - **Prioridades:** Alta (`#991B1B` / `#EF4444`), Media (`#B45309` / `#F59E0B`), Baja (`#475569` / `#94A3B8`).
     - **Categorías de investigación:**
       - Legal / Regulatorio: `#6B21A8` / `#A855F7`
       - Económico / Financiero: `#065F46` / `#10B981`
       - Político / Social: `#1E3A8A` / `#3B82F6`
       - Técnico / Operacional: `#0F766E` / `#14B8A6`
   - Los estilos en `src/styles/index.css` deben incorporar estas variables CSS semánticas para los modos claro y oscuro con soporte de alto contraste y movimiento reducido.

3. **Arquitectura de Servicios y Conectividad:**
   - Actualmente `services/index.ts` exporta `mockServices` de manera rígida. Las vistas acceden directamente a `mockServices` en lugar de una interfaz desacoplada.
   - El backend Spring Boot (`Nexo_Backend`) únicamente tiene la clase base `NexoApiApplication.java` sin endpoints aún implementados; el contrato formal está en `CONTRATO_API_NEXO.md`.
   - No existe monitoreo de conectividad real: no hay distinción verídica entre modo simulación (*Mock Mode*) y conexión con servidor (*Server Mode*). Se requiere `ConnectivityStatus.tsx` y `ConnectionManager.tsx`.
   - Se debe reportar verazmente el estado de tres servicios independientes: Backend Java/Spring Boot (conmutador real Mock/Server con health check configurable), Servicio de IA (estados del ciclo de vida frontend) y Neo4j (reportado como no disponible o desconfigurado si el backend no lo provee, nunca inventado).

4. **Lienzo Conceptual (`ConceptCanvas.tsx`):**
   - El lienzo actual utiliza los modos `graph` y `notion`. La especificación exige `canvasMode: 'notion' | 'obsidian'`.
   - En modo `obsidian` (Constelación), no deben mostrarse tarjetas rectangulares pesadas, sino una visualización minimalista espacial con nodos circulares interactivos, sutiles curvas de Bézier entre conceptos relacionados, feedback de selección, resaltado de aristas y tooltips refinados en hover.
   - En modo `notion` (Tablero de Conocimiento), tarjetas de proporciones homogéneas, borde con acento de categoría, indicador de prioridad y brillo sutil para prioridad alta.
   - El visor en profundidad `NotionModalViewer.tsx` debe ofrecer una experiencia de lectura estructurada tipo documento Markdown, con tipografía refinada, navegación por teclado (Escape) y renderizado seguro sin inyección de HTML peligroso.

5. **Chat de IA (`AIChatDrawer.tsx`) y Modo Tutor:**
   - Las respuestas complejas deben presentarse en tarjetas ricas contextuales (título, categoría, prioridad, metadatos, acciones contextuales).
   - La acción *"No entiendo esto, explícamelo"* (icono `HelpCircle`) actualmente solo hace un toggle de texto estático. Debe implementar un flujo asíncrono real con estado de carga (*loading*), llamada al servicio de IA/adaptador, preservación del mensaje original y control de errores/reintentos.

6. **Autenticación (`LoginView.tsx`):**
   - Requiere actualización visual para alinearse al nuevo sistema de diseño, con inputs consistentes, validación accesible, feedback de errores y etiquetado claro del entorno de desarrollo.

---

## 2. Archivos Afectados y Nuevos Componentes

| Archivo | Estado | Responsabilidad |
|---|---|---|
| `src/domain/types.ts` | Modificar | Definir tipos estrictos `CanvasMode ('notion' \| 'obsidian')`, `NodeCategory`, `NodePriority`, `ConnectivityState`, `ServiceMode`. |
| `src/theme/tokens.ts` | Modificar | Centralizar tokens semánticos de categorías, prioridades y superficies en TS. |
| `src/styles/index.css` | Modificar | Variables CSS temáticas para modo claro y oscuro, sombras sutiles y estilos de tarjetas. |
| `src/services/contracts.ts` | Modificar | Contratos para servicio de salud backend, conmutador de modo y soporte de modo tutor en IA. |
| `src/services/registry.ts` | Nuevo | Registro dinámico de servicios (`activeMode`, conmutación real entre Mock y HTTP Server Adapter). |
| `src/services/http/index.ts` | Nuevo | Cliente HTTP para verificación de salud real del backend y llamadas al servidor cuando está en Server Mode. |
| `src/services/mock/index.ts` | Modificar | Adaptador de simulación enriquecido con categorías, prioridades y generación contextual de tutor. |
| `src/services/index.ts` | Modificar | Exportar servicios a través del gestor de registro conmutador. |
| `src/store/useWorkspaceStore.ts` | Modificar | Actualizar `canvasMode: 'notion' \| 'obsidian'`, manejo de categorías y prioridades en nodos. |
| `src/components/connectivity/ConnectivityStatus.tsx` | Nuevo | Indicador de estado en la barra superior con badge sutil y trigger del Connection Manager. |
| `src/components/connectivity/ConnectionManager.tsx` | Nuevo | Panel emergente con estado de los 3 servicios (Backend, IA, Neo4j), conmutador Mock/Server y test manual. |
| `src/components/ui/ViewModeToggle.tsx` | Nuevo | Conmutador accesible y refinado entre vista Notion y vista Constelación (Obsidian). |
| `src/components/ui/MarkdownRenderer.tsx` | Nuevo | Renderizador seguro y tipografiado de Markdown para documentos profundos sin dependencias inseguras. |
| `src/features/workspace/NotionModalViewer.tsx` | Nuevo | Visor documental en profundidad para el nodo seleccionado en Notion u Obsidian. |
| `src/features/workspace/ConceptCanvas.tsx` | Modificar | Rediseño integral: vista Notion refinada y vista Constelación (Obsidian) con nodos circulares y Bézier SVG. |
| `src/features/workspace/AIChatDrawer.tsx` | Modificar | Tarjetas estructuradas de IA y Modo Tutor interactivo con `HelpCircle` y flujo asíncrono. |
| `src/features/workspace/WorkspaceView.tsx` | Modificar | Integrar `NotionModalViewer`, `ViewModeToggle` y el nuevo gestor de servicios. |
| `src/features/auth/LoginView.tsx` | Modificar | Refactor visual del login con el nuevo sistema de tokens y modos claro/oscuro. |
| `src/components/layout/Titlebar.tsx` | Modificar | Integrar `ConnectivityStatus` en la cabecera. |
| `src/mocks/seed.ts` | Modificar | Incorporar categorías (`legal`, `economic`, `political`, `technical`) y prioridades (`high`, `medium`, `low`) a los nodos de prueba. |

---

## 3. Hitos de Implementación

### Hito 1: Fundaciones del Sistema de Diseño y Tipos de Dominio
- Extender `src/domain/types.ts` con `CanvasMode = 'notion' | 'obsidian'`, `NodeCategory`, `NodePriority`, `BackendMode = 'mock' | 'server'`, y estados de conectividad.
- Actualizar `src/theme/tokens.ts` e `index.css` con las especificaciones exactas de color y sombras.
- Actualizar datos semilla en `src/mocks/seed.ts` para incluir campos de categoría y prioridad.
- *Commit:* `feat: establish semantic design tokens and domain types`

### Hito 2: Monitoreo de Conectividad y Conmutador de Modo de Servicios
- Crear cliente HTTP y health check configurable en `src/services/http/index.ts`.
- Implementar registro dinámico en `src/services/registry.ts` permitiendo alternar verídicamente entre `mockServices` y `httpServices`.
- Crear `ConnectivityStatus.tsx` y `ConnectionManager.tsx` con soporte para Backend (Spring Boot), IA y Neo4j con reportes honestos.
- Integrar en `Titlebar.tsx`.
- *Commit:* `feat: add connectivity status and service mode manager`

### Hito 3: Rediseño del Chat de IA y Modo Tutor Asíncrono
- Crear tarjetas enriquecidas en `AIChatDrawer.tsx` con categoría, prioridad y acciones.
- Implementar la acción "No entiendo esto, explícamelo" con icono `HelpCircle`, estado de carga individual por mensaje, generación de explicación didáctica en español con ejemplos, y prevención de duplicados concurrentes.
- *Commit:* `feat: enhance AI chat drawer with structured cards and tutor mode`

### Hito 4: Rediseño del Lienzo Conceptual (Modo Notion y Visor Documental)
- Implementar `ViewModeToggle.tsx` reusable.
- Implementar `MarkdownRenderer.tsx` seguro y tipográfico.
- Crear `NotionModalViewer.tsx` como panel/modal de inmersión profunda con atajos de teclado y accesibilidad.
- Rediseñar el modo `notion` de `ConceptCanvas.tsx` con tarjetas estilizadas por categoría, insignia de prioridad y acento de elevación.
- *Commit:* `feat: redesign notion knowledge board and add deep-dive document viewer`

### Hito 5: Rediseño del Lienzo Conceptual (Modo Constelación Obsidian)
- Implementar en `ConceptCanvas.tsx` el modo `obsidian`: nodos circulares minimalistas interactivos, aristas con curvas Bézier suaves, destacados al seleccionar o conectar, y tooltips de hover refinados.
- Ocultamiento completo de tarjetas densas en favor del grafo estelar minimalista.
- Selección de nodo abre el visor `NotionModalViewer.tsx`.
- *Commit:* `feat: implement obsidian constellation spatial graph view`

### Hito 6: Refactor de LoginView y Pulido Visual Integral
- Refinar `LoginView.tsx` adaptándolo al nuevo sistema semántico en modo claro y oscuro.
- Verificar temas claro y oscuro en todas las pantallas.
- *Commit:* `style: polish login view and theme surface consistency`

### Hito 7: Verificación, Pruebas y Reporte Final
- Ejecutar `npm run build` y `tsc` para validar cero errores de tipos o linting.
- Inspeccionar el renderizado de la interfaz en navegador/preview.
- Corregir cualquier defecto visual encontrado.
- Sincronizar commits a `origin/main`.
- Elaborar informe final detallado en español.

---

## 4. Criterios de Aceptación Técnicos
- Cero regresiones en la compilación de TypeScript y empaquetado de Vite.
- Transición fluida y preservación de estado entre las vistas `'notion'` y `'obsidian'`.
- Nodos y aristas representadas honestamente según las relaciones del workspace.
- Modo Tutor 100% interactivo con estados de carga, error y preservación del mensaje base.
- Conexión reportada fielmente sin simular éxito de servidor en modo mock.
- Contraste visual adecuado (WCAG AA) en tema claro y tema oscuro.
