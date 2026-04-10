# Скилл /bootstrap — план реализации

**Task:** docs/ai/18-bootstrap/18-bootstrap-task.md
**Complexity:** complex
**Mode:** sub-agents
**Parallel:** true

## Design decisions

### DD-1: sp-context.md — flat KEY: VALUE, не YAML

**Решение:** Формат `.claude/sp-context.md` — плоские секции с ключами, без YAML/JSON.
**Обоснование:** Все structured outputs в sp используют flat KEY: VALUE (`skills/fix/agents/fix-context-collector.md:106-124`, `skills/gst/agents/git-data-collector.md`). Агенты парсят через Read tool + regex, без YAML-парсеров. Ошибка в YAML ломает graceful degradation молча.
**Альтернатива:** YAML frontmatter — сложнее парсить, ошибки формата скрыты.

### DD-2: Phase 1 — 5 агентов параллельно

**Решение:** Dispatch 5 detect-агентов одновременно через Agent tool.
**Обоснование:** Все агенты read-only, файлы не пересекаются. Паттерн параллельного dispatch подтверждён в `skills/do/SKILL.md:97-98`.
**Альтернатива:** Sequential — добавляет latency без выигрыша.

### DD-3: Reference — полный адаптированный контент

**Решение:** Полные reference-файлы в `skills/bootstrap/reference/`, адаптированные из Anthropic-плагинов.
**Обоснование:** WebFetch при runtime непредсказуем: URL нестабильны, offline-окружения недоступны. Контент требует перевода и адаптации под sp-style.
**Альтернатива:** WebFetch из GitHub при runtime — хрупко, offline-несовместимо.

### DD-4: claude-md-generator пишет напрямую

**Решение:** claude-md-generator — write-агент с Edit/Write. Оркестратор передаёт PROJECT_PROFILE, агент выбирает Edit или Write.
**Обоснование:** Файловые операции принадлежат агентам, оркестратор остаётся тонким (`skills/fix/SKILL.md:279`).
**Альтернатива:** Оркестратор получает текст и пишет сам — нарушает принцип thin orchestrator.

### DD-5: Phase 4 fix loop — re-dispatch агента

**Решение:** При ISSUES от verifier оркестратор повторно dispatch claude-md-generator с ISSUES в промпте; оркестратор файлы не правит.
**Обоснование:** Re-dispatch дороже по latency, но сохраняет архитектурную чистоту: оркестратор делегирует файловые операции агентам.
**Альтернатива:** Оркестратор вызывает Edit напрямую — быстрее, но нарушает thin orchestrator.

### DD-6: Шаг 0 — единый формат для всех обновляемых агентов

**Решение:** Идентичный блок "Шаг 0 — Контекст" перед первым процессным шагом каждого агента. Для validator и formatter — дополнение: "если sp-context содержит Commands — проверь существование команд и используй их".
**Обоснование:** Единый формат упрощает поиск (`grep sp-context`), поддержку и верификацию.
**Альтернатива:** Индивидуальные формулировки в каждом агенте — сложнее поддерживать.

### DD-7: code-reviewer.md вместо review-analyzer.md

**Решение:** Обновить `skills/review/agents/code-reviewer.md`. Файл `review-analyzer.md` отсутствует.
**Обоснование:** `code-reviewer.md` — единственный агент в `skills/review/`, анализирующий diff и архитектуру.
**Альтернатива:** Создать `review-analyzer.md` — scope creep, нарушает ограничение на создание лишних файлов.

### DD-8: hooks-patterns.md — Claude Code hooks + git hooks

**Решение:** Секция "Claude Code hooks" вверху (с примером из `hooks/hooks.json`), затем per-stack git hooks.
**Обоснование:** Пользователь сразу видит Claude Code hooks как опцию автоматизации.
**Альтернатива:** Только git hooks — картина неполная.

## Tasks

### Task 1: Reference-файлы

