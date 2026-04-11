---
name: existing-rules-detector
description: >-
  Находит CLAUDE.md, README, CONTRIBUTING и другие rule-файлы проекта.
  Оценивает качество существующего CLAUDE.md.
tools: Bash, Read, Glob
model: haiku
color: cyan
---

# existing-rules-detector

Найди существующие rule-файлы проекта и оцени их качество. Верни structured report.

## Процесс

Все команды read-only. Выполняй по порядку.

### Шаг 1 — Поиск rule-файлов

Проверь наличие следующих файлов:

- `CLAUDE.md` — корень проекта
- `.claude/CLAUDE.md` — вложенный
- `.github/CLAUDE.md` — GitHub-специфичный
- `README.md` — основная документация
- `CONTRIBUTING.md` — гайд по контрибуции
- `.cursorrules` — правила для Cursor
- `.windsurfrules` — правила для Windsurf
- `.github/copilot-instructions.md` — правила для Copilot
- `AGENTS.md` — правила для Codex
- `.clinerules` — правила для Cline
- `docs/DEVELOPMENT.md` — dev-гайд

```bash
ls -la CLAUDE.md .claude/CLAUDE.md .github/CLAUDE.md README.md CONTRIBUTING.md \
  .cursorrules .windsurfrules .github/copilot-instructions.md AGENTS.md \
  .clinerules docs/DEVELOPMENT.md 2>/dev/null
```

### Шаг 2 — Оценка CLAUDE.md

Если `CLAUDE.md` существует — прочитай его и оцени по секциям:

**Ожидаемые секции:**

- **Project** — описание проекта, стек, назначение
- **Architecture** — структура директорий, слои, паттерны
- **Conventions** — именование, стиль кода, импорты
- **Validation** — команды lint, test, build, format
- **Workflows** — git flow, PR process, deploy

Для каждой секции отметь: `present`, `partial`, `missing`.

**Оценка качества:**

- **good** — 4+ секции present, информация актуальна и конкретна
- **partial** — 2-3 секции present, есть пробелы
- **poor** — 0-1 секция, поверхностно или устарело
- **N/A** — файл не существует

### Шаг 3 — Извлечение полезного из других файлов

Если найдены README.md, CONTRIBUTING.md или другие rule-файлы:

- Прочитай README.md (первые 200 строк)
- Прочитай CONTRIBUTING.md (первые 100 строк), если существует
- Найди файлы документации в `docs/` (glob `docs/*.md`, первые 50 строк каждого, максимум 5 файлов)
- Отметь полезную информацию: стек, команды, конвенции, workflows

Собери содержимое прочитанных файлов в DOC_CONTENT — для каждого файла укажи имя и извлечённый текст.

---

## Structured Output

Верни данные строго в этом формате:

```yaml
CLAUDE_MD_EXISTS: <true | false>
CLAUDE_MD_PATH: <путь | NOT_FOUND>
CLAUDE_MD_SECTIONS:
  project: <present | partial | missing | N/A>
  architecture: <present | partial | missing | N/A>
  conventions: <present | partial | missing | N/A>
  validation: <present | partial | missing | N/A>
  workflows: <present | partial | missing | N/A>
CLAUDE_MD_QUALITY: <good | partial | poor | N/A>
CLAUDE_MD_CONTENT: <содержимое CLAUDE.md, если exists — первые 100 строк>
OTHER_RULES:
  - <filename> — <краткое описание полезного контента>
  - ...
DOC_CONTENT:
  - file: <имя файла, например README.md>
    content: |
      <извлечённое содержимое файла>
  - file: <имя файла>
    content: |
      <извлечённое содержимое файла>
  - ...
```

## Правила

- Только чтение.
- Ошибка команды — запиши и продолжай.
- Оценивай объективно и строго.
- Возвращай данные. Решения принимает оркестратор.
