# Скилл /pr

Создаёт или обновляет GitHub Pull Request. Формирует description из артефактов sp flow
(review + report), с акцентом на "что проверить при ревью". Без артефактов — fallback
на коммиты и diff. Поддерживает PR template, auto-labels и маркеры для обновления.

## Вход

`$ARGUMENTS` (опциональный) — флаги: `--draft`, `--base <branch>`.

```
/sp:pr
/sp:pr --draft
/sp:pr --base develop
```

## Фазы

| Фаза | Название     | Что происходит                                                                     |
| ---- | ------------ | ---------------------------------------------------------------------------------- |
| 1    | **Collect**  | Субагент собирает: ветка, slug, PR, review/report файлы, template, коммиты, labels |
| 2    | **Decide**   | Оркестратор: блокирующие ошибки, create vs update, draft, DATA_SOURCE              |
| 3    | **Generate** | Субагент синтезирует PR body из review/report или fallback                         |
| 4    | **Execute**  | Оркестратор: `gh pr create` или `gh pr edit`, labels                               |
| 5    | **Next**     | Оркестратор: завершение                                                            |

## Источники данных (DATA_SOURCE)

| Источник     | Условие                 | Содержимое PR body                                                |
| ------------ | ----------------------- | ----------------------------------------------------------------- |
| `sp_full`    | review + report найдены | Summary, Attention, Design decisions, Questions, Risks, Test plan |
| `sp_partial` | только report           | Summary, Test plan, Changes, Commits                              |
| `fallback`   | нет артефактов sp       | Summary из коммитов, Changes, Commits, generic Test plan          |

## PR body

Генерируемый контент оборачивается в `<!-- sp:start -->` / `<!-- sp:end -->` маркеры.
При update — заменяется только содержимое между маркерами, текст пользователя сохраняется.

Ключевой принцип: description отвечает на "что проверить при ревью", а не "что было сделано".

## Auto-link и auto-labels

Ticket ID из slug: `86-feature` → `Closes #86`, `R2-208-feature` → `Ticket: R2-208`.

Labels из типа коммитов: `feat` → `enhancement`, `fix` → `bug`, `refactor` → `maintenance`.
Назначаются только существующие в репозитории labels.

## Субагенты

| Агент               | Модель | Роль                                                      |
| ------------------- | ------ | --------------------------------------------------------- |
| `pr-data-collector` | haiku  | Сбор данных: PR, review/report, template, коммиты, labels |
| `pr-body-generator` | sonnet | Синтез PR body из артефактов (reasoning-задача)           |

## Пример

```
/sp:pr
```

Результат: PR на GitHub со структурированным description из review и report.

## Связи

Типичный flow: `/task` → `/plan` → `/do` → `/review` → `/gca` → `/gp` → `/pr`.
Работает standalone — создаёт PR из коммитов без артефактов sp.
Использует `reference/pr-body-format.md` для формата body и маппинга секций.
