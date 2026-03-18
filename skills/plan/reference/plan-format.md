# Plan Format

Формат выходного файла `<slug>-plan.md`. Читай в Фазе 6 (Write).

---

## Шаблон

```markdown
# <Заголовок задачи> — план реализации

**Task:** <путь к task-файлу>
**Complexity:** <trivial | simple | medium | complex>
**Mode:** <inline | sub-agents | agent-team>
**Parallel:** <true | false>

## Design decisions

### DD-1: <Что решаем>

**Решение:** <выбранный вариант>
**Обоснование:** <почему, со ссылкой на код>
**Альтернатива:** <отвергнутый вариант — почему нет>

### DD-2: ...

## Tasks

### Task 1: <название>

- **Files:** `src/path/file.ts` (create), `src/path/other.ts:45-60` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** <1-2 предложения — что конкретно сделать>
- **How:** <ключевые шаги реализации — конкретно, не "добавь валидацию">
- **Context:** <файлы и строки для чтения агентом>
- **Verify:** `npm test src/path/__tests__/file.test.ts` — зелёный

### Task 2: <название>

- **Files:** `src/path/feature.ts` (create)
- **Depends on:** Task 1
- **Scope:** M
- **What:** <что сделать>
- **Context:** <контекст>
- **Verify:** <проверка>

### Task N: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Запустить полный validation: lint, types, tests, build
- **Context:** —
- **Verify:** `npm run lint && npm run type-check && npm test && npm run build` — всё зелёное

## Execution

- **Mode:** <inline | sub-agents | agent-team>
- **Parallel:** <true | false>
- **Reasoning:** <одно предложение — почему этот mode>
- **Order:**
  Group 1 (parallel): Task 1, Task 2
  ─── barrier ───
  Group 2 (sequential): Task 3 → Task 4
  ─── barrier ───
  Group 3 (parallel): Task 5, Task 6

Формат Order: parallel группы dispatch-атся одновременно, sequential — по порядку.
Barrier = дождаться завершения всех tasks группы перед следующей.
Если все tasks sequential — записать как `Task 1 → Task 2 → Task 3`.

## Resolved questions (из задачи)

1. **Вопрос?** → Ответ: <выбранный вариант + почему>
2. ...

Если в task-файле нет отвеченных вопросов — «—»

## Уточняющие вопросы

1. **Вопрос про реализацию?**
   - [ ] Вариант A — пояснение
   - [ ] Вариант B — пояснение
   - [ ] Свой вариант: \_\_\_

2. ...

Если вопросов нет — «—»

## Verification

<Критерии из task-файла — без изменений>

## Materials

<Из task-файла — без изменений>
```

---

## Правила формата

- **Последний task — всегда Validation.** Запуск всего test suite, lint, type-check.
- **Каждый task содержит Verify.** Конкретная команда или наблюдаемое поведение.
- **Context в task — минимально достаточный.** Только файлы нужные для _этого_ task.
  Не "прочитай весь проект". Не "смотри plan-файл". Конкретные пути и строки.
- **Design decisions нумерованы** (DD-1, DD-2...) для ссылок.
- **Уточняющие вопросы** — открытые, с чекбоксами. Только про реализацию (HOW),
  не про scope/requirements (WHAT). Если вопросов нет — «—».
- **Mode и Parallel** — обязательные поля header'а.
  `/sp:do` читает их напрямую.
