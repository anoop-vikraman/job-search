---
trigger: always_on
description: "Antigravity setup for this repo: source of truth, skills, hooks, run commands."
---

# Project setup (Antigravity)

Tweak — a local-services gig marketplace. Monorepo: `backend/` (FastAPI + Postgres), `mobile/` (Expo), `admin/` (React/Vite moderation panel), `packages/theme/` (shared `@tweak/theme` tokens). See `project-overview.md` (includes `.kiro/steering/project.md`) for domain objects and business rules.

- Source of truth for every rule is `.kiro/`. The other files in `.agents/rules/` include `.kiro/steering/*.md` and must not be edited directly. Never edit `.kiro/` unless asked.
- Personas: skills `backend-architect`, `admin-architect`, `mobile-architect` (`/backend-architect` etc., or "Adopt Skill: <name>"). Each skill's boundary is binding while it is active.

Hooks (`.agents/hooks.json`, sharing `.kiro/hooks/scripts/`):
- After each file write/edit, `backend/**/*.py` is ruff-fixed and formatted; `admin|mobile/**/*.ts(x)` is eslint-fixed. Expect reformatting.
- Before each `run_command`: `git commit` is blocked on mypy/tsc errors (fix them; never `--no-verify`); `rm -rf`, `git push`, `docker compose down -v`, `docker volume rm`, `npm publish` are denied.

Run/dev:

| Task | Command |
|---|---|
| Postgres | `docker compose up -d postgres` |
| Migrate | `cd backend && venv/bin/alembic upgrade head` |
| All apps | `npm run dev` (backend :8000, admin :5173, Metro :8081) |
| One app | `npm run dev:backend` · `npm run dev:admin` · `npm run dev:mobile` |
| Health | `curl localhost:8000/health` |
| Lint | `npm run lint --workspace=admin` · `npm run lint --workspace=mobile` · `cd backend && venv/bin/ruff check .` |

Full setup: `README.md`.
