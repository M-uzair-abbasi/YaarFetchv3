# YaarFetch Deployment (Railway + MongoDB Atlas)

## Prerequisites
- Railway account + CLI (`npm i -g @railway/cli`)
- MongoDB Atlas cluster (free tier is fine)
- Node.js 18+ and Python 3.11 locally

## Env Vars (set in Railway)
```
MONGO_URI=<Atlas SRV, e.g. mongodb+srv://user:pass@cluster.mongodb.net/?appName=YaarFetch>
MONGO_DB_NAME=yaarfetch
JWT_SECRET=<strong-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=<your frontend URL, e.g. https://your-frontend>
```

## MongoDB Atlas setup (once)
1) Create a DB user with read/write.
2) Network Access → add IP allowlist. For quick start: `0.0.0.0/0` (tighten later).
3) Copy the SRV connection string for Python driver and plug into `MONGO_URI`.

## Backend deploy on Railway (Dockerless)
1) `railway login`
2) In repo root: `railway init` (or `railway link` if project exists)
3) Railway will use:
   - `runtime.txt` → Python 3.11.6
   - `requirements.txt`
   - `Procfile` → `web: uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}`
4) In Railway dashboard, add env vars listed above.
5) Push to your repo; Railway builds and runs. Watch logs for:
   - “Uvicorn running on http://0.0.0.0:<port>”
   - No Mongo auth/connection errors.

## Frontend options
Option A: Separate host (recommended: Vercel/Netlify/Railway Static)
1) Set `VITE_API_BASE` to the Railway backend URL.
2) Build: `cd frontend && npm install && npm run build`.
3) Deploy `frontend/dist` as static assets on your chosen host.

Option B: Railway Static service
1) Create a Static service in Railway.
2) Publish directory: `frontend/dist`.
3) Build command: `npm install && npm run build`.
4) Set `VITE_API_BASE` env on the static service to the backend URL.

## Smoke test after deploy
1) `POST /auth/register` then `POST /auth/login` from the hosted frontend.
2) `POST /orders` to create a request.
3) `GET /orders` and update status to verify end-to-end.

## Local dev (reference)
- Backend: `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend && npm install && npm run dev -- --host --port 5173`
- `.env` files are ignored by git; copy from `env.example` and `frontend/env.example`.

