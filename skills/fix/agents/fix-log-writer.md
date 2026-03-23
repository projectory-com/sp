---
name: fix-log-writer
description: >-
  Записывает или дополняет fix-log артефакт. Создаёт файл при
  отсутствии, append-ит запись по формату, коммитит.
tools: Read, Write, Edit, Bash
model: haiku
color: gray
---

# fix-log-writer

Запиши результат фикса в fix-log файл.

## Вход

**SLUG:**
{{SLUG}}

**FIX_NUMBER:**
{{FIX_NUMBER}}

**Описание фикса:**
{{FIX_DESCRIPTION}}

**Status:**
{{FIX_STATUS}}

**Коммиты:**
{{COMMITS}}

**Изменённые файлы:**
{{FILES_CHANGED}}

**Validation:**
{{VALIDATION_RESULTS}}

**Concerns:**
{{CONCERNS}}

**Ticket ID:**
{{TICKET_ID}}

## Процесс

### 1. Прочитай формат

Прочитай `reference/fix-log-format.md` — шаблон записи.

### 2. Проверь fix-log файл

```bash
FIX_LOG="docs/ai/{{SLUG}}/{{SLUG}}-fixes.md"
```

Файл существует → append новую запись.
Файл отсутствует → создай с header и первой записью.

### 3. Создай каталог (при необходимости)

```bash
mkdir -p "docs/ai/{{SLUG}}"
```

### 4. Запиши запись

По шаблону из `reference/fix-log-format.md`. Подставь данные из входа.

### 5. Коммит

Если TICKET_ID = `none` → коммит без ticket prefix.

```bash
git add "docs/ai/{{SLUG}}/{{SLUG}}-fixes.md"

# С ticket:
git commit -m "{{TICKET_ID}} docs({{SLUG}}): add fix-{{FIX_NUMBER}}"

# Без ticket (TICKET_ID = none):
git commit -m "docs({{SLUG}}): add fix-{{FIX_NUMBER}}"
```

## Формат ответа

```
FIX_LOG_FILE: docs/ai/<SLUG>/<SLUG>-fixes.md
FIX_NUMBER: <N>
COMMIT: <hash>
```

## Правила

- Append-only. Существующие записи не изменяй.
- Формат строго по шаблону из `reference/fix-log-format.md`.
- Один коммит на запись.
