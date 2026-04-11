# Глубокая генерация доменного контекста в bootstrap — план реализации

**Task:** docs/ai/18-bootstrap-deep-doc-generation/18-bootstrap-deep-doc-generation-task.md
**Complexity:** medium
**Mode:** sub-agents
**Parallel:** true

## Design decisions

### DD-1: Отдельный агент вместо расширения существующих

**Решение:** Создать `domain-analyzer.md` как 6-й detect-агент.
**Обоснование:** architecture-mapper анализирует структуру директорий, convention-scanner — стиль кода. Доменный анализ — отдельная задача (семантика кода, типы, API-контракты). Параллельный dispatch в Phase 1 добавляет агента без замедления.
**Альтернатива:** Расширить architecture-mapper — смешивает инфраструктурный и доменный анализ, раздувает промт.

### DD-2: domain-analyzer на sonnet

**Решение:** model: sonnet.
**Обоснование:** Извлечение абстракций и workarounds требует семантического анализа кода. Соответствует architecture-mapper и convention-scanner (оба sonnet). Haiku не справится с анализом типов и интерфейсов.
**Альтернатива:** haiku — быстрее и дешевле, но поверхностный анализ обесценивает функцию.

### DD-3: Четыре условные секции в sp-context.md

**Решение:** Domain Models, API Endpoints, Key Abstractions, Environment Variables пишутся только при наличии данных в DOMAIN_FINDINGS.
**Обоснование:** Не все проекты имеют API или ORM-модели. Условность предотвращает NOT_FOUND блоки в контексте.
**Альтернатива:** Всегда писать все секции с NOT_FOUND — добавляет шум без пользы.

### DD-4: DOMAIN_FINDINGS только в claude-md-generator и sp-context-generator

**Решение:** automation-recommender не получает DOMAIN_FINDINGS.
**Обоснование:** automation-recommender работает со стеком и командами для рекомендаций hooks и MCP. Доменные модели и API не нужны.
**Альтернатива:** Передать всем трём — добавляет контекст в automation-recommender без пользы.

### DD-5: Environment в CLAUDE.md — только comprehensive и monorepo

**Решение:** Minimal-шаблон не получает секцию Environment.
**Обоснование:** Minimal предназначен для скриптов и маленьких утилит без env vars. Добавление раздувает его.
**Альтернатива:** Добавить во все — minimal перестаёт быть minimal.

## Tasks

### Task 1: Создать domain-analyzer.md

- **Files:** `skills/bootstrap/agents/domain-analyzer.md` (create)
- **Depends on:** none
- **Scope:** M
- **What:** Создать detect-агент для анализа доменной области: модели данных, API-эндпоинты, ключевые абстракции, env vars, code workarounds.
- **How:**
  1. Frontmatter: name: domain-analyzer, tools: Glob, Grep, Read, Bash, model: sonnet, color: magenta
  2. Пять шагов в `## Процесс`:
     - Шаг 1 — Доменные модели: Glob `**/models/**`, `**/entities/**`, `**/types/**`, `**/schemas/**`, `**/domain/**`. Grep по `interface `, `type `, `class `, `struct `, `model `, `schema `. Для ORM: Glob `**/prisma/schema.prisma`, `**/migrations/**`, `**/alembic/**`. Read найденные файлы, извлечь имена, поля, связи.
     - Шаг 2 — API-эндпоинты: Grep по `@Get`, `@Post`, `@Put`, `@Delete`, `app.get`, `app.post`, `router.get`, `router.post`, `http.HandleFunc`, `@app.route`. Glob `**/openapi.yaml`, `**/swagger.json`. Извлечь метод, путь, handler.
     - Шаг 3 — Ключевые абстракции: Glob `**/services/**`, `**/usecases/**`, `**/core/**`. Read до 5 файлов. Извлечь публичные интерфейсы и сигнатуры методов.
     - Шаг 4 — Env vars: Grep по `process\.env`, `os\.getenv`, `os\.Getenv`, `os\.environ`, `env::var`, `ENV\[`. Glob `.env.example`, `.env.sample`, `.env.template`. Извлечь имя и назначение.
     - Шаг 5 — Code workarounds: Grep по `HACK`, `WORKAROUND`, `XXX`, `FIXME`, `NOTE:`, `IMPORTANT:`, `WARNING:`. Read top-5 результатов с контекстом (строка + 2 вокруг).
  3. `## Structured Output` — YAML с 5 полями
  4. `## Правила` — read-only, ошибки не стопают, данные возвращай
- **Context:** `skills/bootstrap/agents/architecture-mapper.md` (паттерн sonnet-агента: frontmatter, шаги, structured output), `skills/bootstrap/agents/existing-rules-detector.md` (паттерн structured output с вложенными списками)
- **Verify:** `head -1 skills/bootstrap/agents/domain-analyzer.md` → `---`. `grep -c "Шаг" skills/bootstrap/agents/domain-analyzer.md` → >= 5

### Task 2: Добавить Environment в шаблоны

