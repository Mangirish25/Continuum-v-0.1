# Continuum v0.1 — Enterprise Knowledge Continuity Platform

Continuum is an **Admin-Only Enterprise Knowledge Continuity Platform** designed to preserve institutional knowledge, analyze continuity risks, compute project bus factors, index multi-source organizational knowledge (GitHub, Google Drive, Notion, Jira), provide grounded semantic search, and synthesize structured handovers for departing employees.

---

## 1. Product Context & Core Constraints

### Strict Administrator-Only Architecture
- **Only Company Administrators authenticate into Continuum.**
- Employees do **NOT** have user accounts, login dashboards, or self-service portals.
- Employees are records in the database representing knowledge contributors, project assignments, and continuity risks.
- Supabase Auth is strictly utilized for **Administrator Identity Verification**. Non-admin registrations or general public access are blocked.

### Local AI & Knowledge Processing Preservation
- **LLM Processing**: Local Ollama running Qwen models (e.g. `qwen2.5:7b-instruct` or `qwen2.5-coder`). No paid or hosted LLM inference APIs are introduced.
- **Embeddings**: Local SentenceTransformers (`all-MiniLM-L6-v2`) generating 384-dimensional dense vectors.
- **Vector Storage**: Local ChromaDB persistence directory (`./data/chromadb`).
- **Knowledge Pipeline**: Content hashing (SHA-256), duplicate detection, semantic chunking, and deterministic bus factor scoring are executed locally on the backend.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide icons (Stitch-generated design system).
- **Backend**: Python 3.12+ / FastAPI / Pydantic v2 / SQLAlchemy 2.0 (Async).
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth.
- **Vector Database**: ChromaDB.
- **Local AI**: Ollama + SentenceTransformers (`all-MiniLM-L6-v2`).
- **Background Processing**: Celery + Redis (or FastAPI background tasks).
- **External Connectors**: GitHub (REST API), Google Drive (OAuth2), Notion (OAuth2 / Integrations), Jira (OAuth2 / REST API).

---

## 3. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│             Stitch-Generated Frontend (React)          │
│   - Supabase Auth Client (JWT Session Management)      │
│   - Connections & Manual Source Registration Screen    │
│   - Bus Factor, Risk Dashboard & Handover Review       │
└───────────────────────────┬────────────────────────────┘
                            │ Bearer <Supabase_JWT>
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│   - Server-Side Token Verification & Admin Role Guard  │
│   - Manual Knowledge Source Management & Normalization │
│   - Bus Factor & Continuity Risk Scoring Engine        │
│   - Handover Generation Orchestrator                   │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│   Supabase   │    │   Local AI   │     │  Background  │
│  PostgreSQL  │    │  - Ollama    │     │  - Celery    │
│  - Admins    │    │  - MiniLM    │     │  - Redis     │
│  - Employees │    │  - ChromaDB  │     └──────────────┘
│  - Sources   │    └──────────────┘
│  - Handovers │
└──────────────┘
```

---

## 4. Setup Guide

### 4.1 Creating a Supabase Project
1. Log in to [Supabase](https://supabase.com) and create a new project (e.g., `continuum-platform`).
2. Note your **Project URL** (e.g., `https://xyzcompany.supabase.co`) and **Publishable / Anon Key**.
3. Under **Project Settings > API**, retrieve your **JWT Secret** and **Service Role Key** (for server-side administrative token verification).
4. Under **Project Settings > Database**, find your connection string:
   - **Transaction Pooler (Port 6543)**: Recommended for serverless or high-concurrency environments.
   - **Direct Connection (Port 5432)**: Standard async PostgreSQL connection:
     ```
     postgresql+asyncpg://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```

### 4.2 Configuring Supabase Auth
1. Go to **Authentication > Providers > Email**.
2. Enable Email signup.
3. For local development, you can disable "Confirm email" for immediate access, or keep it enabled for production staging.
4. Set Redirect URLs under **Authentication > URL Configuration** to include your frontend origins (e.g., `http://localhost:5173`).

### 4.3 Administrator Registration & Authorization Modes
Continuum supports two configurable registration modes in `.env`:
- `ADMIN_REGISTRATION_MODE="open"`: For local development. Any administrator registering through the UI is automatically verified and provisioned in the application's PostgreSQL database.
- `ADMIN_REGISTRATION_MODE="restricted"`: For staging and production. Administrator registration requires a valid `REGISTRATION_INVITE_CODE`. Requests without a matching code are rejected with `403 Forbidden`.

### 4.4 Configuring Environment Variables
Copy `.env.example` in both `backend/` and project root:

