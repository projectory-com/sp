# Telegram notifications

Two-layer notification system: skills write JSON to a queue; a stop hook sends the accumulated messages to Telegram.
Without env vars, the system skips notifications.

---

## Setup

### 1. Create a bot

- Open [@BotFather](https://t.me/BotFather) in Telegram
- Send `/newbot` and follow the prompts
- Save the resulting token (format `123456789:ABC...`)

### 2. Get the chat_id

- Send any message to your bot
- Call the API:
  ```bash
  curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | jq '.result[0].message.chat.id'
  ```
- Save the resulting `chat_id`

### 3. Set environment variables

Add to `~/.zshrc` (or `~/.bashrc`):

```bash
export CC_TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
export CC_TELEGRAM_CHAT_ID="YOUR_CHAT_ID"
```

Then reload the shell: `source ~/.zshrc`

The variables are forwarded to the hook via `allowedEnvVars` in `hooks/hooks.json`.

---

## Notification types

| Type            | Marker | When it fires                              |
| --------------- | ------ | ------------------------------------------ |
| ACTION_REQUIRED | ⏸      | Before questions that require an answer    |
| STAGE_COMPLETE  | ✅     | Task, plan, PR, or other artifact is ready |
| ALERT           | ⚠️     | Block, scope guard, critical situation     |

All three types are always on.

---

## Notification point map

| Skill | Phase      | Type            | Description                  |
| ----- | ---------- | --------------- | ---------------------------- |
| task  | Synthesize | ACTION_REQUIRED | Clarifying questions         |
| task  | Complete   | STAGE_COMPLETE  | Task file ready              |
| plan  | Design     | ACTION_REQUIRED | Implementation questions     |
| plan  | Complete   | STAGE_COMPLETE  | Plan ready                   |
| do    | Execute    | ALERT           | Task blocked                 |
| do    | Complete   | STAGE_COMPLETE  | Implementation complete      |
| fix   | Decide     | ALERT           | Large fix (scope guard)      |
| fix   | Decide     | ACTION_REQUIRED | Clarification required       |
| fix   | Complete   | STAGE_COMPLETE  | Fix complete                 |
| pr    | Decide     | ACTION_REQUIRED | Choose PR type (draft/ready) |
| pr    | Complete   | STAGE_COMPLETE  | PR created or updated        |

---

## Testing

Call notify.sh directly and inspect the queue:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh \
  --type STAGE_COMPLETE \
  --skill task \
  --phase Complete \
  --slug test \
  --title "Test" \
  --body "test body"
```

Then check the queue file contents:

```bash
cat .sp/notify-pending.json
```

The file should contain a JSON object with a single notification entry. The stop hook (`hooks/notify.sh`) will pick it up when the session ends and send it to Telegram.

---

## Dependencies

- **jq** — for JSON handling (required by both scripts)
- **curl** — for HTTP requests to the Telegram Bot API (required by the stop hook)

If jq or curl is missing, the scripts exit 0.

---

## Troubleshooting

| Problem                        | Check                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notifications don't arrive     | Verify `CC_TELEGRAM_BOT_TOKEN` and `CC_TELEGRAM_CHAT_ID` are set: `echo $CC_TELEGRAM_BOT_TOKEN`                                                     |
| curl not found                 | Install curl: `sudo apt install curl` / `brew install curl`                                                                                         |
| jq not found                   | Install jq: `sudo apt install jq` / `brew install jq`                                                                                               |
| 401 from Telegram              | Bad bot token — recreate it via @BotFather                                                                                                          |
| 400 (chat not found)           | Bad chat_id — message the bot and rerun getUpdates                                                                                                  |
| Queue isn't draining           | Confirm `hooks/notify.sh` is registered as a stop hook in `hooks/hooks.json`                                                                        |
| Telegram unreachable / timeout | curl waits up to 8 seconds (hook timeout 10s). On failure `notify-pending.json` is removed; no retry. Delete manually: `rm .sp/notify-pending.json` |
