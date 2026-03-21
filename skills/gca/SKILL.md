---
name: gca
description: >-
  Git staging and commit with smart file grouping and SP flow awareness.
  This skill should be used when the user asks to commit changes, stage files,
  make a git commit, "commit this", "save my work", "gca", "закоммить",
  "сделай коммит", "закоммитить изменения", or when any other skill needs
  to commit results. Also use after completing /task, /plan, /do, /review
  to commit artifacts.
---

# Git Commit с умной группировкой

Оркестратор коммитов: определяет контекст, классифицирует файлы, группирует в атомарные коммиты, формирует сообщения.

---

## Шаг 1 — Сбор контекста

Выполни параллельно:

```bash
git status --porcelain
```

```bash
git diff HEAD --stat
```

```bash
git branch --show-current
```

```bash
git ls-files --others --exclude-standard
```

Если изменений нет — сообщи пользователю и останови.

---

## Шаг 2 — Определение контекста

Определи режим: SP flow или standalone.

### Обнаружение SP flow

`$ARGUMENTS` содержит путь к `docs/ai/` или slug? В `docs/ai/*/` есть недавние артефакты? Если да:

- `MODE = sp-flow`
- `SLUG` = из пути или имени директории
- `TICKET_ID` = извлечь из slug по `reference/commit-convention.md`

### Standalone режим

Если SP flow не обнаружен:

- `MODE = standalone`
- `SLUG` = имя текущей ветки без префикса (`feature/`, `fix/`, `hotfix/`, `bugfix/`, `release/`). Если ветка `main`/`master`/`develop` — slug опустить.

---

## Шаг 3 — Определение Ticket ID

Примени каскад из `reference/commit-convention.md`:

1. **Из `$ARGUMENTS`** — пользователь передал ticket ID или URL
2. **Из slug** (SP flow) — извлечь из паттерна slug
3. **Из имени ветки** (standalone) — извлечь по regex-паттернам
4. **Спросить пользователя** — через AskUserQuestion: «Без тикета» / «Ввести номер»

---

## Шаг 4 — Классификация и стейджинг

### Режим SP flow

После скила task/plan/do/review коммить только артефакт этого этапа:

```
#86 docs(86-black-jack-page): add task definition
#86 docs(86-black-jack-page): add implementation plan
#86 docs(86-black-jack-page): add execution report
#86 docs(86-black-jack-page): add review report
```

### Standalone режим

Прочитай `reference/staging-strategy.md` и примени:

1. Собери все изменённые/новые файлы
2. Классифицируй по группам (feature, test, docs, style, chore, sp-artifacts)
3. Определи атомарные коммиты по группам
4. Исключи .env, credentials, большие бинарники — предупреди пользователя об исключённых файлах
5. Покажи план коммитов пользователю через AskUserQuestion

---

## Шаг 5 — Формирование сообщений

Прочитай `reference/commit-convention.md`. Для каждого запланированного коммита:

- Формат: `TICKET type(SLUG): description` (БЕЗ двоеточия после ticket)
- Язык: ВСЕГДА английский
- Ticket ID первым (если есть)
- Описание: одно предложение, imperative mood

---

## Шаг 6 — Выполнение коммитов

Для каждого запланированного коммита:

1. `git add` конкретные файлы по именам (не `git add -A`)
2. `git commit -m "<message>"` — без Co-Authored-By, без trailers
3. Покажи результат: хэш, сообщение, список файлов

---

## Правила

- Коммиты на английском. Без исключений.
- Один коммит — одно логическое изменение.
- Ticket ID первым в сообщении (если есть).
- Стейджи файлы по именам, не `git add -A`.
- Исключи секреты, credentials, большие бинарники.
- Избегай `wip`, `temp`, `misc`.
- Исключи Co-Authored-By, Signed-off-by и любые trailer lines.
- В standalone режиме запроси подтверждение перед выполнением нескольких коммитов.

## Справочные файлы

- **`reference/commit-convention.md`** — формат сообщений, извлечение ticket ID, таблица типов, логика slug
- **`reference/staging-strategy.md`** — классификация файлов, алгоритм группировки, порядок коммитов (только standalone режим)
