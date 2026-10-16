# Contrato de API REST — Nexo Desktop

**Estado:** Propuesto (Pendiente de Implementación en Backend)  
**Versión de la API:** `v1`  
**Base URL:** `http://localhost:8000/api/v1` (Entorno de desarrollo) / `https://api.nexo.app/api/v1` (Producción)  
**Formato de Intercambio:** `application/json; charset=utf-8`  
**Convención de Nombres:** `camelCase` en JSON para compatibilidad 1:1 con TypeScript, `snake_case` interno en modelos ORM backend.

---

## 1. Convenciones Globales y Estándares

### 1.1 Cabeceras de Petición (Request Headers)
- `Content-Type`: `application/json` (para peticiones con cuerpo `POST`, `PUT`, `PATCH`).
- `Authorization`: `Bearer <access_token>` (requerido para todos los endpoints protegidos).
- `Accept-Language`: Código de idioma preferido (`es` o `en`). Afecta las respuestas generadas por IA y mensajes de error.
- `X-Client-Platform`: Identificador de cliente (`tauri-desktop-linux`, `tauri-desktop-macos`, `tauri-desktop-windows`).

### 1.2 Formato Uniforme de Respuestas de Error
Todas las respuestas de error (`4xx` y `5xx`) retornan una envoltura homogénea:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "El proyecto solicitado no existe o no tienes permisos para acceder a él.",
    "details": {
      "resource": "project",
      "id": "campus-market"
    },
    "timestamp": "2026-10-15T19:00:00.000Z"
  }
}
```

#### Catálogo de Códigos de Error:
| Código HTTP | `error.code` | Descripción |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Los datos enviados no cumplen con los tipos o restricciones. |
| `401` | `UNAUTHORIZED` | Token ausente, expirado o firma inválida. |
| `403` | `FORBIDDEN` | El recurso pertenece a otro usuario (*Multi-tenant violation*). |
| `404` | `NOT_FOUND` | Recurso no encontrado. |
| `409` | `CONFLICT` | Conflicto de unicidad (ej. correo ya registrado). |
| `422` | `UNPROCESSABLE_ENTITY` | Error semántico de validación de negocio. |
| `429` | `RATE_LIMIT_EXCEEDED` | Límite de peticiones excedido (especialmente en endpoints de IA). |
| `500` | `INTERNAL_SERVER_ERROR` | Error inesperado en el servidor. |
| `503` | `AI_PROVIDER_UNAVAILABLE` | El proveedor de LLM upstream no responde o agotó su cuota. |

---

## 2. Inventario Completo de Endpoints

```text
AUTENTICACIÓN
POST   /api/v1/auth/register            # Registro de nuevo usuario [Propuesto]
POST   /api/v1/auth/login               # Inicio de sesión y entrega de tokens [Propuesto]
POST   /api/v1/auth/refresh             # Rotación y refresco de tokens [Propuesto]
POST   /api/v1/auth/logout              # Revocación de sesión [Propuesto]
GET    /api/v1/auth/me                  # Perfil del usuario autenticado [Propuesto]

PROYECTOS
GET    /api/v1/projects                 # Listar proyectos con filtros [Propuesto]
POST   /api/v1/projects                 # Crear nuevo proyecto [Propuesto]
GET    /api/v1/projects/{id}            # Obtener metadatos de un proyecto [Propuesto]
PATCH  /api/v1/projects/{id}            # Actualizar proyecto (nombre, status, etc.) [Propuesto]
DELETE /api/v1/projects/{id}            # Eliminar proyecto en cascada [Propuesto]

ESPACIO DE TRABAJO Y LIENZO
GET    /api/v1/projects/{id}/workspace  # Cargar espacio completo (mapa + mensajes) [Propuesto]
PUT    /api/v1/projects/{id}/workspace  # Sincronización completa (batch save) [Propuesto]

