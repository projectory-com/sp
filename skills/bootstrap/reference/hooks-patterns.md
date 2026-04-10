# Паттерны хуков

Claude Code hooks и git hooks для популярных стеков.

## Claude Code hooks

Claude Code поддерживает хуки через `hooks.json` в плагине или `settings.json` локально.

### Типы событий

| Событие       | Когда срабатывает         | Применение                           |
| ------------- | ------------------------- | ------------------------------------ |
| `PreToolUse`  | Перед вызовом инструмента | Валидация, блокировка опасных команд |
| `PostToolUse` | После вызова инструмента  | Логирование, нотификации             |
| `Stop`        | Агент завершает работу    | Нотификации, cleanup                 |

### Формат hooks.json

```json
{
  "description": "Описание набора хуков",
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/notify.sh",
            "timeout": 10,
            "allowedEnvVars": ["MY_TOKEN", "MY_CHAT_ID"]
          }
        ]
      }
    ]
  }
}
```

### Формат settings.json (локальные хуки)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Bash tool used'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### Примеры Claude Code hooks

**Блокировка опасных команд:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$TOOL_INPUT\" | grep -qE 'rm -rf|git push --force|DROP TABLE'; then echo 'BLOCKED: dangerous command' >&2; exit 1; fi",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**Нотификация в Telegram при завершении:**

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST \"https://api.telegram.org/bot${BOT_TOKEN}/sendMessage\" -d chat_id=${CHAT_ID} -d text='Claude Code finished'",
            "timeout": 10,
            "allowedEnvVars": ["BOT_TOKEN", "CHAT_ID"]
          }
        ]
      }
    ]
  }
}
```

## Git hooks по стекам

### Node.js — Prettier + ESLint

**Инструменты:** husky + lint-staged

```bash
# Установка
npm install -D husky lint-staged prettier eslint
npx husky init
```

**`.husky/pre-commit`:**

```bash
npx lint-staged
```

**`package.json`:**

```json
{
  "lint-staged": {
    "*.{js,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  }
}
```

**Что добавить в CLAUDE.md:**

```markdown
## Formatting

Pre-commit хук через Husky форматирует staged файлы автоматически.
`npm run format` — отформатировать все файлы вручную.
`npm run lint` — проверить линтером.
```

### Python — Black + Ruff

**Инструменты:** pre-commit framework

```bash
pip install pre-commit
pre-commit install
```

**`.pre-commit-config.yaml`:**

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.4.0
    hooks:
      - id: black
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.0
    hooks:
      - id: ruff
        args: [--fix]
```

**Что добавить в CLAUDE.md:**

```markdown
## Formatting

Pre-commit хуки: Black (форматирование) + Ruff (линтер).
`black .` — отформатировать. `ruff check --fix .` — линтер с автофиксом.
```

### Go — gofmt + golangci-lint

**`.pre-commit-config.yaml`:**

```yaml
repos:
  - repo: https://github.com/dnephin/pre-commit-golang
    rev: v0.5.1
    hooks:
      - id: go-fmt
      - id: go-vet
      - id: golangci-lint
```

**Что добавить в CLAUDE.md:**

```markdown
## Formatting

Pre-commit хуки: gofmt + go vet + golangci-lint.
`go fmt ./...` — форматирование. `golangci-lint run` — линтер.
```

### Rust — cargo fmt + clippy

**`.pre-commit-config.yaml`:**

```yaml
repos:
  - repo: local
    hooks:
      - id: cargo-fmt
        name: cargo fmt
        entry: cargo fmt --all --
        language: system
        types: [rust]
      - id: cargo-clippy
        name: cargo clippy
        entry: cargo clippy --all-targets -- -D warnings
        language: system
        types: [rust]
        pass_filenames: false
```

**Что добавить в CLAUDE.md:**

```markdown
## Formatting

Pre-commit хуки: cargo fmt + clippy.
`cargo fmt` — форматирование. `cargo clippy` — линтер.
```

## Рекомендации

1. **Всегда документируй хуки в CLAUDE.md** — Claude должен знать что pre-commit хук отформатирует код автоматически
2. **Указывай команды ручного запуска** — чтобы Claude мог проверить форматирование до коммита
3. **Упоминай линтер один раз** — при наличии pre-commit хука достаточно сослаться на него и дать ручную команду
