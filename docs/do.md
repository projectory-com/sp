# Скилл /do

Выполняет задачу по плану от начала до конца без остановки. Читает plan-файл,
выполняет tasks, прогоняет post-implementation pipeline (simplify, cleanup, validate,
document), пишет отчёт. Разработчик запускает и уходит — возвращается по notification.

## Вход

`$ARGUMENTS` — путь к plan-файлу, созданному скиллом `/sp:plan`.

```
/sp:do docs/ai/86-black-jack-page/86-black-jack-page-plan.md
```

## Pipeline

7 этапов. Каждый отмечается в TodoWrite. Без подтверждений между шагами.

| Этап | Название     | Что происходит                                                                                         |
| ---- | ------------ | ------------------------------------------------------------------------------------------------------ |
| 1    | **Parse**    | Чтение plan-файла, извлечение Mode, tasks, depends_on, verification. Создание todo list.               |
| 2    | **Execute**  | Выполнение tasks: inline (trivial/simple) или sub-agents sequential (medium/complex). Status protocol. |
| 3    | **Simplify** | Sub-agent упрощает код: over-engineering, дублирование, лишние абстракции                              |
| 4    | **Cleanup**  | Sub-agent удаляет мусор: отладочные логи, закомментированный код, неиспользуемые импорты               |
| 5    | **Validate** | Прямое выполнение: lint, type-check, tests, build. Одна попытка исправить при fail.                    |
| 6    | **Document** | Sub-agent обновляет README, CHANGELOG, JSDoc/TSDoc для новых экспортов                                 |
| 7    | **Report**   | Запись report-файла, форматирование кода, notification                                                 |

## Выход

Файл `docs/ai/<slug>/<slug>-report.md` со структурой:

- **Header** — Plan, Mode, Status (complete / partial / failed)
- **Tasks** — таблица статусов каждого task (DONE, BLOCKED, SKIPPED)
- **Post-implementation** — статусы simplify, cleanup, validate, document, format
- **Concerns** — сомнения от sub-agents (если были DONE_WITH_CONCERNS)
- **Validation** — результат каждой команды (lint, tests, build)
- **Changes summary** — файлы, действия, описания
- **Commits** — хеши и сообщения в хронологическом порядке

## Режимы выполнения

`/do` читает режим из полей `Mode` и `Complexity` plan-файла:

| Режим                   | Когда            | Характеристика                                                        |
| ----------------------- | ---------------- | --------------------------------------------------------------------- |
| `inline`                | trivial / simple | Последовательно в текущем треде, минимум overhead                     |
| `sub-agents sequential` | medium / complex | Каждый task — отдельный sub-agent через Agent tool, context isolation |

V1 выполняет всё sequential. `Parallel: true` в плане игнорируется.
`Mode: agent-team` → fallback на sub-agents sequential.

## Status protocol

Sub-agents возвращают статус после выполнения task:

| Status               | Значение                          | Действие оркестратора                              |
| -------------------- | --------------------------------- | -------------------------------------------------- |
| `DONE`               | Задача выполнена, verify проходит | Коммит, следующий task                             |
| `DONE_WITH_CONCERNS` | Выполнена, но есть сомнения       | Коммит, записать concerns в report                 |
| `NEEDS_CONTEXT`      | Не хватает информации             | Добавить контекст, re-dispatch (макс 1 retry)      |
| `BLOCKED`            | Невозможно выполнить              | Пропустить зависимые tasks, продолжить независимые |

## Субагенты

| Агент             | Модель | Роль                                                         |
| ----------------- | ------ | ------------------------------------------------------------ |
| `task-executor`   | sonnet | Выполняет один task: реализация, верификация, коммит         |
| `code-simplifier` | sonnet | Упрощает код: over-engineering, дублирование, лишние обёртки |
| `cleanup`         | haiku  | Удаляет мусор: логи, комментарии, неиспользуемые импорты     |
| `doc-updater`     | sonnet | Обновляет README, CHANGELOG, JSDoc/TSDoc                     |

## Пример

```
/sp:do docs/ai/86-black-jack-page/86-black-jack-page-plan.md
```

## Связи

```
/sp:task → /sp:plan → /sp:do → /sp:review
```

`/task` создаёт описание задачи. `/plan` строит план. `/do` выполняет план. `/review` готовит отчёт.