GESTIÓN GRANULAR DE CONCEPTOS (NODOS Y RELACIONES)
POST   /api/v1/projects/{id}/nodes      # Crear nodo individual en el lienzo [Propuesto]
PATCH  /api/v1/projects/{id}/nodes/{nid}# Actualizar nodo (coordenadas, fase, notas) [Propuesto]
DELETE /api/v1/projects/{id}/nodes/{nid}# Eliminar nodo y aristas conectadas [Propuesto]
POST   /api/v1/projects/{id}/relations  # Crear arista relacional [Propuesto]
DELETE /api/v1/projects/{id}/relations/{rid} # Eliminar arista [Propuesto]

INTELIGENCIA ARTIFICIAL
POST   /api/v1/projects/{id}/ai/reply   # Generación conversacional estructurada [Propuesto]
POST   /api/v1/projects/{id}/ai/explain # Explicación contextual simplificada [Propuesto]

DOCUMENTOS
POST   /api/v1/projects/{id}/documents/generate # Generar informe ejecutivo con IA [Propuesto]
GET    /api/v1/projects/{id}/documents          # Listar documentos del proyecto [Propuesto]
GET    /api/v1/projects/{id}/documents/{docId}  # Obtener detalle de documento [Propuesto]

PREFERENCIAS DE USUARIO
GET    /api/v1/users/me/preferences     # Consultar preferencias de interfaz [Propuesto]
PUT    /api/v1/users/me/preferences     # Actualizar preferencias de interfaz [Propuesto]
```

---

## 3. Especificación Detallada de Esquemas y Contratos

### 3.1 Módulo de Autenticación

#### `POST /api/v1/auth/register` [Propuesto]
- **Propósito:** Registrar un nuevo usuario en la plataforma.
- **Autenticación requerida:** No (Público).
- **Esquema de Petición:**
```json
{
  "name": "Kevin Timaran",
  "email": "kevin@nexo.ai",
  "password": "Password123!"
}
```
- **Esquema de Respuesta (`201 Created`):**
```json
{
  "user": {
    "id": "u-a9f2c14e",
    "name": "Kevin Timaran",
    "email": "kevin@nexo.ai"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "d8f3e2a1-7c9b-4e6f-8a0d-1c3b5e7f9a2d",
    "tokenType": "Bearer",
    "expiresIn": 1800
  }
}
```

---

#### `POST /api/v1/auth/login` [Propuesto]
- **Propósito:** Iniciar sesión y validar credenciales. Mapea directamente a `AuthService.signIn(email, password)`.
- **Autenticación requerida:** No (Público).
- **Esquema de Petición:**
```json
{
  "email": "kevin@nexo.ai",
  "password": "Password123!"
}
```
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "user": {
    "id": "u-a9f2c14e",
    "name": "Kevin Timaran",
    "email": "kevin@nexo.ai"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "d8f3e2a1-7c9b-4e6f-8a0d-1c3b5e7f9a2d",
    "tokenType": "Bearer",
    "expiresIn": 1800
  }
}
```

---

#### `POST /api/v1/auth/refresh` [Propuesto]
- **Propósito:** Obtener un nuevo `accessToken` mediante un `refreshToken` válido.
- **Esquema de Petición:**
```json
{
  "refreshToken": "d8f3e2a1-7c9b-4e6f-8a0d-1c3b5e7f9a2d"
}
```
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "e1f2a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

---

