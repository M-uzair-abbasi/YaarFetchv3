# YaarFetch Deployment (Railway + MongoDB Atlas)

## Prerequisites
- Railway account with CLI installed (`npm i -g @railway/cli`)
- MongoDB Atlas cluster + SRV connection string
- Node.js 18+ and Python 3.11 locally for builds

## Environment Variables
Set these in Railway (or a local `.env`):

```
MONGO_URI=<your MongoDB Atlas connection string>
MONGO_DB_NAME=yaarfetch
JWT_SECRET=<strong-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
# CORS: keep "*" for dev, set to frontend URL for production
ALLOWED_ORIGINS=https://your-frontend-domain
```

## Deploy Steps
1) **Create project & link repo**
   - `railway login`
   - `railway init` (or `railway link` if project already exists)

2) **Configure service**
   - Deploy as a Dockerless Python service; Railway will use `Procfile`.
   - Set Python version via `runtime.txt` (3.11.6).
   - Add the environment variables above in the Railway dashboard.

3) **MongoDB Atlas**
   - In Atlas, add a database user with read/write and whitelist `0.0.0.0/0` (or the Railway outbound IPs).
   - Copy the SRV URI (`mongodb+srv://...`) into `MONGO_URI`.

4) **Deploy backend**
   - Push to the connected repo; Railway will build using `requirements.txt` and run:
     ```
     web: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - Confirm logs show `INFO: Uvicorn running on http://0.0.0.0:<port>`.

5) **Deploy frontend (Vite)**
   - Option A: Host separately (e.g., Railway static service, Vercel, Netlify).
   - Build locally: `cd frontend && npm install && npm run build`.
   - Serve `frontend/dist` as static assets; set `VITE_API_BASE` to the backend URL.
   - For Railway static service: point to `frontend/dist` as the publish directory.

6) **Test**
   - Hit `GET /orders` with an `Authorization: Bearer <token>` header.
   - Verify CORS by calling APIs from the hosted frontend domain.

## Local Development
- Backend: `uvicorn backend.app.main:app --reload`
- Frontend: `cd frontend && npm install && npm run dev`
- Use a `.env` file at project root or export vars before running.