**Backend (`backend/.env`):**
```env
PROJECT_NAME="Continuum"
ENVIRONMENT="development"
DEBUG=true
API_V1_STR="/api/v1"
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Supabase Auth & PostgreSQL
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_JWT_SECRET="your-jwt-secret-from-api-settings"

# Supabase PostgreSQL Connection String (Asyncpg Driver)
DATABASE_URL="postgresql+asyncpg://postgres.your-ref:your-db-password@aws-0-region.pooler.supabase.com:6543/postgres"
SYNC_DATABASE_URL="postgresql://postgres.your-ref:your-db-password@aws-0-region.pooler.supabase.com:6543/postgres"

# Administrator Registration Policy
ADMIN_REGISTRATION_MODE="open"              # "open" or "restricted"
REGISTRATION_INVITE_CODE="INVITE-2026-HQ"   # Required when mode is "restricted"

# Local AI Configuration
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:7b-instruct"
EMBEDDING_MODEL_NAME="all-MiniLM-L6-v2"
CHROMA_PERSIST_DIRECTORY="./data/chromadb"

# Celery & Redis
REDIS_URL="redis://localhost:6379/0"

# External Integrations Encryption
FERNET_KEY="generate-with-cryptography-fernet"
```

**Frontend (`.env` in workspace root):**
```env
VITE_API_BASE_URL="http://localhost:8000/api/v1"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-publishable-key"
```

---

## 5. Running the Application

### 5.1 Applying Database Migrations to Supabase
```bash
cd backend
# Activate virtual environment
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Linux/macOS

# Apply latest Alembic schema migrations
alembic upgrade head
```

### 5.2 Starting Ollama and Embedding Model
Ensure Ollama is installed and running locally:
```bash
ollama serve
ollama pull qwen2.5:7b-instruct
```

### 5.3 Starting FastAPI Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation: `http://localhost:8000/api/v1/docs`

### 5.4 Starting Redis & Celery (Optional for background ingestion)
```bash
# Start Redis
redis-server

# In backend directory, start Celery worker
celery -A app.core.celery_app worker --loglevel=info
```

### 5.5 Starting Frontend
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 6. Manual Knowledge Source Management

Administrators can manually register and manage knowledge sources directly from the **Connections** screen without editing `.env` or modifying source files:

1. Click **Connections** in the navigation bar.
2. Click **+ Add Knowledge Source** or **+ Connect Resource**.
3. Select your provider type and enter details:
   - **GitHub**: Public Repository URL (e.g., `https://github.com/torvalds/linux`).
   - **Google Drive**: Folder URL or Folder ID (e.g., `https://drive.google.com/drive/folders/xyz`).
   - **Notion**: Page URL or Page ID (e.g., `https://notion.so/myorg/Architecture-Doc`).
   - **Jira**: Project Key or Project URL (e.g., `PAY` or `https://org.atlassian.net/jira/projects/PAY`).
4. Associate the source with an **Employee Knowledge Owner** and **Project**.
5. Click **Connect / Register Source**.
6. The source is stored in Supabase PostgreSQL with explicit state tracking:
   - `READY`: Ready for indexing.
   - `SYNCING`: Actively pulling and vectorizing documents.
   - `SYNCED`: Up to date.
   - `NEEDS_AUTH`: Missing authorized provider OAuth token.
   - `FAILED`: Ingestion encountered an error (sanitized explanation displayed).
   - `DISABLED`: Deactivated by administrator.

---

## 7. Running the Automated Test Suite

Continuum includes comprehensive tests covering authentication, administrator registration, restricted invitation checks, knowledge source endpoints, risk scoring, bus factors, and semantic search:

```bash
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

All 19 test suites run in an isolated in-memory test database with full verification of token claims and security barriers.

---

## 8. Local Database to Supabase Migration Procedure

If you have existing development data in a local PostgreSQL database that you wish to transfer to Supabase:

1. **Export existing application data**:
   ```bash
   pg_dump -h localhost -U postgres -d continuum_dev --data-only --exclude-table=alembic_version -f backup_data.sql
   ```
2. **Apply migrations to Supabase**:
   ```bash
   alembic upgrade head
   ```
3. **Import data into Supabase PostgreSQL**:
   ```bash
   psql "postgresql://postgres.your-ref:password@aws-0-region.pooler.supabase.com:6543/postgres" -f backup_data.sql
   ```
4. **Link existing Admin records to Supabase Auth**:
   If an existing admin registered in Supabase Auth has a user ID `supa_uid`, update the record:
   ```sql
   UPDATE admins SET supabase_user_id = '<supa_uid>' WHERE email = 'admin@continuum.io';
   ```
