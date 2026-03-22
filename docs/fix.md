# Скилл /fix

Compressed pipeline для мелких доработок и фиксов (1-3 файла). Заменяет неструктурированный
"просто поправь в чат" полноценным flow: исследование, реализация (opus), post-processing, артефакт.

## Вход

`$ARGUMENTS` — описание фикса или URL PR-комментария.

```
/sp:fix поправить валидацию email — не обрабатывает пустую строку
/sp:fix увеличить таймаут reconnect с 5s до 15s
/sp:fix https://github.com/owner/repo/pull/42#discussion_r123456
```

## Два режима

### Post-flow

После `task → plan → do`. Контекст горячий, артефакты в `docs/ai/<slug>/`.
Fix дополняет существующую задачу.

```
/sp:task → /sp:plan → /sp:do → /sp:fix "поправить валидацию"
                                       → /sp:fix "добавить loading state"
                                       → /sp:review
```

### Standalone

Мелкая доработка на любой ветке, без предшествующего flow.

```
/sp:fix исправить overflow в navbar на mobile
```

## Фазы

| Фаза | Название         | Агент                                             | Модель      | Что происходит                                     |
| ---- | ---------------- | ------------------------------------------------- | ----------- | -------------------------------------------------- |
| 1    | **Collect**      | fix-context-collector                             | haiku       | Определяет mode, slug, fix number, пути артефактов |
| 2    | **Investigate**  | fix-investigator                                  | sonnet      | Находит файлы, паттерны, constraints               |
| 3    | **Decide**       | оркестратор                                       | —           | Scope guard, уточнения, промт для implementer      |
| 4    | **Implement**    | task-executor (/do)                               | opus        | Реализует фикс, коммитит                           |
| 5    | **Post-process** | polisher, validator, doc-updater, formatter (/do) | opus/sonnet | Polish, validate, docs, format                     |
| 6    | **Artifact**     | fix-log-writer                                    | haiku       | Записывает fix-log                                 |
| 7    | **Complete**     | оркестратор                                       | —           | Итог + AskUserQuestion (ещё fix / review / выход)  |

## Scope guard

Фикс для 1-3 файлов. Если investigator определил 4+ файлов или архитектурные решения — оркестратор предлагает escalate в `/sp:task`.

## Chain awareness

Каждый `/fix` в цепочке читает предыдущие записи из fix-log. Fix-2 знает об изменениях Fix-1 и избегает конфликтов.

## Выход

Реализованный код + запись в `docs/ai/<slug>/<slug>-fixes.md`.

## Отличие от /do

| Аспект    | /do                                  | /fix                             |
| --------- | ------------------------------------ | -------------------------------- |
| Scope     | 1-20 файлов, архитектурные решения   | 1-3 файла, точечные изменения    |
| Planning  | design decisions, decomposition, DAG | нет — один task                  |
| Execution | per-task loop с review (sonnet)      | один pass без review loop (opus) |
| Артефакт  | task.md + plan.md + report.md        | одна запись в fixes.md           |

## Связи

- `/do` — источник переиспользуемых агентов (task-executor, code-polisher, validator, doc-updater, formatter)
- `/task` — escalation target при scope guard
- `/review` — следующий шаг после цепочки fix'ов
