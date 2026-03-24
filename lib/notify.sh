#!/usr/bin/env bash
# notify.sh — write a notification JSON atomically to .sp/notify-pending.json
# Usage: notify.sh --type TYPE --skill SKILL --phase PHASE --slug SLUG --title TITLE --body BODY

# --- Parse arguments ---
TYPE=""
SKILL=""
PHASE=""
SLUG=""
TITLE=""
BODY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --type)  TYPE="$2";  shift 2 ;;
    --skill) SKILL="$2"; shift 2 ;;
    --phase) PHASE="$2"; shift 2 ;;
    --slug)  SLUG="$2";  shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --body)  BODY="$2";  shift 2 ;;
    *) shift ;;
  esac
done

# --- Project directory ---
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"

# --- jq is required (hooks/notify.sh also requires it) ---
command -v jq >/dev/null 2>&1 || exit 0

# --- Auto-detect project_name ---
PROJECT_NAME=""
if [ -f "$PROJECT_DIR/package.json" ]; then
  PROJECT_NAME=$(jq -r '.name // empty' "$PROJECT_DIR/package.json" 2>/dev/null) || true
fi
if [ -z "$PROJECT_NAME" ]; then
  PROJECT_NAME=$(basename "$PROJECT_DIR") || true
fi

# --- Auto-detect tmux session ---
TMUX_SESSION=""
if [ -n "$TMUX_PANE" ]; then
  TMUX_SESSION=$(tmux display-message -p '#S:#W' 2>/dev/null) || true
fi

# --- Timestamp ---
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null) || true

# --- Ensure output directory ---
mkdir -p "$PROJECT_DIR/.sp" || exit 0

# --- Build JSON via jq ---
JSON=$(jq -n \
  --arg type "$TYPE" \
  --arg skill "$SKILL" \
  --arg phase "$PHASE" \
  --arg slug "$SLUG" \
  --arg title "$TITLE" \
  --arg body "$BODY" \
  --arg project_name "$PROJECT_NAME" \
  --arg tmux_session "$TMUX_SESSION" \
  --arg timestamp "$TIMESTAMP" \
  '{type:$type,skill:$skill,phase:$phase,slug:$slug,title:$title,body:$body,project_name:$project_name,tmux_session:$tmux_session,timestamp:$timestamp}' \
) || exit 0

# --- Atomic write via tmp + mv ---
TMP=$(mktemp "$PROJECT_DIR/.sp/notify-pending.XXXXXX") || exit 0
printf '%s\n' "$JSON" > "$TMP" || { rm -f "$TMP"; exit 0; }
mv "$TMP" "$PROJECT_DIR/.sp/notify-pending.json" || { rm -f "$TMP"; exit 0; }
