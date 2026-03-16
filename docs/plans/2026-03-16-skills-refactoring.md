# Skills Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Исправить критичные и важные проблемы в цепочке /task, /plan, /do — убрать дублирование, починить контракты между скиллами, упростить flow.

**Architecture:** Три независимых блока правок по скиллам + финальный сквозной проход проверки контрактов. Каждый скилл — SKILL.md + reference/ + agents/. Все файлы — markdown.

**Tech Stack:** Markdown skill files, YAML frontmatter, Claude Code plugin system.

---

## Block 1: /task

### Task 1: Объединить task-explorer + task-architect в одного агента

**Files:**
- Create: `skills/task/agents/task-investigator.md`
- Delete: `skills/task/agents/task-explorer.md`
- Delete: `skills/task/agents/task-architect.md`

**Step 1: Создать объединённый agent-файл**

Файл `skills/task/agents/task-investigator.md`:

```markdown
---
name: task-investigator
description: Исследует кодовую базу и анализирует архитектуру — трассирует потоки, выявляет паттерны, определяет точки изменений и зависимости.
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput
model: sonnet
color: yellow
---

Ты — эксперт по анализу кода и архитектуре. Исследуешь кодовую базу И анализируешь архитектуру в одном проходе.

## Процесс

**1. Обнаружение и трассировка**
- Найти точки входа (API, UI-компоненты, CLI-команды)
- Проследить цепочки вызовов от входа до выхода
- Определить границы фичи и конфигурацию
- Задокументировать изменения состояния и побочные эффекты

**2. Анализ архитектуры**
- Картировать слои абстракций
- Определить паттерны проектирования и конвенции
- Задокументировать интерфейсы между компонентами
- Найти 1-2 похожих реализации для переиспользования паттернов

**3. Карта изменений**
- Какие файлы создать/изменить/удалить (с путями и строками)
- Зависимости — что может сломаться при изменениях
- Что НЕ трогать (хрупкие файлы, чужие модули)

**4. Тесты**
- Найти тесты покрывающие область изменений
- Определить что нужно дотестировать

## Формат результата

- Точки входа с file:line ссылками
- Поток выполнения с трансформациями данных
- Паттерны и конвенции с примерами файлов
- Карта изменений: файлы для создания/изменения
- Архитектурные риски и что может сломаться
- Essential file list — файлы ОБЯЗАТЕЛЬНЫЕ для понимания темы

Будь конкретен: пути, номера строк, имена функций.
```

**Step 2: Удалить старые agent-файлы**

Удалить `skills/task/agents/task-explorer.md` и `skills/task/agents/task-architect.md`.

**Step 3: Commit**

```
feat(sp): merge task-explorer + task-architect into task-investigator
```

---

### Task 2: Упростить Фазу 1 и Фазу 2 в /task SKILL.md

**Files:**
- Modify: `skills/task/SKILL.md`

**Step 1: Убрать WARNING из преамбулы**

Удалить строку 15:
```
**WARNING:** `reference/synthesize-guide.md` занимает ~3,000 токенов. Читай его только в фазе Synthesize, непосредственно перед записью файла.
```

**Step 2: Убрать определение TASK_TYPE из Фазы 1**

Удалить блок строк 51-61 (от `**4. Определи тип задачи**` до `**Переход:**`). Обновить переход:
```
**Переход:** slug сформирован, материалы сохранены → Фаза 2.
```

**Step 3: Упростить Фазу 2 — один агент вместо двух**

Заменить Фазу 2 целиком. Убрать:
- Шаг 1 (предварительная оценка сложности — ни на что не влияет)
- Шаги 2-5 (два отдельных агента)

Новая Фаза 2:
```markdown
### Фаза 2 — Investigate

**Запусти task-investigator через Agent tool.**

Задача агенту — суть задачи из тикета: [вставить].
Агент определён в `agents/task-investigator.md`.

**Прочитай все файлы из essential file list** из результата агента.
Не пропускать — это строит контекст для Synthesize.

**Критерии остановки — Investigate завершена когда:**
- [ ] Найдены точки входа для изменений с номерами строк
- [ ] Найдены паттерны которые нужно повторить (с примерами файлов)
- [ ] Найдены или подтверждено отсутствие тестов на затронутую область
- [ ] Определено что может сломаться при изменениях

Если хотя бы один пункт не закрыт — запусти дополнительный
task-investigator с уточняющим запросом.

**Переход:** все четыре критерия закрыты → Фаза 3.
```

