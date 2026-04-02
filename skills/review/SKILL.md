---
name: review
description: >-
  Code review с поиском проблем, автоматическим исправлением и расширенным отчётом.
  Используется когда пользователь пишет "review", "ревью", "code review",
  "найди проблемы", "найди баги", "проверь код", "анализ кода", "check code",
  "подготовь отчёт", "что не так с кодом", или после /do для анализа изменений.
---

# Code review с автоматическим исправлением

Ты — оркестратор. Общаешься с пользователем и координируешь sub-agent'ов.

Агенты:

- Анализ → `agents/code-reviewer.md`
- Исправления → `agents/issue-fixer.md` (→ `agents/single-fix-agent.md`)
- Отчёт → `agents/review-report-writer.md`
- Валидация → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/validator.md`
- Форматирование → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/formatter.md`

Работай непрерывно. Две паузы: выбор scope фиксов и финальное действие.

---

## Вход

`$ARGUMENTS` — task-slug или путь к task-файлу.

Если пользователь не передал — определи slug из текущей ветки или последнего каталога `docs/ai/*/`.

---

## Pipeline

6 фаз. Каждую отмечай в TodoWrite.

```
1. Parse     → определить SLUG, собрать контекст
2. Analyze   → dispatch code-reviewer
3. Select    → показать проблемы, выбрать scope фиксов
4. Fix       → dispatch issue-fixer + validator + formatter
5. Finalize  → dispatch report-writer + PR-комментарии + commit
6. Complete  → нотификация + выбор действия
```

---

### Фаза 1 — Parse

**1.** Определи `SLUG`:

- Из `$ARGUMENTS` (если slug)
- Из пути к task-файлу: `docs/ai/<slug>/<slug>-task.md`
- Из текущей ветки или последнего каталога `docs/ai/*/`

**2.** Путь к task-файлу: `docs/ai/<SLUG>/<SLUG>-task.md`.
Если файл отсутствует — передай `—` в sub-agent.

**3.** Извлеки `TICKET_ID` из SLUG (по `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`).

**4.** Post-flow awareness — проверь артефакты:

- `docs/ai/<SLUG>/<SLUG>-report.md` — собери KNOWN_ISSUES из секций Concerns и quality review results
- `docs/ai/<SLUG>/<SLUG>-fixes.md` — добавь к KNOWN_ISSUES список исправлений
- Артефакты отсутствуют — KNOWN_ISSUES = `—`

**Переход:** SLUG, TICKET_ID, KNOWN_ISSUES определены → Фаза 2.

---

### Фаза 2 — Analyze

Dispatch code-reviewer через Agent tool. Прочитай `agents/code-reviewer.md`, подставь {{SLUG}}, {{TASK_FILE_PATH}}, {{KNOWN_ISSUES}}.

Получи SUMMARY + ISSUES + ISSUES_COUNT.

Если ISSUES_COUNT = 0 → пропусти Фазы 3-4, перейди к Фазе 5 (отчёт без фиксов).

**Переход:** SUMMARY и ISSUES получены → Фаза 3.

---

### Фаза 3 — Select

**1.** Отправь нотификацию:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill review --phase Select --slug "$SLUG" --title "Найдено N проблем" --body "Critical: X, Important: Y, Minor: Z"
```

**2.** Покажи пользователю все issues (кратко: severity, category, file:line, description).

**3.** Через AskUserQuestion предложи scope:

- **"Fix Critical + Important (Recommended)"** — исключить Minor
- **"Fix only Critical"** — только score >= 80
- **"Fix all"** — все issues
- **"Skip fixes"** — только отчёт, без исправлений

**4.** Отфильтруй issues по выбору → ISSUES_TO_FIX, ISSUES_TO_SKIP.

**Переход:** scope выбран → Фаза 4.

---

### Фаза 4 — Fix

Если ISSUES_TO_FIX содержит issues:

**a)** Dispatch issue-fixer через Agent tool. Прочитай `agents/issue-fixer.md`, подставь {{ISSUES_TO_FIX}}, {{SLUG}}, {{TICKET_ID}}, {{CONSTRAINTS}}.
Issue-fixer сам dispatch'ит параллельные single-fix-agent'ы.

**b)** Получи FIXED_ISSUES, SKIPPED_ISSUES, FILES_CHANGED.

**c)** Добавь issues из ISSUES_TO_SKIP к SKIPPED_ISSUES (причина "Excluded by user").

**d)** Dispatch validator из /do:
Прочитай `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/validator.md`, подставь {{FILES_CHANGED}}, {{SLUG}}, {{TICKET_ID}}, {{CONSTRAINTS}}.

**e)** Dispatch formatter из /do:
Прочитай `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/formatter.md`, подставь {{FILES_CHANGED}}, {{SLUG}}, {{TICKET_ID}}.

Если пользователь выбрал "Skip fixes" → помести все issues в SKIPPED_ISSUES с причиной "Skipped by user choice".

**Переход:** фиксы завершены → Фаза 5.

---

### Фаза 5 — Finalize

**a)** Dispatch review-report-writer через Agent tool. Прочитай `agents/review-report-writer.md`, подставь {{SLUG}}, {{SUMMARY}}, {{ALL_ISSUES}} (полный список из Фазы 2), {{FIXED_ISSUES}}, {{SKIPPED_ISSUES}}, {{COMMIT_HASHES}}.

**b)** PR-комментарии:

Проверь PR: `gh pr view --json number 2>/dev/null`

Если PR существует и SKIPPED_ISSUES содержит записи — опубликуй каждый issue как PR-комментарий:

```bash
gh api --method POST repos/{owner}/{repo}/pulls/{number}/comments -f body="[severity] category: file:line — description"
```

Без PR — пропусти.

**c)** Commit report artifact:

Проверь что `docs/ai/` отсутствует в `.gitignore`. Если gitignore пропускает:

```bash
git add docs/ai/<SLUG>/<SLUG>-review.md
git commit -m "TICKET docs(SLUG): add review report"
```

Пример: `#44 docs(44-review-with-fixes): add review report`

**Переход:** отчёт записан → Фаза 6.

---

### Фаза 6 — Complete

**1.** Нотификация:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill review --phase Complete --slug "$SLUG" --title "Review завершён" --body "docs/ai/$SLUG/$SLUG-review.md"
```

**2.** Сообщи результат: количество найденных / исправленных / пропущенных, путь к review-файлу.

**3.** AskUserQuestion — что дальше:

- **"Push (/sp:gp) (Recommended)"** — вызови Skill tool с `/sp:gp`
- **"Create PR (/sp:pr)"** — вызови Skill tool с `/sp:pr`
- **"Завершить"** — выйди

---

## Правила

- **Непрерывная работа.** Паузы: scope selection (Фаза 3) и финальное действие (Фаза 6).
- **Делегирование.** Файловые операции и bash передавай sub-agent'ам.
- **Коммиты по конвенции.** Формат и ticket ID из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- **Context isolation.** Sub-agent получает только свои данные, не весь pipeline.
- **Обратная совместимость.** $ARGUMENTS = SLUG. Вызов из /do и /fix без изменений.
- **Длинный вывод CLI.** Запускай с `2>&1 | tail -20`.
- **Язык контента** — русский. Язык коммитов — английский.
