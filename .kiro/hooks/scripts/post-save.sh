#!/usr/bin/env bash
# PostFileSave: lint/format the saved file.
#   backend/**/*.py            -> ruff check --fix, ruff format
#   admin|mobile/**/*.ts(x)    -> eslint --fix
# File path: $1 ({{filePath}}) if valid, else parsed from stdin JSON.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
# Never block on stdin: skip on a TTY, cap the read otherwise.
PAYLOAD=""
[[ -t 0 ]] || PAYLOAD="$(timeout 2 cat 2>/dev/null || true)"

FILE="${1:-}"
if [[ ! -f "$FILE" && -n "$PAYLOAD" ]] && command -v jq >/dev/null; then
  FILE="$(jq -r '.file_path // .filePath // .path //
    ([.. | strings | select(test("\\.(py|tsx?)$"))][0]) // empty' <<<"$PAYLOAD" 2>/dev/null)"
fi
[[ -z "$FILE" ]] && { echo "post-save: no file path received" >&2; exit 1; }

[[ "$FILE" = /* ]] || FILE="$ROOT/$FILE"
[[ -f "$FILE" ]] || exit 0
REL="$(realpath --relative-to="$ROOT" "$FILE")"
[[ "$REL" == */node_modules/* ]] && exit 0

find_bin() { # find_bin <name> <dir...>: local venv/node_modules first, then PATH
  local name="$1"; shift
  for d in "$@"; do [[ -x "$d/$name" ]] && { echo "$d/$name"; return; }; done
  command -v "$name" 2>/dev/null
}

case "$REL" in
  backend/*.py)
    RUFF="$(find_bin ruff "$ROOT/backend/.venv/bin" "$ROOT/backend/venv/bin")"
    [[ -z "$RUFF" ]] && { echo "post-save: ruff not installed, skipped $REL" >&2; exit 1; }
    cd "$ROOT/backend" || exit 1
    # F401 unfixable: multi-step edits add an import before the code that uses it.
    "$RUFF" check --fix --unfixable F401 "$FILE"
    "$RUFF" format "$FILE"
    ;;
  admin/*.ts|admin/*.tsx|mobile/*.ts|mobile/*.tsx)
    PKG="${REL%%/*}"
    # Repo installs only (workspace first, then hoisted root); never a global eslint.
    ESLINT=""
    for c in "$ROOT/$PKG/node_modules/.bin/eslint" "$ROOT/node_modules/.bin/eslint"; do
      [[ -x "$c" ]] && { ESLINT="$c"; break; }
    done
    [[ -z "$ESLINT" ]] && { echo "post-save: eslint not installed in $PKG/, skipped $REL" >&2; exit 1; }
    cd "$ROOT/$PKG" || exit 1
    "$ESLINT" --fix "$FILE"
    ;;
esac
