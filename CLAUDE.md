# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**sp** — a marketplace of skills and commands for Claude Code, inspired by [obra/superpowers](https://github.com/obra/superpowers). Distributed as a Claude Code plugin via `.claude-plugin/marketplace.json`.

## Architecture

```
.claude/
  skills/              # local skills for plugin development (sp-create, sp-release)
.claude-plugin/
  plugin.json          # plugin manifest (name, version, author)
  marketplace.json     # marketplace registry (name, owner, plugins[])
skills/                # skills — auto-discovered by SKILL.md in subdirectories
commands/              # slash commands — auto-discovered by .md files
hooks/                 # hooks — auto-discovered by hooks.json (Telegram notifications)
lib/                   # shared scripts called from skills (notify.sh)
docs/                  # reference documentation for the plugin system
_skills/               # drafts — NOT part of the plugin, don't touch
```

Components (`skills/`, `commands/`) live at the repository root, NOT inside `.claude-plugin/`.

## Plugin System

- **Skills** (`skills/<name>/SKILL.md`): model-invoked, activated automatically by `description` in YAML frontmatter
- **Agents** (`skills/<name>/agents/<agent>.md`): model-invoked sub-agents dispatched by skill orchestrators via the Agent tool; YAML frontmatter with `name` and `description`
- **Commands** (`commands/<name>.md`): user-invoked via `/sp:<name>`, YAML frontmatter with `name` and `description`
- **Namespace**: all components are available as `/sp:<name>` after installation
- **`$ARGUMENTS`**: placeholder for user input in commands
- **`${CLAUDE_PLUGIN_ROOT}`**: for paths inside the plugin in hooks and MCP configs

## Validation

```bash
# Validate JSON manifests
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"

# Validate YAML frontmatter in skills/commands — first line must be ---
head -1 skills/*/SKILL.md commands/*.md
```

## Testing locally

```bash
claude --plugin-dir .
```

## Conventions

- **Content language**: English by default. Skills adapt to the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md.
- **Files and directories**: kebab-case
- **Versioning**: semver in `plugin.json` (source of truth for the version)
- **marketplace.json**: required top-level fields — `name`, `owner` (object with `name`), `plugins[]`
- **Plugin source**: `"./"` for self-contained (plugin at the marketplace root), `{ "source": "github", "repo": "owner/repo" }` for external
- **SKILL.md frontmatter**: `name` (identifier), `description` (when to activate)

## Implemented skills

- `/task` — define tasks for AI implementation
- `/plan` — build an implementation plan from a task file
- `/do` — execute a task per the plan
- `/review` — prepare a code review report
- `/gca` — git commit with smart grouping and a unified commit convention
- `/gp` — git push with checks and a report
- `/pr` — create and update GitHub pull requests
- `/gst` — development status: branch, changes, diff, hot files
- `/fix` — quick fix or follow-up (1–3 files, opus on code phases)
- `/hi` — welcome and overview of available skills
- `/explore` — codebase exploration: read-only Q&A loop with a summary chain
- `/bootstrap` — prepare a project for sp flow: stack detection, CLAUDE.md generation, `.claude/sp-context.md` creation

## Local skills (development)

- `/sp-create` — skill factory: analysis, design, implementation, validation, integration
- `/sp-release` — plugin release: quality checks, version bump, tag, push, GitHub release

## Planned skills

`/polish` `/qa` `/memorize` `/merge`

## Reference docs

- `docs/notify.md` — Telegram notifications: setup, types, map of trigger points

## Formatting

```bash
pnpm run format          # format all *.{md,json}
pnpm run format:check    # check formatting (CI-ready)
```

Config: `.prettierrc.json` (proseWrap: preserve, printWidth: 120).
A pre-commit hook via Husky formats staged files automatically.
