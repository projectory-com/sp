# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**sp** — маркетплейс скиллов и команд для Claude Code, вдохновлённый [obra/superpowers](https://github.com/obra/superpowers). Распространяется как Claude Code plugin через `.claude-plugin/marketplace.json`.

## Architecture

```
.claude/
  skills/              # локальные скиллы для разработки плагина (sp-create, sp-release)
.claude-plugin/
  plugin.json          # манифест плагина (name, version, author)
  marketplace.json     # реестр маркетплейса (name, owner, plugins[])
skills/                # скиллы — auto-discovered по SKILL.md в поддиректориях
commands/              # slash-команды — auto-discovered по .md файлам
hooks/                 # хуки — auto-discovered по hooks.json (Telegram notifications)
lib/                   # shared-скрипты для вызова из скиллов (notify.sh)
docs/                  # справочная документация по plugin system
_skills/               # черновики — НЕ часть плагина, не трогать
```

Компоненты (`skills/`, `commands/`) располагаются в корне репозитория, НЕ внутри `.claude-plugin/`.

## Plugin System

- **Скиллы** (`skills/<name>/SKILL.md`): model-invoked, активируются автоматически по `description` в YAML frontmatter
- **Команды** (`commands/<name>.md`): user-invoked через `/sp:<name>`, YAML frontmatter с `name` и `description`
- **Namespace**: все компоненты доступны как `/sp:<name>` после установки
- **`$ARGUMENTS`**: плейсхолдер для пользовательского ввода в командах
- **`${CLAUDE_PLUGIN_ROOT}`**: для путей внутри плагина в хуках и MCP конфигах

## Validation

```bash
# Проверить JSON манифесты
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"

# Проверить YAML frontmatter в скиллах/командах — первая строка должна быть ---
head -1 skills/*/SKILL.md commands/*.md
```

## Testing locally

```bash
claude --plugin-dir .
```

## Conventions

- **Язык контента**: русский (скиллы, команды, документация)
- **Файлы и директории**: kebab-case
- **Версионирование**: semver в `plugin.json` (source of truth для версии)
- **marketplace.json**: обязательные поля верхнего уровня — `name`, `owner` (object с `name`), `plugins[]`
- **Plugin source**: `"./"` для self-contained (плагин в корне маркетплейса), `{ "source": "github", "repo": "owner/repo" }` для внешних
- **SKILL.md frontmatter**: `name` (идентификатор), `description` (когда активировать)

## Implemented skills

- `/task` — формирование задач для AI-реализации
- `/plan` — построение плана реализации по task-файлу
- `/do` — выполнение задачи по плану
- `/review` — подготовка отчёта для code review
- `/gca` — git commit с умной группировкой и единым commit-convention
- `/gp` — git push с проверками и отчётом
- `/pr` — создание и обновление GitHub Pull Request
- `/gst` — статус разработки: ветка, изменения, diff, горячие файлы
- `/fix` — быстрый фикс или доработка (1-3 файла, opus на code-фазах)
- `/hi` — приветствие и объяснение доступных скиллов
- `/explore` — исследование кодовой базы: read-only Q&A loop с summary chain
- `/bootstrap` — подготовка проекта к sp flow: детекция стека, генерация CLAUDE.md, создание .claude/sp-context.md

## Local skills (development)

- `/sp-create` — фабрика скиллов: анализ, проектирование, реализация, валидация, интеграция
- `/sp-release` — публикация плагина: проверки качества, bump версии, tag, push, GitHub release

## Planned skills

`/polish` `/qa` `/memorize` `/merge`

## Reference docs

- `docs/notify.md` — Telegram-нотификации: настройка, типы, карта точек

## Formatting

```bash
pnpm run format          # отформатировать все *.{md,json}
pnpm run format:check    # проверить форматирование (CI-ready)
```

Конфигурация: `.prettierrc.json` (proseWrap: preserve, printWidth: 120).
Pre-commit хук через Husky форматирует staged файлы автоматически.