- **Files:** `skills/bootstrap/reference/quality-criteria.md` (create), `skills/bootstrap/reference/claude-md-template.md` (create), `skills/bootstrap/reference/update-guidelines.md` (create), `skills/bootstrap/reference/hooks-patterns.md` (create), `skills/bootstrap/reference/mcp-servers.md` (create)
- **Depends on:** none
- **Scope:** M
- **What:** Создать 5 reference-файлов на основе контента Anthropic-плагинов claude-md-management и claude-code-setup.
- **How:**
  1. `mkdir -p skills/bootstrap/reference`
  2. `quality-criteria.md` — рубрика качества CLAUDE.md: 6 критериев (Commands 20pt, Architecture 20pt, Non-obvious 15pt, Conciseness 15pt, Currency 15pt, Actionability 15pt), грейды A-F, assessment process. Fetch из `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-md-management/references/quality-criteria.md`, адаптировать: русские заголовки, sp-style.
  3. `claude-md-template.md` — 3 шаблона (minimal, comprehensive, monorepo) с секциями: Project, Architecture, Commands, Conventions, Key Files. Fetch из `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-md-management/references/templates.md`.
  4. `update-guidelines.md` — что включать (project-specific facts, commands), что исключать (generic advice), red flags, idempotency rules. Fetch из claude-md-management SKILL.md Phase 4.
  5. `hooks-patterns.md` — Claude Code hooks section + per-stack git hooks (Node/prettier/eslint, Python/black/ruff, Go/gofmt, Rust/cargo fmt). Fetch из `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-automation-recommender/references/hooks-patterns.md`. Добавить секцию Claude Code hooks с примером из `hooks/hooks.json`.
  6. `mcp-servers.md` — 6+ категорий MCP-серверов (Databases, Version Control, Communication, Search, Development, Cloud). Fetch из `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-automation-recommender/references/mcp-servers.md`.
- **Context:** `CLAUDE.md` (sp repo, пример Grade A), `hooks/hooks.json` (Claude Code hooks example), `skills/task/reference/synthesize-guide.md` (writing style)
- **Verify:** `ls skills/bootstrap/reference/ | wc -l` → 5. `head -1 skills/bootstrap/reference/*.md` → каждый начинается с `#` (plain markdown, не frontmatter).

### Task 2: Detect-агенты

- **Files:** `skills/bootstrap/agents/stack-detector.md` (create), `skills/bootstrap/agents/architecture-mapper.md` (create), `skills/bootstrap/agents/convention-scanner.md` (create), `skills/bootstrap/agents/validation-scanner.md` (create), `skills/bootstrap/agents/existing-rules-detector.md` (create)
- **Depends on:** none
- **Scope:** M
- **What:** Создать 5 read-only агентов для Phase 1 (Detect).
- **How:**
  1. `mkdir -p skills/bootstrap/agents`
  2. **stack-detector.md** — frontmatter: `name: stack-detector`, `tools: Bash, Glob, Read`, `model: haiku`, `color: cyan`. Процесс: проверить `package.json`, `go.mod`, `requirements.txt`/`pyproject.toml`, `Cargo.toml`, `*.gemspec`, `.nvmrc`, Dockerfile. Output: `LANGUAGES:`, `FRAMEWORKS:`, `PACKAGE_MANAGER:`, `RUNTIME:`, `RUNTIME_VERSION:`.
  3. **architecture-mapper.md** — frontmatter: `tools: Glob, Grep, LS, Read, Bash`, `model: sonnet`, `color: yellow`. Процесс: `ls`, `find -maxdepth 2 -type d`, найти entry points (main/index/app), определить layers (api/service/repository), monorepo. Output: `ARCHITECTURE_PATTERN:`, `KEY_DIRS:`, `ENTRY_POINTS:`, `LAYERS:`, `NOTES:`.
  4. **convention-scanner.md** — frontmatter: `tools: Glob, Grep, Read`, `model: sonnet`, `color: yellow`. Процесс: прочитать 3-5 source files, определить naming (camelCase/snake_case), imports, file naming, test conventions. Проверить `.eslintrc`, `.editorconfig`, `biome.json`. Output: `NAMING:`, `IMPORT_STYLE:`, `FILE_NAMING:`, `TEST_CONVENTIONS:`, `CODE_STYLE:`.
  5. **validation-scanner.md** — frontmatter: `tools: Read, Glob, Bash`, `model: haiku`, `color: cyan`. Процесс: `package.json` scripts, `Makefile`, `justfile`. Output: `DEV:`, `BUILD:`, `TEST:`, `LINT:`, `FORMAT:`, `TYPECHECK:`, `PACKAGE_MANAGER:`. Отсутствующие — `NOT_FOUND`.
  6. **existing-rules-detector.md** — frontmatter: `tools: Bash, Read, Glob`, `model: haiku`, `color: cyan`. Проверить: CLAUDE.md, README.md, CONTRIBUTING.md, .cursorrules, .github/CLAUDE.md. Если CLAUDE.md есть — оценить по секциям. Output: `CLAUDE_MD_EXISTS:`, `CLAUDE_MD_PATH:`, `CLAUDE_MD_SECTIONS:`, `CLAUDE_MD_QUALITY:`, `OTHER_RULES:`.
