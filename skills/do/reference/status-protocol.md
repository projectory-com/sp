# Status Protocol

Протокол статусов sub-agent'ов и review loop.

---

## Статусы implementer-а

Sub-agent возвращает один из четырёх статусов после выполнения task.

### DONE

Задача выполнена. Verify проходит. Коммит сделан.

**Действие оркестратора:**

1. Если sub-agent не закоммитил — закоммить
2. Запусти spec review → quality review (см. Review Loop)
3. Отметь task в TodoWrite
4. Перейди к следующему task

### DONE_WITH_CONCERNS

Задача выполнена, но sub-agent сомневается. Код работает, Verify проходит.

**Действие оркестратора:**

1. Прочитай concerns
2. Concern о корректности или скоупе — оцени перед review:
   - Обоснован → запиши, продолжи к review
   - Критичен → останови как BLOCKED
3. Concern-наблюдение (файл разрастается, нетипичный паттерн) — запиши и продолжи
4. Запиши concerns в данные для report
5. Закоммить если не сделано, запусти review loop

### NEEDS_CONTEXT

Sub-agent'у не хватило информации. Задача не выполнена.

**Действие оркестратора:**

1. Прочитай что именно нужно
2. Найди информацию (файлы, контекст из плана)
3. Re-dispatch sub-agent с добавленным контекстом (макс 1 retry)
4. После retry снова NEEDS_CONTEXT → re-dispatch с более мощной моделью
5. И это не помогло → BLOCKED

### BLOCKED

Задача не может быть выполнена.

**Действие оркестратора:**

1. Оцени blocker:
   - Проблема контекста → дай больше контекста, re-dispatch
   - Задача слишком сложная → re-dispatch с более мощной моделью
   - Задача слишком большая → разбей на части (если возможно в рамках плана)
   - План ошибочен → запиши, продолжи с независимыми tasks
2. Пометь зависимые tasks как SKIPPED
3. Продолжи с независимыми tasks

**Всё выполнение не останавливай.** Блокируй только tasks, зависящие от заблокированного.

---

## Review Loop

После каждого DONE/DONE_WITH_CONCERNS — двухэтапный review.

### Этап 1 — Spec Compliance Review

Dispatch `agents/spec-reviewer.md`:

- Передать: task requirements + implementer report
- Reviewer верифицирует по коду, а не по отчёту

**Результат:**

- ✅ Spec compliant → Этап 2
- ❌ Issues → implementer фиксит → re-dispatch spec reviewer (макс 3 итерации)
- 3 итерации без ✅ → записать issues, продолжить к quality review

### Этап 2 — Code Quality Review

Dispatch `agents/quality-reviewer.md`:

- Передать: BASE_SHA, HEAD_SHA, task requirements
- Dispatch только после ✅ от spec reviewer

**Результат:**

- ✅ Approved → task complete
- ❌ Critical/Important issues → implementer фиксит → re-dispatch quality reviewer (макс 3 итерации)
- Minor issues → записать, не блокировать
- 3 итерации без ✅ → записать issues, продолжить

---

## Model Escalation

Когда sub-agent не справляется:

1. Первый dispatch — модель из agent frontmatter (обычно sonnet)
2. BLOCKED или NEEDS_CONTEXT повторно → re-dispatch с opus
3. Opus тоже не справился → запиши как BLOCKED, escalate в report

---

## Parallel Dispatch

При наличии parallel groups в Execution Order:

```
Group 1 (parallel): Task 1, Task 2
─── barrier ───
Group 2 (sequential): Task 3 → Task 4
```

**Правила:**

- Parallel group: dispatch все tasks одновременно через Agent tool
- Barrier: дождись завершения всех tasks группы перед следующей
- Sequential: dispatch по одному в порядке зависимостей
- Task в parallel group BLOCKED → остальные tasks группы продолжай

**Не параллель:**

- Tasks затрагивают одни и те же файлы (file intersection)
- Tasks связаны через depends_on
- В плане нет явных parallel groups

---

## Отслеживание

По каждому task записывай:

- Status (DONE / DONE_WITH_CONCERNS / BLOCKED / SKIPPED)
- Concerns (текст, если есть)
- Block reason (текст, если BLOCKED)
- Commit hash (если был коммит)
- Retry count (0, 1, или 2 с model escalation)
- Spec review result (✅/❌ + issues)
- Quality review result (✅/❌ + issues)
- Файлы, изменённые sub-agent'ом (FILES_CHANGED)

Все данные попадают в report-файл.
