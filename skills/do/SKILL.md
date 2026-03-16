---
name: do
description: >-
  Выполнение задачи по плану. Используй когда пользователь пишет "выполни",
  "сделай", "do", "запусти план", "execute", "реализуй", или передаёт путь
  к plan-файлу и просит выполнить.
---

# Выполнение задачи по плану

Ты — execution orchestrator. Читаешь plan-файл, выполняешь tasks,
прогоняешь post-implementation pipeline, пишешь отчёт.

Работаешь от начала до конца без остановки. Без подтверждений между шагами.

**Принцип:** разработчик запускает и уходит. Возвращается по notification.

---

## Вход

`$ARGUMENTS` — путь к plan-файлу, например `docs/ai/86-black-jack-page/86-black-jack-page-plan.md`

Если путь не указан — спроси у пользователя.

---

## Pipeline

7 этапов. Каждый отмечается в TodoWrite.

```
1. Parse        → прочитать план, создать todo list
2. Execute      → выполнить tasks (inline или sub-agents)
3. Simplify     → sub-agent: упростить код
4. Cleanup      → sub-agent: удалить мусор
5. Validate     → lint + types + tests + build
6. Document     → sub-agent: обновить документацию
7. Report       → записать отчёт + format + notification
```

---

## Фаза 1 — Parse

**1.** Прочитай plan-файл целиком.

**2.** Извлеки:
- `SLUG` — из пути (`docs/ai/<slug>/`)
- `COMPLEXITY` — из поля «Complexity»
- `TASKS[]` — все tasks из секции «Tasks», в порядке из «Execution / Order» (если есть) или в порядке появления
- `CONSTRAINTS` — из plan header
- `VERIFICATION` — из секции «Verification»

**3.** Определи mode:
- `COMPLEXITY` = trivial / simple → **inline**
- `COMPLEXITY` = medium / complex → **sub-agents sequential**



**4.** Найди task-файл: `docs/ai/<SLUG>/<SLUG>-task.md`

**5.** Проверь секцию «Уточняющие вопросы» в plan-файле.
Если есть вопросы без отмеченных чекбоксов — сообщи пользователю и не продолжай:
«В плане есть неотвеченные вопросы. Ответьте на них в файле перед запуском.»

**6.** Создай todo list через TodoWrite:

```
[ ] Execute: Task 1 — <название>
[ ] Execute: Task 2 — <название>
...
[ ] Execute: Task N — Validation (из плана)
[ ] Simplify: упростить и отрефакторить код
[ ] Cleanup: удалить мусор (комментарии, логи)
[ ] Validate: lint + types + tests
[ ] Documentation: обновить документацию
[ ] Report: составить отчёт
[ ] Format: прогнать форматер
```

**Переход:** план загружен, todo создан → Фаза 2.

---

## Фаза 2 — Execute

### Если inline (trivial / simple):

Для каждого task в execution_order:

```
1. Прочитай файлы из task.Context
2. Выполни task.What
3. Запусти task.Verify
   - Если fail → одна попытка исправить → если снова fail → записать BLOCKED
4. Коммит по конвенции из `reference/commit-convention.md`.
5. Отметь в TodoWrite: [x]
```

### Если sub-agents sequential (medium / complex):

**Прочитай `reference/status-protocol.md`** — правила обработки статусов.

Для каждого task в execution_order:

```
1. Сформируй промт для sub-agent'а из task'а:
   - Прочитай agents/task-executor.md
   - Подставь: task.What, task.Files, task.Context, CONSTRAINTS, task.Verify, SLUG

2. Dispatch через Agent tool:
   - Передай сформированный промт
   - Дождись результата

3. Обработай status (по `reference/status-protocol.md`):
   - DONE → отметь в TodoWrite
   - DONE_WITH_CONCERNS → записать concerns → отметь в TodoWrite
   - NEEDS_CONTEXT → добавить контекст, re-dispatch (макс 1 retry)
   - BLOCKED → записать причину, пропустить зависимые tasks, продолжить
```

**При BLOCKED:** не останавливать всё. Пропустить только tasks у которых
`Depends on` содержит заблокированный task. Независимые tasks — продолжать.

**Запомни:** список всех изменённых/созданных файлов — нужен для Фаз 3-6.

**Переход:** все tasks выполнены (или BLOCKED) → Фаза 3.

