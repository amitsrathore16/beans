# Grounded

A mobile-first coffee companion for tracking home brews, café tastings, and bean inventory. Log every cup, monitor bean freshness, and watch your stock update in real time as you brew.

**Stack:** React 18 + Vite + TypeScript · FastAPI (Python 3.12) · Supabase (PostgreSQL + Auth + Realtime)

---

## Features

- **Home brews** — structured coffee identity (roaster, origin, species, process, roast date), brew method → equipment cascade, dose/ratio/yield with extraction indicator, SCA sensory profile
- **Café tastings** — record café visits with ratings, sensory notes, and would-return flag
- **Bean inventory** — track bag weight, roast date, and freshness; weight deducts automatically after each brew
- **Real-time sync** — inventory updates across tabs via Supabase Realtime

---

## Local setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Docker Desktop (required by Supabase CLI)

---

### 1. Clone and install

```bash
git clone <repo-url>
cd beans
```

### 2. Start Supabase locally

```bash
supabase start
```

Once running, note the output values — you'll need `API URL`, `anon key`, `service_role key`, and `JWT secret`.

Apply migrations:

```bash
supabase db reset
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Start the dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. Backend (FastAPI)

```bash
cd grounded-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `grounded-api/.env`:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
SUPABASE_JWT_SECRET=<JWT secret from supabase start>
ENVIRONMENT=development
```

Start the API (from inside `grounded-api/`):

```bash
uvicorn main:app --reload
```

API runs at `http://localhost:8000`. Health check: `GET http://localhost:8000/health`.

### 5. Run backend tests

```bash
# from inside grounded-api/ with the venv active
pytest tests/ -v
```

---

## Project structure

```
beans/
├── frontend/               # React + Vite app
│   └── src/
│       ├── components/     # LogCard, BeanCard, NewLogForm, NewBeanForm, …
│       ├── contexts/       # AuthContext
│       ├── hooks/          # useLogs, useBeans, useBeansRealtime
│       ├── lib/            # supabaseClient, apiClient
│       ├── pages/          # Home, Login, Register
│       └── utils/          # migration (localStorage → Supabase)
├── grounded-api/           # FastAPI backend
│   ├── routers/            # logs.py, inventory.py
│   ├── main.py
│   ├── dependencies.py     # JWT validation
│   ├── models.py
│   ├── database.py
│   └── tests/
└── supabase/
    └── migrations/         # SQL migration files
```
