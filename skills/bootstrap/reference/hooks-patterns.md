# Hook patterns

Claude Code hooks and git hooks for popular stacks.

## Claude Code hooks

Claude Code supports hooks via `hooks.json` in a plugin or `settings.json` locally.

### Event types

| Event         | When it fires              | Use case                              |
| ------------- | -------------------------- | ------------------------------------- |
| `PreToolUse`  | Before a tool call         | Validation, blocking dangerous commands |
| `PostToolUse` | After a tool call          | Logging, notifications                |
| `Stop`        | Agent finishes work        | Notifications, cleanup                |

### hooks.json format

```json
{
  "description": "Description of the hook set",
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

### settings.json format (local hooks)

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

### Claude Code hook examples

**Blocking dangerous commands:**

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

**Telegram notification on completion:**

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

## Git hooks by stack

### Node.js — Prettier + ESLint

**Tools:** husky + lint-staged

```bash
# Install
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

**What to add to CLAUDE.md:**

```markdown
## Formatting

Husky pre-commit hook formats staged files automatically.
`npm run format` — format all files manually.
`npm run lint` — run the linter.
```

### Python — Black + Ruff

**Tools:** pre-commit framework

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

**What to add to CLAUDE.md:**

```markdown
## Formatting

Pre-commit hooks: Black (formatting) + Ruff (linter).
`black .` — format. `ruff check --fix .` — linter with autofix.
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

**What to add to CLAUDE.md:**

```markdown
## Formatting

Pre-commit hooks: gofmt + go vet + golangci-lint.
`go fmt ./...` — formatting. `golangci-lint run` — linter.
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

**What to add to CLAUDE.md:**

```markdown
## Formatting

Pre-commit hooks: cargo fmt + clippy.
`cargo fmt` — formatting. `cargo clippy` — linter.
```

## Recommendations

1. **Always document hooks in CLAUDE.md** — Claude should know that a pre-commit hook formats code automatically
2. **Provide manual-run commands** — so Claude can verify formatting before commit
3. **Mention the linter once** — if a pre-commit hook exists, a reference to it plus a manual command is enough