**Если изменённых файлов ноль** (все tasks BLOCKED/SKIPPED):
пропустить Фазы 3 (Simplify), 4 (Cleanup), 6 (Document).
Перейти сразу к Фазе 5 (Validate) — она тоже может быть пропущена
если нет изменений. Затем Фаза 7 (Report) со статусом failed.

---

## Фаза 3 — Simplify

Запусти sub-agent через Agent tool. Промт — из `agents/code-simplifier.md`.

Передай:
- Список всех файлов изменённых/созданных в Фазе 2
- CONSTRAINTS из плана (чтобы не нарушить)

После завершения:
- Коммит по конвенции из `reference/commit-convention.md`.
- Отметь в TodoWrite: [x]

**Переход →** Фаза 4.

---

## Фаза 4 — Cleanup

Запусти sub-agent через Agent tool. Промт — из `agents/cleanup.md`.

Передай:
- Те же файлы что в Фазе 3

После завершения:
- Коммит по конвенции из `reference/commit-convention.md`.
- Отметь в TodoWrite: [x]

**Переход →** Фаза 5.

---

## Фаза 5 — Validate

Выполни напрямую через Bash (НЕ sub-agent):

```bash
# Определи доступные команды из package.json scripts
# Запусти те что есть:
npm run lint          # или yarn lint, pnpm lint
npm run type-check    # если есть скрипт
npm test              # если есть
npm run build         # если есть
```

Запиши результат каждой команды: ✅ / ❌ + вывод ошибки.

Если какая-то команда fails:
1. Одна попытка исправить — запусти sub-agent с контекстом ошибки
2. Коммит по конвенции из `reference/commit-convention.md`.
3. Перезапусти failed команды
4. Если снова fails → записать как issue в report, продолжить

Отметь в TodoWrite: [x]

**Переход →** Фаза 6.

---

## Фаза 6 — Document

Запусти sub-agent через Agent tool. Промт — из `agents/doc-updater.md`.

Передай:
- Список изменённых файлов
- SLUG и task title
- Requirements из plan-файла

Sub-agent решает что обновить:
- README если изменился API или добавлена фича
- CHANGELOG если есть
- JSDoc/TSDoc для новых/изменённых экспортируемых функций

**Не создавать документацию с нуля если её не было.**

После завершения:
- Коммит по конвенции из `reference/commit-convention.md`.
- Отметь в TodoWrite: [x]

**Переход →** Фаза 7.

---

## Фаза 7 — Format + Report

### 7a. Format

Определи formatter проекта:
- `.prettierrc` или `prettier` в package.json → `npx prettier --write`
- `.eslintrc` или `eslint` в package.json → `npx eslint --fix`
- `biome.json` → `npx biome format --write`
- Ничего не найдено → пропустить

Прогнать на всех изменённых файлах.

Коммит по конвенции из `reference/commit-convention.md`.
Отметь в TodoWrite: [x]

### 7b. Report

Прочитай `reference/report-format.md`.

Запиши `docs/ai/<SLUG>/<SLUG>-report.md`:
- Статусы всех tasks (DONE / BLOCKED / SKIPPED)
- Хэши и сообщения всех коммитов
- Concerns (если были DONE_WITH_CONCERNS)
- Blocked tasks (причины + impact)
- Post-implementation статусы (simplify, cleanup, validate, document)
- Validation result (каждая команда: ✅/❌)
- Changes summary (файл, action, описание)

### 7c. Notification

Выведи итог пользователю:

```
✅ <SLUG> done (N/M tasks)
Report: docs/ai/<SLUG>/<SLUG>-report.md
```

Или если были проблемы:

```
⚠️ <SLUG> done with issues (N/M tasks, K blocked)
Report: docs/ai/<SLUG>/<SLUG>-report.md
```

---

## Правила

- **Без остановки.** Никаких подтверждений между шагами. Запустил — работает до конца.
- **Один коммит на этап.** feat для tasks, refactor для simplify, chore для cleanup/format, docs для documentation, fix для исправлений validation.
- **Работа в текущей директории.** Не создавать worktrees, не управлять ветками.
- **Context isolation.** Sub-agent получает только свой task, не весь план.
- **TodoWrite обновляется.** Каждый шаг отмечается сразу по завершении.
- **При BLOCKED — продолжать.** Останавливать только зависимую ветку, не всё.
- Язык контента — язык оригинального plan-файла.
