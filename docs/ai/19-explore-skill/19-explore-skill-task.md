# Реализовать скилл /explore

**Slug:** 19-explore-skill
**Тикет:** https://github.com/projectory-com/sp/issues/19
**Сложность:** medium
**Тип:** general

## Task

Создать скилл `/explore` — read-only Q&A loop для исследования кодовой базы через sub-agent dispatch с summary chain между вопросами и exploration log как артефактом.

## Context

### Архитектура области

Скиллы располагаются в `skills/<name>/SKILL.md` с YAML frontmatter (`name`, `description`). Claude auto-discovers их по `SKILL.md` в поддиректории `skills/`. Регистрация в `plugin.json` или `marketplace.json` не нужна.

Агенты располагаются в `skills/<name>/agents/<agent>.md` с frontmatter (`name`, `description`, `tools`, `model`, `color`). Оркестратор dispatch-ит агентов через Agent tool с указанием model.

Reference файлы располагаются в `skills/<name>/reference/`. Агент или оркестратор читает reference через Read перед работой.

Паттерн "тонкий оркестратор": SKILL.md координирует, файловые операции делегирует агентам. AskUserQuestion — для входа и завершающих выборов. TodoWrite — для отметки прогресса.

### Файлы для создания

- `skills/explore/SKILL.md` — оркестратор с loop-архитектурой (5 фаз)
- `skills/explore/agents/explore-agent.md` — read-only исследователь, sonnet
- `skills/explore/agents/explore-log-writer.md` — writer артефакта, haiku
- `skills/explore/reference/exploration-log-format.md` — формат exploration log

### Паттерны для повторения

**Оркестратор:** `skills/fix/SKILL.md` — полный pipeline с фазами, dispatch агентов, scope guard, AskUserQuestion на Complete. Адаптировать pipeline в loop.

**Read-only agent:** `skills/fix/agents/fix-investigator.md` — frontmatter с `tools: Glob, Grep, LS, Read, Bash`, structured output (`KEY: value`), placeholder-ы `{{VARIABLE}}` для входных данных от оркестратора. Расширить tools на `WebSearch, WebFetch` для explore-agent.

**Log writer:** `skills/fix/agents/fix-log-writer.md` — паттерн: читает reference с форматом → проверяет существование файла → mkdir -p → Write/Edit → git add + commit. Append-only.

**Формат лога:** `skills/fix/reference/fix-log-format.md` — header файла + повторяющиеся записи. Адаптировать под Q&A формат.

**Простой скилл:** `skills/gst/SKILL.md` + `skills/gst/agents/git-data-collector.md` — минимальная структура: оркестратор dispatch-ит одного агента, выводит результат.

### Тесты

Скиллы — markdown промпты, автоматические тесты отсутствуют. Валидация: YAML frontmatter (`head -1`), JSON манифесты, `pnpm run format:check`, ручной тест `claude --plugin-dir .`.

## Requirements

1. SKILL.md реализует user-driven Q&A loop (не auto-generated pipeline): пользователь задаёт вопросы, оркестратор dispatch-ит explore-agent на каждый вопрос, показывает ответ, спрашивает "ещё вопрос / сохранить / выйти".
2. Summary chain: оркестратор хранит `RUNNING_SUMMARY` (~200 токенов на Q&A) и передаёт explore-agent контекст предыдущих ответов. На Q10 — ~2000 токенов вместо ~30000.
3. explore-agent использует `tools: Glob, Grep, LS, Read, Bash, WebSearch, WebFetch`. Write/Edit отсутствуют — read-only enforcement через отсутствие инструментов. Model: sonnet. Возвращает structured output: `RESPONSE_TYPE`, `ANSWER`, `DETAILS`, `SUMMARY`, `KEY_FILES`, `WEB_SOURCES`, `OPTIONS` (при brainstorm). Оркестратор показывает ANSWER и DETAILS пользователю.
4. explore-agent классифицирует вопрос (how-it-works, compare, what-if, explain, brainstorm, suggest) и выбирает стратегию. Web search включается при упоминании внешних библиотек, best practices, сравнениях технологий.
5. При `RESPONSE_TYPE = brainstorm` explore-agent возвращает `OPTIONS` — structured список вариантов с label и description. Оркестратор показывает развёрнутый ANSWER и записывает варианты как todo-чеклист в exploration log.
6. Question refinement молчаливый: оркестратор дополняет промт для агента контекстом (summary chain, key_files) без уточнений у пользователя.
7. Self-check: explore-agent проверяет все file:line ссылки перед возвратом — файлы существуют, номера строк актуальны, имена функций совпадают с реальными.
8. Exploration log сохраняется в `docs/ai/<slug>/<slug>-exploration.md` с Q&A записями, brainstorm todo-чеклистами, итоговым summary. Формат определён в `reference/exploration-log-format.md`.
9. Slug содержит префикс `explore-`: `explore-sound-system`, `explore-state-management`. Оркестратор предлагает 2-3 варианта через AskUserQuestion, пользователь выбирает или вводит свой.
10. Init фаза: если `$ARGUMENTS` пуст → AskUserQuestion "О чём хочешь поговорить?". Первый вопрос = `$ARGUMENTS`.
11. Complete фаза предлагает: ещё вопрос / сохранить и завершить / создать задачу через /sp:task / выйти без сохранения.
12. Обновить `skills/hi/SKILL.md` — добавить /explore в таблицу скиллов. Перенести /explore в CLAUDE.md из Planned в Implemented skills.

## Constraints

- Write/Edit в tools explore-agent не добавлять. Read-only — архитектурное решение, не правило в промпте.
- Существующие скиллы не менять кроме /hi (таблица скиллов) и CLAUDE.md.
- Скилл не регистрировать в `plugin.json` или `marketplace.json` — auto-discovery.
- Pipeline с автоматическими вопросами не создавать — loop user-driven, пользователь задаёт каждый вопрос сам.
- Placeholder-ы в агентах — `{{DOUBLE_BRACES}}`, как в `fix-investigator.md` и `fix-log-writer.md`.
- Язык контента — русский. Slug — английский kebab-case с префиксом `explore-`.
- Коммит артефакта без ticket prefix (explore standalone, не привязан к SP flow): `docs(<slug>): add exploration log`.

## Verification

- `head -1 skills/explore/SKILL.md skills/explore/agents/*.md skills/explore/reference/*.md` → каждый файл начинается с `---`
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"` → OK (манифесты не сломаны)
- `pnpm run format:check` → без ошибок
- `claude --plugin-dir .` → скилл `/sp:explore` доступен в списке
- SKILL.md содержит 5 фаз: Init, Loop, Synthesize (или Present), Finalize, Complete
- explore-agent.md frontmatter содержит `tools:` без Write и Edit
- explore-log-writer.md frontmatter содержит `tools: Read, Write, Edit, Bash`
- `skills/hi/SKILL.md` содержит строку с /explore
- `CLAUDE.md` содержит `/explore` в секции Implemented skills

## Материалы

- [Issue #19](https://github.com/projectory-com/sp/issues/19) — полная спецификация скилла
- `skills/fix/SKILL.md` — паттерн оркестратора с фазами
- `skills/fix/agents/fix-investigator.md` — паттерн read-only agent
- `skills/fix/agents/fix-log-writer.md` — паттерн log writer
- `skills/fix/reference/fix-log-format.md` — паттерн формата лога
- `skills/gst/SKILL.md` — паттерн простого скилла
- `skills/gst/agents/git-data-collector.md` — паттерн простого агента