**Step 4: Commit**

```
refactor(sp): simplify /task phases — one agent, no double complexity assessment
```

---

### Task 3: Добавить TASK_TYPE в Фазу 3 и шаблон выходного файла

**Files:**
- Modify: `skills/task/SKILL.md`

**Step 1: Добавить определение TASK_TYPE в начало Фазы 3 (Synthesize)**

После строки "Примени 5 измерений из synthesize-guide" добавить:
```markdown
**Определи тип задачи — frontend или general:**

Задача **frontend** если findings содержат:
- технологии: React, Vue, CSS, Tailwind, SCSS, styled-components, Framer Motion, Three.js
- файлы: .tsx, .jsx, .css, .scss в essential file list или карте изменений
- артефакты: component, page, layout, screen, UI, modal, animation

Запиши: `TASK_TYPE = frontend | general`

**Если `TASK_TYPE = frontend`:** дополнительно прочитай `reference/frontend-guide.md`.
```

**Step 2: Добавить TASK_TYPE в шаблон выходного файла**

В шаблоне task-файла после `**Сложность:**` добавить:
```
**Тип:** <frontend | general>
```

**Step 3: Добавить подсказку следующего шага**

В Фазе 4 (Write) шаг 4, изменить:
```markdown
**4.** Сообщи пользователю:
- Путь к файлу и task-slug
- Следующий шаг: `/sp:plan docs/ai/<task-slug>/<task-slug>-task.md`
```

**Step 4: Убрать дублирование правила про вопросы**

Заменить строку 138:
```
Сформируй уточняющие вопросы — ровно 5, максимум 7 — только о пробелах которые заблокируют реализацию.
```
На:
```
Сформируй уточняющие вопросы по правилам из synthesize-guide.md.
```

**Step 5: Убрать тройное упоминание секции Материалы**

Удалить из секции "Правила" строку:
```
- Секция «Материалы» обязательна (если пусто — пиши "—")
```
(Уже есть в шаблоне.)

**Step 6: Commit**

```
feat(sp): add TASK_TYPE to /task output, add next step hint, cleanup duplications
```

---

## Block 2: /plan

### Task 4: Объединить plan-explorer + plan-designer в одного агента

**Files:**
- Create: `skills/plan/agents/plan-architect.md`
- Delete: `skills/plan/agents/plan-explorer.md`
- Delete: `skills/plan/agents/plan-designer.md`

**Step 1: Создать объединённый agent-файл**

Файл `skills/plan/agents/plan-architect.md`:

```markdown
---
name: plan-architect
description: Исследует кодовую базу с фокусом на реализацию И проектирует план — декомпозирует на задачи, строит DAG зависимостей, принимает design decisions.
tools: Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput
model: sonnet
color: green
---

Ты — senior architect-planner. Исследуешь кодовую базу с фокусом на реализацию И проектируешь план в одном проходе.

## Принципы

- **Решай, не спрашивай.** Если ответ есть в коде — принимай решение сам.
- **Атомарность.** Каждый task = один коммит, один concern, тестируемый отдельно.
- **Гранулярность.** Task на 2-10 минут работы агента.
- **Context isolation.** Каждый task содержит только свой контекст.

## Процесс

### Часть 1 — Исследование (explore)

**1. Карта изменений**
Для каждого requirement из task-файла определи:
- Какие файлы создать (путь, назначение)
- Какие файлы изменить (путь, что именно менять, номера строк)
- Какие файлы читать но не менять (зависимости, интерфейсы)

**2. Паттерны реализации**
Найди 1-2 похожих реализации в проекте. Для каждой:
- Путь, структура, что переиспользовать

**3. Естественные фазы**
Что должно существовать прежде чем другое станет возможно.

**4. Оценка объёма**
S = 1-2 файла, < 50 строк | M = 3-5 файлов, 50-200 строк | L = 5+ файлов, 200+ строк

### Часть 2 — Проектирование (design)

**5. Design decisions**
Для каждого неочевидного выбора:
- Что решаем (одно предложение)
- Выбранный вариант + обоснование из кода
- Отвергнутый вариант + причина отказа

**6. Decomposition**
Разбей на tasks:
- Название, Files, Depends on, Scope, What, Context, Verify

**7. Execution order**
На основе depends_on определи порядок выполнения.
Текстовый DAG.

**8. Implementation questions**
От 3 до 5. Только про HOW: архитектура, паттерны, trade-offs реализации.
НЕ дублировать вопросы из task-файла (они про scope/requirements).

Хорошо: «Какой паттерн — Strategy или Template Method?»
Плохо: «Какие поля нужны в форме?» (это scope → task)

Если вопросов нет — явно написать «нет вопросов».

## Формат результата

Полный, actionable план. Включает все секции выше.
Будь конкретен: пути к файлам, номера строк, имена функций.
```

