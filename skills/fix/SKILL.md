---
name: fix
description: >-
  Быстрый фикс или доработка. Используется когда пользователь пишет
  "fix", "поправь", "исправь", "доработай", "допили", "мелкий фикс",
  "quick fix", или описывает мелкое изменение после /do.
---

# Быстрый фикс

Ты — оркестратор. Координируешь агентов, принимаешь решения через AskUserQuestion. Все файловые операции и bash делегируй агентам.

Делегируй каждую фазу агенту через Agent tool:

- Контекст → `agents/fix-context-collector.md`
- Исследование → `agents/fix-investigator.md`
- Реализация → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/task-executor.md`
- Polish → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/code-polisher.md`
- Валидация → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/validator.md`
- Документация → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/doc-updater.md`
- Форматирование → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/formatter.md`
- Fix-log → `agents/fix-log-writer.md`

Работай от начала до конца без остановок.

**Принцип:** разработчик пишет описание фикса и уходит. Opus на code-фазах заменяет review loop.

---

## Вход

`$ARGUMENTS` — описание фикса или URL PR-комментария.

Если `$ARGUMENTS` пуст — спроси описание через AskUserQuestion.

Если `$ARGUMENTS` содержит URL PR-комментария (`github.com/.../pull/...#discussion_r...`):

1. Извлеки текст комментария через `gh api`
2. Используй как описание фикса
3. Контекст: файл и строки из комментария

---

## Pipeline

7 фаз. Отмечай каждую через TodoWrite.

```
1. Collect     → dispatch fix-context-collector (haiku)
2. Investigate → dispatch fix-investigator (sonnet)
3. Decide      → scope guard + уточнения (оркестратор)
4. Implement   → dispatch task-executor (opus, reuse /do)
5. Post-process → polish (opus) + validate + docs + format
6. Artifact    → dispatch fix-log-writer (haiku)
7. Complete    → AskUserQuestion: ещё fix / review / выход
```

---

## Фаза 1 — Collect

Dispatch `fix-context-collector` через Agent tool (model: haiku).

Прочитай `agents/fix-context-collector.md`, передай промт агенту.

Агент вернёт structured data:

```
MODE: <post-flow | standalone>
SLUG, SLUG_SOURCE, TICKET_ID
FIX_NUMBER, FIX_LOG_EXISTS, FIX_LOG_SUMMARY
TASK_FILE, REPORT_FILE, PLAN_FILE (пути)
```

Сохрани результат. Переход → Фаза 2.

---

## Фаза 2 — Investigate

Dispatch `fix-investigator` через Agent tool (model: sonnet).

Прочитай `agents/fix-investigator.md`, передай агенту:

- Описание фикса от пользователя
- MODE из Фазы 1
- Пути артефактов: TASK_FILE, REPORT_FILE, PLAN_FILE
- FIX_LOG_SUMMARY (предыдущие фиксы)

Агент вернёт findings:

```
FILES_TO_CHANGE, FILES_COUNT
PATTERNS, CONSTRAINTS, VERIFY
COMPLEXITY: trivial | simple | escalate
```

Переход → Фаза 3.

---

## Фаза 3 — Decide

### 0. Защита default branch

Если `IS_DEFAULT_BRANCH = true` (из Фазы 1) → AskUserQuestion:

> Fix на `<BRANCH>` — default branch. Продолжить?

Варианты:

- **Продолжить**
- **Отменить** → выйди

### 1. Scope guard

Если `COMPLEXITY = escalate` → отправь нотификацию и AskUserQuestion:

`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ALERT --skill fix --phase Decide --slug "$SLUG" --title "Большой фикс" --body "Затронуто $FILES_COUNT файлов"`

> Фикс затрагивает N файлов: [список]. Выглядит как задача для /sp:task.

Варианты:

- **Продолжить как fix**
- **Escalate в /sp:task** → вызови Skill tool с `/sp:task` и описанием фикса, выйди

### 2. Уточнения

