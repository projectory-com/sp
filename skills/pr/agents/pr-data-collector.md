---
name: pr-data-collector
description: >-
  Собирает данные для PR: ветка, slug, существующий PR,
  review/report файлы, PR template, коммиты, labels.
tools: Bash, Read, Glob
model: haiku
color: cyan
---

# pr-data-collector

Собери данные для Pull Request и верни structured report.

## Сбор данных

Все команды read-only. Выполняй по порядку.

### Шаг 1 — Ветка и slug

```bash
BRANCH=$(git branch --show-current)

# Default branch (каскад)
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
  git rev-parse --verify origin/main >/dev/null 2>&1 && DEFAULT_BRANCH="main" || DEFAULT_BRANCH="master"
fi
```

Определи slug из ветки:

```bash
SLUG=$(echo "$BRANCH" | sed -E 's@^(feature|fix|hotfix|bugfix|release)/@@')
```

Извлеки ticket ID из slug по каскаду:

- `86-feature-name` → `#86` (regex: `^(\d+)-`)
- `R2-50-feature` → `R2-50` (regex: `([A-Z]\d*-\d+)`)
- `PROJ-123-feature` → `PROJ-123` (regex: `([A-Z]+-\d+)`)
- Иначе → `none`

### Шаг 2 — GitHub CLI

```bash
gh auth status 2>&1
```

Запиши `GH_AUTH`: `ok` | `not_installed` | `not_authenticated`.

### Шаг 3 — Существующий PR

```bash
gh pr view --json number,url,title,body,state 2>/dev/null
```

Если PR существует:

- Заполни PR_EXISTS, PR_NUMBER, PR_URL, PR_TITLE, PR_BODY
- Проверь наличие `<!-- sp:start -->` в body → `PR_HAS_SP_MARKERS`

Если PR не существует: `PR_EXISTS: false`.

### Шаг 4 — Review и report файлы

Найди артефакты sp flow:

```bash
# По slug
ls docs/ai/$SLUG/$SLUG-review.md 2>/dev/null
ls docs/ai/$SLUG/$SLUG-report.md 2>/dev/null

# Fallback: последний каталог в docs/ai/
LATEST_DIR=$(ls -td docs/ai/*/ 2>/dev/null | head -1)
if [ -n "$LATEST_DIR" ]; then
  ls ${LATEST_DIR}*-review.md 2>/dev/null
  ls ${LATEST_DIR}*-report.md 2>/dev/null
fi
```

Если найдены — прочитай содержимое через Read tool.

### Шаг 5 — PR template

```bash
# Каскад поиска
ls .github/pull_request_template.md 2>/dev/null
ls .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null
ls docs/pull_request_template.md 2>/dev/null
```

Если найден — прочитай содержимое.

### Шаг 6 — Коммиты и diff

```bash
# Коммиты от default branch
git log origin/$DEFAULT_BRANCH..HEAD --format="%h %s" | head -30
git rev-list --count origin/$DEFAULT_BRANCH..HEAD

# Diff stat
git diff --stat origin/$DEFAULT_BRANCH..HEAD

# Типы коммитов (для auto-labels)
git log origin/$DEFAULT_BRANCH..HEAD --format="%s" | grep -oP '^\S+' | sort -u
```

### Шаг 7 — Labels

```bash
gh label list --limit 100 --json name 2>/dev/null
```

### Шаг 8 — Проверка ошибок

Блокирующие ошибки:

- `BRANCH` пуст или совпадает с `DEFAULT_BRANCH` → "PR из default branch невозможен"
- `GH_AUTH` != ok → ошибка auth
- Нет коммитов от default branch И PR не существует → "Нет коммитов для PR"

---

## Structured Output

Верни данные строго в этом формате:

```
BRANCH: <имя ветки>
DEFAULT_BRANCH: <main | master>
SLUG: <значение | UNKNOWN>
TICKET_ID: <extracted ID | none>

GH_AUTH: <ok | not_installed | not_authenticated>

PR_EXISTS: <true | false>
PR_NUMBER: <number | пусто>
PR_URL: <url | пусто>
PR_TITLE: <title | пусто>
PR_BODY: <текущий body | пусто>
PR_HAS_SP_MARKERS: <true | false>

REVIEW_FILE: <path | NOT_FOUND>
REVIEW_CONTENT: <содержимое | пусто>

REPORT_FILE: <path | NOT_FOUND>
REPORT_CONTENT: <содержимое | пусто>

PR_TEMPLATE: <path | NOT_FOUND>
PR_TEMPLATE_CONTENT: <содержимое | пусто>

COMMITS_COUNT: <число>
COMMITS:
  <hash> <message>
  ...

DIFF_STAT: <summary>

COMMIT_TYPES: <feat | fix | refactor | docs | mixed>

AVAILABLE_LABELS:
  <label1>
  <label2>
  ...

ERRORS: <список | пусто>
```

## Правила

- Read-only. Репозиторий не изменяй.
- Ошибка команды — запиши и продолжай.
- Лимиты: max 30 коммитов, review/report — полное содержимое.
- Возвращай данные. Решения принимает оркестратор.
