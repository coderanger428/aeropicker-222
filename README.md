# AeroPicker

User application for tailoring a master resume to a job, then answering application-form questions. The React UI calls one API module. `VITE_API_MODE=http` uses the Python API and MongoDB. `VITE_API_MODE=mock` keeps the older in-browser store.

Demo account: `demo@aeropicker.dev` / `demo`

A profile can open the job form after a Full Stack Engineer PDF is uploaded. Analyze reads that PDF and stores the resume JSON. Until the PDF is uploaded, Apply opens the resume slots.

## UI

```powershell
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 on this computer. Another machine on the same network should use the Ethernet address printed as Network when the dev server starts, currently http://172.20.2.48:5173. Skip the VPN and virtual-adapter addresses.

To reset the mock, clear the `aeropicker.mock.v1` entry in browser local storage.

## API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Point the UI at it with `frontend/.env.local`:

```
VITE_API_MODE=http
VITE_API_URL=http://127.0.0.1:8000/api
```

MongoDB listens on `mongodb://127.0.0.1:27017`. The database name is `aeropicker` (override with `MONGODB_URI` and `MONGODB_DB` in `backend/.env`). Accounts, profiles, master resumes, applications, sessions, prompts, and API keys are separate collections. Each write updates one document. A master resume document keeps the original PDF for download and a JSON document as the resume content. The first launch creates `demo@aeropicker.dev` / `demo` and `admin@aeropicker.dev` / `admin`.

## Admin

Open http://127.0.0.1:5173/admin/login on this computer, or the same Network address with `/admin/login` from another machine on the LAN.

Demo admin: `admin@aeropicker.dev` / `admin`

The admin app manages users (including a delete mark), searches across every account, shows application counts by user for each day or week, and lists every application. The profile filter on that tracker stays disabled until a user is selected. AI settings cover API keys, token usage, and the five prompts: master resume parser, JD analyzer, tailor resume generator, cover letter generator, and QA session.
