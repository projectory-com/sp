# Create plugins

> Источник: https://code.claude.com/docs/en/plugins

## Когда использовать плагины vs standalone

| Подход                                     | Имена скиллов        | Для чего                             |
| ------------------------------------------ | -------------------- | ------------------------------------ |
| **Standalone** (`.claude/`)                | `/hello`             | Личные workflow, эксперименты        |
| **Plugins** (`.claude-plugin/plugin.json`) | `/plugin-name:hello` | Шеринг, дистрибуция, версионирование |

## Структура плагина

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # манифест (обязательный)
├── commands/                # slash-команды (.md)
├── agents/                  # определения агентов (.md)
├── skills/                  # скиллы (SKILL.md в поддиректориях)
├── hooks/                   # обработчики событий (hooks.json)
├── .mcp.json                # MCP серверы
├── .lsp.json                # LSP серверы
└── settings.json            # настройки по умолчанию
```

**Важно**: `commands/`, `agents/`, `skills/`, `hooks/` — на уровне корня плагина, НЕ внутри `.claude-plugin/`.

## Plugin Manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "description": "Описание плагина",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

| Поле          | Назначение                                                        |
| ------------- | ----------------------------------------------------------------- |
| `name`        | Уникальный идентификатор и namespace скиллов (`/my-plugin:hello`) |
| `description` | Отображается в plugin manager                                     |
| `version`     | Семантическое версионирование                                     |
| `author`      | Опционально. Автор плагина                                        |

Дополнительные поля: `homepage`, `repository`, `license`, `keywords`.

## Skills (скиллы)

Скиллы — model-invoked: Claude активирует их автоматически по контексту задачи.

```
skills/
└── code-review/
    └── SKILL.md
```

Формат `SKILL.md`:

```yaml
---
name: code-review
description: Reviews code for best practices and potential issues
---
Инструкции для скилла...
```

## Commands (команды)

Команды — user-invoked: вызываются явно через `/plugin-name:command-name`.

```
commands/
└── hello.md
```

Формат `.md`:

```yaml
---
name: hello
description: Приветственное сообщение
---
Инструкции для команды...
```

### Аргументы

`$ARGUMENTS` — плейсхолдер для текста после имени команды:

```markdown
Greet the user named "$ARGUMENTS" warmly.
```

```
/my-plugin:hello Alex
```

## Agents (агенты)

```
agents/
└── code-reviewer.md
```

```yaml
---
description: Agent role and expertise
capabilities:
  - Specific task 1
  - Specific task 2
---
Detailed agent instructions...
```

## Hooks (хуки)

Файл `hooks/hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npm run lint:fix"
          }
        ]
      }
    ]
  }
}
```

События: `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreCompact`, `Notification`.

## MCP серверы

Файл `.mcp.json` в корне плагина:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/server.js"],
      "env": { "API_KEY": "${API_KEY}" }
    }
  }
}
```

## LSP серверы

Файл `.lsp.json` в корне плагина:

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": { ".go": "go" }
  }
}
```

## settings.json

Настройки по умолчанию при включении плагина. Поддерживается ключ `agent`:

```json
{
  "agent": "security-reviewer"
}
```

## Тестирование

```bash
# Загрузить плагин из локальной директории
claude --plugin-dir ./my-plugin

# Несколько плагинов
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two
```

Проверки:

- Скиллы: `/plugin-name:skill-name`
- Агенты: `/agents`
- Хуки: триггерить события

## Валидация

```bash
claude plugin validate .
```

Или из Claude Code:

```
/plugin validate .
```

## Миграция из standalone

```bash
mkdir -p my-plugin/.claude-plugin
cp -r .claude/commands my-plugin/
cp -r .claude/agents my-plugin/
cp -r .claude/skills my-plugin/
```

Хуки: скопировать объект `hooks` из `.claude/settings.json` в `my-plugin/hooks/hooks.json`.

| Standalone (`.claude/`) | Plugin                    |
| ----------------------- | ------------------------- |
| Только в одном проекте  | Шеринг через маркетплейсы |
| `.claude/commands/`     | `plugin-name/commands/`   |
| Хуки в `settings.json`  | Хуки в `hooks/hooks.json` |
| Ручное копирование      | `/plugin install`         |

## Strict Mode

| Значение         | Поведение                                                                            |
| ---------------- | ------------------------------------------------------------------------------------ |
| `true` (default) | `plugin.json` — authority для компонентов. Marketplace дополняет.                    |
| `false`          | Marketplace entry — полное определение. `plugin.json` с компонентами вызовет ошибку. |

## Ссылки

- [Plugin Marketplaces](./plugin-marketplaces.md) — создание и распространение маркетплейсов
- [Discover plugins](https://code.claude.com/docs/en/discover-plugins) — установка плагинов
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference) — полная спецификация
- [Skills](https://code.claude.com/docs/en/skills) — разработка скиллов
- [Subagents](https://code.claude.com/docs/en/sub-agents) — конфигурация агентов
- [Hooks](https://code.claude.com/docs/en/hooks) — обработка событий
- [MCP](https://code.claude.com/docs/en/mcp) — интеграция внешних инструментов
