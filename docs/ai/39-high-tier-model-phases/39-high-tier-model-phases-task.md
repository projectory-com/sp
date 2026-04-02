# Трёхуровневая стратегия моделей для агентов

**Slug:** 39-high-tier-model-phases
**Тикет:** https://github.com/projectory-com/sp/issues/39
**Сложность:** simple
**Тип:** general

## Task

Выставить в YAML frontmatter 7 агентов модели по критичности фазы: opus для кода и архитектуры, haiku для детерминированных операций. Обновить документацию, убрать избыточные переопределения в /fix.

## Context

### Архитектура области

Каждый агент — markdown-файл с YAML frontmatter. Поле `model` задаёт модель, которую Claude Code использует при dispatch через Agent tool. Оркестраторы (`SKILL.md`) вызывают агентов без переопределения — модель берётся из frontmatter.

Исключение: `skills/fix/SKILL.md` явно инструктирует dispatch task-executor и code-polisher с `model: opus`, перекрывая frontmatter. После выставления opus в frontmatter эти инструкции станут избыточными.

Принцип выбора модели (эталон — `/fix`):
- **opus** — пишет/модифицирует код, принимает архитектурные решения
- **sonnet** — анализирует, исследует, ревьюит (результат — текст, не код)
- **haiku** — собирает данные, запускает команды, пишет артефакты по шаблону

### Файлы для изменения

**Agent frontmatter (7 файлов, строка `model:`):**

| Файл | Строка | Текущее | Целевое |
| ---- | ------ | ------- | ------- |
| `skills/do/agents/task-executor.md` | 5 | sonnet | opus |
| `skills/do/agents/code-polisher.md` | 5 | sonnet | opus |
| `skills/do/agents/validator.md` | 5 | sonnet | haiku |
| `skills/do/agents/formatter.md` | 5 | sonnet | haiku |
| `skills/do/agents/report-writer.md` | 5 | sonnet | haiku |
| `skills/task/agents/task-architect.md` | 6 | sonnet | opus |
| `skills/plan/agents/plan-designer.md` | 6 | sonnet | opus |

**Документация (2 файла, таблицы субагентов):**

- `docs/do.md` — таблица субагентов: привести модели к frontmatter (task-executor → opus, code-polisher → opus, validator → haiku, formatter → haiku, report-writer → haiku)
- `docs/fix.md` — таблица субагентов: validator и formatter sonnet → haiku

**Оркестратор (1 файл):**

- `skills/fix/SKILL.md` — удалить текстовые переопределения `model: opus` при dispatch task-executor и code-polisher (opus теперь в frontmatter)

### Паттерны для повторения

Эталонные агенты в `skills/fix/agents/`:
- `fix-context-collector.md` — `model: haiku` (сбор данных)
- `fix-investigator.md` — `model: sonnet` (исследование)
- `fix-log-writer.md` — `model: haiku` (запись артефакта)

Формат frontmatter одинаков во всех агентах: `model: <value>` на строке 5-6.

### Тесты

Тестов нет. Плагин состоит из markdown-файлов; валидация — через `grep` и ручную проверку.

## Requirements

1. Заменить `model: sonnet` на `model: opus` в task-executor.md, code-polisher.md, task-architect.md, plan-designer.md.
2. Заменить `model: sonnet` на `model: haiku` в validator.md, formatter.md, report-writer.md.
3. Привести таблицу субагентов в `docs/do.md` в соответствие с frontmatter.
4. Выставить в таблице субагентов `docs/fix.md` validator и formatter: sonnet → haiku.
5. Удалить текстовые переопределения `model: opus` из `skills/fix/SKILL.md` при dispatch task-executor и code-polisher.

## Constraints

- Менять только поле `model` — `description`, `tools`, `color` и тело агентов оставить как есть.
- Агенты, уже на правильной модели (/fix agents, /gp, /gst, /pr, /explore, /review), остаются без изменений.
- `skills/do/SKILL.md`, `skills/task/SKILL.md`, `skills/plan/SKILL.md` не трогать — оркестраторы модель не переопределяют.
- При удалении переопределений в `skills/fix/SKILL.md` сохранить остальную логику dispatch (промт, tools, контекст).

## Verification

- `grep 'model:' skills/do/agents/*.md` → task-executor и code-polisher = opus, validator, formatter, report-writer = haiku
- `grep 'model:' skills/task/agents/task-architect.md` → opus
- `grep 'model:' skills/plan/agents/plan-designer.md` → opus
- `grep 'model:' skills/fix/agents/*.md` → без изменений (haiku, sonnet, haiku)
- `grep -c 'model: opus' skills/fix/SKILL.md` → 0 (переопределения убраны)
- Таблица в `docs/do.md` содержит opus для task-executor/code-polisher, haiku для validator/formatter/report-writer
- Таблица в `docs/fix.md` содержит haiku для validator и formatter
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK (манифест не сломан)

## Материалы

- [GitHub Issue #39](https://github.com/projectory-com/sp/issues/39) — полный чеклист изменений с обоснованиями
- `skills/fix/agents/` — эталон трёхуровневой стратегии (haiku/sonnet/opus)
- `docs/fix.md` — документация /fix с таблицей моделей
