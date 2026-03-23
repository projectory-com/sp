# Скилл /fix

Compressed pipeline для мелких доработок и фиксов (1-3 файла). Заменяет неструктурированный
"просто поправь в чат" полноценным flow: исследование, реализация (opus), post-processing, артефакт.
Два режима: post-flow (после task/plan/do) и standalone. Поддерживает цепочки фиксов и fix from PR comment URL.

## Вход

`$ARGUMENTS` — описание фикса или URL PR-комментария.

```
/sp:fix поправить валидацию email — не обрабатывает пустую строку
/sp:fix увеличить таймаут reconnect с 5s до 15s
/sp:fix https://github.com/owner/repo/pull/42#discussion_r123456
```

## Фазы

| Фаза | Название         | Что происходит                                                         |
| ---- | ---------------- | ---------------------------------------------------------------------- |
| 1    | **Collect**      | Субагент определяет mode, slug, fix number, пути артефактов, ветку     |
| 2    | **Investigate**  | Субагент находит файлы, паттерны, constraints, оценивает сложность     |
| 3    | **Decide**       | Оркестратор: scope guard, уточнения, подготовка промта для implementer |
| 4    | **Implement**    | Субагент (opus) реализует фикс и коммитит                              |
| 5    | **Post-process** | Субагенты: polish (opus), validate, docs, format                       |
| 6    | **Artifact**     | Субагент записывает fix-log                                            |
| 7    | **Complete**     | Оркестратор: итог, AskUserQuestion (ещё fix / review / выход)          |

## Выход

Реализованный код + запись в `docs/ai/<slug>/<slug>-fixes.md`.

Fix-log содержит: описание, статус, изменённые файлы, validation results, коммиты.

## Субагенты

| Агент                   | Модель | Роль                                                                |
| ----------------------- | ------ | ------------------------------------------------------------------- |
| `fix-context-collector` | haiku  | Сбор контекста: mode, slug, ticket ID, fix number, пути артефактов  |
| `fix-investigator`      | sonnet | Исследование кодовой базы: файлы, паттерны, constraints, complexity |
| `task-executor` (/do)   | opus   | Реализация фикса, self-review, коммит                               |
| `code-polisher` (/do)   | opus   | Упрощение и чистка кода                                             |
| `validator` (/do)       | sonnet | Lint, type-check, tests, build + авто-фикс                          |
| `doc-updater` (/do)     | sonnet | Обновление README, CHANGELOG, JSDoc                                 |
| `formatter` (/do)       | sonnet | Форматирование кода                                                 |
| `fix-log-writer`        | haiku  | Запись/дополнение fix-log артефакта                                 |

## Пример

```
/sp:fix поправить валидацию email
```

Результат: фикс реализован (opus), отполирован, провалидирован, запись добавлена в `docs/ai/<slug>/<slug>-fixes.md`.

## Связи

```
/sp:task → /sp:plan → /sp:do → /sp:fix → /sp:review
```

`/fix` дополняет `/do` точечными доработками. При scope guard (4+ файлов) escalate в `/sp:task`.
Переиспользует 5 агентов из `/do` (task-executor, code-polisher, validator, doc-updater, formatter).
