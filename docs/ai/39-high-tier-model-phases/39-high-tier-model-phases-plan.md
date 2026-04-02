# Трёхуровневая стратегия моделей для агентов — план реализации

**Task:** docs/ai/39-high-tier-model-phases/39-high-tier-model-phases-task.md
**Complexity:** simple
**Mode:** sub-agents
**Parallel:** true

## Design decisions

### DD-1: Группировка изменений по слоям

**Решение:** Три задачи: frontmatter агентов → документация → оркестратор /fix.
**Обоснование:** Документация (docs/do.md, docs/fix.md) описывает модели агентов — обновлять после frontmatter. Оркестратор (fix/SKILL.md) ссылается на модели — обновлять после документации.
**Альтернатива:** Один task на все 10 файлов — потеря атомарности коммитов.

### DD-2: Формулировка замены переопределений в fix/SKILL.md

**Решение:** Заменить «с **model: opus**» на «(модель определена в frontmatter агента)». В правилах — «Модели по frontmatter» вместо «Opus на code-фазах».
**Обоснование:** Сохраняет информативность текста. Указывает источник правды — frontmatter, а не инструкцию оркестратора.
**Альтернатива:** Удалить упоминание модели полностью — теряется контекст для читателя SKILL.md.

### DD-3: Таблица docs/do.md — актуализация имён агентов

**Решение:** Переписать таблицу: заменить `code-simplifier` на `code-polisher`, убрать `cleanup`, добавить `validator`, `formatter`, `report-writer`.
**Обоснование:** Текущая таблица не соответствует реальным агентам в `skills/do/agents/`. `code-simplifier` и `cleanup` — устаревшие имена, таких файлов нет.
**Альтернатива:** Менять только модели, оставив старые имена — создаст ещё больший drift.

## Tasks

### Task 1: Frontmatter агентов — model field

- **Files:** `skills/do/agents/task-executor.md:5` (edit), `skills/do/agents/code-polisher.md:5` (edit), `skills/do/agents/validator.md:5` (edit), `skills/do/agents/formatter.md:5` (edit), `skills/do/agents/report-writer.md:5` (edit), `skills/task/agents/task-architect.md:5` (edit), `skills/plan/agents/plan-designer.md:5` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** Заменить `model: sonnet` на целевую модель в YAML frontmatter 7 агентов. 4 агента → opus (task-executor, code-polisher, task-architect, plan-designer). 3 агента → haiku (validator, formatter, report-writer).
- **How:** Edit tool — заменить строку `model: sonnet` на `model: opus` или `model: haiku` в каждом файле. Не менять description, tools, color, тело агента.
- **Context:** `skills/fix/agents/fix-context-collector.md:7` (эталон haiku), `skills/fix/agents/fix-investigator.md:8` (эталон sonnet)
- **Verify:** `grep 'model:' skills/do/agents/*.md skills/task/agents/task-architect.md skills/plan/agents/plan-designer.md` → task-executor=opus, code-polisher=opus, validator=haiku, formatter=haiku, report-writer=haiku, task-architect=opus, plan-designer=opus

### Task 2: Таблицы субагентов в документации

- **Files:** `docs/do.md:64-72` (edit), `docs/fix.md:35-46` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** Привести таблицы субагентов в docs/do.md и docs/fix.md в соответствие с реальными агентами и их моделями.
- **How:**
  - docs/do.md: переписать таблицу — заменить `code-simplifier` на `code-polisher` (opus), убрать `cleanup`, добавить `validator` (haiku), `formatter` (haiku), `report-writer` (haiku), обновить `task-executor` → opus.
  - docs/fix.md: в существующей таблице изменить `validator` sonnet → haiku, `formatter` sonnet → haiku.
- **Context:** `docs/do.md:64-72` (текущая таблица), `docs/fix.md:35-46` (текущая таблица), `skills/do/agents/` (реальные агенты)
- **Verify:** Таблица docs/do.md содержит 6 агентов с правильными моделями. Таблица docs/fix.md содержит validator=haiku, formatter=haiku.

### Task 3: Убрать переопределения model: opus из fix/SKILL.md

- **Files:** `skills/fix/SKILL.md:155,180,281` (edit)
- **Depends on:** Task 1
- **Scope:** S
- **What:** Удалить текстовые инструкции «с **model: opus**» при dispatch task-executor и code-polisher. Переформулировать правило в секции Правила.
- **How:** Три правки через Edit tool:
  - Строка 155: «Dispatch через Agent tool с **model: opus**.» → «Dispatch через Agent tool (модель определена в frontmatter агента).»
  - Строка 180: «Dispatch ... с **model: opus**.» → «Dispatch ... (модель определена в frontmatter агента).»
  - Строка 281: «**Opus на code-фазах.** Dispatch task-executor и code-polisher с model: opus.» → «**Модели по frontmatter.** task-executor и code-polisher используют модели из frontmatter агентов.»
- **Context:** `skills/fix/SKILL.md:150-160` (Фаза 4), `skills/fix/SKILL.md:174-185` (Фаза 5a), `skills/fix/SKILL.md:276-284` (Правила)
- **Verify:** `grep -c 'model: opus' skills/fix/SKILL.md` → 0

### Task 4: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Проверить все изменения: frontmatter, документацию, оркестратор.
- **Context:** —
- **Verify:**
  - `grep 'model:' skills/do/agents/*.md` → task-executor=opus, code-polisher=opus, validator=haiku, formatter=haiku, report-writer=haiku
  - `grep 'model:' skills/task/agents/task-architect.md` → opus
  - `grep 'model:' skills/plan/agents/plan-designer.md` → opus
  - `grep 'model:' skills/fix/agents/*.md` → без изменений (haiku, sonnet, haiku)
  - `grep -c 'model: opus' skills/fix/SKILL.md` → 0
  - `pnpm run format:check` → без ошибок
  - `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK

## Execution

- **Mode:** sub-agents
- **Parallel:** true
- **Reasoning:** 4 задачи, Tasks 1+2 не пересекаются по файлам и параллелятся. Task 3 зависит от Task 1 (frontmatter должен быть обновлён до удаления переопределений). Task 4 — финальная валидация.
- **Order:**
  Group 1 (parallel): Task 1, Task 2
  ─── barrier ───
  Group 2 (sequential): Task 3 → Task 4

## Verification

- `grep 'model:' skills/do/agents/*.md` → task-executor и code-polisher = opus, validator, formatter, report-writer = haiku
- `grep 'model:' skills/task/agents/task-architect.md` → opus
- `grep 'model:' skills/plan/agents/plan-designer.md` → opus
- `grep 'model:' skills/fix/agents/*.md` → без изменений (haiku, sonnet, haiku)
- `grep -c 'model: opus' skills/fix/SKILL.md` → 0 (переопределения убраны)
- Таблица в docs/do.md содержит opus для task-executor/code-polisher, haiku для validator/formatter/report-writer
- Таблица в docs/fix.md содержит haiku для validator и formatter
- `pnpm run format:check` → без ошибок

## Materials

- [GitHub Issue #39](https://github.com/projectory-com/sp/issues/39) — полный чеклист изменений с обоснованиями
- `skills/fix/agents/` — эталон трёхуровневой стратегии (haiku/sonnet/opus)
- `docs/fix.md` — документация /fix с таблицей моделей
