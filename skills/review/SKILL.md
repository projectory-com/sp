---
name: review
description: >-
  Подготовка отчёта для code review. Используется когда пользователь пишет
  "review", "ревью", "подготовь отчёт", "что изменилось", или после
  выполнения /do для анализа всех изменений.
---

# Подготовка отчёта для code review

Ты — оркестратор. Git-команды и анализ выполняй только через Agent tool:

- Анализ и запись отчёта → `agents/review-analyzer.md`

---

## Вход

`$ARGUMENTS` — task-slug или путь к task-файлу.

Если отсутствует — определи slug из текущей ветки или последнего каталога `docs/ai/*/`.

---

## Фазы

### Фаза 1 — Parse

**1.** Определи `SLUG`:

- Из `$ARGUMENTS` напрямую (если это slug)
- Из пути к task-файлу: `docs/ai/<slug>/<slug>-task.md`
- Из текущей ветки или последнего каталога `docs/ai/*/`

**2.** Определи путь к task-файлу: `docs/ai/<SLUG>/<SLUG>-task.md`
Если файл не существует — передай `—` в sub-agent.

**3.** Извлеки `TICKET_ID` из SLUG (по `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`).

**Переход:** SLUG и TICKET_ID определены → Фаза 2.

---

### Фаза 2 — Analyze

Запусти sub-agent через Agent tool с промтом из `agents/review-analyzer.md`.

Передай:

- `SLUG`
- Путь к task-файлу (или `—`)

Sub-agent собирает git-данные, анализирует изменения по 7 измерениям
и записывает отчёт в `docs/ai/<SLUG>/<SLUG>-review.md`.

**Переход:** sub-agent вернул результат → Фаза 3.

---

### Фаза 3 — Commit Artifact

Закоммить артефакт ревью автоматически.

**1.** Проверь: `docs/ai/` под `.gitignore`? Если да -- сообщи пользователю, не коммить.

**2.** Если не под gitignore -- закоммить артефакт по конвенции из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`:

Формат коммита: `TICKET docs(SLUG): add review report` (БЕЗ двоеточия после ticket).

```bash
git add docs/ai/<SLUG>/<SLUG>-review.md
git commit -m "TICKET docs(SLUG): add review report"
```

Пример: `R2-220 docs(R2-220-fix-doubled-stats): add review report`

Коммить только артефакт ревью, не смешивай с другими файлами.

---

### Фаза 4 — Complete

Сообщи пользователю путь к review-файлу.

---

## Правила

- Анализ выполняет sub-agent, не оркестратор.
- Язык отчёта — язык task-файла.
- Язык коммита — английский (по commit-convention).
