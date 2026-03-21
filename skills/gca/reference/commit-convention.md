# Commit Convention

Формат коммитов для скиллов SP и standalone-вызовов.

---

## Формат

```
TICKET type(SLUG): description
```

Пример: `#86 feat(86-black-jack-page): add game page`

- **Язык**: ВСЕГДА английский. Без исключений.
- **TICKET**: первым в сообщении, через пробел (БЕЗ двоеточия после ticket). Определяется каскадом (см. секцию Ticket ID). Без тикета — опустить вместе с пробелом.
- **type**: определяется характером изменений (см. таблицу типов).
- **SLUG**: в скобках после type. Определяется контекстом (см. секцию Slug). Без slug — опустить скобки: `type: description`.
- **description**: одно предложение, imperative mood. Описывает что сделано, а не как.

### Антипаттерны

```
# НЕПРАВИЛЬНО:
R2-220: fix: restrict analytics          # двоеточие после ticket, нет slug
R2-220: fix(slug): restrict analytics    # двоеточие после ticket
fix: restrict analytics [R2-220]         # ticket в конце

# ПРАВИЛЬНО:
R2-220 fix(R2-220-fix-doubled-stats): restrict analytics
```

---

## Ticket ID

Каскад приоритетов:

### Из аргументов

Пользователь передаёт ticket ID или URL.

| Вход                               | Ticket ID  |
| ---------------------------------- | ---------- |
| `86` или `#86`                     | `#86`      |
| `R2-50`                            | `R2-50`    |
| `PROJ-123`                         | `PROJ-123` |
| `https://github.com/.../issues/86` | `#86`      |
| URL YouTrack с `/issue/PROJ-123`   | `PROJ-123` |

### Из имени ветки

| Имя ветки               | Regex          | Ticket ID  |
| ----------------------- | -------------- | ---------- |
| `86-feature-name`       | `^(\d+)-`      | `#86`      |
| `feature/86-name`       | `\/(\d+)-`     | `#86`      |
| `R2-50-feature`         | `(R\d+-\d+)`   | `R2-50`    |
| `fix/R2-50-name`        | `(R\d+-\d+)`   | `R2-50`    |
| `PROJ-123-feature`      | `([A-Z]+-\d+)` | `PROJ-123` |
| `main`, `develop`, etc. | --             | не найден  |

### Из SP flow

Внутри SP flow (`/task` -> `/plan` -> `/do` -> `/review`) ticket ID извлекается из slug:

| Паттерн slug                                | Ticket ID | Пример   |
| ------------------------------------------- | --------- | -------- |
| Начинается с числа: `86-black-jack-page`    | `#86`     | `#86`    |
| Начинается с `R\d+-\d+`: `R2-50-user-id-db` | `R2-50`   | `R2-50`  |
| Без ID: `fix-navbar-overflow`               | нет       | опустить |

### Спросить пользователя

Если каскад не определил ticket — спроси через AskUserQuestion:

- **Без тикета** — коммит без привязки
- **Ввести номер** — пользователь указывает ticket ID

---

## Типы

| Тип        | Когда                                             |
| ---------- | ------------------------------------------------- |
| `feat`     | Новая функциональность                            |
| `fix`      | Исправление бага                                  |
| `refactor` | Рефакторинг без изменения поведения               |
| `docs`     | Только документация                               |
| `test`     | Только тесты                                      |
| `chore`    | Сборка, CI, зависимости, конфиги                  |
| `style`    | Только форматирование (результат prettier/eslint) |
| `perf`     | Оптимизация производительности                    |

---

## Slug

Определяется контекстом:

### Внутри SP flow

Slug = имя директории задачи (например `86-black-jack-page` из `docs/ai/86-black-jack-page/`). Источник: активный task/plan файл в `docs/ai/` или переданный путь.

### Вне SP flow (standalone /gca)

Slug = имя текущей ветки без префикса (`feature/`, `fix/`, `hotfix/`, `bugfix/`, `release/`). Если ветка `main`, `master` или `develop` — slug опусти.

---

## Примеры

```
#86 feat(86-black-jack-page): add game page with basic layout
#86 fix(86-black-jack-page): correct score calculation on ace cards
R2-50 refactor(auth-redesign): extract token refresh into separate service
docs(86-black-jack-page): update task file with clarified requirements
chore: update dependencies
style: apply prettier formatting
```

---

## Типы для артефактов SP

Коммиты артефактов SP flow (формат `TICKET docs(SLUG): description`):

```
#86 docs(86-black-jack-page): add task definition           # после /task
#86 docs(86-black-jack-page): add implementation plan       # после /plan
#86 docs(86-black-jack-page): add execution report          # после /do
#86 docs(86-black-jack-page): add review report             # после /review
```

---

## Типы по этапам pipeline (/do)

| Этап                      | Тип        | Пример                                                  |
| ------------------------- | ---------- | ------------------------------------------------------- |
| Task: реализация фичи     | `feat`     | `#86 feat(86-black-jack-page): add SSE endpoint`        |
| Task: тесты               | `test`     | `R2-50 test(R2-50-user-id-db): add unit tests`          |
| Task: validation из плана | `chore`    | `#86 chore(86-black-jack-page): add validation`         |
| Polish                    | `refactor` | `#86 refactor(86-black-jack-page): simplify components` |
| Validate fix              | `fix`      | `#86 fix(86-black-jack-page): fix lint errors`          |
| Documentation             | `docs`     | `#86 docs(86-black-jack-page): update docs`             |
| Format                    | `chore`    | `#86 chore(86-black-jack-page): format code`            |

---

## Правила

- Один коммит — одно логическое изменение.
- Ticket ID первым в сообщении (если есть).
- Избегай `wip`, `temp`, `misc`.
- Исключи секреты и credentials.
- Исключи `Co-Authored-By`, `Signed-off-by` и любые trailer lines.
- Сообщение коммита: краткое, конкретное, imperative mood, на английском.
- Task с реализацией и тестами — тип `feat` (тесты идут вместе с фичей).
- Task только с тестами — тип `test`.
