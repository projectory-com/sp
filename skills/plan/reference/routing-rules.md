# Routing Rules

Правила выбора стратегии выполнения. Читай в Фазе 3 (Route).

---

## Таблица решений

Применяй сверху вниз — первое совпадение побеждает.

| #   | Complexity | Tasks | File intersections  | Cross-layer | → Mode       | → Parallel |
| --- | ---------- | ----- | ------------------- | ----------- | ------------ | ---------- |
| 1   | trivial    | 1-2   | —                   | —           | `inline`     | false      |
| 2   | simple     | 1-2   | none                | no          | `inline`     | false      |
| 3   | simple     | 2-3   | none                | no          | `sub-agents` | true       |
| 4   | medium     | 3+    | none between groups | no          | `sub-agents` | true       |
| 5   | medium     | 3+    | some                | no          | `sub-agents` | mixed\*    |
| 6   | medium     | 3+    | any                 | yes         | `agent-team` | true       |
| 7   | complex    | any   | none between groups | no          | `sub-agents` | true       |
| 8   | complex    | any   | any                 | yes         | `agent-team` | true       |
| 9   | complex    | any   | heavy               | any         | `agent-team` | false      |

\*mixed = параллельные группы где нет пересечений, sequential между группами с общими файлами.

---

## Определения

**File intersection** — два task'а изменяют один и тот же файл.

- `none` = ни одна пара tasks не имеет общих файлов
- `some` = есть пересечения, но можно выделить независимые группы
- `heavy` = большинство tasks трогают общие файлы

**Cross-layer** — план содержит tasks из разных слоёв:

- frontend (React, Vue, CSS, компоненты)
- backend (API, сервисы, БД)
- infrastructure (конфиг, CI, деплой)
- tests (отдельный test-task, не тесты внутри feature-task)

Если tasks из 2+ слоёв и _каждый слой имеет 2+ tasks_ → cross-layer = yes.
Если один backend-task + один test-task → cross-layer = no (тесты при feature — норма).

---

## Mode: inline

Выполнение в текущем треде, последовательно. Без sub-agents.

**Когда:** простые задачи, 1-3 files, всё в одном модуле.
**Преимущество:** минимум overhead, полный контекст в одном окне.
**Риск:** блокирует сессию.

---

## Mode: sub-agents

Каждый task → отдельный sub-agent через Task tool.
Параллельные tasks запускаются одновременно (если parallel=true).

**Когда:** 3+ tasks, есть независимые группы, одна кодовая база.
**Преимущество:** параллелизм, context isolation, каждый agent фокусирован.
**Риск:** merge conflicts при параллельных изменениях общих файлов.

Для sub-agents:

- `isolation: worktree` если parallel=true
- `isolation: none` если parallel=false (sequential)

---

## Mode: agent-team

Полноценная команда агентов с координацией через TeamCreate.
Требует `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

**Когда:** cross-layer задачи, нужна координация между частями.
**Преимущество:** agents могут общаться друг с другом, разделять находки.
**Риск:** высокий token cost, coordination overhead.

Структура team:

- **Lead** — координатор (текущая сессия)
- **Teammates** — по одному на слой (frontend, backend, tests)
- Shared task list для координации

**Fallback:** если agent-team недоступен (нет feature flag) → degrade до sub-agents.

---

## Parallel groups

Если mode=sub-agents и parallel=true, определи группы:

```
Group 1 (parallel): Task 1, Task 2    # нет общих файлов
Group 2 (parallel): Task 3, Task 4    # нет общих файлов
─── barrier ───
Group 3 (sequential): Task 5          # зависит от Group 1 + 2
```

Barrier = все tasks в группе завершены прежде чем следующая группа стартует.

---

## Как записать routing в plan-файл

```markdown
## Execution

- **Mode:** sub-agents
- **Parallel:** true
- **Reasoning:** 5 tasks, 2 параллельные группы без пересечений, все в одной кодовой базе
- **Order:**
  Group 1 (parallel): Task 1, Task 2
  Group 2 (sequential): Task 3 → Task 4
  Group 3 (sequential): Task 5
```
