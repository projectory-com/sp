# Status Protocol

Протокол статусов sub-agent'ов. Читай перед Фазой 2 если mode = sub-agents.

Вдохновлено [obra/superpowers subagent-driven-development](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md).

---

## Статусы

Sub-agent возвращает один из четырёх статусов после выполнения task'а.

### DONE

Задача выполнена. Verify проходит. Коммит сделан.

**Действие оркестратора:**
1. Если коммит не сделан sub-agent'ом — сделать
2. Отметить task как завершённый в TodoWrite
3. Перейти к следующему task

### DONE_WITH_CONCERNS

Задача выполнена, но sub-agent сомневается. Код работает, Verify проходит.

**Действие оркестратора:**
1. Прочитать concerns
2. Если concern о корректности или скоупе — оценить перед продолжением:
   - Concern обоснован → записать, продолжить (review разберётся)
   - Concern критичен → остановить как BLOCKED
3. Если concern — наблюдение (файл разрастается, нетипичный паттерн) — записать и продолжить
4. Записать concerns в данные для report
5. Коммит если не сделан, отметить в TodoWrite
6. Перейти к следующему task

### NEEDS_CONTEXT

Sub-agent'у не хватило информации. Задача не выполнена.

**Действие оркестратора:**
1. Прочитать что именно нужно sub-agent'у
2. Попробовать найти нужную информацию:
   - Прочитать запрошенные файлы
   - Извлечь контекст из плана или task-файла
3. Re-dispatch sub-agent с добавленным контекстом (макс 1 retry)
4. Если после retry снова NEEDS_CONTEXT → перевести в BLOCKED

**Максимум:** 1 retry на task. Бесконечный loop недопустим.

### BLOCKED

Задача не может быть выполнена. Код не изменён (или частично).

**Действие оркестратора:**
1. Прочитать причину блокировки
2. Записать в данные для report
3. Определить зависимые tasks: все у которых `Depends on` содержит текущий task
4. Пометить зависимые tasks как SKIPPED (не выполнять)
5. Продолжить с независимыми tasks (не зависящими от заблокированного)

**Не останавливать всё выполнение.** Если tasks 1, 2, 3 независимы
и task 2 BLOCKED — task 1 и 3 продолжают выполняться. Блокируются
только tasks явно зависящие от task 2.

---

## Verify failure

Если task.Verify fails после выполнения sub-agent'ом (status DONE):

1. Re-dispatch sub-agent с ошибкой verify как дополнительный контекст
2. Если retry fixes → DONE
3. Если retry не fixes → BLOCKED

---

## Отслеживание

Для каждого task записывай:
- Status (DONE / DONE_WITH_CONCERNS / BLOCKED / SKIPPED)
- Concerns (текст, если есть)
- Block reason (текст, если BLOCKED)
- Commit hash (если был коммит)
- Retry count (0 или 1)
- Файлы изменённые sub-agent'ом (FILES_CHANGED из ответа)

Эти данные попадают в report-файл в Фазе 7.