#### `GET /api/v1/auth/me` [Propuesto]
- **Propósito:** Obtener la información del usuario autenticado actual.
- **Autenticación requerida:** Sí (`Bearer <token>`).
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "id": "u-a9f2c14e",
  "name": "Kevin Timaran",
  "email": "kevin@nexo.ai",
  "createdAt": "2026-10-15T18:00:00.000Z"
}
```

---

### 3.2 Módulo de Proyectos

#### `GET /api/v1/projects` [Propuesto]
- **Propósito:** Mapea directamente a `ProjectService.list(lang)`.
- **Autenticación requerida:** Sí (`Bearer <token>`).
- **Parámetros de consulta (Query params):**
  - `status` (opcional): `'all' | 'active' | 'draft' | 'archived'` (por defecto `'all'`).
  - `search` (opcional): texto para filtrar por nombre o descripción.
- **Esquema de Respuesta (`200 OK`):**
```json
[
  {
    "id": "campus-market",
    "name": "Mercado circular universitario",
    "description": "Una red de reventa confiable donde estudiantes compran y venden artículos usados en el campus.",
    "status": "active",
    "icon": "leaf",
    "updatedAt": "2026-10-15T18:45:00.000Z",
    "nodeCount": 8
  },
  {
    "id": "legal-aid",
    "name": "Asistente de orientación legal",
    "description": "Orientación en lenguaje sencillo para entender tus derechos antes de acudir a un abogado.",
    "status": "active",
    "icon": "scale",
    "updatedAt": "2026-10-15T14:00:00.000Z",
    "nodeCount": 5
  }
]
```

---

#### `POST /api/v1/projects` [Propuesto]
- **Propósito:** Mapea a `ProjectService.create(input)`. Crea un nuevo proyecto con mapa conceptual vacío.
- **Autenticación requerida:** Sí.
- **Esquema de Petición:**
```json
{
  "name": "Plataforma de Mentorías Peer-to-Peer",
  "description": "Red de acompañamiento académico entre estudiantes senior y junior."
}
```
- **Esquema de Respuesta (`201 Created`):**
```json
{
  "id": "p-7a1b3c9d",
  "name": "Plataforma de Mentorías Peer-to-Peer",
  "description": "Red de acompañamiento académico entre estudiantes senior y junior.",
  "status": "draft",
  "icon": "lightbulb",
  "updatedAt": "2026-10-15T19:05:00.000Z",
  "nodeCount": 0
}
```

---

#### `PATCH /api/v1/projects/{id}` [Propuesto]
- **Propósito:** Actualizar metadatos del proyecto.
- **Esquema de Petición:**
```json
{
  "name": "Plataforma de Mentorías Universitaria",
  "status": "active",
  "icon": "book"
}
```
- **Esquema de Respuesta (`200 OK`):** Objeto `Project` actualizado.

---

#### `DELETE /api/v1/projects/{id}` [Propuesto]
- **Propósito:** Eliminar un proyecto y todos sus nodos, relaciones y mensajes asociados en cascada.
- **Respuesta (`204 No Content`):** Vacía.

---

### 3.3 Módulo de Espacio de Trabajo (`Workspace`)

#### `GET /api/v1/projects/{id}/workspace` [Propuesto]
- **Propósito:** Mapea directamente a `WorkspaceService.load(projectId, lang)`. Retorna la fotografía integral del espacio.
- **Autenticación requerida:** Sí.
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "project": {
    "id": "campus-market",
    "name": "Mercado circular universitario",
    "description": "Una red de reventa confiable donde estudiantes compran y venden artículos usados en el campus.",
    "status": "active",
    "icon": "leaf",
    "updatedAt": "2026-10-15T18:45:00.000Z",
    "nodeCount": 3
  },
  "map": {
    "nodes": [
      {
        "id": "cm-core",
        "kind": "concept",
        "status": "confirmed",
        "phase": "planning",
        "x": 60,
        "y": 250,
        "title": "Reventa entre estudiantes",
        "description": "Estudiantes intercambian libros y muebles en una red verificada.",
        "metadata": "Idea central",
        "details": "### Hipótesis de Partida\nLos estudiantes prefieren comprar localmente...",
        "tags": ["core", "estudiantes"]
      },
      {
        "id": "cm-demand",
        "kind": "viability",
        "status": "confirmed",
        "phase": "execution",
        "x": 400,
        "y": 250,
        "title": "Alta demanda al inicio de semestre",
        "description": "68% de 212 estudiantes encuestados compró usados.",
        "metadata": "Puntaje 74/100"
      },
      {
        "id": "cm-payments",
        "kind": "risk",
        "status": "review",
        "phase": "validation",
        "x": 400,
        "y": 480,
        "title": "Pagos y protección al consumidor",
        "description": "Gestionar pagos requiere proveedor autorizado.",
        "metadata": "Revisión legal"
      }
    ],
    "relations": [
      {
        "id": "cm-core->cm-demand",
        "from": "cm-core",
        "to": "cm-demand"
      },
      {
        "id": "cm-core->cm-payments",
        "from": "cm-core",
        "to": "cm-payments"
      }
    ]
  },
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "createdAt": "2026-10-15T18:30:00.000Z",
      "text": "Quiero crear un mercado para que estudiantes revendan libros en el campus."
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "createdAt": "2026-10-15T18:30:02.000Z",
      "replyTo": "msg-001",
      "cardType": "idea",
      "text": "Estructuré tu idea en tres piezas fundamentales.",
      "simplifiedExplanation": "En términos sencillos: Diseñamos la idea central, cómo validar la demanda y qué riesgos legales debes vigilar.",
      "showExplanation": false,
      "insight": {
        "title": "Estructura de tu idea",
        "items": [
          { "nodeId": "cm-core", "kind": "concept", "label": "Reventa entre estudiantes" },
          { "nodeId": "cm-demand", "kind": "viability", "label": "Alta demanda al inicio de semestre" }
        ]
      },
      "actionableNode": {
        "title": "Puntos de entrega seguros",
        "description": "Supervisión física en bibliotecas del campus.",
        "kind": "concept",
        "phase": "execution",
        "metadata": "Propuesto"
      }
    }
  ]
}
```

