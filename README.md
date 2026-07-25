# MyIqtisod — AI-Powered Personal Finance Platform (MVP)

An MVP personal finance web app: track income & expenses, see a live dashboard,
and ask an AI assistant questions about your own finances (grounded in your
real transaction data). Built for Uzbek, English, and Russian speakers.

This is a **lean, deployable MVP**, not the full "everything" spec — it covers
the core loop end-to-end (auth → add transactions → dashboard → AI assistant)
with clean, extensible code so you can add budgets/goals/reports UI next.

## Stack

- **Backend:** FastAPI, SQLAlchemy 2.0, PostgreSQL, JWT auth, Alembic migrations, Groq (Llama 3.3) for AI
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, next-intl (uz/en/ru), Zustand, Recharts

## What's included

- Email/password auth with email verification, password reset/change
- Expense CRUD with search/filter/sort/pagination
- Income CRUD, budgets, goals, categories (API only — full UI not yet built for these three)
- Dashboard: income/expenses/balance/savings, month-over-month change, financial health score, category breakdown chart
- AI financial assistant (Groq) that reads your real data before answering
- Market price assistant stub (general LLM knowledge, pluggable for a real data source later)
- PDF/Excel report export endpoints
- Dark/light mode, 3 languages, glassmorphism UI
- Dockerfiles for both services + docker-compose for local dev

## Not built yet (API exists, no page yet)

Income, budgets, goals, and reports have working backend endpoints
(`/api/v1/incomes`, `/api/v1/budgets`, `/api/v1/goals`, `/api/v1/reports/*`)
but no frontend pages yet — the fastest way to extend this app is to copy the
pattern in `frontend/src/app/[locale]/expenses/page.tsx` for each of them.

## Local development

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in SECRET_KEY, DATABASE_URL, GROQ_API_KEY
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/api/docs

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

### 3. Or run everything with Docker

```bash
cp backend/.env.example backend/.env   # fill in real values first
docker compose up --build
```

## Running tests

```bash
cd backend
pytest
```

Tests run against an in-memory SQLite database, so no live Postgres is needed.

## Deployment (matches the original brief: Vercel + Render + Supabase)

1. **Database — Supabase**
   Create a Supabase project, copy the Postgres connection string into
   `DATABASE_URL`. Run `alembic upgrade head` once against it (from your
   machine or a one-off Render job) to create the schema.

2. **Backend — Render**
   - New Web Service → point at `/backend` → Docker runtime (uses the included Dockerfile)
   - Set all variables from `backend/.env.example` in Render's dashboard
   - `ALLOWED_ORIGINS` must include your Vercel frontend URL

3. **Frontend — Vercel**
   - Import the repo, set root directory to `/frontend`
   - Set `NEXT_PUBLIC_API_URL` to your Render backend URL + `/api/v1`

4. **AI Assistant — Groq**
   - Get a key at https://console.groq.com and set `GROQ_API_KEY` on the backend.
   - ⚠️ Never commit a real API key to the repo — only put it in Render's
     environment variable settings / your local `.env` (gitignored).

## Folder structure

```
myiqtisod/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # one file per resource
│   │   ├── core/               # config, security (JWT, hashing)
│   │   ├── db/                 # engine/session, portable UUID type
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── services/           # AI assistant, market price, email, scoring
│   ├── alembic/                # migrations
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/[locale]/       # all pages, locale-prefixed
│       ├── components/         # shared UI (app shell, cards, theme)
│       ├── lib/                # API client, auth store
│       └── i18n/, messages/    # uz.json, en.json, ru.json
└── docker-compose.yml
```

## Security notes

- Passwords hashed with bcrypt; JWT access + refresh tokens
- CORS restricted to `ALLOWED_ORIGINS`
- Rate limiting via slowapi
- All financial resources are scoped to `current_user.id` — one user can never read another's data
- Pydantic validates every request body
