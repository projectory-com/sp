#!/usr/bin/env bash
# notify.sh — Stop hook: deliver pending notification to Telegram
# Reads stdin (hook JSON), finds .sp/notify-pending.json, sends via Bot API.
# Always exits 0. Never writes to stdout (would block Stop).

# --- Drain stdin so the hook doesn't block ---
cat > /dev/null

# --- Project directory (Stop hook runs in project dir, see DD-3) ---
PROJECT_DIR="$PWD"

# --- Paths ---
PENDING="$PROJECT_DIR/.sp/notify-pending.json"
CONFIG="$PROJECT_DIR/.sp/notify.json"

# --- Graceful checks: no file / no tool → silent exit ---
[[ -f "$PENDING" ]] || exit 0
[[ -f "$CONFIG" ]]   || exit 0
command -v curl &>/dev/null || exit 0
command -v jq &>/dev/null   || exit 0

# --- Read config ---
BOT_TOKEN=$(jq -r '.bot_token // ""' "$CONFIG") || exit 0
CHAT_ID=$(jq -r '.chat_id // ""' "$CONFIG")     || exit 0
LEVELS=$(jq -r '.levels // "" | if type == "array" then join(",") else . end' "$CONFIG") || exit 0

# Empty credentials → nothing to do
[[ -n "$BOT_TOKEN" ]] || exit 0
[[ -n "$CHAT_ID" ]]   || exit 0

# --- Read pending notification ---
EVENT_TYPE=$(jq -r '.type // ""' "$PENDING")         || exit 0
SKILL=$(jq -r '.skill // ""' "$PENDING")             || exit 0
PHASE=$(jq -r '.phase // ""' "$PENDING")             || exit 0
TITLE=$(jq -r '.title // ""' "$PENDING")             || exit 0
BODY=$(jq -r '.body // ""' "$PENDING")               || exit 0
PROJECT_NAME=$(jq -r '.project_name // ""' "$PENDING") || exit 0
TMUX_SESSION=$(jq -r '.tmux_session // ""' "$PENDING") || exit 0

# --- Filter by levels ---
if [[ -n "$LEVELS" ]]; then
  [[ ",$LEVELS," == *",$EVENT_TYPE,"* ]] || { rm -f "$PENDING"; exit 0; }
fi

# --- Emoji by type (DD-7) ---
case "$EVENT_TYPE" in
  ACTION_REQUIRED) EMOJI="⏸" ;;
  STAGE_COMPLETE)  EMOJI="✅" ;;
  ALERT)           EMOJI="⚠️" ;;
  *)               EMOJI="🔔" ;;
esac

# --- HTML-escape dynamic content for Telegram parse_mode=HTML ---
_html() {
  local s="$1"
  s=${s//&/&amp;}
  s=${s//</&lt;}
  s=${s//>/&gt;}
  printf '%s' "$s"
}

# --- Format HTML message ---
MSG="${EMOJI} <b>$(_html "$EVENT_TYPE")</b>"

# Project / skill / phase line
META=""
[[ -n "$PROJECT_NAME" ]] && META="$(_html "$PROJECT_NAME")"
[[ -n "$SKILL" ]] && META="${META:+$META / }$(_html "$SKILL")"
[[ -n "$PHASE" ]] && META="${META:+$META / }$(_html "$PHASE")"
[[ -n "$META" ]] && MSG="${MSG}\n${META}"

# Title
[[ -n "$TITLE" ]] && MSG="${MSG}\n\n$(_html "$TITLE")"

# Body
[[ -n "$BODY" ]] && MSG="${MSG}\n$(_html "$BODY")"

# tmux session
[[ -n "$TMUX_SESSION" ]] && MSG="${MSG}\n\n<i>tmux: $(_html "$TMUX_SESSION")</i>"

# --- Build JSON payload via jq (DD-4) ---
PAYLOAD=$(jq -n \
  --arg chat_id "$CHAT_ID" \
  --arg text "$(printf '%b' "$MSG")" \
  '{chat_id: $chat_id, parse_mode: "HTML", text: $text}') || { rm -f "$PENDING"; exit 0; }

# --- Send to Telegram Bot API ---
curl -s --max-time 8 \
  -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >/dev/null 2>&1 || true

# --- Cleanup ---
rm -f "$PENDING"
exit 0
