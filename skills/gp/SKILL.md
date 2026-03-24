---
name: gp
description: >-
  Git push с проверками и отчётом. Используется когда пользователь пишет
  "push", "пуш", "gp", "запушь", "отправь коммиты", "git push",
  или после выполнения /do и /review для отправки изменений.
---

# Git push с проверками и отчётом

Ты — оркестратор. Делегируй bash-команды агентам через Agent tool:

- Pre-check → `agents/git-pre-checker.md`
- Push + Report → `agents/git-pusher.md`

---

## Вход

`$ARGUMENTS` — опциональные флаги (`--force-with-lease`).

---

## Фаза 1 — Pre-check

Запусти `git-pre-checker` через Agent tool:

- Агент: `${CLAUDE_PLUGIN_ROOT}/skills/gp/agents/git-pre-checker.md`
- Промпт: «Собери состояние репозитория перед push»

Агент вернёт structured data. Переход → Фаза 2.

---

## Фаза 2 — Decide

Обработай данные pre-checker. Проверки идут от блокирующих к интерактивным.

### 1. Блокирующие ошибки — выход

- `BRANCH = DETACHED` → сообщи: «Checkout ветку перед push», выйди
- `GH_AUTH = not_installed` → сообщи: «Установи gh CLI: https://cli.github.com», выйди
- `GH_AUTH = not_authenticated` → сообщи: «Авторизуйся: `gh auth login`», выйди
- `REMOTE_URL` пуст → сообщи: «Добавь remote: `git remote add origin <url>`», выйди
- `UNPUSHED_COMMITS = 0` и `HAS_UPSTREAM = true` и `UNCOMMITTED_FILES = 0` → сообщи: «Nothing to push», выйди

### 2. Защита default branch

Если `IS_DEFAULT_BRANCH = true` → AskUserQuestion:

> Push в `<BRANCH>` — default branch. Продолжить?

Варианты:

- **Продолжить**
- **Отменить** → выйди

### 3. Uncommitted changes

Если `UNCOMMITTED_FILES > 0` → AskUserQuestion:

> Незакоммиченные изменения (N файлов):

Покажи список файлов из `UNCOMMITTED_LIST`.

Варианты:

- **Закоммитить и пушить** → запроси commit message через AskUserQuestion, стейджи файлы из `UNCOMMITTED_LIST` по именам (не `git add -A`), выполни `git commit -m "<message>"`
- **Пушить только закоммиченное** → продолжай
- **Отменить** → выйди

### 4. Nothing to push после коммита

Если пользователь выбрал «Пушить только закоммиченное» и `UNPUSHED_COMMITS = 0` → сообщи: «Nothing to push», выйди.

### 5. Определить PUSH_MODE

- `HAS_UPSTREAM = false` → `set-upstream`
- `$ARGUMENTS` содержит `--force-with-lease` → `force-with-lease`
- Иначе → `normal`

Переход → Фаза 3.

---

## Фаза 3 — Push + Report

Запусти `git-pusher` через Agent tool:

- Агент: `${CLAUDE_PLUGIN_ROOT}/skills/gp/agents/git-pusher.md`
- Промпт: «Выполни push и собери отчёт. BRANCH: `<BRANCH>`, PUSH_MODE: `<PUSH_MODE>`, SLUG: `<SLUG>`»

### Если PUSH_STATUS = FAILED

Покажи `PUSH_ERROR`.

Если ошибка содержит «non-fast-forward» → предложи:

> `git pull --rebase` или `/sp:gp --force-with-lease`

Выйди.

Переход → Фаза 4.

---

## Фаза 4 — Report

Выведи отчёт пользователю:

```
Pushed to origin/<BRANCH>: +N коммитов

Коммиты:
  <hash> <message>
  <hash> <message>

Статистика: <DIFF_STAT>

Ссылка: <BRANCH_URL>
```

Если `PR_EXISTS = true` — добавь:

```
PR: <PR_TITLE> (<PR_URL>)
```

Если `PR_EXISTS = false` — добавь:

```
PR не найден.
```

AskUserQuestion — что дальше:

Если `PR_EXISTS = true`:

- **Обновить PR через /sp:pr (Recommended)** — `<PR_TITLE>` (`<PR_URL>`)
- **Завершить** → выйди

Если `PR_EXISTS = false`:

- **Создать PR через /sp:pr (Recommended)**
- **Завершить** → выйди

Обработка: `/sp:pr` → вызвать Skill tool с `/sp:pr`. Завершить → выйди.

---

## Правила

- Делегируй bash-команды агентам.
- AskUserQuestion — только в оркестраторе.
- Remote: `origin`. При нескольких remote — пушить в origin.
- Лимиты вывода: max 20 коммитов, max 30 файлов.
