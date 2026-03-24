---
name: plan
description: >-
  Построение плана реализации по task-файлу. Используется когда пользователь пишет
  "построй план", "сделай план", "plan", "спланируй реализацию", "подготовь план",
  или передаёт путь к task-файлу и просит спланировать выполнение.
---

# Построение плана реализации

Ты — оркестратор. Координируешь работу sub-agent'ов и общаешься с пользователем.

Делегируй исследование кодовой базы и проектирование через Agent tool:

- Исследование → `agents/plan-explorer.md`
- Проектирование → `agents/plan-designer.md`
- Ревью плана → `agents/plan-reviewer.md`

Результат — plan-файл, по которому `/sp:do` выполнит реализацию автономно.

---

## Вход

`$ARGUMENTS` — путь к task-файлу, например `docs/ai/86-black-jack-page/86-black-jack-page-task.md`

Если пути нет — запроси у пользователя.

---

## Фазы

### Фаза 1 — Load

**1.** Прочитай task-файл целиком.

**2.** Извлеки:

- `TASK_TITLE` — заголовок
- `TASK_SLUG` — из поля `Slug` в task-файле
- `TASK_COMPLEXITY` — из поля «Сложность»
- `TASK_TYPE` — frontend / general (если не указан — определи по содержимому)
- `REQUIREMENTS` — список требований
- `CONSTRAINTS` — ограничения
- `VERIFICATION` — критерии проверки
- `MATERIALS` — ссылки и пути

**3.** Проверь наличие секций Task, Context, Requirements.
Если критичная секция отсутствует — сообщи пользователю и остановись.

**4.** Извлеки `TICKET_ID` из TASK_SLUG (по `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`).

**Переход:** task-файл загружен, TICKET_ID определён → Фаза 2.

---

### Фаза 2 — Explore

Цель: определить _как именно_ реализовать задачу. Task-файл описывает _что_ и _где_.
Plan-explorer ищет _how_: какие файлы создать, какие паттерны повторить,
какие интеграционные точки задействовать.

**Запусти plan-explorer через Agent tool:**

Задача агенту:

```
На основе task-файла: [вставить TASK_TITLE и полную секцию Context из task-файла]

Requirements:
[вставить REQUIREMENTS]

Constraints:
[вставить CONSTRAINTS]

Исследуй кодовую базу с фокусом на реализацию:

1. Для каждого requirement — какие конкретно файлы нужно создать или изменить?
   Путь + что именно менять/добавлять.
2. Паттерны реализации: найди 1-2 похожих реализации в проекте.
   Для каждой: путь, структура, что переиспользовать.
3. Shared state и зависимости: какие файлы будут затронуты несколькими requirements?
   Составь матрицу пересечений.
4. Порядок: что должно быть готово раньше чего? Есть ли естественные фазы?
5. Estimated scope: для каждого блока изменений — примерный объём (S/M/L).

В конце — essential file list для design-фазы.
```

**Прочитай каждый файл из essential file list.**

**Переход:** findings получены, essential files прочитаны → Фаза 3.

---

### Фаза 3 — Design

Цель: принять архитектурные решения и декомпозировать задачу на tasks.

**Запусти plan-designer через Agent tool:**

Задача агенту:

```
Task: [TASK_TITLE]
Complexity: [TASK_COMPLEXITY]

Findings от plan-explorer:
[вставить findings целиком]

Requirements из task-файла:
[вставить REQUIREMENTS]

Constraints из task-файла:
[вставить CONSTRAINTS]

Спроектируй план реализации:

1. DESIGN DECISIONS — для каждого неочевидного выбора:
   - Что решаем (одно предложение)
   - Выбранный вариант + почему
   - Отвергнутый вариант + почему нет
   Принимай решения на основе паттернов кодовой базы.
   Ответ есть в коде — используй его, а не спрашивай пользователя.

2. DECOMPOSITION — разбей на задачи:
   - Каждая задача: название, файлы, depends_on, estimated scope (S/M/L)
   - Задача = атомарный коммит. Один concern, тестируемый отдельно.
   - Гранулярность: 2-10 минут работы агента на задачу.

3. FILE INTERSECTION MATRIX — для каждой пары задач:
   - Есть ли общие файлы? Какие?
   - Если да — пометить как sequential dependency.

4. EXECUTION ORDER — в каком порядке выполнять:
   - Какие задачи можно параллелить (нет общих файлов, нет depends_on)?
   - Какие строго последовательны?
   - Нарисуй текстовый DAG.

5. IMPLEMENTATION QUESTIONS — от 3 до 5. Только про HOW:
   архитектура, паттерны, trade-offs реализации.
   Исключай вопросы, уже решённые в task-файле.

   Хорошо: «Какой паттерн — Strategy или Template Method?»
   Плохо: «Какие поля нужны в форме?» (это scope → task)
```

**Прочитай дополнительные файлы,** запрошенные designer'ом.

**Интерактивные уточнения:**

