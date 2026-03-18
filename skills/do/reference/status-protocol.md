# Status Protocol

Протокол статусов sub-agent'ов и review loop.

---

## Статусы implementer-а

Sub-agent возвращает один из четырёх статусов после выполнения task'а.

### DONE

Задача выполнена. Verify проходит. Коммит сделан.

**Действие оркестратора:**

1. Если коммит не сделан sub-agent'ом — сделать
2. Запустить spec review → quality review (см. Review Loop)
3. Отметить task в TodoWrite
4. Перейти к следующему task

### DONE_WITH_CONCERNS

Задача выполнена, но sub-agent сомневается. Код работает, Verify проходит.

**Действие оркестратора:**

1. Прочитать concerns
2. Если concern о корректности или скоупе — оценить перед review:
   - Concern обоснован → записать, продолжить к review
   - Concern критичен → остановить как BLOCKED
3. Если concern — наблюдение (файл разрастается, нетипичный паттерн) — записать и продолжить
4. Записать concerns в данные для report
5. Коммит если не сделан, запустить review loop

### NEEDS_CONTEXT

Sub-agent'у не хватило информации. Задача не выполнена.

**Действие оркестратора:**

1. Прочитать что именно нужно
2. Найти информацию (файлы, контекст из плана)
3. Re-dispatch sub-agent с добавленным контекстом (макс 1 retry)
4. Если после retry снова NEEDS_CONTEXT → re-dispatch с более мощной моделью
5. Если и это не помогло → BLOCKED

### BLOCKED

Задача не может быть выполнена.

**Действие оркестратора:**

1. Оценить blocker:
   - Проблема контекста → дать больше контекста, re-dispatch
   - Задача слишком сложная → re-dispatch с более мощной моделью
   - Задача слишком большая → разбить на части (если возможно в рамках плана)
   - План ошибочен → записать, продолжить с независимыми tasks
2. Пометить зависимые tasks как SKIPPED
3. Продолжить с независимыми tasks

**Не останавливать всё выполнение.** Блокируются только tasks зависящие от заблокированного.

---

## Review Loop

После каждого DONE/DONE_WITH_CONCERNS — двухэтапный review.

### Этап 1 — Spec Compliance Review

Dispatch `agents/spec-reviewer.md`:

- Передать: task requirements + implementer report
- Reviewer верифицирует по коду, не по отчёту

**Результат:**

- ✅ Spec compliant → Этап 2
- ❌ Issues → implementer фиксит → re-dispatch spec reviewer (макс 3 итерации)
- 3 итерации без ✅ → записать issues, продолжить к quality review

### Этап 2 — Code Quality Review

Dispatch `agents/quality-reviewer.md`:

- Передать: BASE_SHA, HEAD_SHA, task requirements
- Dispatch **только после ✅ от spec reviewer**

**Результат:**

- ✅ Approved → task complete
- ❌ Critical/Important issues → implementer фиксит → re-dispatch quality reviewer (макс 3 итерации)
- Minor issues → записать, не блокировать
- 3 итерации без ✅ → записать issues, продолжить

---

## Model Escalation

Если sub-agent не справляется:

1. Первый dispatch — модель из agent frontmatter (обычно sonnet)
2. Если BLOCKED или NEEDS_CONTEXT повторно → re-dispatch с opus
3. Если и opus не справился → записать как BLOCKED, escalate в report

---

## Parallel Dispatch

Когда план содержит parallel groups в Execution Order:

```
Group 1 (parallel): Task 1, Task 2
─── barrier ───
Group 2 (sequential): Task 3 → Task 4
```

**Правила:**

- Parallel group: dispatch все tasks одновременно через Agent tool
- Barrier: дождаться завершения всех tasks группы перед следующей
- Sequential: dispatch по одному, в порядке зависимостей
- Если task в parallel group BLOCKED → не блокировать другие tasks в той же группе

**Когда НЕ параллелить:**

- Tasks трогают одни и те же файлы (file intersection)
- Tasks имеют depends_on между собой
- Нет явных parallel groups в плане

---

## Отслеживание

Для каждого task записывай:

- Status (DONE / DONE_WITH_CONCERNS / BLOCKED / SKIPPED)
- Concerns (текст, если есть)
- Block reason (текст, если BLOCKED)
- Commit hash (если был коммит)
- Retry count (0, 1, или 2 с model escalation)
- Spec review result (✅/❌ + issues)
- Quality review result (✅/❌ + issues)
- Файлы изменённые sub-agent'ом (FILES_CHANGED)

Эти данные попадают в report-файл.
