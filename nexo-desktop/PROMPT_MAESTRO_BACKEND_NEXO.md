# Master Backend Implementation Prompt — Nexo Desktop

**Document Status:** Ready for Execution by Future Coding Agent  
**Language of Instruction:** English (Technical Precision)  
**Required Agent Communication Language:** Spanish (Mandatory)  
**Target Repository:** Nexo Desktop (`nexo-desktop`)  
**Base Frontend Architecture:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Zustand 5 + React Router v7 + Tauri v2  

---

## 1. Directive and Role Definition

You are a **Principal Software Architect, Senior Backend Engineer, and API Integration Specialist**.

Your mission is to construct, test, and deploy a robust, secure, and production-grade backend service tailored specifically to support the real, audited frontend of **Nexo Desktop**.

### Mandatory Communication and Documentation Rules
- **All conversation, progress reports, clarification questions, and project documentation MUST BE IN SPANISH.**
- Code symbols, variable names, database column names, API route paths, and Git commit messages must remain in English where standard for software engineering.
- Before writing a single line of backend implementation code, you **MUST inspect the existing repository**, review the verified findings in `AUDITORIA_FRONTEND_NEXO.md` and `CONTRATO_API_NEXO.md`, and generate a comprehensive implementation plan in Spanish for user approval.

---

## 2. Project Context and Verified Frontend Architecture

Nexo Desktop is an AI-powered desktop application focused on visual ideation, concept exploration, and structured knowledge mapping.

### Verified Frontend Baseline (Audited Facts)
- **Frontend Stack:** React 19.1.0, TypeScript ~6.0.3, Vite 8.0.16, Tailwind CSS 4.3.3, Zustand 5.0.15, React Router DOM 7.18.4, Tauri v2.
- **Tauri Runtime:** Runs in a native desktop Webview window (1280x820). The frontend communicates through origins `http://localhost:1420` (in dev) and `tauri://localhost` (in release builds).
- **Centralized State (`useWorkspaceStore.ts`):** Governs `workspace` (project, concept map, message history), `canvasMode` (`'notion' | 'graph'`), `selectedNodeId`, `expandedDocNodeId`, `isThinking`, and atomic node/message operations.
- **Dual-Mode Canvas (`ConceptCanvas.tsx`):**
  - **Knowledge Mode (`notion`):** Categorizes concept cards into 3 research phase columns: **Planning** (`planning` - emerald), **Execution** (`execution` - blue), and **Validation** (`validation` - amber). Clicking a card opens `DocumentDetailOverlay.tsx`.
  - **Graph Mode (`graph`):** Spatial coordinate canvas `(x, y)` with SVG cubic Bezier curves (`C cx1 cy1, cx2 cy2, tx ty`), interactive zoom/pan, and node selection with connection highlighting.
- **AI Chat Drawer (`AIChatDrawer.tsx`):**
  - Displays message history with structured assistant cards (`idea`, `recommendation`, `explanation`).
  - Contextual explanation trigger: `"No entiendo esto, explícamelo"` button with `HelpCircle` icon toggling `simplifiedExplanation` in Spanish.
  - Direct canvas mapping action: `"Mapear al lienzo"` button injecting an `actionableNode` directly into the Zustand graph and creating a relationship to the root concept.
- **Current Limitations in Frontend:**
  - Mock services (`src/services/mock/index.ts`) store workspaces in an in-memory `Map` (`sessions`), resulting in data loss upon application restart.
  - `WorkspaceService.save` has a synchronous signature: `save(projectId: string, map: ConceptMap, messages: Message[]): void`.
  - Components directly import `mockServices` instead of using the dependency injection contract in `src/services/index.ts`.
  - No registration view exists in `LoginView.tsx` (only email/password login).

---

## 3. Recommended Backend Technology Stack & Justification

### Recommended Stack: **FastAPI + PostgreSQL + SQLAlchemy 2.0 (Async) + Pydantic v2 + Alembic**

