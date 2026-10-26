# Continuum backend

Continuum's FastAPI backend stores operational records in SQLAlchemy models backed by SQLite. The application initializes tables on startup and creates the configured initial administrator only when that account does not already exist. Existing database records are preserved during startup schema upgrades. The default database is the existing repository-root `continuum_local.db`; set `DATABASE_URL` to another SQLite URL to change its location. SQLite foreign-key enforcement is enabled.

The existing relational entities remain in the ORM: admins, employees, projects, employee-project assignments, employee resources, indexed documents and chunks, risk scores, handovers, and handover audit logs. Employee and project creation only changes database records; it does not create or rename filesystem folders. Supabase Auth remains an optional administrator identity provider for existing installations. Supabase is not used for relational data. With the optional Supabase Auth environment values omitted, the backend uses its local administrator login.

## Local folder connections

The employee-level **Add Connection** form accepts a Drive or Notion source, connection name, and an explicit local path. Relative paths resolve from the repository root and must resolve to an existing readable directory under the root `data/` directory. Absolute paths are accepted only when they resolve inside that same permitted data root. Missing folders, files, traversal paths, and symlinks resolving outside the root are rejected. The backend never creates employee, Drive, Notion, or document folders.

Create the folders and place files manually, for example:

```text
data/
└── employee_1/
    ├── drive/
    │   ├── meeting_notes.md
    │   └── project_plan.pdf
    └── notion/
        └── technical_documentation.txt
```

Enter paths such as `data/employee_1/drive` in the form. This layout is an example only; employees and folders are not hardcoded or required to exist. The local connector recursively reads `.txt`, `.md`, `.pdf`, `.json`, and `.csv` files. Unsupported, hidden, temporary, empty, or malformed files are skipped with indexing errors recorded on the connection. Reindexing detects changed and removed files.

The existing chunking, `all-MiniLM-L6-v2` embeddings, Chroma vector store, retrieval, RAG, and handover services remain in use. Connection removal marks the connection disabled and clears its extracted text and searchable index while leaving the source directory and files untouched. Drive/Notion indexing does not use OAuth or call provider APIs. Jira is no longer a selectable knowledge connection. Public GitHub repository ingestion remains a separate non-OAuth feature.

## Configuration

Copy `backend/.env.example` to `backend/.env`. SQLite settings are provided by default. Supabase values are optional and apply only when preserving Supabase administrator login; they are not needed for SQLite CRUD or local folders. Do not configure Google Drive, Notion, or Jira OAuth credentials for this workflow.

Copy `frontend/.env.example` values into the repository-root `.env`; the Vite config reads frontend values from that root file. Supabase Auth values in the frontend example are optional.

For local document access, the backend process must be able to read the repository's `data/` folder. An empty or missing `data/` directory is not created by the application; create it manually if needed.

## Run locally

Install Python dependencies and start the backend from its directory:

```powershell
cd backend
python -m venv .venv
.venv\\Scripts\\Activate.ps1
```

On macOS/Linux, activate the environment with `source .venv/bin/activate`, then install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In another terminal, run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `http://localhost:3000`; API documentation is at `http://localhost:8000/api/v1/docs`. On a fresh database, the initial local administrator uses the values configured by `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`. Existing accounts and passwords are preserved.

## Docker Compose

Create the root `data/` directory manually before starting Compose, then run `docker compose up --build`. Compose mounts that directory read-only at `/project/data` for the backend and worker, and stores SQLite in the persistent `continuum_db_data` volume. Redis, ChromaDB, and Ollama retain their existing service roles. No PostgreSQL service is required.

## API and lifecycle

- `POST /api/v1/sources`: validate and save an employee Drive/Notion folder connection, then queue indexing.
- `GET /api/v1/sources`: list connection status, configured path, and indexing metadata.
- `PATCH /api/v1/sources/{id}`: update a local folder path and queue indexing.
- `POST /api/v1/sources/{id}/sync`: reindex a connected folder.
- `DELETE /api/v1/sources/{id}`: deactivate the connection, clear its search index, and preserve files.

OAuth authorization and callback routes for knowledge providers are not registered. The existing Supabase Auth login integration remains optional and separate from SQLite persistence. Legacy OAuth token model fields are retained in the ORM for compatibility with existing SQLite files but are no longer read or written by active connection routes.