Если нужны уточнения — отправь нотификацию:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill fix --phase Decide --slug "$SLUG" --title "Требуется уточнение" --body "Не хватает данных для фикса"`

Если `FILES_TO_CHANGE` пуст или `VERIFY` пуст → AskUserQuestion с 1-3 вопросами.

Всё ясно → пропусти.

### 3. Промт для implementer

Подготовь данные:

- **TASK_WHAT:** описание фикса
- **TASK_HOW:** из findings (files + patterns)
- **TASK_FILES:** FILES_TO_CHANGE
- **TASK_CONTEXT:** файлы для чтения
- **CONSTRAINTS:** из findings + task-файла (post-flow)
- **TASK_VERIFY:** из findings
- **COMMIT_MESSAGE:** `TICKET fix(SLUG): <описание фикса>` — по `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`

Переход → Фаза 4.

---

## Фаза 4 — Implement

Прочитай `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/task-executor.md`. Dispatch через Agent tool с моделью из frontmatter агента.

Передай подготовленный промт из Фазы 3 (TASK_WHAT, TASK_HOW, TASK_FILES, TASK_CONTEXT, CONSTRAINTS, TASK_VERIFY, COMMIT_MESSAGE).

### Обработка статусов (упрощённая)

- **DONE** → Фаза 5
- **DONE_WITH_CONCERNS** → запиши concerns, Фаза 5
- **NEEDS_CONTEXT** → добавь контекст, re-dispatch (1 retry). Повторно → BLOCKED
- **BLOCKED** → запиши причину, Фаза 6 (артефакт со статусом BLOCKED)

Opus на code-фазах снижает ошибки на входе, validator ловит regression — review loop избыточен.

Task-executor коммитит по COMMIT_MESSAGE из промта. Если его статус DONE — коммит гарантирован.

Переход → Фаза 5.

---

## Фаза 5 — Post-process

Полный pipeline из /do за один проход. Сохрани список изменённых файлов из Фазы 4.

### 5a. Polish

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/code-polisher.md` с моделью из frontmatter агента.

Передай: изменённые файлы, CONSTRAINTS.

Коммит: `TICKET refactor(SLUG): polish fix-N`

### 5b. Validate

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/validator.md`.

Передай: изменённые файлы, SLUG, TICKET_ID, CONSTRAINTS.

### 5c. Document

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/doc-updater.md`.

Передай: изменённые файлы, SLUG, описание фикса.

Коммит: `TICKET docs(SLUG): update docs for fix-N`

### 5d. Format

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/formatter.md`.

Передай: изменённые файлы, SLUG, TICKET_ID.

Отмечай каждый шаг в TodoWrite.

Переход → Фаза 6.

---

## Фаза 6 — Artifact

Dispatch `fix-log-writer` через Agent tool (model: haiku).

Прочитай `agents/fix-log-writer.md`, передай агенту:

- SLUG, FIX_NUMBER
- Описание фикса
- STATUS (done / blocked)
- Коммиты из Фаз 4-5 (хеши + сообщения)
- Изменённые файлы с описаниями
- Validation results
- Concerns (если были)
- TICKET_ID

Агент запишет/дополнит `docs/ai/<SLUG>/<SLUG>-fixes.md` и закоммитит.

Переход → Фаза 7.

---

## Фаза 7 — Complete

Выведи результат:

```
Fix N: <описание>
Коммиты: <список>
Validation: pass / fail
```

Отправь нотификацию:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill fix --phase Complete --slug "$SLUG" --title "Fix $FIX_NUMBER завершён" --body "$FIX_DESCRIPTION"`

AskUserQuestion — что дальше:

- **Ещё один fix** → вернись к Фазе 1 (SLUG сохраняется)
- **Запустить /sp:review (Recommended)** → вызови Skill tool с `/sp:review` и SLUG
- **Завершить** → выйди

---

## Chain awareness

Каждый `/fix` в цепочке читает предыдущие записи из fix-log:

- Fix-2 знает об изменениях Fix-1 → избегает конфликтов
- Fix-investigator получает FIX_LOG_SUMMARY как контекст
- Fix-log-writer append-ит запись, сохраняя историю

---

## Fix from PR feedback

Если `$ARGUMENTS` содержит URL PR-комментария:

1. Извлеки текст через `gh api repos/{owner}/{repo}/pulls/comments/{id}`
2. Используй текст как описание фикса
3. Файл и строки из контекста комментария → передай investigator
4. URL нерабочий → спроси описание через AskUserQuestion (fallback)

Закрывает flow: `/do` → `/review` → `/gp` → `/pr` → ревьюер комментирует → `/fix <URL>` → `/gp`.

---

## Правила

- **Тонкий оркестратор.** Все файловые операции и bash делегируй агентам.
- **Без остановок.** Работай до конца без подтверждений между фазами.
- **Модели по frontmatter.** task-executor и code-polisher используют модели из frontmatter агентов.
- **Коммиты по конвенции.** Формат и ticket ID — из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- **Scope guard.** 4+ файлов или архитектурные решения → предложи escalate в /sp:task.
- **TodoWrite.** Отмечай каждый шаг сразу по завершении.
- **Вывод CLI.** Команды с длинным выводом запускай с `2>&1 | tail -20`.
- **Текущая директория.** Worktrees и управление ветками запрещены.
- **Язык контента** — русский.