---

#### `PUT /api/v1/projects/{id}/workspace` [Propuesto]
- **Propósito:** Mapea a `WorkspaceService.save(projectId, map, messages)`. Permite una sincronización en bloque de la sesión completa.
- **Autenticación requerida:** Sí.
- **Esquema de Petición:**
```json
{
  "map": {
    "nodes": [ /* array de ConceptNodes */ ],
    "relations": [ /* array de ConceptRelations */ ]
  },
  "messages": [ /* array de Messages */ ]
}
```
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "saved": true,
  "updatedAt": "2026-10-15T19:10:00.000Z",
  "nodeCount": 8
}
```

---

### 3.4 Operaciones Granulares sobre Nodos del Grafo

#### `POST /api/v1/projects/{id}/nodes` [Propuesto]
- **Propósito:** Mapea a `useWorkspaceStore.addNode` o `addNodeFromChat`.
- **Esquema de Petición:**
```json
{
  "title": "Verificación con correo institucional",
  "description": "Acceso exclusivo con dominio universitario para generar confianza.",
  "kind": "concept",
  "status": "confirmed",
  "phase": "planning",
  "metadata": "Capa de confianza",
  "details": "### Reglas de Acceso\nSolo correos @universidad.edu...",
  "x": 400,
  "y": 120
}
```
- **Esquema de Respuesta (`201 Created`):** Objeto `ConceptNode` con su `id` asignado por el backend (`n-xxxxxx`).

---

#### `PATCH /api/v1/projects/{id}/nodes/{nodeId}` [Propuesto]
- **Propósito:** Mapea a `useWorkspaceStore.updateNode` y `moveNode`. Permite actualizar título, fase, estado o coordenadas `(x, y)` tras un arrastre.
- **Esquema de Petición:**
```json
{
  "x": 450,
  "y": 140,
  "phase": "execution"
}
```
- **Esquema de Respuesta (`200 OK`):** Objeto `ConceptNode` actualizado.

---

#### `DELETE /api/v1/projects/{id}/nodes/{nodeId}` [Propuesto]
- **Propósito:** Mapea a `useWorkspaceStore.removeNode`. Elimina el nodo y limpia automáticamente cualquier relación donde participaba.
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "deletedNodeId": "cm-payments",
  "affectedRelations": ["cm-core->cm-payments"]
}
```

---

### 3.5 Módulo de Inteligencia Artificial

