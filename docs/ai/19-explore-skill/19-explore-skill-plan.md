# Реализовать скилл /explore — план реализации

**Task:** docs/ai/19-explore-skill/19-explore-skill-task.md
**Complexity:** medium
**Mode:** sub-agents
**Parallel:** true

## Design decisions

### DD-1: Q&A loop в оркестраторе

**Решение:** Loop полностью в SKILL.md. Q&A — интерактивное взаимодействие с пользователем через AskUserQuestion. Агенты stateless, выполняют одну задачу за dispatch.
**Обоснование:** Паттерн из `skills/fix/SKILL.md` — оркестратор принимает решения и задаёт вопросы; агенты исследуют и пишут артефакты. AskUserQuestion доступен только оркестратору.
**Альтернатива:** Отдельный агент-интерпретатор Q&A. Нарушает паттерн: агенты не имеют доступа к AskUserQuestion.

### DD-2: Summary chain inline + QA_LOG параллельно

**Решение:** Оркестратор ведёт две структуры: `EXPLORATION_SUMMARY` (нумерованный список сжатых findings, ~200 токенов на Q&A) и `QA_LOG` (полные Q&A пары: вопрос + ANSWER + KEY_FILES + WEB_SOURCES + OPTIONS). EXPLORATION_SUMMARY передаётся explore-agent через `{{PREVIOUS_FINDINGS}}`. QA_LOG передаётся explore-log-writer через `{{QA_PAIRS}}` при Finalize.
**Обоснование:** Разделение даёт агенту компактный контекст (~2000 токенов на Q10), а log-writer получает полные данные для записи. Лог записывается однократно при Finalize — осознанный trade-off: реализация проще, но при обрыве сессии лог теряется. Для exploration это приемлемо — лог имеет справочную, не критическую ценность.
**Альтернатива:** Temp-файл для промежуточного состояния. Избыточно; fix-pattern тоже хранит состояние в контексте оркестратора.

### DD-3: Question classification и web search в агенте

**Решение:** explore-agent классифицирует вопрос (codebase / web / hybrid) и сам решает источник данных. Приоритет: (1) context7 MCP если установлен у пользователя — для документации библиотек и фреймворков, (2) WebSearch/WebFetch как fallback. Оркестратор не участвует в классификации.
**Обоснование:** Агент лучше понимает содержание вопроса в контексте кодовой базы. context7 даёт структурированную документацию с актуальными примерами, WebSearch — более широкий охват. Агент проверяет доступность context7 и выбирает оптимальный источник.
**Альтернатива:** Оркестратор классифицирует по ключевым словам и передаёт флаг. Излишняя логика; оркестратор не видит контекст кодовой базы.

### DD-4: Brainstorm per-question

**Решение:** explore-agent возвращает `RESPONSE_TYPE: answer | brainstorm` на каждый вопрос. При brainstorm — `OPTIONS` (label + description для каждого варианта). Оркестратор показывает развёрнутый ANSWER и сохраняет OPTIONS в QA_LOG для записи как todo-чеклист в exploration log.
**Обоснование:** Спецификация issue #19 определяет brainstorm как тип ответа на конкретный вопрос, не как отдельную фазу. Варианты полезны в контексте конкретного вопроса.
**Альтернатива:** Synthesis-фаза в конце сессии. Перегружает финал; теряет контекст конкретного вопроса.

### DD-5: Slug generation в оркестраторе через AskUserQuestion

**Решение:** Оркестратор предлагает 2-3 варианта slug через AskUserQuestion. Prefix `explore-`, kebab-case, английский, max 40 символов.
**Обоснование:** По спецификации issue #19, Фаза Init. Для explore нет сложной логики ветки/тикета как в fix — context-collector избыточен.
**Альтернатива:** Автогенерация без подтверждения. Рискует дать плохой slug; пользователь контролирует naming.

### DD-6: Разделение ответственностей: prompt enrichment vs question interpretation

**Решение:** Оркестратор выполняет prompt enrichment — добавляет PREVIOUS_FINDINGS и KEY_FILES из предыдущих раундов в промт для агента. Агент выполняет question interpretation — переформулирует вопрос в конкретные search queries (silent, без вывода пользователю).
**Обоснование:** Оркестратор владеет состоянием сессии (summary chain), агент владеет исследовательской стратегией. Разграничение по паттерну `fix/SKILL.md:130-144` — оркестратор подготавливает данные, агент работает с готовым промтом.
**Альтернатива:** Обе функции в одном месте. Смешивает orchestration и research concerns.