- **Context:** `skills/fix/agents/fix-context-collector.md` (haiku structured output pattern), `skills/fix/agents/fix-investigator.md` (sonnet read-only pattern)
- **Verify:** `head -1 skills/bootstrap/agents/stack-detector.md skills/bootstrap/agents/architecture-mapper.md skills/bootstrap/agents/convention-scanner.md skills/bootstrap/agents/validation-scanner.md skills/bootstrap/agents/existing-rules-detector.md` → каждый начинается с `---`.

### Task 3: Process-агенты (claude-md-generator, sp-context-generator)

- **Files:** `skills/bootstrap/agents/claude-md-generator.md` (create), `skills/bootstrap/agents/sp-context-generator.md` (create)
- **Depends on:** Task 1 (reference files must exist for generator references)
- **Scope:** M
- **What:** Создать 2 write-агента Phase 3 (Generate).
- **How:**
  1. **claude-md-generator.md** — frontmatter: `name: claude-md-generator`, `tools: Read, Write, Edit, Glob`, `model: sonnet`, `color: green`. Принимает `{{PROJECT_PROFILE}}` и `{{CLAUDE_MD_EXISTS}}`. CLAUDE.md отсутствует → Read `reference/claude-md-template.md`, выбрать шаблон, заполнить из PROJECT_PROFILE, Write. CLAUDE.md существует → Read текущий, определить недостающие секции, Edit для добавления. Читает `reference/quality-criteria.md` как таргет Grade A. Принимает опциональный `{{ISSUES}}` для re-dispatch fix loop. Output: `STATUS: created|enriched`, `SECTIONS_ADDED:`, `QUALITY_ESTIMATE:`.
  2. **sp-context-generator.md** — frontmatter: `name: sp-context-generator`, `tools: Write, Bash`, `model: haiku`, `color: gray`. Принимает `{{PROJECT_PROFILE}}`. Процесс: `mkdir -p .claude`, Write `.claude/sp-context.md`. Формат файла:
     ```
     # SP Context: <project-name>

     ## Stack
     - Languages: <из PROJECT_PROFILE>
     - Frameworks: <из PROJECT_PROFILE>
     - Package manager: <из PROJECT_PROFILE>
     - Runtime: <из PROJECT_PROFILE>

     ## Commands
     - Dev: <команда | NOT_FOUND>
     - Build: <команда>
     - Test: <команда>
     - Lint: <команда>
     - Format: <команда>
     - Typecheck: <команда>

     ## Architecture
     - Pattern: <из PROJECT_PROFILE>
     - Key dirs: <список>
     - Entry points: <список>
     - Layers: <список>

     ## Conventions
     - Naming: <camelCase|snake_case|...>
     - File naming: <kebab|snake|...>
     - Import style: <из PROJECT_PROFILE>
     ```
     Всегда Write (overwrite) — source of truth остаётся кодовая база. Output: `SP_CONTEXT_FILE: .claude/sp-context.md`.
- **Context:** `skills/explore/agents/explore-log-writer.md` (Write vs Edit branching), `skills/fix/agents/fix-log-writer.md` (simple write agent), `skills/bootstrap/reference/quality-criteria.md`, `skills/bootstrap/reference/claude-md-template.md`
- **Verify:** `grep "model: sonnet" skills/bootstrap/agents/claude-md-generator.md` и `grep "model: haiku" skills/bootstrap/agents/sp-context-generator.md` — оба pass.

### Task 4: Process-агенты (automation-recommender, bootstrap-verifier)

