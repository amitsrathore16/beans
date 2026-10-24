# Grounded

A mobile-first coffee companion for tracking home brews, café tastings, and bean inventory. Log every cup, monitor bean freshness, and watch your stock update in real time as you brew.

**Stack:** React 19 + Vite + TypeScript · FastAPI (Python 3.9+) · Supabase (PostgreSQL + Auth + Realtime + Storage)

---

## Features

- **Home brews** — structured coffee identity (roaster, origin, species, process, roast date), brew method → equipment cascade, dose/ratio/yield with extraction indicator, SCA sensory profile; edit, delete, or "brew again" any entry
- **Café tastings** — record café visits with ratings, sensory notes, and would-return flag
- **Bean inventory** — track bag weight, roast date, and freshness; a matching bean's stock is deducted (with confirmation) after each brew, plus manual decrease-only adjustments and a per-bean deduction/adjustment history
- **Profiles** — username, display name, avatar, bio, experience level, favourite methods/origins/roasts, brewing setup, social links, and brew stats; public or private, viewable at `/u/<username>`. Users without a profile (including accounts created before profiles existed) complete a one-time setup on next login
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
SUPABASE_JWT_ALG=ES256
ENVIRONMENT=development
```

> `SUPABASE_JWT_ALG` **must match** how your Supabase project signs user tokens, or every
> authenticated request 401s. Local `supabase start` (and new cloud projects) use asymmetric
> signing keys → `ES256`; legacy projects using the shared JWT secret → `HS256`. Check with
> `curl http://127.0.0.1:54321/auth/v1/.well-known/jwks.json` — `ES256` keys means `ES256`.

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
│       ├── hooks/          # useLogs, useBeans, useBeansRealtime, useProfile
│       ├── lib/            # supabaseClient, apiClient
│       ├── pages/          # Home, Login, Register, Profile, ProfileEdit
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