## Tasks

### Task 1: Создать exploration-log-format reference

- **Files:** `skills/explore/reference/exploration-log-format.md` (create)
- **Depends on:** none
- **Scope:** S
- **What:** Определить формат файла exploration log: header, Q&A записи с file:line ссылками, brainstorm todo-чеклист, итоговый summary, правила.
- **How:** По паттерну `skills/fix/reference/fix-log-format.md`. Header: `# Exploration: <TOPIC>`, `**Дата:** YYYY-MM-DD`, `**Вопросов:** N`. Формат Q&A записи: `## Q<N>: <вопрос>`, prose с file:line ссылками, `**Key files:**`, `**Sources:**`. Формат brainstorm Q&A: добавить секцию `### Варианты` с todo-чеклистом `- [ ] **<label>** — <description>` и `- [ ] **Other:** ___`. Формат итогового summary: `## Summary`, 3-5 предложений. Правила: нумерация Q с 1, дата YYYY-MM-DD, без emoji, секция Sources и Варианты — только при наличии.
- **Context:** `skills/fix/reference/fix-log-format.md` (паттерн формата)
- **Verify:** файл начинается с `---`, содержит секции «Header файла», «Формат Q&A записи», «Формат brainstorm записи», «Правила»

### Task 2: Создать explore-agent

- **Files:** `skills/explore/agents/explore-agent.md` (create)
- **Depends on:** none
- **Scope:** M
- **What:** Создать read-only агента для исследования кодовой базы и ответа на вопросы. Два типа ответов: answer и brainstorm. Для документации библиотек — context7 MCP в приоритете, WebSearch как fallback.
- **How:** YAML frontmatter: `tools: Glob, Grep, LS, Read, Bash, WebSearch, WebFetch`, `model: sonnet`, `color: yellow`. Bash для `git log`, `wc -l` и подобных read-only команд. Входные placeholder-ы: `{{EXPLORATION_TOPIC}}`, `{{CURRENT_QUESTION}}`, `{{PREVIOUS_FINDINGS}}`. Процесс: (1) Question interpretation — переформулировать вопрос в 2-3 search queries (silent, не выводить пользователю). (2) Classification — определить `codebase | web | hybrid`. Codebase: Glob/Grep/Read. Web: context7 MCP (если установлен) для документации библиотек и фреймворков, WebSearch/WebFetch как fallback или для широкого поиска. Hybrid: оба. Auto-detect web: упоминание внешних библиотек, "best practices", сравнения технологий. (3) Research — искать с file:line ссылками. (4) Self-check — перед каждой file:line ссылкой перечитать файл в указанном диапазоне и убедиться в соответствии. (5) Structured Output. Два RESPONSE_TYPE: `answer` (ANSWER + SUMMARY + KEY_FILES + WEB_SOURCES) и `brainstorm` (+ OPTIONS: список вариантов с label и description). SUMMARY: 1-3 предложения, ключевые выводы для summary chain. Правила: Read-only — код не изменять. Конкретные ссылки: file:line для каждого утверждения. При web-вопросах проверить доступность context7 MCP и использовать в приоритете над WebSearch для документации.
- **Context:** `skills/fix/agents/fix-investigator.md` (паттерн read-only agent с structured output), `skills/task/agents/task-explorer.md` (паттерн расширенного исследователя с WebSearch)
- **Verify:** frontmatter содержит `tools:` без Write и Edit, содержит `model: sonnet`, содержит `color: yellow`

### Task 3: Создать explore-log-writer

