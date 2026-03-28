# Exploration: Какие переменные окружения нужно задать, чтобы заработали Telegram-нотификации при разработке через флоу

**Дата:** 2026-03-28
**Вопросов:** 2

---

## Q1: Какие переменные окружения нужно задать, чтобы начали работать Telegram-нотификации при разработке через флоу sp плагина?

Telegram-нотификации в sp плагине не используют переменные окружения. Вся конфигурация хранится в файле `.sp/notify.json` в директории проекта. Система работает по двухслойной схеме: скиллы записывают JSON-очередь в `.sp/notify-pending.json` через `lib/notify.sh`, а stop-hook `hooks/notify.sh` читает очередь и отправляет сообщение в Telegram Bot API при завершении сессии агента. Требуемый конфиг содержит три поля: `bot_token`, `chat_id` и `levels`.

**Key files:**

- `docs/notify.md:1-46` — полная инструкция настройки Telegram-нотификаций
- `hooks/notify.sh:22-29` — stop-hook читает bot_token и chat_id из .sp/notify.json
- `lib/notify.sh:26-29` — запись в очередь; `$CLAUDE_PROJECT_DIR` определяет путь к .sp/
- `hooks/hooks.json:1-16` — регистрация stop-hook

**Sources:**

- Файлы плагина sp: docs/notify.md, hooks/notify.sh, lib/notify.sh, hooks/hooks.json

---

## Q2: Какие переменные надо указать в локальном .env / env ключи, чтобы работали нотификации?

В sp нет .env-переменных для нотификаций. Из переменных окружения система читает только служебные для внутренних целей: `CLAUDE_PROJECT_DIR` (определяет путь к проекту, задаётся Claude Code автоматически с fallback на $PWD), `TMUX_PANE` (для определения tmux-сессии в теле уведомления) и `CLAUDE_PLUGIN_ROOT` (путь к плагину в инструкциях скиллов, задаётся автоматически). Токен бота и chat_id берутся исключительно из `.sp/notify.json`, а не из переменных окружения. В проекте нет .env-файлов или .local.md-файлов — единственное что требуется, это создать `.sp/notify.json` с bot_token и chat_id.

**Key files:**

- `lib/notify.sh:26` — `CLAUDE_PROJECT_DIR` с fallback на $PWD
- `lib/notify.sh:42-43` — `TMUX_PANE` для автоопределения tmux-сессии
- `hooks/notify.sh:23-24` — чтение bot_token и chat_id из .sp/notify.json, не из env
- `docs/notify.md:29-36` — пример конфига .sp/notify.json

**Sources:**

- Файлы плагина sp: lib/notify.sh, hooks/notify.sh, docs/notify.md

---

## Summary

Исследование подтвердило, что Telegram-нотификации в sp плагине полностью конфигурируются через файл `.sp/notify.json`, а не переменные окружения. Ключевые выводы: (1) не нужно создавать .env-файлы или переменные окружения для нотификаций; (2) требуется только создать `.sp/notify.json` с полями bot_token, chat_id и levels; (3) служебные переменные окружения (CLAUDE_PROJECT_DIR, TMUX_PANE, CLAUDE_PLUGIN_ROOT) задаются системой автоматически и не требуют ручной настройки; (4) файл `.sp/` должен быть в .gitignore для безопасности.