- **Files:** `skills/bootstrap/agents/automation-recommender.md` (create), `skills/bootstrap/agents/bootstrap-verifier.md` (create)
- **Depends on:** Task 1 (reference files)
- **Scope:** M
- **What:** Создать read-only recommender и read-only verifier.
- **How:**
  1. **automation-recommender.md** — frontmatter: `name: automation-recommender`, `tools: Read`, `model: haiku`, `color: cyan`. Принимает `{{PROJECT_PROFILE}}`. Читает `reference/hooks-patterns.md` и `reference/mcp-servers.md`. Сопоставляет стек с паттернами. Возвращает markdown-текст рекомендаций (hooks + MCP). Write/Edit отсутствуют. Output: `RECOMMENDATIONS: <markdown text>`.
  2. **bootstrap-verifier.md** — frontmatter: `name: bootstrap-verifier`, `tools: Read, Bash, Glob`, `model: sonnet`, `color: cyan`. Процесс: (1) проверить наличие CLAUDE.md и `.claude/sp-context.md`, (2) проверить обязательные секции CLAUDE.md, (3) проверить что команды из CLAUDE.md существуют в `package.json`/`Makefile` (запустить `--help`), (4) оценить качество по `reference/quality-criteria.md`. Output: `FILES_OK:`, `SECTIONS_OK:`, `COMMANDS_OK:`, `QUALITY_SCORE:`, `QUALITY_GRADE:`, `ISSUES:`.
- **Context:** `skills/plan/agents/plan-reviewer.md` (reviewer Verdict pattern), `skills/bootstrap/reference/quality-criteria.md`, `skills/bootstrap/reference/hooks-patterns.md`, `skills/bootstrap/reference/mcp-servers.md`
- **Verify:** `grep "tools: Read$" skills/bootstrap/agents/automation-recommender.md` — без Write/Edit. `grep "model: sonnet" skills/bootstrap/agents/bootstrap-verifier.md` — pass.

### Task 5: SKILL.md оркестратор

- **Files:** `skills/bootstrap/SKILL.md` (create)
- **Depends on:** Task 2, Task 3, Task 4 (все 9 агентов должны существовать)
- **Scope:** L
- **What:** Создать оркестратор: 7 фаз (Preflight, Detect, Synthesize, Generate, Verify, Confirm, Commit).
- **How:**
  Frontmatter:
  ```yaml
  name: bootstrap
  description: >-
    Подготовка проекта к работе с sp flow. Активируется когда пользователь пишет
    "bootstrap", "настрой sp", "подготовь проект", "инициализация sp",
    "setup sp", "первый запуск".
  ```
  Структура по паттерну `skills/fix/SKILL.md`:
  1. **Header:** идентификация, список агентов с путями, принцип "тонкий оркестратор"
  2. **Phase 0 — Preflight:**
     ```bash
     git rev-parse --is-inside-work-tree 2>/dev/null
     ```
     Результат false → abort. Проверить отсутствие `.claude-plugin/plugin.json` → файл присутствует → abort "sp-репозиторий".
  3. **Phase 1 — Detect:** прочитать 5 detect-агентов, dispatch параллельно через Agent tool (5 вызовов одновременно). Дождаться 5 результатов. Сохранить: `STACK_FINDINGS`, `ARCH_FINDINGS`, `CONV_FINDINGS`, `VAL_FINDINGS`, `RULES_FINDINGS`.
  4. **Phase 2 — Synthesize:** агрегировать PROJECT_PROFILE из 5 findings:
     ```
     PROJECT_PROFILE:
       name, languages, frameworks, package_manager, runtime
       architecture: pattern, layers, entry_points, key_dirs
       commands: dev, build, test, lint, format, typecheck
       conventions: naming, file_naming, import_style
       existing_rules: claude_md_exists, claude_md_content, claude_md_quality
     ```
  5. **Phase 3 — Generate:** dispatch 3 агента (claude-md-generator + sp-context-generator параллельно, automation-recommender параллельно с ними). Передать PROJECT_PROFILE и CLAUDE_MD_EXISTS.
  6. **Phase 4 — Verify:** dispatch bootstrap-verifier. QUALITY_GRADE < A и ISSUES непуст → re-dispatch claude-md-generator с ISSUES (макс 1 retry, DD-5). После retry Grade остаётся < A → продолжить с warning.
  7. **Phase 5 — Confirm:** notify ACTION_REQUIRED. Показать: сводку PROJECT_PROFILE, quality score CLAUDE.md, содержимое sp-context.md, рекомендации. AskUserQuestion: Закоммитить (Recommended) / Просмотреть и отредактировать / Отменить. Пользователь редактирует → re-verify → Confirm.
  8. **Phase 6 — Commit:** проверить `.claude/` в .gitignore. `git add CLAUDE.md .claude/sp-context.md && git commit -m "chore: bootstrap sp flow context"`. Notify STAGE_COMPLETE.
  9. **Правила:** тонкий оркестратор без файловых операций, TodoWrite на каждой фазе, язык русский.
