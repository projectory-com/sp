# Interactive /task skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the /task skill interactive — clarifying questions via AskUserQuestion, automatic transition to /sp:plan, plannotator review loop.

**Architecture:** Changes touch 5 markdown files across 2 skills (/task, /plan) and reference docs. No code, no tests — pure skill/prompt editing. All edits are in `/home/heliotik/project/projectory-com/sp/`.

**Tech Stack:** Markdown (SKILL.md format), AskUserQuestion tool, Skill tool

---

### Task 1: Update Phase 3 (Synthesize) — add interactive questions

**Files:**

- Modify: `skills/task/SKILL.md:116-141` (Phase 3 section)

**Step 1: Replace the last 3 lines of Phase 3**

Current lines 137-141:

```markdown
Определи сложность: trivial / simple / medium / complex.

Сформируй уточняющие вопросы по правилам из synthesize-guide.md.

**Переход:** 5 измерений применены, вопросы готовы → Фаза 4.
```

Replace with:

```markdown
Определи сложность: trivial / simple / medium / complex.

**Интерактивные уточнения:**

Сформируй 3-7 уточняющих вопросов по правилам из synthesize-guide.md.
Задай их пользователю через AskUserQuestion порциями по 1-4 вопроса.

Для каждого вопроса:

- 2-4 варианта ответа с пояснениями
- Рекомендуемый вариант первым, с "(Recommended)" в label
- Пользователь может выбрать "Other" для произвольного ввода

После каждой порции ответов — пересмотри Requirements, Constraints и Context
с учётом выбранных вариантов. Вшей ответы прямо в формулировки секций.

Повторяй пока все вопросы не заданы и не отвечены.

**Переход:** 5 измерений применены, вопросы заданы и ответы вшиты → Фаза 4.
```

**Step 2: Verify the edit**

Read `skills/task/SKILL.md` lines 116-160. Confirm Phase 3 ends with the new interactive section and transitions to Phase 4.

**Step 3: Commit**

```bash
git add skills/task/SKILL.md
git commit -m "feat(task): add interactive AskUserQuestion flow in Phase 3 Synthesize"
```

---

### Task 2: Update Phase 4 (Write) — remove questions section from template

**Files:**

- Modify: `skills/task/SKILL.md:145-222` (Phase 4 section, line numbers approximate after Task 1 edit)

**Step 1: Remove "Уточняющие вопросы" from the task file template**

