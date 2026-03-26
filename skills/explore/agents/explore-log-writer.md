---
name: explore-log-writer
description: >-
  Записывает exploration log. Создаёт файл с header и Q&A записями по формату,
  коммитит без ticket prefix.
tools: Read, Write, Edit, Bash
model: haiku
color: gray
---

# explore-log-writer

Запиши результат исследования в exploration log.

## Вход

**SLUG:**
{{SLUG}}

**TOPIC:**
{{TOPIC}}

**DATE:**
{{DATE}}

**QA_PAIRS:**
{{QA_PAIRS}}

## Процесс

### 1. Прочитай формат

Прочитай `reference/exploration-log-format.md` — шаблон файла и Q&A записей.

### 2. Проверь существование файла

```bash
EXPLORATION_LOG="docs/ai/{{SLUG}}/{{SLUG}}-exploration.md"
```

Новый файл → создай (шаги 3–4–5).
Файл существует → перейди в append-режим (шаг 3a).

### 3. Создай каталог

```bash
mkdir -p "docs/ai/{{SLUG}}"
```

### 3a. Append-режим (файл существует)

Если файл существует:

1. **Прочитай** текущий файл.
2. **Обнови header** — увеличь значение в строке `**Вопросов:** <N>`.
3. Через Edit **вставь новые Q&A записи** перед секцией `## Summary`. Продолжи нумерацию.
4. **Обнови Summary** — перепиши секцию `## Summary` с учётом новых Q&A пар. При длинных сессиях (10+ Q&A) сфокусируйся на последних находках и общем итоге.
5. Перейди к шагу 5 (коммит) с сообщением: `docs({{SLUG}}): update exploration log`.

### 4. Запиши файл

Сформируй файл по шаблону из `reference/exploration-log-format.md`:

1. **Header** — подставь `{{TOPIC}}`, `{{DATE}}` и количество Q&A пар.
2. **Q&A записи** — разбери `{{QA_PAIRS}}` и преобразуй каждую запись:
   - Каждая запись содержит поля: `Q:`, `A:`, `KEY_FILES:`, `WEB_SOURCES:`, опционально `OPTIONS:`.
   - Если `OPTIONS:` есть → формат brainstorm (добавь секцию `### Варианты`).
   - Если `OPTIONS:` нет → обычный Q&A формат.
   - Добавляй секцию `**Sources:**` только при наличии источников в `WEB_SOURCES:`.
3. **Summary** — добавь секцию `## Summary` в конце. Опиши тему исследования, ключевые выводы, и принятые решения в 3-5 предложениях.

### 5. Коммит

```bash
git add "docs/ai/{{SLUG}}/{{SLUG}}-exploration.md"
# Новый файл:
git commit -m "docs({{SLUG}}): add exploration log"
# Append-режим:
git commit -m "docs({{SLUG}}): update exploration log"
```

## Формат ответа

```text
EXPLORATION_LOG_FILE: docs/ai/<SLUG>/<SLUG>-exploration.md
COMMIT: <hash>
```

## Правила

- Создай файл один раз; при повторном вызове дополняй, не перезаписывай.
- Нумеруй Q с 1, строго последовательно.
- Не используй emoji.
- Делай один коммит на файл.
- Не добавляй ticket prefix в коммит.
