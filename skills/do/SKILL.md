---
name: do
description: >-
  Выполнение задачи по плану. Используется когда пользователь пишет "выполни",
  "сделай", "do", "запусти план", "execute", "реализуй", или передаёт путь
  к plan-файлу и просит выполнить.
---

# Выполнение задачи по плану

Ты — оркестратор. Координируешь работу sub-agent'ов.

Делегируй каждую рабочую фазу sub-agent'у через Agent tool:

- Реализация → `agents/task-executor.md`
- Spec review → `agents/spec-reviewer.md`
- Quality review → `agents/quality-reviewer.md`
- Polish → `agents/code-polisher.md`
- Validate → `agents/validator.md`
- Document → `agents/doc-updater.md`
- Format → `agents/formatter.md`
- Report → `agents/report-writer.md`

Работай от начала до конца без остановок и подтверждений.

**Принцип:** разработчик запускает и уходит, возвращается по notification.

---

## Вход

`$ARGUMENTS` — путь к plan-файлу, например `docs/ai/86-black-jack-page/86-black-jack-page-plan.md`

Если пути нет — запроси у пользователя.

---

## Pipeline

7 этапов. Каждый отмечается в TodoWrite.

```
1. Parse        → прочитать план, создать todo
2. Execute      → dispatch sub-agents + spec review + quality review
3. Polish       → упростить и почистить код
4. Validate     → dispatch validator sub-agent
5. Document     → обновить документацию
6. Finalize     → format + report
7. Complete     → review / plannotator / завершить
```

---

## Фаза 1 — Parse

**1.** Прочитай plan-файл целиком.

**2.** Извлеки:

- `SLUG` — из пути (`docs/ai/<slug>/`)
- `COMPLEXITY` — из поля «Complexity»
- `TASKS[]` — все tasks из секции «Tasks» с полным текстом (What, How, Files, Context, Verify)
- `CONSTRAINTS` — из plan header
- `VERIFICATION` — из секции «Verification»
- `EXECUTION_ORDER` — из секции «Execution / Order» (parallel groups, barriers, sequence)

**3.** Извлеки `TICKET_ID` из slug (по `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`). Передавай `TICKET_ID` и `SLUG` всем sub-agent'ам для коммитов.

**4.** Найди task-файл: `docs/ai/<SLUG>/<SLUG>-task.md`

**5.** Создай todo list через TodoWrite:

```
[ ] Execute: Task 1 — <название>
[ ] Execute: Task 2 — <название>
...
[ ] Execute: Task N — Validation (из плана)
[ ] Polish: упростить и почистить код
[ ] Validate: lint + types + tests
[ ] Documentation: обновить документацию
[ ] Finalize: format + report
[ ] Complete: review / завершить
```

**Переход:** план загружен, todo создан → Фаза 2

---

## Фаза 2 — Execute

Прочитай `reference/status-protocol.md` — правила обработки статусов, review loop, parallel dispatch.

### Dispatch по Execution Order

Читай Order из плана:

- **Parallel group** → dispatch все tasks группы одновременно через Agent tool
- **Sequential** → dispatch по одному
- **Barrier** → дождаться завершения всех tasks группы

Без явных parallel groups — выполняй sequential по порядку.

### Для каждого task

```
1. Сформируй промт для sub-agent'а:
   - Прочитай agents/task-executor.md
   - Подставь: task.What, task.How, task.Files, task.Context, CONSTRAINTS, task.Verify
   - Сконструируй COMMIT_MESSAGE в формате `TICKET type(SLUG): description`
     Пример: `#86 feat(86-black-jack-page): add game page with basic layout`
     БЕЗ двоеточия после ticket. SLUG обязателен.
   - Передай полный текст task, а не путь к plan-файлу

2. Dispatch через Agent tool
   - Дождись результата

3. Обработай status (по reference/status-protocol.md):
   - DONE / DONE_WITH_CONCERNS → запусти Review Loop
   - NEEDS_CONTEXT → добавить контекст, re-dispatch
   - BLOCKED → оценить, re-dispatch с мощной моделью или записать

4. Review Loop (для DONE / DONE_WITH_CONCERNS):
   a. Dispatch agents/spec-reviewer.md
      - Передать: task requirements + implementer report
      - ✅ → шаг b
      - ❌ → implementer фиксит → re-dispatch spec reviewer (макс 3)

   b. Dispatch agents/quality-reviewer.md
      - Передать: BASE_SHA, HEAD_SHA, task requirements
      - ✅ → task complete
      - ❌ Critical/Important → implementer фиксит → re-dispatch (макс 3)
      - Minor → записать, не блокировать

5. Гарантируй коммит:
   - Проверь `git status` на незакоммиченные изменения
   - Если есть — закоммить по конвенции из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`
   - Запиши commit hash для report

6. Отметь в TodoWrite: [x]
```

**При BLOCKED:** пропускай только tasks, зависящие от заблокированного. Остальные выполняй.