#### Detailed Justification:
1. **AI-First Ecosystem & Structured Outputs:** Nexo's core value proposition is structured idea extraction (mapping natural language conversations to concept nodes with exact research phases, metrics, and relationships). Python is the premier language for LLM integration (OpenAI, Anthropic Claude, and Google Gemini SDKs provide native Pydantic validation via Structured Outputs and tool calling).
2. **High-Performance Async I/O:** FastAPI running on `uvicorn` with `asyncio` handles concurrent LLM network requests, streaming Server-Sent Events (SSE), and database transactions with minimal overhead.
3. **Data Integrity & Relational Modeling:** PostgreSQL provides rock-solid relational integrity with foreign keys, cascading deletes (`ON DELETE CASCADE`), indexes on `user_id` and `project_id`, and native `JSONB` support for complex AI insight payloads.
4. **Automated OpenAPI / Swagger:** FastAPI generates live, typed OpenAPI contracts directly from Pydantic schemas, guaranteeing exact alignment with `CONTRATO_API_NEXO.md`.

*Alternative Considered:* **Node.js (TypeScript) with Fastify / NestJS and Prisma / Drizzle**. While sharing TypeScript interfaces between frontend and backend is advantageous, Python's LLM ecosystem, structured output tooling, and native prompt engineering capabilities make FastAPI the superior architectural choice for Nexo.

---

## 4. Proposed Backend Architecture (Modular Monolith)

Implement a clean, layered modular monolith following Domain-Driven Design (DDD) principles:

```text
nexo-backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint, CORS & middleware
│   ├── config.py                # Pydantic BaseSettings (env vars, secrets, CORS)
│   ├── core/
│   │   ├── security.py          # JWT creation/verification, password hashing (Argon2id)
│   │   ├── database.py          # SQLAlchemy async engine, sessionmaker & Base
│   │   ├── dependencies.py      # FastAPI Depends: get_db, get_current_user
│   │   └── exceptions.py        # Custom domain exceptions & global error handlers
│   ├── models/                  # SQLAlchemy ORM Models
│   │   ├── user.py              # User & UserPreferences models
│   │   ├── project.py           # Project model
│   │   ├── concept.py           # ConceptNode & ConceptRelation models
│   │   ├── message.py           # Conversation Message model
│   │   └── document.py          # GeneratedDocument model
│   ├── schemas/                 # Pydantic v2 Schemas (DTOs & Validation)
│   │   ├── common.py            # Standard Error envelope, pagination
│   │   ├── auth.py              # Login, Register, Token responses
│   │   ├── project.py           # ProjectInput, ProjectResponse
│   │   ├── workspace.py         # WorkspaceSync, ConceptMap, Node, Relation schemas
│   │   ├── ai.py                # AIReplyRequest, AIResponse, ActionableNode
│   │   └── document.py          # DocumentGenerateRequest, DocumentResponse
│   ├── routers/                 # API Route Controllers (/api/v1)
│   │   ├── auth.py              # /api/v1/auth
│   │   ├── projects.py          # /api/v1/projects
│   │   ├── workspace.py         # /api/v1/projects/{id}/workspace
│   │   ├── nodes.py             # /api/v1/projects/{id}/nodes
│   │   ├── ai.py                # /api/v1/projects/{id}/ai
│   │   └── documents.py         # /api/v1/projects/{id}/documents
│   ├── services/                # Business Logic Services
│   │   ├── auth_service.py      # User authentication, token issuance
│   │   ├── project_service.py   # Project lifecycle, ownership verification
│   │   ├── workspace_service.py # Graph resolution, atomic node sync
│   │   └── ai_service.py        # LLM prompt orchestration, structured outputs
│   └── integrations/            # External Third-Party Adapters
│       └── llm_client.py        # Abstraction layer over OpenAI / Anthropic / Gemini
├── alembic/                     # Database migrations
├── tests/                       # Automated tests (Pytest)
│   ├── conftest.py              # Test database fixtures, client, auth tokens
│   ├── test_auth.py             # Auth endpoints testing
│   ├── test_projects.py         # Project CRUD and multi-tenant isolation tests
│   ├── test_workspace.py        # Graph nodes and relations testing
│   └── test_ai.py               # AI reply mocking and validation tests
├── Dockerfile                   # Multi-stage production container
├── docker-compose.yml           # Backend + PostgreSQL service composition
└── requirements.txt             # Python dependencies
```

---

## 5. Domain Model and Relational Database Schema

### 5.1 Tables and Constraints (PostgreSQL DDL Specification)

