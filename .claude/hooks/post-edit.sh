#!/usr/bin/env bash
# Claude PostToolUse adapter: pass tool_input.file_path to the shared Kiro script.
FILE="$(timeout 2 cat | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[[ -z "$FILE" ]] && exit 0
bash "$CLAUDE_PROJECT_DIR/.kiro/hooks/scripts/post-save.sh" "$FILE" </dev/null