При BLOCKED — отправь нотификацию:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ALERT --skill do --phase Execute --slug "$SLUG" --title "Task заблокирован" --body "<причина блокировки и количество skipped>"`

Сохрани список изменённых/созданных файлов — потребуется в Фазах 3-5.

**Переход:** tasks выполнены (или BLOCKED) → Фаза 3

**Если изменённых файлов ноль** (все tasks BLOCKED/SKIPPED):
пропусти Фазы 3 (Polish) и 5 (Document).
Перейди к Фазе 4 (Validate) — пропусти при отсутствии изменений.
Затем Фаза 6 (Finalize) со статусом failed → Фаза 7 (Complete).

---

## Фаза 3 — Polish

Запусти sub-agent через Agent tool. Промт — из `agents/code-polisher.md`.

Передай:

- Список файлов, изменённых/созданных в Фазе 2
- CONSTRAINTS из плана

После завершения:

- Коммит по конвенции из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- Отметь в TodoWrite: [x]

**Переход →** Фаза 4.

---

## Фаза 4 — Validate

Запусти sub-agent через Agent tool. Промт — из `agents/validator.md`.

Передай:

- Список изменённых файлов из Фаз 2-3
- SLUG для коммит-конвенции
- TICKET_ID для коммит-конвенции
- CONSTRAINTS из плана

Sub-agent определяет доступные команды из package.json scripts, запускает lint/type-check/test/build,
фиксит failures (одна попытка), коммитит фиксы и возвращает результат каждой команды.

Отметь в TodoWrite: [x]

**Переход →** Фаза 5.

---

## Фаза 5 — Document

Запусти sub-agent через Agent tool. Промт — из `agents/doc-updater.md`.

Передай:

- Список изменённых файлов
- SLUG и task title
- Requirements из plan-файла

Sub-agent решает что обновить:

- README — при изменении API или добавлении фичи
- CHANGELOG — при наличии файла
- JSDoc/TSDoc — для новых/изменённых экспортируемых функций

**Обновляй существующую документацию, а не создавай с нуля.**

После завершения:

- Коммит по конвенции из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- Отметь в TodoWrite: [x]

**Переход →** Фаза 6.

---

## Фаза 6 — Finalize

### 6a. Format

Запусти sub-agent через Agent tool. Промт — из `agents/formatter.md`.

Передай:

- Список изменённых файлов
- SLUG для коммит-конвенции
- TICKET_ID для коммит-конвенции

Sub-agent определяет formatter, прогоняет на файлах и коммитит результат.

Отметь в TodoWrite: [x]

### 6b. Report

Запусти sub-agent через Agent tool. Промт — из `agents/report-writer.md`.

Передай:

- SLUG
- Путь к plan-файлу
- Собранные данные для отчёта: статусы tasks, concerns, blocked, validation results,
  post-implementation статусы, changes summary

Sub-agent читает `reference/report-format.md` и записывает `docs/ai/<SLUG>/<SLUG>-report.md`.

### 6c. Commit Report Artifact

Проверь: `docs/ai/` под `.gitignore`? Если да — пропусти.

Если не под gitignore — закоммить отчёт по конвенции из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`:

Формат: `TICKET docs(SLUG): add execution report` (БЕЗ двоеточия после ticket).

```bash
git add docs/ai/<SLUG>/<SLUG>-report.md
git commit -m "TICKET docs(SLUG): add execution report"
```

Пример: `#86 docs(86-black-jack-page): add execution report`

### 6d. Notification

Выведи краткий итог: `<SLUG> done (N/M tasks)` или `<SLUG> done with issues (N/M tasks, K blocked)`.
Путь к report-файлу.

Отправь нотификацию:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill do --phase Complete --slug "$SLUG" --title "<SLUG> done (N/M tasks)" --body "docs/ai/$SLUG/$SLUG-report.md"`

**Переход →** Фаза 7.

---

## Фаза 7 — Complete

Сообщи путь к report-файлу и предложи через AskUserQuestion 2 варианта:

1. **Запустить /sp:review (Recommended)** — автоматический переход к code review
2. **Завершить** — выход

**Обработка выбора:**

- **Запустить /sp:review:** вызови Skill tool с `/sp:review` и аргументом `<SLUG>`
- **Завершить:** сообщи путь к report-файлу

---

## Правила

- **Без остановок.** Работает до конца без подтверждений между шагами.
- **Коммиты по конвенции.** Формат и ticket ID — из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- **Текущая директория.** Worktrees и управление ветками запрещены.
- **Context isolation.** Sub-agent получает полный текст своего task, а не весь план.
- **Review после каждого task.** Spec compliance → code quality. Обязателен.
- **TodoWrite.** Отмечай каждый шаг сразу по завершении.
- **При BLOCKED — продолжай.** Останавливай только зависимую ветку.
- **Вывод CLI.** Команды с длинным выводом (formatter, lint, build, test) запускай с `2>&1 | tail -20`.
- **Язык контента** — язык оригинального plan-файла.