Если plan-designer сгенерировал вопросы — отправь нотификацию перед AskUserQuestion:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill plan --phase Design --slug "$TASK_SLUG" --title "Вопросы по реализации" --body "<краткий список тем>"`

Если plan-designer сгенерировал IMPLEMENTATION QUESTIONS — задай их
пользователю через AskUserQuestion, по 1-4 вопроса за раз.

Для каждого вопроса:

- 2-4 варианта ответа с пояснениями
- Рекомендуемый вариант первым, с "(Recommended)" в label
- Пользователь может выбрать "Other" для произвольного ввода

После получения ответов — обнови design decisions и decomposition
с учётом выбранных вариантов. Вшей ответы в план.

Если вопросов нет — пропусти этот шаг.

**Переход:** design decisions + decomposition + DAG готовы, вопросы решены → Фаза 4.

---

### Фаза 4 — Route

Определи стратегию выполнения по таблице из `reference/routing-rules.md`.

**Входные данные для routing:**

- `TASK_COMPLEXITY` из task-файла
- Количество задач из decomposition
- File intersection matrix из architect
- Наличие cross-layer задач (frontend + backend + tests в разных tasks)

**Запиши результат:**

- `MODE` = inline | sub-agents | agent-team
- `PARALLEL` = true | false
- `PARALLEL_GROUPS` = какие задачи можно параллелить (если parallel=true)
- `REASONING` = одно предложение почему именно этот mode

**Перед записью — проверь согласованность:**

- [ ] Каждый requirement покрыт хотя бы одним task
- [ ] Каждый depends_on ссылается на существующий task
- [ ] Циклических зависимостей нет
- [ ] Последний task — Validation
- [ ] Verification criteria из task-файла отражены в task-level Verify

**Переход:** routing определён, план согласован → Фаза 5.

---

### Фаза 5 — Review

Запусти subagent для ревью плана.

**Запусти plan-reviewer через Agent tool:**

Передай:

- Design decisions
- Decomposition (все tasks с What, How, Files, Context, Verify)
- Execution order
- Requirements и Constraints из task-файла

Агент определён в `agents/plan-reviewer.md`.

**Обработка результата:**

- ✅ Approved → Фаза 6 (Write)
- ❌ Issues → исправь проблемы, re-dispatch (макс 5 итераций)
- 5 итераций без approve → запиши план как есть, добавь нерешённые issues отдельной секцией

**Переход:** план прошёл ревью → Фаза 6.

---

### Фаза 6 — Write

**1.** Прочитай `reference/plan-format.md` — формат выходного файла.

**2.** Прочитай пример для калибровки:

- trivial / simple → `examples/simple-plan.md`
- medium / complex → `examples/complex-plan.md`

**3.** Запиши файл: `docs/ai/<TASK_SLUG>/<TASK_SLUG>-plan.md`

Используй формат из plan-format.md. Включи:

- Все design decisions с reasoning
- Все задачи с файлами, зависимостями, scope
- Routing decision
- Execution order (DAG)
- Verification criteria из task-файла

**4.** Запусти subagent для copyedit плана:

- Передай путь к plan-файлу и `reference/elements-of-style-rules.md`
- Subagent правит прозу: активный залог, конкретный язык, убирает лишние слова
- Subagent перезаписывает файл

**5.** Сообщи пользователю путь к файлу.

**Переход →** Фаза 7.

---

### Фаза 7 — Commit Artifact

Автоматический коммит артефакта плана.

**1.** Проверь: `docs/ai/` в `.gitignore`? Если да — сообщи пользователю, коммит пропусти.

**2.** Если не в gitignore — закоммить артефакт по конвенции из `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`:

Формат коммита: `TICKET docs(SLUG): add implementation plan` (БЕЗ двоеточия после ticket).

```bash
git add docs/ai/<TASK_SLUG>/<TASK_SLUG>-plan.md
git commit -m "TICKET docs(SLUG): add implementation plan"
```

Пример: `#86 docs(86-black-jack-page): add implementation plan`

Коммить только артефакт плана, без других файлов.

---

### Фаза 8 — Complete

Сообщи путь к plan-файлу и запусти цикл завершения.

Отправь нотификацию:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill plan --phase Complete --slug "$TASK_SLUG" --title "План готов" --body "docs/ai/$TASK_SLUG/$TASK_SLUG-plan.md"`

**Цикл:**

Через AskUserQuestion предложи 3 варианта:

1. **Запустить /sp:do (Recommended)** — автоматический переход к выполнению
2. **Ревью через plannotator** — интерактивная проверка plan-файла
3. **Завершить** — выход

**Обработка выбора:**

- **Запустить /sp:do:** вызови Skill tool с `/sp:do` и аргументом `docs/ai/<TASK_SLUG>/<TASK_SLUG>-plan.md`. Выход из цикла.
- **Ревью через plannotator:** вызови Skill tool с `/plannotator-annotate` и путём к plan-файлу. После получения аннотаций — примени правки к plan-файлу, перезапиши его. Вернись к началу цикла.
- **Завершить:** сообщи путь к файлу. Выход из цикла.

---

## Правила

- Язык контента — язык оригинального task-файла
- Ответ есть в коде — принимай design decision и пиши план сразу.
- Каждая задача — один атомарный коммит. Крупнее чем "создай файл" + "добавь импорт", мельче чем "сделай всё".
- Context isolation: в каждой задаче — только файлы и контекст, нужные для неё.
- Routing — на основе количества tasks и матрицы пересечений файлов.
- Одна задача — один plan-файл, без под-планов.
- Активный залог. Конкретные файлы и строки вместо абстракций.
