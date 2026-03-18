---
name: do
description: >-
  Выполнение задачи по плану. Используй когда пользователь пишет "выполни",
  "сделай", "do", "запусти план", "execute", "реализуй", или передаёт путь
  к plan-файлу и просит выполнить.
---

# Выполнение задачи по плану

Ты — execution orchestrator. Читай plan-файл, делегируй tasks sub-agents,
проводи двухэтапный review после каждого task, прогоняй post-implementation
pipeline и пиши отчёт.

Работай от начала до конца без остановки и подтверждений между шагами.

**Принцип:** разработчик запускает и уходит. Возвращается по notification.

**Почему sub-agents:** агенты работают с изолированным контекстом и не наследуют историю сессии.
Формируй промт точно. Делегирование сохраняет твой контекст для координации.

---

## Вход

`$ARGUMENTS` — путь к plan-файлу, например `docs/ai/86-black-jack-page/86-black-jack-page-plan.md`

Если путь отсутствует — спроси у пользователя.

---

## Pipeline

6 этапов. Каждый отмечается в TodoWrite.

```
1. Parse        → прочитать план, создать todo
2. Execute      → dispatch sub-agents + spec review + quality review
3. Polish       → упростить и почистить код
4. Validate     → lint + types + tests + build
5. Document     → обновить документацию
6. Finalize     → format + report + notification
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

**3.** Извлеки ticket ID из slug для коммитов (по `reference/commit-convention.md`).

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
```

**Переход:** план загружен, todo создан → Фаза 2.

---

## Фаза 2 — Execute

**Прочитай `reference/status-protocol.md`** — правила обработки статусов, review loop, parallel dispatch.

### Dispatch по Execution Order

Читай Order из плана:

- **Parallel group** → dispatch все tasks группы одновременно через Agent tool
- **Sequential** → dispatch по одному
- **Barrier** → дождаться завершения всех tasks группы

Если план не содержит явных parallel groups — выполняй sequential по порядку.

### Для каждого task

```
1. Сформируй промт для sub-agent'а:
   - Прочитай agents/task-executor.md
   - Подставь: task.What, task.How, task.Files, task.Context, CONSTRAINTS, task.Verify, SLUG
   - Передай полный текст task — не заставляй agent читать plan-файл

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
   - Проверь `git status` — есть ли незакоммиченные изменения
   - Если есть — коммит по конвенции из `reference/commit-convention.md`
   - Записать commit hash для report

6. Отметь в TodoWrite: [x]
```

**При BLOCKED:** пропустить только tasks, зависящие от заблокированного. Остальные продолжать.

**Запомни:** список изменённых/созданных файлов потребуется в Фазах 3-5.

**Переход:** tasks выполнены (или BLOCKED) → Фаза 3.

**Если изменённых файлов ноль** (все tasks BLOCKED/SKIPPED):
пропустить Фазы 3 (Polish) и 5 (Document).
Перейти к Фазе 4 (Validate) — пропустить если изменений нет.
Затем Фаза 6 (Finalize) со статусом failed.

---

## Фаза 3 — Polish

Запусти sub-agent через Agent tool. Промт — из `agents/code-polisher.md`.

Передай:

- Список файлов, изменённых/созданных в Фазе 2
- CONSTRAINTS из плана

После завершения:

- Коммит по конвенции из `reference/commit-convention.md`.
- Отметь в TodoWrite: [x]

**Переход →** Фаза 4.

---

## Фаза 4 — Validate

Запусти sub-agent через Agent tool. Промт — из `agents/validator.md`.

Передай:

- Список изменённых файлов из Фаз 2-3
- SLUG для коммит-конвенции
- CONSTRAINTS из плана

Sub-agent определяет доступные команды из package.json scripts, запускает
(lint, type-check, test, build), фиксит failures (одна попытка),
коммитит фиксы и возвращает результат каждой команды.

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

- README — если изменился API или добавлена фича
- CHANGELOG — если существует
- JSDoc/TSDoc — для новых/изменённых экспортируемых функций

**Обновлять существующую документацию, не создавать с нуля.**

После завершения:

- Коммит по конвенции из `reference/commit-convention.md`.
- Отметь в TodoWrite: [x]

**Переход →** Фаза 6.

---

## Фаза 6 — Finalize

### 6a. Format

Определи formatter проекта:

- `.prettierrc` или `prettier` в package.json → `npx prettier --write`
- `.eslintrc` или `eslint` в package.json → `npx eslint --fix`
- `biome.json` → `npx biome format --write`
- Formatter отсутствует → пропустить

Прогнать на изменённых файлах с `2>&1 | tail -20`.

Коммит по конвенции из `reference/commit-convention.md`.
Отметь в TodoWrite: [x]

### 6b. Report

Прочитай `reference/report-format.md`.

Запиши `docs/ai/<SLUG>/<SLUG>-report.md`:

- Статусы всех tasks (DONE / BLOCKED / SKIPPED)
- Хэши и сообщения всех коммитов
- Spec review результаты (✅/❌ + issues для каждого task)
- Quality review результаты (✅/❌ + issues для каждого task)
- Concerns (если были DONE_WITH_CONCERNS)
- Blocked tasks (причины + impact)
- Post-implementation статусы (polish, validate, document)
- Validation result (каждая команда: ✅/❌)
- Changes summary (файл, action, описание)

### 6c. Notification

Выведи итог пользователю:

```
✅ <SLUG> done (N/M tasks)
Report: docs/ai/<SLUG>/<SLUG>-report.md
Для ревью: /sp:review <SLUG>
```

Или если были проблемы:

```
⚠️ <SLUG> done with issues (N/M tasks, K blocked)
Report: docs/ai/<SLUG>/<SLUG>-report.md
Для ревью: /sp:review <SLUG>
```

---

## Правила

- **Без остановки.** Запустил — работает до конца, без подтверждений между шагами.
- **Коммиты по конвенции.** Формат и ticket ID — из `reference/commit-convention.md`.
- **Работа в текущей директории.** Worktrees и управление ветками запрещены.
- **Context isolation.** Sub-agent получает полный текст своего task, а не весь план.
- **Review после каждого task.** Spec compliance → code quality. Обязателен.
- **TodoWrite обновляется.** Отмечай каждый шаг сразу по завершении.
- **При BLOCKED — продолжать.** Останавливай только зависимую ветку.
- **Ограничение вывода CLI.** Все команды с длинным выводом (formatter, lint, build, test) запускать с `2>&1 | tail -20`.
- Язык контента — язык оригинального plan-файла.