- **Context:** `skills/fix/SKILL.md` (orchestrator phases + notify), `skills/do/SKILL.md` (parallel dispatch), `skills/task/SKILL.md` (AskUserQuestion + notify cycle), `skills/gca/reference/commit-convention.md`, все 9 агентов в `skills/bootstrap/agents/`
- **Verify:** `head -1 skills/bootstrap/SKILL.md` → `---`. `grep -c "## Фаза\|## Phase" skills/bootstrap/SKILL.md` → 7. `grep "agents/" skills/bootstrap/SKILL.md | wc -l` → минимум 9 ссылок на агентов.

### Task 6: Обновление существующих агентов — Шаг 0

- **Files:** `skills/task/agents/task-explorer.md` (edit), `skills/task/agents/task-architect.md` (edit), `skills/plan/agents/plan-explorer.md` (edit), `skills/plan/agents/plan-designer.md` (edit), `skills/do/agents/task-executor.md` (edit), `skills/do/agents/validator.md` (edit), `skills/do/agents/formatter.md` (edit), `skills/review/agents/code-reviewer.md` (edit, **DD-7: не review-analyzer.md**), `skills/explore/agents/explore-agent.md` (edit), `skills/fix/agents/fix-investigator.md` (edit)
- **Depends on:** none
- **Scope:** M
- **What:** Добавить "Шаг 0 — Контекст" с graceful-чтением `.claude/sp-context.md` в 10 агентов.
- **How:**
  Общий шаблон вставки (DD-6):
  ```markdown
  ### Шаг 0 — Контекст

  Прочитай `.claude/sp-context.md`, если файл существует.
  Используй данные как дополнительный контекст: стек, архитектура, команды валидации.
  Файл отсутствует — пропусти шаг.
  ```
  Точки вставки:
  - `task-explorer.md` — перед `## Миссия` (между строкой 10 и 12)
  - `task-architect.md` — перед `## Процесс` (между строкой 10 и 12). Дополнить: "Используй sp-context.md вместе с CLAUDE.md"
  - `plan-explorer.md` — перед `## Процесс` (между строкой 11 и 13)
  - `plan-designer.md` — перед `## Принципы` (между строкой 10 и 12)
  - `task-executor.md` — перед `## Before You Begin` (между строкой 28 и 30)
  - `validator.md` — перед `### 1. Определи доступные команды` (между строкой 25 и 27). Дополнить: "Если sp-context содержит секцию Commands — используй команды оттуда. Проверь каждую через `--help` или `--version` перед запуском."
  - `formatter.md` — перед `### 1. Определи formatter проекта` (между строкой 22 и 24). Дополнить: "Если sp-context содержит Format команду — используй её. Проверь что команда существует."
  - `code-reviewer.md` — перед `## Шаг 1 — Собери данные` (между строкой 16 и 17)
  - `explore-agent.md` — строка 37: расширить чтение CLAUDE.md, добавить `. Если `.claude/sp-context.md` существует — прочитай его тоже.`
  - `fix-investigator.md` — строка 39: расширить аналогично `explore-agent.md`.
- **Context:** `skills/explore/agents/explore-agent.md:36-38` (expand pattern), `skills/fix/agents/fix-investigator.md:38-41` (expand pattern), `skills/do/agents/validator.md:25-36` (insertion point), `skills/do/agents/formatter.md:22-30` (insertion point)
- **Verify:** `grep -l "sp-context" skills/task/agents/task-explorer.md skills/task/agents/task-architect.md skills/plan/agents/plan-explorer.md skills/plan/agents/plan-designer.md skills/do/agents/task-executor.md skills/do/agents/validator.md skills/do/agents/formatter.md skills/review/agents/code-reviewer.md skills/explore/agents/explore-agent.md skills/fix/agents/fix-investigator.md` → все 10 файлов.