- **Files:** `skills/explore/agents/explore-log-writer.md` (create)
- **Depends on:** Task 1
- **Scope:** S
- **What:** Создать агента записи exploration log. Читает reference с форматом, создаёт файл, коммитит без ticket prefix.
- **How:** YAML frontmatter: `tools: Read, Write, Edit, Bash`, `model: haiku`, `color: gray`. Placeholder-ы: `{{SLUG}}`, `{{TOPIC}}`, `{{QA_PAIRS}}`, `{{DATE}}`. Формат QA_PAIRS от оркестратора — markdown-блок с нумерованными записями: `Q: <вопрос>`, `A: <ответ>`, `KEY_FILES: <список>`, `WEB_SOURCES: <список>`, `OPTIONS: <если brainstorm>`. Процесс: (1) Прочитать `reference/exploration-log-format.md`. (2) Проверить существование `docs/ai/{{SLUG}}/{{SLUG}}-exploration.md`. (3) `mkdir -p "docs/ai/{{SLUG}}"`. (4) Write файл по формату из reference — header + Q&A записи из QA_PAIRS + Summary. (5) `git add` + `git commit -m "docs({{SLUG}}): add exploration log"` — без ticket prefix. Формат ответа: `EXPLORATION_LOG_FILE: <path>`, `COMMIT: <hash>`.
- **Context:** `skills/fix/agents/fix-log-writer.md` (паттерн log writer с mkdir + commit), `skills/explore/reference/exploration-log-format.md` (Task 1 — формат)
- **Verify:** frontmatter содержит `tools: Read, Write, Edit, Bash`, содержит `model: haiku`

### Task 4: Создать SKILL.md оркестратор

- **Files:** `skills/explore/SKILL.md` (create)
- **Depends on:** Task 2, Task 3
- **Scope:** L
- **What:** Создать оркестратор с user-driven Q&A loop, summary chain, dispatch двух агентов, 4 фазы.
- **How:** YAML frontmatter: `name: explore`, `description` с trigger phrases: "explore", "исследуй", "как устроено", "как работает", "объясни", "расскажи про", "что если", "сравни", "какие варианты", "предложи подход", "брейнсторм". Делегировать: исследование → `agents/explore-agent.md`, запись лога → `agents/explore-log-writer.md`. Работать от начала до конца без остановок.

  **Фаза 1 — Init:** Если `$ARGUMENTS` пуст → AskUserQuestion "О чём хочешь поговорить?". AskUserQuestion для slug: предложить 2-3 варианта из первого вопроса (prefix `explore-`, kebab-case, английский, max 40 символов) + "Other". `mkdir -p docs/ai/<slug>/`. Первый вопрос = `$ARGUMENTS`. Инициализировать: `EXPLORATION_SUMMARY = ""`, `QA_LOG = []`, `ITERATION = 0`.

  **Фаза 2 — Loop (user-driven Q&A):** Повторять до выхода пользователя. (a) Prompt enrichment — оркестратор формирует промт: `{{EXPLORATION_TOPIC}}` = тема, `{{CURRENT_QUESTION}}` = вопрос пользователя, `{{PREVIOUS_FINDINGS}}` = EXPLORATION_SUMMARY. Добавить KEY_FILES из предыдущих раундов если связаны. (b) Dispatch `explore-agent` через Agent tool (model: sonnet). (c) При `RESPONSE_TYPE = answer` — показать ANSWER пользователю. При `RESPONSE_TYPE = brainstorm` — показать ANSWER + OPTIONS. (d) Append SUMMARY агента в EXPLORATION_SUMMARY. Append полную запись (вопрос + ANSWER + KEY_FILES + WEB_SOURCES + OPTIONS) в QA_LOG. `ITERATION++`. TodoWrite: "Q<N> исследован". (e) AskUserQuestion: "Задать ещё вопрос" (open-ended input) / "Сохранить и завершить" → Фаза 3 / "Продолжить без сохранения" → выход. (f) При 20+ вопросах — warning: "Сессия длинная, рекомендую сохранить".

  **Фаза 3 — Finalize:** Dispatch `explore-log-writer` (model: haiku). Передать: SLUG, TOPIC (первый вопрос), QA_PAIRS (полный QA_LOG в markdown формате), DATE. Вывести путь к файлу и количество вопросов.

  **Фаза 4 — Complete:** AskUserQuestion: "Ещё вопрос" → вернуться к Фазе 2 (slug сохраняется) / "Создать задачу через /sp:task (Recommended)" → вызвать Skill tool с `/sp:task` и TOPIC / "Завершить" → выйти. Правила оркестратора: тонкий оркестратор — файловые операции делегировать агентам. Язык контента — русский.

