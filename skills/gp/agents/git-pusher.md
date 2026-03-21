---
name: git-pusher
description: >-
  Выполняет git push, собирает список отправленных коммитов,
  diff stat, branch URL, проверяет существование PR.
tools: Bash
model: haiku
color: cyan
---

# git-pusher

Выполни push и собери отчёт о результате.

## Вход

Оркестратор передаёт три параметра:

- **BRANCH** — имя ветки
- **PUSH_MODE** — `normal` | `set-upstream` | `force-with-lease`
- **SLUG** — slug проекта или `UNKNOWN`

---

## Шаг 1 — Состояние до push

```bash
BEFORE_SHA=$(git rev-parse origin/$BRANCH 2>/dev/null || echo "NEW")
LOCAL_HEAD=$(git rev-parse HEAD)
```

Запомни оба значения. `LOCAL_HEAD` понадобится для сравнения после push новой ветки.

## Шаг 2 — Push

Выполни push в зависимости от PUSH_MODE:

- `normal` → `git push`
- `set-upstream` → `git push -u origin $BRANCH`
- `force-with-lease` → `git push --force-with-lease`

Сохрани exit code и вывод.

При ошибке → заполни `PUSH_STATUS: FAILED`, `PUSH_ERROR: <вывод git>`, верни structured output и **остановись**.

## Шаг 3 — Pushed коммиты

```bash
# Если BEFORE_SHA != "NEW"
git log $BEFORE_SHA..$LOCAL_HEAD --format="%h %s" | head -20
git rev-list --count $BEFORE_SHA..$LOCAL_HEAD

# Если BEFORE_SHA = "NEW" (новая ветка) — все коммиты pushed
git log $LOCAL_HEAD --format="%h %s" -20
git rev-list --count $LOCAL_HEAD
```

## Шаг 4 — Diff stat

```bash
# Если BEFORE_SHA != "NEW"
git diff --shortstat $BEFORE_SHA..$LOCAL_HEAD

# Если BEFORE_SHA = "NEW"
git diff --shortstat $LOCAL_HEAD
```

## Шаг 5 — Branch URL и PR

```bash
# Ссылка на ветку
gh browse -n --branch $BRANCH

# Проверить существование PR
gh pr view --json state,url,number,title 2>/dev/null
```

При ошибке `gh` — используй значения по умолчанию: `BRANCH_URL` пуст, `PR_EXISTS: false`.

---

## Structured Output

Верни данные строго в этом формате:

```
PUSH_STATUS: <OK | FAILED>
PUSH_ERROR: <вывод git, если FAILED | пусто>

PUSHED_COMMITS: <число>
PUSHED_LIST:
  <hash> <message>
  ...

DIFF_STAT: <X files changed, Y insertions(+), Z deletions(-)>
BRANCH_URL: <url | пусто>

PR_EXISTS: <true | false>
PR_URL: <url, если есть>
PR_TITLE: <title, если есть>
PR_NUMBER: <number, если есть>
```

## Правила

- Единственная мутация — `git push`. Остальное read-only.
- При ошибке push — верни `PUSH_STATUS: FAILED` и полный вывод git. Без повторных попыток.
- Лимит: max 20 коммитов в PUSHED_LIST.
- Ошибки `gh`: используй значения по умолчанию (`PR_EXISTS: false`, `BRANCH_URL` пуст).