#### `POST /api/v1/projects/{id}/ai/reply` [Propuesto]
- **Propósito:** Mapea directamente a `AIService.reply(request)`. Procesa el mensaje del usuario considerando el contexto actual del mapa conceptual y genera nodos enriquecidos con su fase de investigación correspondiente.
- **Autenticación requerida:** Sí.
- **Esquema de Petición:**
```json
{
  "text": "¿Cómo resolvemos el problema de la confianza en las entregas físicas?",
  "map": {
    "nodes": [
      {
        "id": "cm-core",
        "kind": "concept",
        "title": "Reventa entre estudiantes",
        "phase": "planning"
      }
    ],
    "relations": []
  },
  "replyTo": "msg-003",
  "lang": "es"
}
```
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "message": {
    "id": "m-ai-9812",
    "role": "assistant",
    "createdAt": "2026-10-15T19:15:00.000Z",
    "replyTo": "msg-003",
    "cardType": "recommendation",
    "text": "La confianza en entregas físicas se soluciona fijando puntos de encuentro verificados dentro del campus.",
    "simplifiedExplanation": "En palabras simples: En lugar de que los estudiantes se vean en lugares desconocidos, usamos las cafeterías y bibliotecas de la universidad como puntos seguros de intercambio.",
    "insight": {
      "title": "Mitigación de seguridad recomendada",
      "items": [
        {
          "nodeId": "n-points",
          "kind": "concept",
          "label": "Puntos de entrega supervisados"
        }
      ]
    },
    "actionableNode": {
      "title": "Puntos de entrega supervisados",
      "description": "Bibliotecas y cafeterías funcionan como ubicaciones seguras de entrega con personal presente.",
      "kind": "concept",
      "phase": "execution",
      "metadata": "Propuesta validada",
      "details": "### Plan de Habilitación\n1. Coordinar con la administración de bibliotecas.\n2. Delimitar lockers o mesas designadas de entrega segura."
    }
  },
  "newNodes": [
    {
      "id": "n-points",
      "kind": "concept",
      "status": "exploring",
      "phase": "execution",
      "x": 720,
      "y": 280,
      "title": "Puntos de entrega supervisados",
      "description": "Bibliotecas y cafeterías funcionan como ubicaciones seguras de entrega.",
      "metadata": "Propuesta validada",
      "details": "### Plan de Habilitación\n1. Coordinar con administradores..."
    }
  ],
  "newRelations": [
    {
      "id": "rel-cm-core->n-points",
      "from": "cm-core",
      "to": "n-points"
    }
  ]
}
```

---

#### `POST /api/v1/projects/{id}/ai/explain` [Propuesto]
- **Propósito:** Generar una explicación contextual en lenguaje sencillo bajo demanda para un concepto técnico o riesgo complejo.
- **Esquema de Petición:**
```json
{
  "conceptTitle": "Riesgo de cumplimiento normativo y ley de protección de datos",
  "context": "El sistema almacena historiales académicos de estudiantes para sugerir compañeros de estudio.",
  "lang": "es"
}
```
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "simplifiedExplanation": "En palabras sencillas: La información académica es privada por ley. Si la compartes sin permiso por escrito del estudiante, la universidad o las autoridades pueden sancionar la plataforma. Debes pedir consentimiento explícito."
}
```

---

### 3.6 Módulo de Generación de Documentos

#### `POST /api/v1/projects/{id}/documents/generate` [Propuesto]
- **Propósito:** Mapea a `DocumentService.generate(projectId, projectName, lang)`. Utiliza un modelo de lenguaje para sintetizar todos los nodos del grafo, notas profundas y señales de viabilidad en un informe ejecutivo formal.
- **Esquema de Petición:**
```json
{
  "lang": "es"
}
```
- **Esquema de Respuesta (`201 Created`):**
```json
{
  "id": "doc-b18c4e",
  "projectId": "campus-market",
  "title": "Resumen Conceptual Ejecutivo — Mercado circular universitario",
  "contentMarkdown": "# RESUMEN EJECUTIVO: Mercado circular universitario\n\n## 1. Visión y Propósito\n...",
  "createdAt": "2026-10-15T19:20:00.000Z"
}
```