```sql
-- 1. Users
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- 2. User Preferences
CREATE TABLE user_preferences (
    user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(10) NOT NULL DEFAULT 'system',
    language VARCHAR(5) NOT NULL DEFAULT 'es',
    reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
    desktop_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    sound BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Projects
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'active', 'draft', 'archived'
    icon VARCHAR(30) NOT NULL DEFAULT 'lightbulb',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- 4. Concept Nodes
CREATE TABLE concept_nodes (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    kind VARCHAR(20) NOT NULL,       -- 'concept', 'viability', 'risk'
    status VARCHAR(20) NOT NULL DEFAULT 'exploring', -- 'confirmed', 'exploring', 'review'
    phase VARCHAR(20) NOT NULL DEFAULT 'planning',   -- 'planning', 'execution', 'validation'
    metadata VARCHAR(150) NOT NULL DEFAULT '',
    details TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    x DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    y DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_concept_nodes_project ON concept_nodes(project_id);
CREATE INDEX idx_concept_nodes_phase ON concept_nodes(phase);

-- 5. Concept Relations
CREATE TABLE concept_relations (
    id VARCHAR(75) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_node_id VARCHAR(36) NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
    to_node_id VARCHAR(36) NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_relation UNIQUE (project_id, from_node_id, to_node_id)
);
CREATE INDEX idx_concept_relations_project ON concept_relations(project_id);

-- 6. Messages
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(15) NOT NULL, -- 'user', 'assistant'
    text TEXT NOT NULL,
    reply_to VARCHAR(36),
    card_type VARCHAR(20),     -- 'idea', 'explanation', 'recommendation'
    simplified_explanation TEXT,
    insight_payload JSONB,
    actionable_node_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_project ON messages(project_id, created_at ASC);

-- 7. Documents
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_project ON documents(project_id);
```

---

## 6. Authentication and Multi-Tenant Security

### 6.1 Authentication Mechanism
- **Password Hashing:** Passlib with **Argon2id** (`argon2_cffi`) or `bcrypt` (12 rounds).
- **Token Mechanism:**
  - `access_token`: JWT with HMAC-SHA256 (`HS256`), containing `sub: user_id`, `email`, `iat`, `exp` (lifetime: 30 minutes).
  - `refresh_token`: Opaque cryptographically random UUID v4 stored in database or Redis with expiration (7 days).
- **Header:** `Authorization: Bearer <access_token>`.

### 6.2 Strict Multi-Tenant Isolation
- Never query database entities directly by resource ID alone.
- Every read, update, or delete query MUST explicitly enforce tenant ownership:
  ```python
  stmt = select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
  ```
- Sub-entities (`concept_nodes`, `messages`, `documents`) must be validated against the project owned by the current user.

### 6.3 CORS Configuration for Tauri Desktop
In `app/main.py`, configure `CORSMiddleware` to explicitly permit desktop Webview origins:
```python
ALLOWED_ORIGINS = [
    "http://localhost:1420",     # Vite Dev Server
    "http://127.0.0.1:1420",
    "tauri://localhost",         # Tauri v2 Webview (macOS / Linux / Windows)
    "http://tauri.localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept-Language", "X-Client-Platform"],
)
```

---

## 7. AI Service Integration & Prompt Engineering Architecture

### 7.1 Provider Abstraction Layer (`LLMClient`)
Design an abstract protocol `LLMClient` with concrete implementations:
- `OpenAILLMClient` (using `gpt-4o-mini` or `gpt-4o`)
- `AnthropicLLMClient` (using `claude-3-5-sonnet`)
- `MockLLMClient` (for offline testing and CI/CD)

### 7.2 Structured Output Schema for AI Reply
Configure Pydantic models for Structured Outputs:

```python
class ActionableNodeCandidate(BaseModel):
    title: str = Field(description="Clear, concise concept title in the target language (max 6 words)")
    description: str = Field(description="Explanatory summary of the concept")
    kind: Literal["concept", "viability", "risk"]
    phase: Literal["planning", "execution", "validation"]
    metadata: str = Field(description="Short factual badge, e.g., 'Score 75/100' or 'Core idea'")
    details: Optional[str] = Field(description="Structured markdown analysis with hypotheses and action plan")

class AIReplyStructuredOutput(BaseModel):
    assistant_text: str = Field(description="Direct conversational answer acknowledging the user's idea")
    card_type: Literal["idea", "explanation", "recommendation"]
    simplified_explanation: str = Field(
        description="Plain-language explanation in Spanish answering 'No entiendo esto, explícamelo'"
    )
    suggested_nodes: List[ActionableNodeCandidate] = Field(
        default_factory=list,
        description="0 to 3 new concept nodes to enrich the graph"
    )
    connect_to_node_id: Optional[str] = Field(
        description="ID of an existing concept node this new concept builds upon"
    )
```