**Step 2: Удалить старые agent-файлы**

Удалить `skills/plan/agents/plan-explorer.md` и `skills/plan/agents/plan-designer.md`.

**Step 3: Commit**

```
feat(sp): merge plan-explorer + plan-designer into plan-architect
```

---

### Task 5: Перестроить фазы /plan SKILL.md

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Добавить проверку неотвеченных вопросов в Фазу 1 (Load)**

После шага 3 ("Проверь что task-файл содержит минимум") добавить:
```markdown
**4.** Проверь секцию «Уточняющие вопросы» в task-файле.
Если есть вопросы без отмеченных чекбоксов — предупреди пользователя:
«В task-файле есть неотвеченные вопросы: [список]. Ответьте на них
в файле перед планированием, или план будет построен с assumptions.»
```

**Step 2: Объединить Фазу 2 (Explore) и Фазу 3 (Design) в одну**

Заменить Фазы 2 и 3 на одну объединённую:

```markdown
### Фаза 2 — Explore & Design

Цель: исследовать кодовую базу И спроектировать план в одном проходе.

**Запусти plan-architect через Agent tool.**

Задача агенту:
- Task: [TASK_TITLE]
- Complexity: [TASK_COMPLEXITY]
- Requirements: [REQUIREMENTS]
- Constraints: [CONSTRAINTS]
- Нерешённые task-вопросы: [TASK_QUESTIONS — для контекста, НЕ дублировать]

Агент определён в `agents/plan-architect.md`.

**Прочитай все файлы из essential file list** если агент его сформировал.

**Переход:** design decisions + decomposition + execution order готовы → Фаза 3.
```

**Step 3: Перенумеровать Route в Фазу 3**

Текущая Фаза 4 (Route) становится Фазой 3.

**Step 4: Убрать чтение routing-rules.md из бывшей Фазы 3 (Design)**

Оно было в начале Design ("Прочитай routing-rules.md"), теперь не нужно — routing-rules читается только в Фазе 3 (Route).

**Step 5: Добавить V1-пометку в Фазу 3 (Route)**

После таблицы решений добавить:
```markdown
**V1:** /do выполняет всё sequential. Parallel groups и agent-team
записываются в план для будущих версий, но на текущее исполнение не влияют.
File intersection matrix — опциональна.
```

**Step 6: Добавить step-back validation перед Write**

Между Route и Write вставить:
```markdown
**Перед записью — проверь согласованность плана:**
- [ ] Каждый requirement из task-файла покрыт хотя бы одним task
- [ ] Все depends_on ссылаются на существующие tasks (нет висячих ссылок)
- [ ] Нет циклических зависимостей
- [ ] Последний task — Validation
- [ ] Verification criteria из task-файла отражены в task-level Verify
```

**Step 7: Перенумеровать Write в Фазу 4, исправить нумерацию шагов**

Фаза Write становится Фазой 4. Шаги внутри: 1, 2, 3, 4, 5 (последовательно, без пропусков).

**Step 8: Commit**

```
refactor(sp): restructure /plan phases — merge agents, add validation, fix numbering
```

