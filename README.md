# YaarFetch (FastAPI + React + MongoDB)

## Prereqs
- Python 3.11+
- Node.js 18+
- MongoDB URI (Atlas or local)

## Backend (FastAPI)
1) Copy `env.example` to `.env` (optional) or export variables:
   - `MONGO_URI` (Atlas SRV example: `mongodb+srv://<user>:<password>@yaarfetch.2qdcf7z.mongodb.net/?appName=YaarFetch`)
   - `MONGO_DB_NAME`
   - `JWT_SECRET`
   - `ALLOWED_ORIGINS` (e.g., `http://localhost:5173` for dev, your frontend URL in prod)
   - `JWT_ALGORITHM` (default `HS256`)
   - `ACCESS_TOKEN_EXPIRE_MINUTES` (default `1440`)
2) Install deps:
   ```bash
   python -m pip install -r requirements.txt
   ```
3) Run API:
   ```bash
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
4) Docs: http://localhost:8000/docs

## Frontend (Vite + React + Tailwind)
1) In `frontend/`, copy `env.example` to `.env` or set `VITE_API_BASE`:
   ```bash
   cd frontend
   npm install
   npm run dev -- --host --port 5173
   ```
2) Open the URL Vite prints (usually http://localhost:5173).

## Deploy on Railway
- Uses `Procfile`, `runtime.txt`, `requirements.txt`.
- Set the same env vars in Railway (see `DEPLOYMENT.md` for steps).
- Point frontend `VITE_API_BASE` to the deployed backend URL.

