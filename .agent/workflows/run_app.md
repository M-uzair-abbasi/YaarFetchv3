---
description: Start the YaarFetch application (Backend + Frontend)
---

To run the application, you will need two separate terminal windows.

### 1. Start the Backend
In your first terminal (ensure virtual environment is active):
```powershell
# Activate venv if not already active
# .\venv\Scripts\Activate

# Run FastAPI server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
// turbo

### 2. Start the Frontend
In a **second** terminal window:
```powershell
cd frontend
npm run dev
```
