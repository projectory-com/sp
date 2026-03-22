---
name: pr
description: >-
  Создание и обновление GitHub Pull Request. Используй когда пользователь пишет
  "pr", "pull request", "создай pr", "обнови pr", "открой pr",
  или после выполнения /gp для создания pull request.
---

# Создание и обновление Pull Request

Ты — оркестратор. Делегируй агентам через Agent tool:

- Сбор данных → `agents/pr-data-collector.md`
- Генерация body → `agents/pr-body-generator.md`

---

## Вход

`$ARGUMENTS` — опциональные флаги (`--draft`, `--base <branch>`).

---

## Фаза 1 — Collect

Запусти `pr-data-collector` через Agent tool:

- Агент: `${CLAUDE_PLUGIN_ROOT}/skills/pr/agents/pr-data-collector.md`
- Промпт: «Собери данные для создания PR»

Агент вернёт structured data. Переход → Фаза 2.

---

## Фаза 2 — Decide

Обработай данные от collector строго по порядку.

### 1. Блокирующие ошибки — выход

- `GH_AUTH = not_installed` → сообщи: «Установи gh CLI: https://cli.github.com», выйди
- `GH_AUTH = not_authenticated` → сообщи: «Авторизуйся: `gh auth login`», выйди
- `BRANCH` совпадает с `DEFAULT_BRANCH` → сообщи: «PR из default branch невозможен», выйди
- `COMMITS_COUNT = 0` и `PR_EXISTS = false` → сообщи: «Нет коммитов. Сначала запушь: `/sp:gp`», выйди

### 2. Create vs Update

- `PR_EXISTS = true` → `MODE = UPDATE`
- `PR_EXISTS = false` → `MODE = CREATE`

### 3. Draft (только CREATE)

Если `$ARGUMENTS` содержит `--draft` → `IS_DRAFT = true`, пропустить вопрос.

Иначе → AskUserQuestion:

> Создать PR как...

Варианты:

- **Ready for review (Recommended)**
- **Draft**

### 4. Определить DATA_SOURCE

- `REVIEW_FILE` найден → `DATA_SOURCE = sp_full`
- Только `REPORT_FILE` найден → `DATA_SOURCE = sp_partial`
- Ни того ни другого → `DATA_SOURCE = fallback`

### 5. Base branch

Если `$ARGUMENTS` содержит `--base <branch>` → `BASE_BRANCH = <branch>`.
Иначе → `BASE_BRANCH = DEFAULT_BRANCH`.

Переход → Фаза 3.

---

## Фаза 3 — Generate body

Запусти `pr-body-generator` через Agent tool:

- Агент: `${CLAUDE_PLUGIN_ROOT}/skills/pr/agents/pr-body-generator.md`
- Передай: DATA_SOURCE, REVIEW_CONTENT, REPORT_CONTENT, PR_TEMPLATE_CONTENT, COMMITS, DIFF_STAT, TICKET_ID, PR_BODY (при update), PR_HAS_SP_MARKERS, MODE

Агент вернёт готовый markdown. Переход → Фаза 4.

---

## Фаза 4 — Execute

### PR title

Сформируй title: `<TICKET_ID> <краткое описание из summary>`.
Если `MODE = UPDATE` — title не менять.

### CREATE

```bash
gh pr create --title "$TITLE" --body "$BODY" --base "$BASE_BRANCH" [--draft]
```

После создания — добавить labels:

```bash
# Маппинг из COMMIT_TYPES → labels (только существующие в AVAILABLE_LABELS)
gh pr edit <NUMBER> --add-label "<label>"
```

### UPDATE

```bash
gh pr edit <PR_NUMBER> --body "$NEW_BODY"
```

Добавить labels при необходимости.

### Вывести результат

```
PR создан: <URL>              # или "PR обновлён: <URL>"
  Title: <title>
  Labels: <labels>
  Ticket: <ticket_id>
  Source: <DATA_SOURCE>
```

Переход → Фаза 5.

---

## Фаза 5 — Next step

AskUserQuestion — что дальше:

- **Завершить (Recommended)** → выйди

> Примечание: интеграция с `/code-review` планируется в будущей версии.
> До реализации — завершай без дополнительных предложений.

---

## Правила

- Делегируй bash-команды агентам. Исключение: `gh pr create/edit` в Фазе 4.
- AskUserQuestion — только в оркестраторе.
- Оборачивай PR body в маркеры `<!-- sp:start/end -->`.
- При update — сохраняй текст пользователя вне маркеров.
- Назначай только labels, существующие в репозитории.
- Лимиты: max 30 коммитов.

## Справочные файлы

- **`reference/pr-body-format.md`** — формат PR body, маппинг секций review/report, маркеры, template интеграция, auto-link, auto-labels
