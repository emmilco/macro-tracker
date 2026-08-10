# macro-tracker — project index

Personal macro-tracking web app. React + TypeScript + Vite frontend built
into `dist/`, FastAPI + sqlite backend serving both the API and the built
frontend from one process. Deployed as the lab-server app `macro`
(`macro.emmilco.com`; Unix socket, gateway-authenticated — no in-app auth).

## Layout

| Path | Purpose |
|------|---------|
| `backend/server.py` | FastAPI app: JSON API + `/healthz` + static mount of `dist/` at `/` (healthz and API routes are defined before the mount — the root mount swallows anything registered after it). |
| `backend/init_db.py` | Schema bootstrap for `backend/data/macro.db`. |
| `backend/data/` | sqlite database (gitignored). |
| `src/` | React/TS source (`App.tsx`, `api.ts`, `types.ts`, CSS modules). |
| `dist/` | Vite build output — content-hashed bundles (cache-busting comes from the build; do not hand-version assets). Untracked: built locally, and the server serves whatever build is present. |
| `public/` | Static assets copied into the build (icons). |
| `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json` | Vite/TS project files. |
| `database/`, `netlify.toml`, `deploy.sh` | Legacy remnants of the pre-2026-05 Supabase/Netlify deployment (see README's architecture-history note). |

## Conventions

- Frontend changes require `npm run build` (the server serves `dist/`,
  not `src/`).
- Data model: food edits never rewrite history — past `food_entries`
  snapshot macros at log time (see README Features).
- Lab-app conventions (icons, healthz, restart-safety) per
  `lab-server/APP_GUIDE.md`.
