<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Continuum — Knowledge Continuity Platform

Continuum combines a React frontend with a FastAPI backend. The frontend lives in `frontend/`; backend services and setup instructions are in `backend/`.

## Run the frontend

Prerequisite: Node.js.

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app at `http://localhost:3000`. Frontend environment values are documented in [`frontend/.env.example`](frontend/.env.example); put them in the repository-root `.env` file, which Vite loads for this setup.

## Run the backend

Follow the backend setup guide in [`backend/README.md`](backend/README.md). The root `docker-compose.yml` starts the supporting services and backend.