In the template block (the ``` code block in Phase 4 step 3), find and delete these lines:

```markdown
## Уточняющие вопросы

1. **Вопрос?**
   - [ ] Вариант A — пояснение
   - [ ] Вариант B — пояснение
   - [ ] Свой вариант: \_\_\_
```

The template should go directly from `## Verification` to `## Материалы`.

**Step 2: Replace step 5 (copy-paste string) with path announcement**

Current step 5 (lines ~218-221):

```markdown
**5.** Сообщи пользователю:

- Путь к файлу и task-slug
- Следующий шаг: `/sp:plan docs/ai/<task-slug>/<task-slug>-task.md`
```

Replace with:

```markdown
**5.** Сообщи пользователю путь к файлу и task-slug.

**Переход →** Фаза 5.
```

**Step 3: Verify the edit**

Read the Phase 4 section. Confirm template has no "Уточняющие вопросы", step 5 transitions to Phase 5.

**Step 4: Commit**

```bash
git add skills/task/SKILL.md
git commit -m "feat(task): remove questions section from task file template, redirect to Phase 5"
```

---

### Task 3: Add new Phase 5 (Complete) — completion loop

**Files:**

- Modify: `skills/task/SKILL.md` — insert new Phase 5 section before "## Правила"

**Step 1: Insert Phase 5 before "## Правила"**

Add this block right before the `---` + `## Правила` section:

```markdown
### Фаза 5 — Complete

Сообщи путь к файлу и task-slug, затем запусти цикл завершения.

**Цикл:**

Через AskUserQuestion предложи 3 варианта:

1. **Запустить /sp:plan (Recommended)** — автоматический переход к планированию
2. **Ревью через plannotator** — интерактивная проверка task-файла
3. **Завершить** — выход

**Обработка выбора:**

- **Запустить /sp:plan:** вызови Skill tool с `/sp:plan` и аргументом `docs/ai/<task-slug>/<task-slug>-task.md`. Выход из цикла.
- **Ревью через plannotator:** вызови Skill tool с `/plannotator-annotate` и путём к task-файлу. После получения аннотаций — примени правки к task-файлу, перезапиши его. Вернись к началу цикла.
- **Завершить:** сообщи путь к файлу. Выход из цикла.
```

**Step 2: Verify the edit**

Read the end of SKILL.md. Confirm Phase 5 appears before "## Правила", the flow is: Phase 4 → Phase 5 → (loop or exit).

**Step 3: Commit**

```bash
git add skills/task/SKILL.md
git commit -m "feat(task): add Phase 5 Complete with plan/plannotator/finish loop"
```

---

### Task 4: Update synthesize-guide.md — replace checkbox format

**Files:**

- Modify: `skills/task/reference/synthesize-guide.md:232-270`

**Step 1: Replace the "Уточняющие вопросы" section**

Current section (lines 232-270) describes checkbox format for file output.

Replace with:

```markdown
## Уточняющие вопросы

Генерируй **от 3 до 7 вопросов**. Только если ответ изменит реализацию.

**Тест на нужность вопроса:** «Если я угадаю ответ — реализатор сделает неправильно?» Если да — вопрос нужен. Если нет — убери.

**Вопросы задаются интерактивно через AskUserQuestion** (не записываются в файл).

Для каждого вопроса подготовь:

- Текст вопроса (одно предложение)
- 2-4 варианта с пояснением как каждый влияет на реализацию
- Рекомендуемый вариант первым

**Примеры хороших вопросов** (про реализацию, не про постановку):

- «Где хранить счётчики rate limiting?» → In-memory (текущий паттерн) / Redis (персистентно)
- «Как считать лимит — по IP или по пользователю?» → По IP (проще) / По user ID (точнее) / Оба

**Антипаттерн — вопросы не про реализацию:**

- Что именно нужно сделать?
- Есть ли дедлайн?
- Кто будет ревьювить?
```

**Step 2: Verify the edit**

Read `skills/task/reference/synthesize-guide.md` from line 230. Confirm the section instructs AskUserQuestion, not file checkboxes.

**Step 3: Commit**

```bash
git add skills/task/reference/synthesize-guide.md
git commit -m "feat(task): update synthesize-guide to use AskUserQuestion instead of file checkboxes"
```

---

### Task 5: Update examples — remove questions section

**Files:**

- Modify: `skills/task/examples/simple-task.md:120-145` (remove "Уточняющие вопросы" section)
- Modify: `skills/task/examples/complex-task.md:218-243` (remove "Уточняющие вопросы" section)

**Step 1: Remove "Уточняющие вопросы" from simple-task.md**

Delete the entire section from `## Уточняющие вопросы` to (but not including) `## Материалы`. In simple-task.md this is lines 120-145.

Also update the file header (lines 3-8) to remove the reference to "5 уточняющих вопросов":

Current line 7: `- 5 уточняющих вопросов про реализацию`

Delete this line.

**Step 2: Remove "Уточняющие вопросы" from complex-task.md**

Delete the entire section from `## Уточняющие вопросы` to (but not including) `## Материалы`. In complex-task.md this is lines 218-243.

**Step 3: Verify the edits**

Read both files. Confirm `## Verification` is followed directly by `## Материалы`, no questions section.

**Step 4: Commit**

```bash
git add skills/task/examples/simple-task.md skills/task/examples/complex-task.md
git commit -m "feat(task): remove questions section from example task files"
```

---

### Task 6: Clean up /plan — remove TASK_QUESTIONS handling

**Files:**

- Modify: `skills/plan/SKILL.md:35-55` (Phase 1 Load)
- Modify: `skills/plan/SKILL.md:142-148` (Phase 3 Design, plan-designer prompt)

**Step 1: Remove TASK_QUESTIONS from Phase 1 step 2 extraction list**

In Phase 1 step 2 (line 44), delete:

```markdown
- `TASK_QUESTIONS` — уточняющие вопросы из task-файла (контекст для plan-architect, НЕ для повторного показа)
```

**Step 2: Remove Phase 1 step 4 (checkbox check)**

Delete lines 50-53:

```markdown
**4.** Проверь секцию «Уточняющие вопросы» в task-файле.
Если вопросы без отмеченных чекбоксов остались — предупреди пользователя:
«В task-файле остались неотвеченные вопросы: [список]. Ответьте на них
в файле перед планированием, иначе план будет построен с assumptions.»
```

**Step 3: Remove TASK_QUESTIONS from plan-designer prompt**

In Phase 3 (line 145), delete:

```markdown
Нерешённые task-вопросы: [вставить TASK_QUESTIONS]
```

**Step 4: Verify the edits**

Read `skills/plan/SKILL.md` lines 35-55 and 140-150. Confirm no references to TASK_QUESTIONS or "Уточняющие вопросы".

**Step 5: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(plan): remove TASK_QUESTIONS handling, questions resolved interactively in /task"
```

---

### Task 7: Validation

**Step 1: Validate YAML frontmatter**

```bash
head -1 skills/task/SKILL.md skills/plan/SKILL.md
```

Expected: both start with `---`

**Step 2: Validate JSON manifests**

```bash
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"
```

Expected: `OK`

**Step 3: Run formatter**

```bash
pnpm run format
```

Commit if changes:

```bash
git add -A && git commit -m "style: format markdown files"
```