---

### 3.7 Módulo de Preferencias de Usuario

#### `GET /api/v1/users/me/preferences` [Propuesto]
- **Esquema de Respuesta (`200 OK`):**
```json
{
  "theme": "system",
  "language": "es",
  "reduceMotion": false,
  "desktopNotifications": true,
  "sound": true
}
```

#### `PUT /api/v1/users/me/preferences` [Propuesto]
- **Esquema de Petición:**
```json
{
  "theme": "dark",
  "language": "es",
  "reduceMotion": true,
  "desktopNotifications": false,
  "sound": false
}
```
- **Esquema de Respuesta (`200 OK`):** Mismo objeto actualizado.

---

## 4. Mapeo entre Contratos Frontend y Endpoints Backend

La siguiente tabla detalla la correspondencia exacta entre las interfaces declaradas en [`src/services/contracts.ts`](file:///home/kevin/Universidad/Dise%C3%B1o%20de%20interfaces/Proyectos/AppPc/Nexo_Frontend/nexo-desktop/src/services/contracts.ts) y los endpoints propuestos:

| Método en `contracts.ts` | Endpoint REST Propuesto | Método HTTP | Notas de Integración |
|---|---|---|---|
| `AuthService.signIn(email, pass)` | `/api/v1/auth/login` | `POST` | Devuelve `User` y almacena `accessToken` |
| `AuthService.signOut()` | `/api/v1/auth/logout` | `POST` | Revoca tokens y limpia sesión local |
| `ProjectService.list(lang)` | `/api/v1/projects` | `GET` | Envía `Accept-Language: {lang}` |
| `ProjectService.create(input)` | `/api/v1/projects` | `POST` | Recibe `name` y `description` |
| `WorkspaceService.load(id, lang)` | `/api/v1/projects/{id}/workspace` | `GET` | Retorna `Workspace` completo o 404 |
| `WorkspaceService.save(id, map, msgs)` | `/api/v1/projects/{id}/workspace` | `PUT` | Requiere volver asíncrona la firma o debounce |
| `AIService.reply(request)` | `/api/v1/projects/{id}/ai/reply` | `POST` | Procesa prompt, mapa y fases |
| `DocumentService.generate(id, name, lang)`| `/api/v1/projects/{id}/documents/generate`| `POST` | Genera Markdown enriquecido |
| *Acción no definida en contratos* | `/api/v1/auth/register` | `POST` | Nueva función requerida en `AuthService` |
| *Acción no definida en contratos* | `/api/v1/users/me/preferences` | `GET`/`PUT` | Nueva función recomendada para sincronizar ajustes |

---

## 5. Reglas de Propiedad de Datos y Seguridad

1. **Aislamiento Multi-Tenant:**
   - Toda consulta en base de datos para proyectos, nodos, aristas, mensajes o documentos debe incluir `WHERE user_id = :authenticated_user_id`.
   - Cualquier intento de acceder o modificar recursos de otro usuario responderá con código `404 Not Found` (para evitar enumeración de identificadores) o `403 Forbidden`.
2. **Restricciones de Integridad Referencial:**
   - Un nodo conceptual no puede relacionarse con un nodo de otro proyecto.
   - Si se elimina un `ConceptNode`, sus aristas asociadas en `concept_relations` se eliminan automáticamente mediante `ON DELETE CASCADE`.
3. **CORS para Entorno de Escritorio Tauri:**
   - La API debe permitir los siguientes orígenes en desarrollo y producción:
     - `http://localhost:1420` (servidor de desarrollo Vite).
     - `tauri://localhost` (origen interno del Webview de Tauri en Linux/Windows/macOS).
     - `http://tauri.localhost` (variante en ciertas plataformas).
   - Cabeceras permitidas: `Authorization`, `Content-Type`, `Accept-Language`, `X-Client-Platform`.
