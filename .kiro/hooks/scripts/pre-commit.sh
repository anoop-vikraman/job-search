#!/usr/bin/env bash
# PreToolUse (execute_bash): gate `git commit` on type checks.
#   mypy backend/app ; tsc (admin, mobile)
# Exit 2 = block commit (stderr forwarded to agent). Exit 0 = allow.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# Never block on stdin: skip on a TTY, cap the read otherwise.
PAYLOAD=""
[[ -t 0 ]] || PAYLOAD="$(timeout 2 cat 2>/dev/null || true)"

CMD=""
command -v jq >/dev/null && CMD="$(jq -r '.tool_input.command // empty' <<<"$PAYLOAD" 2>/dev/null)"
[[ -z "$CMD" ]] && CMD="$PAYLOAD"

# Only act on git commit
grep -Eq '(^|[^[:alnum:]_-])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+commit([^[:alnum:]_-]|$)' <<<"$CMD" || exit 0

FAILED=0
LOG="$(mktemp)"
trap 'rm -f "$LOG"' EXIT

run() { # run <label> <dir> <cmd...>
  local label="$1" dir="$2"; shift 2
  if ! (cd "$dir" && "$@") >"$LOG" 2>&1; then
    FAILED=1
    { echo "✗ $label"; cat "$LOG"; echo; } >&2
  fi
}

# Backend: mypy
if [[ -d "$ROOT/backend/app" ]]; then
  MYPY=""
  for c in "$ROOT/backend/.venv/bin/mypy" "$ROOT/backend/venv/bin/mypy"; do
    [[ -x "$c" ]] && { MYPY="$c"; break; }
  done
  [[ -z "$MYPY" ]] && MYPY="$(command -v mypy 2>/dev/null || true)"
  if [[ -n "$MYPY" ]]; then
    # Run from backend/ so pyproject.toml [tool.mypy] (strict) applies.
    run "mypy backend/app" "$ROOT/backend" "$MYPY" app
  else
    echo "pre-commit: mypy not installed, skipped backend check"
  fi
fi

# Frontends: tsc --noEmit
for PKG in admin mobile; do
  [[ -f "$ROOT/$PKG/tsconfig.json" ]] || continue
  TSC=""
  for c in "$ROOT/$PKG/node_modules/.bin/tsc" "$ROOT/node_modules/.bin/tsc"; do
    [[ -x "$c" ]] && { TSC="$c"; break; }
  done
  if [[ -z "$TSC" ]]; then
    echo "pre-commit: typescript not installed in $PKG/, skipped"
    continue
  fi
  if [[ "$PKG" == "admin" ]]; then
    # admin/tsconfig.json is a solution file (files: [], references); build mode
    # type-checks referenced projects, which already set noEmit: true.
    run "tsc ($PKG)" "$ROOT/$PKG" "$TSC" -b
  else
    run "tsc --noEmit ($PKG)" "$ROOT/$PKG" "$TSC" --noEmit
  fi
done

if [[ "$FAILED" -ne 0 ]]; then
  echo "Commit blocked: type errors found. Fix them before committing." >&2
  exit 2
fi
exit 0