- **Files:** `skills/bootstrap/reference/claude-md-template.md` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** Добавить секцию Environment в comprehensive и monorepo шаблоны. Обновить таблицу секций.
- **How:**
  1. В comprehensive шаблон (после Non-obvious, перед закрывающим ```) вставить секцию Environment с placeholder: `- \`VAR_NAME\` — [назначение]`
  2. В monorepo шаблон добавить аналогично, с пометкой про корневой `.env` vs per-app `.env.local`
  3. В таблицу (строки 159-169) добавить строку: `| Environment | нет | да | да |`
- **Context:** `skills/bootstrap/reference/claude-md-template.md` (строки 31-85 comprehensive, 87-157 monorepo, 159-169 таблица)
- **Verify:** `grep -c "Environment" skills/bootstrap/reference/claude-md-template.md` → >= 3

### Task 3: Уточнить Non-obvious в quality-criteria.md

- **Files:** `skills/bootstrap/reference/quality-criteria.md` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** Расширить критерий Non-obvious: включить env vars и domain-specific workarounds.
- **How:**
  1. Обновить описание критерия (строка 31): "Зафиксированы ли неочевидные решения, gotchas, workarounds, обязательные env vars?"
  2. Строка 37 (15 баллов): "3+ неочевидных факта с объяснением 'почему так', env vars документированы"
- **Context:** `skills/bootstrap/reference/quality-criteria.md` (строки 31-40)
- **Verify:** `grep "env" skills/bootstrap/reference/quality-criteria.md` → found

### Task 4: Обновить claude-md-generator.md

- **Files:** `skills/bootstrap/agents/claude-md-generator.md` (edit)
- **Depends on:** Task 2, Task 3
- **Scope:** S
- **What:** Добавить DOMAIN_FINDINGS во вход агента. Использовать для data flow, env vars и workarounds.
- **How:**
  1. В секцию `## Вход` (после DOC_CONTENT) добавить: `**DOMAIN_FINDINGS (доменный контекст):**\n{{DOMAIN_FINDINGS}}`
  2. В шаг 3 (режим создания) расширить список источников данных:
     - Data flow из `DOMAIN_FINDINGS.API_ENDPOINTS + DOMAIN_FINDINGS.DOMAIN_MODELS` → в Architecture
     - Environment variables из `DOMAIN_FINDINGS.ENV_VARS` → в секцию Environment
     - Code workarounds из `DOMAIN_FINDINGS.CODE_WORKAROUNDS` → в Non-obvious
     - Key abstractions из `DOMAIN_FINDINGS.KEY_ABSTRACTIONS` → в Key Files или Architecture
  3. В шаг 4 (режим обогащения) добавить Environment в список проверяемых секций
- **Context:** `skills/bootstrap/agents/claude-md-generator.md` (вход строки 15-26, шаг 3 строки 39-53, шаг 4 строки 55-68)
- **Verify:** `grep -c "DOMAIN_FINDINGS" skills/bootstrap/agents/claude-md-generator.md` → >= 4

### Task 5: Обновить sp-context-generator.md

- **Files:** `skills/bootstrap/agents/sp-context-generator.md` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** Добавить DOMAIN_FINDINGS во вход. Добавить 4 условные секции. Обновить правила.
- **How:**
  1. В секцию `## Вход` (после DOC_CONTENT) добавить: `**DOMAIN_FINDINGS (доменный контекст):**\n{{DOMAIN_FINDINGS}}`
  2. В шаблон (после `## Conventions`) добавить 4 условные секции:
     ```
     ## Domain Models
     - <model> — <назначение> (source: <path>)

     ## API Endpoints
     - <METHOD> <path> → <handler> (source: <path>)

     ## Key Abstractions
     - <abstraction> — <методы> (source: <path>)

     ## Environment Variables
     - `<VAR>` — <назначение>
     ```
  3. В `## Правила` обновить: "Базовые секции (Stack, Commands, Architecture, Conventions) — обязательные. Domain Models, API Endpoints, Key Abstractions, Environment Variables — условные: пиши только при наличии данных в DOMAIN_FINDINGS."
- **Context:** `skills/bootstrap/agents/sp-context-generator.md` (вход строки 13-19, шаблон строки 34-66, правила строки 73-77)
- **Verify:** `grep -c "DOMAIN_FINDINGS" skills/bootstrap/agents/sp-context-generator.md` → >= 2. `grep "Domain Models" skills/bootstrap/agents/sp-context-generator.md` → found

### Task 6: Обновить bootstrap-verifier.md

- **Files:** `skills/bootstrap/agents/bootstrap-verifier.md` (edit)
- **Depends on:** Task 5
- **Scope:** S
- **What:** Добавить проверку новых секций sp-context.md. Не штрафовать за отсутствие, проверять формат при наличии.
- **How:**
  1. В Шаг 2 (Sections check) после проверки CLAUDE.md добавить проверку sp-context.md:
     - Обязательные секции: Stack, Commands, Architecture, Conventions
     - Условные секции (при наличии — проверить формат списка): Domain Models, API Endpoints, Key Abstractions, Environment Variables
  2. В Шаг 2 добавить проверку секции Environment в CLAUDE.md (опционально)
- **Context:** `skills/bootstrap/agents/bootstrap-verifier.md` (шаг 2 строки 22-31, правила строки 72-77)
- **Verify:** `grep "Domain Models" skills/bootstrap/agents/bootstrap-verifier.md` → found

### Task 7: Обновить SKILL.md — интеграция в pipeline

- **Files:** `skills/bootstrap/SKILL.md` (edit)
- **Depends on:** Task 1
- **Scope:** M
- **What:** Добавить domain-analyzer 6-м агентом в Phase 1. Добавить domain-findings в PROJECT_PROFILE Phase 2. Передать в Phase 3 генераторам, но не в automation-recommender.
- **How:**
  1. Список агентов (строки 13-23): добавить `- Домен → \`agents/domain-analyzer.md\``
  2. Pipeline summary (строка 45): "5 параллельных" → "6 параллельных"
  3. Phase 1 Detect (строка 85): "5 агентов **параллельно**" → "6 агентов **параллельно**", "(5 вызовов)" → "(6 вызовов)". После блока 5 (existing-rules-detector) добавить блок 6: domain-analyzer (sonnet), результат → DOMAIN_FINDINGS. Строка 121: "всех 5" → "всех 6".
  4. Phase 2 Synthesize (строка 131): "из 5 findings" → "из 6 findings". После existing_rules (строки 162-167) добавить в PROJECT_PROFILE:
     ```yaml
     domain:
       models: <из DOMAIN_FINDINGS>
       api_endpoints: <из DOMAIN_FINDINGS>
       key_abstractions: <из DOMAIN_FINDINGS>
       env_vars: <из DOMAIN_FINDINGS>
       workarounds: <из DOMAIN_FINDINGS>
     ```
  5. Phase 3 Generate: в claude-md-generator (строки 182-192) добавить `- DOMAIN_FINDINGS из PROJECT_PROFILE.domain`. В sp-context-generator (строки 194-197) — аналогично. automation-recommender оставить без изменений.
- **Context:** `skills/bootstrap/SKILL.md` целиком (строки 13-23, 45, 80-125, 129-168, 178-207)
- **Verify:** `grep -c "domain-analyzer" skills/bootstrap/SKILL.md` → >= 3. `grep -c "DOMAIN_FINDINGS" skills/bootstrap/SKILL.md` → >= 3. `grep "6 параллельных" skills/bootstrap/SKILL.md` → found.

### Task 8: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Проверить frontmatter изменённых файлов, JSON манифесты, консистентность pipeline.
- **Context:** —
- **Verify:**
  - `head -1 skills/bootstrap/agents/domain-analyzer.md` → `---`
  - `head -1 skills/bootstrap/SKILL.md` → `---`
  - `head -1 skills/bootstrap/agents/claude-md-generator.md` → `---`
  - `head -1 skills/bootstrap/agents/sp-context-generator.md` → `---`
  - `head -1 skills/bootstrap/agents/bootstrap-verifier.md` → `---`
  - `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK
  - `grep -c "DOMAIN_FINDINGS" skills/bootstrap/SKILL.md` → >= 3
  - `grep "Domain Models" skills/bootstrap/agents/sp-context-generator.md` → found
  - `grep "Environment" skills/bootstrap/reference/claude-md-template.md` → found

## Execution

- **Mode:** sub-agents
- **Parallel:** true
- **Reasoning:** 8 tasks без пересечений файлов между группами, три последовательных этапа
- **Order:**
  ```
  Group 1 (parallel): Task 1, Task 2, Task 3, Task 5
  ─── barrier ───
  Group 2 (parallel): Task 4, Task 6, Task 7
  ─── barrier ───
  Group 3 (sequential): Task 8
  ```

## Verification

- `head -1 skills/bootstrap/agents/domain-analyzer.md` → `---`
- `head -1 skills/bootstrap/SKILL.md` → `---`
- `grep -c "domain-analyzer" skills/bootstrap/SKILL.md` → >= 3
- `grep -c "DOMAIN_FINDINGS" skills/bootstrap/agents/claude-md-generator.md` → >= 2
- `grep -c "DOMAIN_FINDINGS" skills/bootstrap/agents/sp-context-generator.md` → >= 2
- `grep "Domain Models" skills/bootstrap/agents/sp-context-generator.md` → found
- `grep "Environment" skills/bootstrap/reference/claude-md-template.md` → found
- `grep "env" skills/bootstrap/reference/quality-criteria.md` → found
- `grep "Domain Models" skills/bootstrap/agents/bootstrap-verifier.md` → found
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK

## Materials

- `skills/bootstrap/SKILL.md` — оркестратор pipeline
- `skills/bootstrap/agents/existing-rules-detector.md` — паттерн structured output
- `skills/bootstrap/agents/architecture-mapper.md` — паттерн sonnet detect-агента
- `skills/bootstrap/agents/claude-md-generator.md` — генератор CLAUDE.md
- `skills/bootstrap/agents/sp-context-generator.md` — генератор sp-context.md
- `skills/bootstrap/reference/claude-md-template.md` — шаблоны CLAUDE.md
- `skills/bootstrap/reference/quality-criteria.md` — рубрика качества
- `skills/bootstrap/agents/bootstrap-verifier.md` — верификатор