---

### Task 6: Исправить reference-файлы /plan

**Files:**
- Modify: `skills/plan/reference/plan-format.md`
- Modify: `skills/plan/reference/routing-rules.md`

**Step 1: Исправить ссылку на фазу в plan-format.md**

Строка 1: заменить "Читай в Фазе 6 (Write)" на "Читай в Фазе 4 (Write)".

**Step 2: Исправить overlap в routing-rules.md**

Строка 13 (правило #2): изменить `1-3` на `1-2`:
```
| 2 | simple | 1-2 | — | — | `inline` | false |
```

Теперь правило #3 (`simple | 2-3 | none | no → sub-agents | true`) срабатывает для 3 tasks.

**Step 3: Commit**

```
fix(sp): fix phase reference in plan-format, fix routing-rules overlap
```

---

## Block 3: /do

### Task 7: Упростить парсинг Фазы 1 в /do

**Files:**
- Modify: `skills/do/SKILL.md`

**Step 1: Упростить список полей для извлечения**

Заменить шаг 2 (строки 48-56) на:
```markdown
**2.** Извлеки:
- `SLUG` — из пути (`docs/ai/<slug>/`)
- `COMPLEXITY` — из поля «Complexity»
- `TASKS[]` — все tasks из секции «Tasks», в порядке из «Execution / Order» (если есть) или в порядке появления
- `CONSTRAINTS` — из plan header
- `VERIFICATION` — из секции «Verification»
```

**Step 2: Упростить определение mode**

Заменить шаг 3 (строки 58-62) на:
```markdown
**3.** Определи mode:
- `COMPLEXITY` = trivial / simple → **inline**
- `COMPLEXITY` = medium / complex → **sub-agents sequential**

V1: все tasks выполняются последовательно. Parallel и agent-team из плана игнорируются.
```

**Step 3: Добавить проверку неотвеченных вопросов**

После шага 4 ("Найди task-файл") добавить:
```markdown
**5.** Проверь секцию «Уточняющие вопросы» в plan-файле.
Если есть вопросы без отмеченных чекбоксов — сообщи пользователю и не продолжай:
«В плане есть неотвеченные вопросы. Ответьте на них в файле перед запуском.»
```

**Step 4: Убрать запись todo list в task-файл**

Удалить шаг 6 (строка 81): "Запиши todo list в task-файл — добавь секцию «Выполнение» в конец."

**Step 5: Commit**

```
refactor(sp): simplify /do parsing — 5 fields instead of 8, add question check
```

---

### Task 8: Исправить Фазу 2 (Execute) в /do

**Files:**
- Modify: `skills/do/SKILL.md`
- Modify: `skills/do/reference/status-protocol.md`

**Step 1: Убрать повторный verify из status-protocol.md**

В секции DONE (строки 17-21) заменить:
```markdown
**Действие оркестратора:**
1. Если коммит не сделан sub-agent'ом — сделать
2. Отметить task как завершённый в TodoWrite
3. Перейти к следующему task
```

(Убран пункт "Проверить что Verify действительно проходит (запустить ещё раз)".)

**Step 2: Убрать дублирование коммита в sub-agents flow SKILL.md**

В секции sub-agents sequential (строки 107-126) заменить шаги 3-5 на:
```markdown
3. Обработай status (по `reference/status-protocol.md`):
   - DONE → отметь в TodoWrite
   - DONE_WITH_CONCERNS → записать concerns → отметь в TodoWrite
   - NEEDS_CONTEXT → добавить контекст, re-dispatch (макс 1 retry)
   - BLOCKED → записать причину, пропустить зависимые tasks, продолжить
```

(Убраны отдельные шаги 4 и 5 с дублированием коммита — sub-agent делает коммит сам, status-protocol покрывает fallback.)

**Step 3: Убрать конкретные commit messages из описания фаз**

В inline flow (строка 98) и sub-agents flow заменить конкретные `feat(<SLUG>): <task name>` на:
```
Коммит по конвенции из `reference/commit-convention.md`.
```

Аналогично для Фаз 3, 4, 5, 6, 7 — убрать конкретные commit messages, оставить ссылку на reference.

**Step 4: Commit**

```
fix(sp): remove double verification and commit duplication in /do execute phase
```

---

### Task 9: Исправить порядок Фазы 7 и добавить guard на пустой файл-лист

**Files:**
- Modify: `skills/do/SKILL.md`

**Step 1: Добавить guard после Фазы 2**

После строки "Переход: все tasks выполнены (или BLOCKED) → Фаза 3" добавить:
```markdown
**Если изменённых файлов ноль** (все tasks BLOCKED/SKIPPED):
пропустить Фазы 3 (Simplify), 4 (Cleanup), 6 (Document).
Перейти сразу к Фазе 5 (Validate) — она тоже может быть пропущена
если нет изменений. Затем Фаза 7 (Report) со статусом failed.
```

**Step 2: Переставить Format перед Report в Фазе 7**

Текущий порядок: 7a Report → 7b Format → 7c Notification.
Новый порядок: 7a Format → 7b Report → 7c Notification.

Переставить секции местами. Так коммит format попадёт в report.

**Step 3: Убрать обновление секции "Выполнение" в task-файле**

В секции 7b Report (бывшая 7a) удалить:
```
Запиши краткий отчёт в task-файл (обнови секцию «Выполнение»):
- Список выполненных tasks со статусами
- Итог: complete / partial / failed
```

(Task-файл read-only для /do.)

**Step 4: Обновить правило в секции "Правила"**

Удалить:
```
- **Task-файл обновляется.** Секция «Выполнение» — при старте (todo list) и в конце (итог).
```

**Step 5: Commit**

```
fix(sp): reorder format before report, add guard for all-blocked, task-file read-only
```

---

## Block 4: Сквозной проход

### Task 10: Проверить контракты между скиллами

**Files:**
- Read: `skills/task/SKILL.md`
- Read: `skills/plan/SKILL.md`
- Read: `skills/do/SKILL.md`
- Read: `skills/plan/reference/plan-format.md`

**Step 1: Проверить контракт /task → /plan**

Убедиться:
- Шаблон /task содержит `**Тип:** <frontend | general>`
- /plan Фаза 1 (Load) извлекает TASK_TYPE из поля "Тип"
- /task подсказывает `/sp:plan <путь>`

**Step 2: Проверить контракт /plan → /do**

Убедиться:
- plan-format.md содержит секцию "Уточняющие вопросы" с чекбоксами
- /do Фаза 1 проверяет неотвеченные вопросы из плана
- /plan подсказывает `/sp:do <путь>`

**Step 3: Проверить согласованность agent-файлов**

Убедиться:
- `skills/task/agents/` содержит только `task-investigator.md`
- `skills/plan/agents/` содержит только `plan-architect.md`
- SKILL.md обоих скиллов ссылается на новые agent-файлы, не на старые

**Step 4: Прогнать валидацию манифестов**

```bash
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"
head -1 skills/*/SKILL.md commands/*.md
```

**Step 5: Commit (если были правки)**

```
fix(sp): fix cross-skill contracts
```

---

## Summary

| Task | Блок | Что | Files |
|------|------|-----|-------|
| 1 | /task | Merge task-explorer + task-architect | agents/ |
| 2 | /task | Simplify phases 1-2 | SKILL.md |
| 3 | /task | Add TASK_TYPE to phase 3 + template | SKILL.md |
| 4 | /plan | Merge plan-explorer + plan-designer | agents/ |
| 5 | /plan | Restructure phases | SKILL.md |
| 6 | /plan | Fix reference files | reference/ |
| 7 | /do | Simplify parsing | SKILL.md |
| 8 | /do | Fix execute phase | SKILL.md, status-protocol.md |
| 9 | /do | Reorder phase 7, add guards | SKILL.md |
| 10 | cross | Verify contracts | all |

**Dependencies:**
- Tasks 1-3 (/task) — sequential
- Tasks 4-6 (/plan) — sequential
- Tasks 7-9 (/do) — sequential
- Task 10 — depends on all above
- Blocks 1, 2, 3 are independent (can run in parallel)