### Task 7: Обновить CLAUDE.md

- **Files:** `CLAUDE.md` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** Добавить `/bootstrap` в секцию "Implemented skills".
- **How:** После строки `/explore` добавить: `- \`/bootstrap\` — подготовка проекта к sp flow: детекция стека, генерация CLAUDE.md, создание sp-context.md`.
- **Context:** `CLAUDE.md:62-73` (Implemented skills)
- **Verify:** `grep "bootstrap" CLAUDE.md` → строка в Implemented skills.

### Task 8: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Запустить верификационные проверки из task-файла.
- **How:**
  ```bash
  head -1 skills/bootstrap/SKILL.md
  head -1 skills/bootstrap/agents/*.md
  ls skills/bootstrap/agents/ | wc -l
  ls skills/bootstrap/reference/ | wc -l
  grep -l "sp-context" skills/task/agents/task-explorer.md skills/task/agents/task-architect.md skills/plan/agents/plan-explorer.md skills/plan/agents/plan-designer.md skills/do/agents/task-executor.md skills/do/agents/validator.md skills/do/agents/formatter.md skills/review/agents/code-reviewer.md skills/explore/agents/explore-agent.md skills/fix/agents/fix-investigator.md
  grep "bootstrap" CLAUDE.md
  python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"
  ```
  Ожидаемые результаты: SKILL.md и агенты начинаются с `---`, 9 агентов, 5 reference-файлов, 10 файлов содержат sp-context, `/bootstrap` в CLAUDE.md, `plugin.json` валиден.
- **Context:** `docs/ai/18-bootstrap/18-bootstrap-task.md` (Verification section)
- **Verify:** Все команды возвращают ожидаемый результат. При расхождении — исправить.

## Execution

- **Mode:** sub-agents
- **Parallel:** true
- **Reasoning:** 8 tasks, 4 параллельные группы без пересечений. Все файлы в одной кодовой базе. Task 6 (agent updates) полностью независим от создания bootstrap.
- **Order:**
  ```
  Group 1 (parallel):
    Task 1: Reference-файлы
    Task 2: Detect-агенты
    Task 6: Обновление существующих агентов
    Task 7: Обновить CLAUDE.md
  ─── barrier ───
  Group 2 (parallel):
    Task 3: Process-агенты (claude-md-generator, sp-context-generator)
    Task 4: Process-агенты (automation-recommender, bootstrap-verifier)
  ─── barrier ───
  Group 3 (sequential):
    Task 5: SKILL.md оркестратор
  ─── barrier ───
  Group 4 (sequential):
    Task 8: Validation
  ```

## Verification

- `head -1 skills/bootstrap/SKILL.md` → `---` (валидный YAML frontmatter)
- `head -1 skills/bootstrap/agents/*.md` → каждый файл начинается с `---`
- `ls skills/bootstrap/agents/ | wc -l` → 9 агентов
- `ls skills/bootstrap/reference/ | wc -l` → 5 reference-файлов
- `grep -l "sp-context" skills/task/agents/task-explorer.md skills/task/agents/task-architect.md skills/plan/agents/plan-explorer.md skills/plan/agents/plan-designer.md skills/do/agents/task-executor.md skills/do/agents/validator.md skills/do/agents/formatter.md skills/review/agents/code-reviewer.md skills/explore/agents/explore-agent.md skills/fix/agents/fix-investigator.md` → все 10 файлов
- `grep "bootstrap" CLAUDE.md` → `/bootstrap` в Implemented skills
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK
- Повторный `/bootstrap` в том же проекте → обновляет файлы без ошибок

## Materials

- [Issue #18](https://github.com/projectory-com/sp/issues/18) — архитектура, фазы, агенты
- [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) — рубрика, шаблоны, guidelines
- [claude-code-setup](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup) — детекция стека, hooks, MCP
- `skills/task/SKILL.md` — паттерн оркестратора с фазами
- `skills/fix/SKILL.md` — cross-skill agent reuse, thin orchestrator
- `skills/do/SKILL.md` — parallel dispatch
- `skills/gca/reference/commit-convention.md` — конвенция коммитов