### 7.3 System Prompt Instructions for Nexo AI
The system prompt for the ideation engine must enforce:
1. **Language Respect:** Always respond in the requested language (`lang` parameter, default Spanish).
2. **Phase Assignment Rules:**
   - `planning` (Emerald): Core propositions, customer segments, framing, hypotheses.
   - `execution` (Blue): Viability, distribution channels, operational architecture, unit economics.
   - `validation` (Amber): Regulatory risks, compliance, legal liability, user churn points.
3. **Spatial Awareness:** The prompt must receive a summary of current nodes in the map to suggest complementary concepts rather than repeating existing ones.

---

## 8. Frontend Integration Strategy (Minimal Surface Changes)

Instruct the future agent to adapt the frontend without breaking existing layouts:
1. **Environment Configuration:**
   - Create `.env.development` with `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
2. **HTTP Service Adapter:**
   - In `src/services/http/index.ts`, implement `AuthService`, `ProjectService`, `WorkspaceService`, `AIService`, and `DocumentService` wrapping native `fetch` with token storage.
3. **Switch Service Registry:**
   - In `src/services/index.ts`, change:
     ```typescript
     // From:
     export const services: Services = mockServices;
     // To:
     import { httpServices } from "./http";
     export const services: Services = httpServices;
     ```
4. **Fix Direct Component Imports:**
   - Update `useWorkspaceStore.ts`, `AuthContext.tsx`, `DashboardView.tsx`, `WorkspaceView.tsx`, and `AppLayout.tsx` to import `services` from `src/services` instead of `mockServices`.
5. **Debounced Autosave in Zustand:**
   - Wrap `services.workspace.save(projectId, map, messages)` with a 500ms debounce inside `useWorkspaceStore.ts` to prevent redundant network bursts during node dragging.

---

## 9. Incremental Git Workflow & Milestone Plan

Build the backend in 5 logical, verifiable milestones. Each milestone must produce passing tests and a clean Git commit:

- **Milestone 1: Project Setup, Database Models & Migrations**
  - Setup FastAPI project structure, dependencies (`requirements.txt`), Docker Compose for PostgreSQL.
  - Implement SQLAlchemy models and initial Alembic migration.
  - Commit message: `feat: initialize backend architecture with database models and migrations`

- **Milestone 2: Authentication & Multi-Tenant User Management**
  - Implement Argon2id hashing, JWT access/refresh token endpoints, `get_current_user` dependency.
  - Add Pytest suite for registration, login, and token expiry.
  - Commit message: `feat: implement jwt authentication and user management endpoints`

- **Milestone 3: Projects & Workspace Concept Graph Persistence**
  - Implement Project CRUD, Workspace load/save, and granular Node/Relation endpoints with cascading deletes.
  - Add tests for multi-tenant isolation (preventing User A from reading User B's project).
  - Commit message: `feat: implement project lifecycle and spatial concept graph endpoints`

- **Milestone 4: AI Ideation Engine & Document Generation**
  - Implement `LLMClient` with Structured Outputs, research phase classification, and simplified explanations.
  - Implement executive document markdown synthesis endpoint.
  - Commit message: `feat: integrate ai ideation engine and structured concept generation`

- **Milestone 5: Frontend HTTP Client Connection & End-to-End Verification**
  - Wire frontend `src/services/http` to FastAPI backend.
  - Verify complete flow: register -> login -> create project -> chat with AI -> map to canvas -> save -> reload.
  - Commit message: `feat: connect desktop frontend to real backend api and verify e2e flow`

---

## 10. Acceptance Criteria

The backend implementation will be considered complete and verified only when:
1. All endpoints defined in `CONTRATO_API_NEXO.md` are implemented and return status codes matching the specification.
2. The Pytest test suite runs cleanly with >80% code coverage across routers, services, and models.
3. Multi-tenant security tests confirm zero data leakage between different user accounts.
4. Concept nodes and relations are reliably persisted in PostgreSQL and survive full application reboots.
5. The AI reply endpoint generates structured cards with `actionableNode`, research phases (`planning`, `execution`, `validation`), and Spanish simplified explanations (`simplifiedExplanation`).
6. The desktop frontend (`npm run build`) continues to compile with 0 TypeScript errors.
7. Docker Compose launches PostgreSQL and the FastAPI application seamlessly with a single `docker compose up -d` command.
8. A comprehensive `README.md` in Spanish documents local environment setup, environment variables, migration execution, and API documentation endpoints (`/docs`).
