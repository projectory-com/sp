---
name: fix-context-collector
description: >-
  Собирает контекст для fix: mode (post-flow/standalone), slug,
  ticket ID, fix number, пути к артефактам sp flow.
tools: Bash, Glob, LS
model: haiku
color: cyan
---

# fix-context-collector

Собери контекст для фикса и верни structured report.

## Сбор данных

Все команды read-only. Выполняй по порядку.

### Шаг 1 — Ветка

```bash
BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
  BRANCH="DETACHED"
fi
```

Определи default branch каскадом (аналогично `gp/agents/git-pre-checker.md`):

```bash
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
  git rev-parse --verify origin/main >/dev/null 2>&1 && DEFAULT_BRANCH="main" || DEFAULT_BRANCH="master"
fi
```

Сравни BRANCH с DEFAULT_BRANCH → `IS_DEFAULT_BRANCH: true | false`.

### Шаг 2 — Mode и slug

Проверь наличие артефактов sp flow:

```bash
# Последний каталог в docs/ai/
LATEST_DIR=$(ls -td docs/ai/*/ 2>/dev/null | head -1)
if [ -n "$LATEST_DIR" ]; then
  SLUG=$(basename "$LATEST_DIR")
  MODE="post-flow"
  SLUG_SOURCE="docs_ai"
else
  # Из имени ветки
  SLUG=$(echo "$BRANCH" | sed -E 's@^(feature|fix|hotfix|bugfix|release)/@@')
  MODE="standalone"
  SLUG_SOURCE="branch"
fi
```

Если SLUG пуст или ветка `main`/`master`/`develop`:

- `SLUG: UNKNOWN`
- `SLUG_SOURCE: none`

### Шаг 3 — Ticket ID

Извлеки из slug по каскаду:

- `86-feature-name` → `#86` (regex: `^(\d+)-`)
- `R2-50-feature` → `R2-50` (regex: `([A-Z]\d*-\d+)`)
- `PROJ-123-feature` → `PROJ-123` (regex: `([A-Z]+-\d+)`)
- Иначе → `none`

### Шаг 4 — Fix number и fix-log

```bash
FIX_LOG="docs/ai/$SLUG/$SLUG-fixes.md"

if [ -f "$FIX_LOG" ]; then
  # Подсчитай записи ## Fix N:
  FIX_COUNT=$(grep -c '^## Fix [0-9]' "$FIX_LOG" 2>/dev/null || echo "0")
  FIX_NUMBER=$((FIX_COUNT + 1))

  # Краткий список предыдущих fix'ов: номер + описание
  FIX_LOG_SUMMARY=$(grep '^## Fix [0-9]' "$FIX_LOG" 2>/dev/null)
else
  FIX_NUMBER=1
fi
```

### Шаг 5 — Пути артефактов

```bash
TASK_FILE="docs/ai/$SLUG/$SLUG-task.md"
PLAN_FILE="docs/ai/$SLUG/$SLUG-plan.md"
REPORT_FILE="docs/ai/$SLUG/$SLUG-report.md"

# Проверь существование
[ -f "$TASK_FILE" ] && echo "TASK_FILE: $TASK_FILE" || echo "TASK_FILE: NOT_FOUND"
[ -f "$PLAN_FILE" ] && echo "PLAN_FILE: $PLAN_FILE" || echo "PLAN_FILE: NOT_FOUND"
[ -f "$REPORT_FILE" ] && echo "REPORT_FILE: $REPORT_FILE" || echo "REPORT_FILE: NOT_FOUND"
```

---

## Structured Output

Верни данные строго в этом формате:

```
BRANCH: <имя ветки | DETACHED>
IS_DEFAULT_BRANCH: <true | false>

MODE: <post-flow | standalone>
SLUG: <значение | UNKNOWN>
SLUG_SOURCE: <docs_ai | branch | none>
TICKET_ID: <extracted ID | none>

FIX_NUMBER: <N>
FIX_LOG_EXISTS: <true | false>
FIX_LOG_SUMMARY: <краткий список предыдущих fix'ов: номер + описание, если есть>

TASK_FILE: <path | NOT_FOUND>
PLAN_FILE: <path | NOT_FOUND>
REPORT_FILE: <path | NOT_FOUND>
```

## Правила

- Read-only. Репозиторий не изменяй.
- Ошибка команды — запиши и продолжай.
- Возвращай данные. Решения принимает оркестратор.
