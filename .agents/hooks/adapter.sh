#!/usr/bin/env bash
# Antigravity hook adapter -> shared Kiro scripts in .kiro/hooks/scripts/.
#   adapter.sh post   (PostToolUse on write_to_file|replace_file_content|multi_replace_file_content)
#   adapter.sh pre    (PreToolUse on run_command)
# Contract: JSON on stdin (toolCall.name/args); always exit 0; PreToolUse prints {"decision": ...}.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
S="$ROOT/.kiro/hooks/scripts"
IN="$(timeout 2 cat 2>/dev/null)"

case "${1:-}" in
  post)
    FILE="$(jq -r '.toolCall.args.TargetFile // empty' <<<"$IN" 2>/dev/null)"
    [[ -n "$FILE" ]] && bash "$S/post-save.sh" "$FILE" </dev/null >/dev/null 2>&1
    echo '{}'
    ;;
  pre)
    CMD="$(jq -r '.toolCall.args.CommandLine // empty' <<<"$IN" 2>/dev/null)"
    # Destructive commands: hard deny (mirrors the Kiro agents' deny rules).
    if grep -Eq '(^|[;&|[:space:]])(rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f|rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*r|git[[:space:]]+push|docker[[:space:]]+volume[[:space:]]+rm|npm[[:space:]]+(un)?publish|eas(-cli[^[:space:]]*)?[[:space:]]+(submit|update))' <<<"$CMD" \
       || grep -Eq 'docker[[:space:]]+compose[[:space:]]+down.*[[:space:]]-v' <<<"$CMD"; then
      jq -nc --arg c "$CMD" '{decision:"deny", reason:("Blocked by project policy: " + $c + ". Ask the user to run it manually.")}'
      exit 0
    fi
    OUT="$(jq -nc --arg c "$CMD" '{tool_input:{command:$c}}' | bash "$S/pre-commit.sh" 2>&1)"
    if [[ $? -eq 2 ]]; then
      jq -nc --arg r "$OUT" '{decision:"deny", reason:$r}'
    else
      echo '{"decision":"allow"}'
    fi
    ;;
  *) echo '{}' ;;
esac
exit 0
