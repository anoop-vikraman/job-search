---
inclusion: always
---

# Dev Efficiency (Strict)

## 1. Tests: only for critical logic
Default: no tests, mocks, fixtures or test config unless the user asks.

**Exception, tests are mandatory** when creating or changing code in these areas:

| Area | Location | Must cover |
|---|---|---|
| Wallet / escrow ledger | `backend/app/services/` | hold on accept, release on completion, refund on cancel; balance never goes negative; ledger is append-only and sums to balance |
| Refund policy | `backend/app/services/` | eligible vs ineligible states, partial vs full, reversing transaction recorded, idempotent on retry |
| Application flow | `backend/app/services/` | cannot apply to own tweak, one active application per (tweak, provider), accept/reject/counter-quote transitions, re-apply replaces prior |
| Refresh token rotation | `backend/app/core/security*`, auth services | rotation revokes old token, reuse of revoked token revokes family, expiry |
| RBAC & tweak access | `get_current_user`, `require_role`, `verify_tweak_access` | each role allowed/denied, banned user, owner vs accepted-applicant vs stranger |
| Ratings | `backend/app/services/` | only after completion, once per side, bounds 1–5, aggregate recomputed |
| Mobile create-tweak persistence | `mobile/` create store | wizard writes persist and rehydrate across reload; "Save Draft" writes a real draft |

Rules for these tests:
- Unit-level, focused on the logic; no snapshot or UI tests.
- Backend: `pytest` + `pytest-asyncio` in `backend/tests/`, mirroring the module path. DB tests run
  against `tweak_postgres` in a rolled-back transaction, not mocks.
- Frontends: Vitest (admin), `jest-expo` (mobile), next to the file as `*.test.ts`. Mock native
  storage with an in-memory store.
- Run only the tests for the changed module (`pytest tests/services/test_wallet.py -q`,
  `npx vitest run <file>`).
- Install the framework (pinned) the first time it's needed; that install is allowed without asking.

## 2. No production builds during routine work
- Banned unless asked: `npm run build`, `vite build`, `expo export`, `eas build`, `expo run:*`,
  `expo prebuild`, `docker compose build`.
- Verify with fast checks scoped to the changed app only:

| App | Check |
|---|---|
| backend | `venv/bin/ruff check <files>`, `venv/bin/mypy app` |
| admin | `npx tsc -b`, `npx eslint <files>` |
| mobile | `npx tsc --noEmit`, `npx eslint <files>` |

- Do not start dev servers to verify a change unless the change concerns runtime behaviour
  (routing, startup, CORS, DB connectivity).

## 3. Surgical edits only
- Edit with targeted replacements of the changed lines. Never rewrite a whole existing file for a
  minor change.
- Full-file writes only for new files or when more than about half the file changes.
- Read only the relevant range of large files, not the whole file.
- Don't reformat, reorder or "clean up" code outside the change.

## 4. Quiet output
- Pipe noisy commands: `| tail -n 20`, `-q`/`--quiet`/`--silent`, `--reporter=dot`,
  `2>&1 | grep -E 'error|warn'`.
- Non-interactive flags always (`--yes`, `CI=1`) so commands never hang on prompts.
- Never print full install logs, lockfiles, `node_modules` listings or full dependency trees.
- Response style: no pleasantries or narration; see `output-style.md`.