- **Context:** `skills/fix/SKILL.md` (паттерн оркестратора: фазы, dispatch, init/complete, AskUserQuestion), `skills/explore/agents/explore-agent.md` (Task 2 — structured output), `skills/explore/agents/explore-log-writer.md` (Task 3 — placeholder-ы)
- **Verify:** SKILL.md начинается с `---`, содержит фазы Init, Loop, Finalize, Complete; dispatch `explore-agent` и `explore-log-writer`; AskUserQuestion в Init и Loop

### Task 5: Обновить /hi и CLAUDE.md

- **Files:** `skills/hi/SKILL.md` (edit), `CLAUDE.md` (edit)
- **Depends on:** Task 4
- **Scope:** S
- **What:** Добавить /explore в таблицу скиллов /hi и в Implemented skills в CLAUDE.md.
- **How:** В `skills/hi/SKILL.md`: найти строку `## Планируемые скиллы` и вставить перед ней новую секцию:

  ```markdown
  ### /explore — исследование кодовой базы

  Read-only Q&A loop для исследования кодовой базы и обсуждения подходов. Классифицирует вопросы (codebase / web / hybrid), ищет в коде и интернете, накапливает контекст через summary chain, записывает exploration log.

  **Вход:** тема или вопрос → **Выход:** `docs/ai/<slug>/<slug>-exploration.md`

  /sp:explore как работает аутентификация
  /sp:explore сравни Framer Motion и react-spring для наших анимаций
  ```

  Также добавить `/sp:explore <тема>` в секцию "Полный цикл" перед `/sp:task`. В `CLAUDE.md`: добавить `- /explore — исследование кодовой базы: read-only Q&A loop с summary chain` в секцию Implemented skills после `/hi`.

- **Context:** `skills/hi/SKILL.md` (найти `## Планируемые скиллы` для точки вставки), `CLAUDE.md` (найти `## Implemented skills` для точки вставки)
- **Verify:** `grep "explore" skills/hi/SKILL.md` и `grep "explore" CLAUDE.md` находят строки

### Task 6: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Проверить все verification criteria из task-файла.
- **How:** Выполнить последовательно: (1) `head -1 skills/explore/SKILL.md skills/explore/agents/*.md skills/explore/reference/*.md` → каждый начинается с `---`. (2) `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"` → OK. (3) `pnpm run format:check` → без ошибок. Если ошибки — запустить `pnpm run format` и закоммитить. (4) Проверить содержимое: SKILL.md содержит 4 фазы, explore-agent.md tools без Write/Edit, explore-log-writer.md tools содержит Write, hi/SKILL.md содержит /explore, CLAUDE.md содержит /explore в Implemented.
- **Context:** —
- **Verify:** Все команды из task-файла секции Verification проходят

## Execution

- **Mode:** sub-agents
- **Parallel:** true
- **Reasoning:** 6 tasks, параллельные группы не пересекаются по файлам, одна кодовая база
- **Order:**
  ```text
  Group 1 (parallel): Task 1, Task 2
  ─── barrier ───
  Group 2 (sequential): Task 3
  ─── barrier ───
  Group 3 (sequential): Task 4
  ─── barrier ───
  Group 4 (sequential): Task 5 → Task 6
  ```

## Verification

- `head -1 skills/explore/SKILL.md skills/explore/agents/*.md skills/explore/reference/*.md` → каждый файл начинается с `---`
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"` → OK (манифесты не сломаны)
- `pnpm run format:check` → без ошибок
- `claude --plugin-dir .` → скилл `/sp:explore` доступен в списке
- SKILL.md содержит 4 фазы: Init, Loop, Finalize, Complete
- explore-agent.md frontmatter содержит `tools:` без Write и Edit
- explore-log-writer.md frontmatter содержит `tools: Read, Write, Edit, Bash`
- `skills/hi/SKILL.md` содержит строку с /explore
- `CLAUDE.md` содержит `/explore` в секции Implemented skills

## Materials

- [Issue #19](https://github.com/projectory-com/sp/issues/19) — полная спецификация скилла
- `skills/fix/SKILL.md` — паттерн оркестратора с фазами
- `skills/fix/agents/fix-investigator.md` — паттерн read-only agent
- `skills/fix/agents/fix-log-writer.md` — паттерн log writer
- `skills/fix/reference/fix-log-format.md` — паттерн формата лога
- `skills/gst/SKILL.md` — паттерн простого скилла
