# /bootstrap skill — implementation plan

**Task:** docs/ai/18-bootstrap/18-bootstrap-task.md
**Complexity:** complex
**Mode:** sub-agents
**Parallel:** true

## Design decisions

### DD-1: sp-context.md — flat KEY: VALUE, not YAML

**Decision:** The `.claude/sp-context.md` format is flat sections with keys, without YAML/JSON.
**Rationale:** All structured outputs in sp use flat KEY: VALUE (`skills/fix/agents/fix-context-collector.md:106-124`, `skills/gst/agents/git-data-collector.md`). Agents parse via the Read tool + regex, without YAML parsers. A YAML error silently breaks graceful degradation.
**Alternative:** YAML frontmatter — harder to parse, format errors are hidden.

### DD-2: Phase 1 — 5 agents in parallel

**Decision:** Dispatch 5 detect agents at once via the Agent tool.
**Rationale:** All agents are read-only, files do not overlap. The parallel dispatch pattern is confirmed in `skills/do/SKILL.md:97-98`.
**Alternative:** Sequential — adds latency without a payoff.

### DD-3: Reference — full adapted content

**Decision:** Full reference files in `skills/bootstrap/reference/`, adapted from the Anthropic plugins.
**Rationale:** WebFetch at runtime is unpredictable: URLs are unstable, offline environments are unavailable. The content needs translation and adaptation to sp-style.
**Alternative:** WebFetch from GitHub at runtime — fragile, offline-incompatible.

### DD-4: claude-md-generator writes directly

**Decision:** claude-md-generator is a write agent with Edit/Write. The orchestrator passes PROJECT_PROFILE; the agent picks Edit or Write.
**Rationale:** File operations belong to agents; the orchestrator stays thin (`skills/fix/SKILL.md:279`).
**Alternative:** The orchestrator receives text and writes itself — violates the thin-orchestrator principle.

### DD-5: Phase 4 fix loop — re-dispatch of the agent

**Decision:** On ISSUES from the verifier the orchestrator re-dispatches claude-md-generator with ISSUES in the prompt; the orchestrator does not edit files.
**Rationale:** Re-dispatch costs more latency but preserves architectural cleanliness: the orchestrator delegates file operations to agents.
**Alternative:** The orchestrator calls Edit directly — faster but violates thin-orchestrator.

### DD-6: Step 0 — a single format for all updated agents

**Decision:** An identical "Step 0 — Context" block in front of the first process step of each agent. For validator and formatter — an addition: "if sp-context contains Commands — verify that the commands exist and use them".
**Rationale:** A single format simplifies search (`grep sp-context`), maintenance, and verification.
**Alternative:** Individual wording in each agent — harder to maintain.

### DD-7: code-reviewer.md instead of review-analyzer.md

**Decision:** Update `skills/review/agents/code-reviewer.md`. The file `review-analyzer.md` does not exist.
**Rationale:** `code-reviewer.md` is the only agent in `skills/review/` that analyzes diff and architecture.
**Alternative:** Create `review-analyzer.md` — scope creep, violates the restriction on creating extra files.

### DD-8: hooks-patterns.md — Claude Code hooks + git hooks

**Decision:** A "Claude Code hooks" section at the top (with an example from `hooks/hooks.json`), then per-stack git hooks.
**Rationale:** The user immediately sees Claude Code hooks as an automation option.
**Alternative:** Git hooks only — an incomplete picture.

## Tasks

### Task 1: Reference files

- **Files:** `skills/bootstrap/reference/quality-criteria.md` (create), `skills/bootstrap/reference/claude-md-template.md` (create), `skills/bootstrap/reference/update-guidelines.md` (create), `skills/bootstrap/reference/hooks-patterns.md` (create), `skills/bootstrap/reference/mcp-servers.md` (create)
- **Depends on:** none
- **Scope:** M
- **What:** Create 5 reference files based on content from the Anthropic plugins claude-md-management and claude-code-setup.
- **How:**
  1. `mkdir -p skills/bootstrap/reference`
  2. `quality-criteria.md` — CLAUDE.md quality rubric: 6 criteria (Commands 20pt, Architecture 20pt, Non-obvious 15pt, Conciseness 15pt, Currency 15pt, Actionability 15pt), grades A-F, assessment process. Fetch from `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-md-management/references/quality-criteria.md`, adapt: Russian headings, sp-style.
  3. `claude-md-template.md` — 3 templates (minimal, comprehensive, monorepo) with sections: Project, Architecture, Commands, Conventions, Key Files. Fetch from `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-md-management/references/templates.md`.
  4. `update-guidelines.md` — what to include (project-specific facts, commands), what to exclude (generic advice), red flags, idempotency rules. Fetch from claude-md-management SKILL.md Phase 4.
  5. `hooks-patterns.md` — Claude Code hooks section + per-stack git hooks (Node/prettier/eslint, Python/black/ruff, Go/gofmt, Rust/cargo fmt). Fetch from `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-automation-recommender/references/hooks-patterns.md`. Add a Claude Code hooks section with an example from `hooks/hooks.json`.
  6. `mcp-servers.md` — 6+ MCP server categories (Databases, Version Control, Communication, Search, Development, Cloud). Fetch from `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/claude-automation-recommender/references/mcp-servers.md`.
- **Context:** `CLAUDE.md` (sp repo, Grade A example), `hooks/hooks.json` (Claude Code hooks example), `skills/task/reference/synthesize-guide.md` (writing style)
- **Verify:** `ls skills/bootstrap/reference/ | wc -l` → 5. `head -1 skills/bootstrap/reference/*.md` → each starts with `#` (plain markdown, not frontmatter).

### Task 2: Detect agents

- **Files:** `skills/bootstrap/agents/stack-detector.md` (create), `skills/bootstrap/agents/architecture-mapper.md` (create), `skills/bootstrap/agents/convention-scanner.md` (create), `skills/bootstrap/agents/validation-scanner.md` (create), `skills/bootstrap/agents/existing-rules-detector.md` (create)
- **Depends on:** none
- **Scope:** M
- **What:** Create 5 read-only agents for Phase 1 (Detect).
- **How:**
  1. `mkdir -p skills/bootstrap/agents`
  2. **stack-detector.md** — frontmatter: `name: stack-detector`, `tools: Bash, Glob, Read`, `model: haiku`, `color: cyan`. Process: check `package.json`, `go.mod`, `requirements.txt`/`pyproject.toml`, `Cargo.toml`, `*.gemspec`, `.nvmrc`, Dockerfile. Output: `LANGUAGES:`, `FRAMEWORKS:`, `PACKAGE_MANAGER:`, `RUNTIME:`, `RUNTIME_VERSION:`.
  3. **architecture-mapper.md** — frontmatter: `tools: Glob, Grep, LS, Read, Bash`, `model: sonnet`, `color: yellow`. Process: `ls`, `find -maxdepth 2 -type d`, find entry points (main/index/app), determine layers (api/service/repository), monorepo. Output: `ARCHITECTURE_PATTERN:`, `KEY_DIRS:`, `ENTRY_POINTS:`, `LAYERS:`, `NOTES:`.
  4. **convention-scanner.md** — frontmatter: `tools: Glob, Grep, Read`, `model: sonnet`, `color: yellow`. Process: read 3-5 source files, determine naming (camelCase/snake_case), imports, file naming, test conventions. Check `.eslintrc`, `.editorconfig`, `biome.json`. Output: `NAMING:`, `IMPORT_STYLE:`, `FILE_NAMING:`, `TEST_CONVENTIONS:`, `CODE_STYLE:`.
  5. **validation-scanner.md** — frontmatter: `tools: Read, Glob, Bash`, `model: haiku`, `color: cyan`. Process: `package.json` scripts, `Makefile`, `justfile`. Output: `DEV:`, `BUILD:`, `TEST:`, `LINT:`, `FORMAT:`, `TYPECHECK:`, `PACKAGE_MANAGER:`. Missing ones — `NOT_FOUND`.
  6. **existing-rules-detector.md** — frontmatter: `tools: Bash, Read, Glob`, `model: haiku`, `color: cyan`. Check: CLAUDE.md, README.md, CONTRIBUTING.md, .cursorrules, .github/CLAUDE.md. If CLAUDE.md exists — evaluate by sections. Output: `CLAUDE_MD_EXISTS:`, `CLAUDE_MD_PATH:`, `CLAUDE_MD_SECTIONS:`, `CLAUDE_MD_QUALITY:`, `OTHER_RULES:`.
- **Context:** `skills/fix/agents/fix-context-collector.md` (haiku structured output pattern), `skills/fix/agents/fix-investigator.md` (sonnet read-only pattern)
- **Verify:** `head -1 skills/bootstrap/agents/stack-detector.md skills/bootstrap/agents/architecture-mapper.md skills/bootstrap/agents/convention-scanner.md skills/bootstrap/agents/validation-scanner.md skills/bootstrap/agents/existing-rules-detector.md` → each starts with `---`.

### Task 3: Process agents (claude-md-generator, sp-context-generator)

- **Files:** `skills/bootstrap/agents/claude-md-generator.md` (create), `skills/bootstrap/agents/sp-context-generator.md` (create)
- **Depends on:** Task 1 (reference files must exist for generator references)
- **Scope:** M
- **What:** Create 2 write agents for Phase 3 (Generate).
- **How:**
  1. **claude-md-generator.md** — frontmatter: `name: claude-md-generator`, `tools: Read, Write, Edit, Glob`, `model: sonnet`, `color: green`. Accepts `{{PROJECT_PROFILE}}` and `{{CLAUDE_MD_EXISTS}}`. CLAUDE.md missing → Read `reference/claude-md-template.md`, pick a template, fill from PROJECT_PROFILE, Write. CLAUDE.md exists → Read the current one, determine missing sections, Edit to add them. Reads `reference/quality-criteria.md` as the Grade A target. Accepts an optional `{{ISSUES}}` for the re-dispatch fix loop. Output: `STATUS: created|enriched`, `SECTIONS_ADDED:`, `QUALITY_ESTIMATE:`.
  2. **sp-context-generator.md** — frontmatter: `name: sp-context-generator`, `tools: Write, Bash`, `model: haiku`, `color: gray`. Accepts `{{PROJECT_PROFILE}}`. Process: `mkdir -p .claude`, Write `.claude/sp-context.md`. File format:
     ```
     # SP Context: <project-name>

     ## Stack
     - Languages: <from PROJECT_PROFILE>
     - Frameworks: <from PROJECT_PROFILE>
     - Package manager: <from PROJECT_PROFILE>
     - Runtime: <from PROJECT_PROFILE>

     ## Commands
     - Dev: <command | NOT_FOUND>
     - Build: <command>
     - Test: <command>
     - Lint: <command>
     - Format: <command>
     - Typecheck: <command>

     ## Architecture
     - Pattern: <from PROJECT_PROFILE>
     - Key dirs: <list>
     - Entry points: <list>
     - Layers: <list>

     ## Conventions
     - Naming: <camelCase|snake_case|...>
     - File naming: <kebab|snake|...>
     - Import style: <from PROJECT_PROFILE>
     ```
     Always Write (overwrite) — the source of truth remains the codebase. Output: `SP_CONTEXT_FILE: .claude/sp-context.md`.
- **Context:** `skills/explore/agents/explore-log-writer.md` (Write vs Edit branching), `skills/fix/agents/fix-log-writer.md` (simple write agent), `skills/bootstrap/reference/quality-criteria.md`, `skills/bootstrap/reference/claude-md-template.md`
- **Verify:** `grep "model: sonnet" skills/bootstrap/agents/claude-md-generator.md` and `grep "model: haiku" skills/bootstrap/agents/sp-context-generator.md` — both pass.

### Task 4: Process agents (automation-recommender, bootstrap-verifier)

- **Files:** `skills/bootstrap/agents/automation-recommender.md` (create), `skills/bootstrap/agents/bootstrap-verifier.md` (create)
- **Depends on:** Task 1 (reference files)
- **Scope:** M
- **What:** Create a read-only recommender and a read-only verifier.
- **How:**
  1. **automation-recommender.md** — frontmatter: `name: automation-recommender`, `tools: Read`, `model: haiku`, `color: cyan`. Accepts `{{PROJECT_PROFILE}}`. Reads `reference/hooks-patterns.md` and `reference/mcp-servers.md`. Matches the stack against the patterns. Returns markdown recommendation text (hooks + MCP). No Write/Edit. Output: `RECOMMENDATIONS: <markdown text>`.
  2. **bootstrap-verifier.md** — frontmatter: `name: bootstrap-verifier`, `tools: Read, Bash, Glob`, `model: sonnet`, `color: cyan`. Process: (1) check that CLAUDE.md and `.claude/sp-context.md` exist, (2) check CLAUDE.md required sections, (3) check that commands from CLAUDE.md exist in `package.json`/`Makefile` (run `--help`), (4) assess quality via `reference/quality-criteria.md`. Output: `FILES_OK:`, `SECTIONS_OK:`, `COMMANDS_OK:`, `QUALITY_SCORE:`, `QUALITY_GRADE:`, `ISSUES:`.
- **Context:** `skills/plan/agents/plan-reviewer.md` (reviewer Verdict pattern), `skills/bootstrap/reference/quality-criteria.md`, `skills/bootstrap/reference/hooks-patterns.md`, `skills/bootstrap/reference/mcp-servers.md`
- **Verify:** `grep "tools: Read$" skills/bootstrap/agents/automation-recommender.md` — no Write/Edit. `grep "model: sonnet" skills/bootstrap/agents/bootstrap-verifier.md` — pass.

### Task 5: SKILL.md orchestrator

- **Files:** `skills/bootstrap/SKILL.md` (create)
- **Depends on:** Task 2, Task 3, Task 4 (all 9 agents must exist)
- **Scope:** L
- **What:** Create the orchestrator: 7 phases (Preflight, Detect, Synthesize, Generate, Verify, Confirm, Commit).
- **How:**
  Frontmatter:
  ```yaml
  name: bootstrap
  description: >-
    Prepare a project for sp flow. Activates when the user writes
    "bootstrap", "setup sp", "prepare the project", "sp init",
    "setup sp", "first run".
  ```
  Structure follows the `skills/fix/SKILL.md` pattern:
  1. **Header:** identification, agent list with paths, thin-orchestrator principle
  2. **Phase 0 — Preflight:**
     ```bash
     git rev-parse --is-inside-work-tree 2>/dev/null
     ```
     Result false → abort. Check that `.claude-plugin/plugin.json` is absent → file present → abort "sp repository".
  3. **Phase 1 — Detect:** read 5 detect agents, dispatch in parallel via the Agent tool (5 simultaneous calls). Wait for all 5 results. Save: `STACK_FINDINGS`, `ARCH_FINDINGS`, `CONV_FINDINGS`, `VAL_FINDINGS`, `RULES_FINDINGS`.
  4. **Phase 2 — Synthesize:** aggregate PROJECT_PROFILE from the 5 findings:
     ```
     PROJECT_PROFILE:
       name, languages, frameworks, package_manager, runtime
       architecture: pattern, layers, entry_points, key_dirs
       commands: dev, build, test, lint, format, typecheck
       conventions: naming, file_naming, import_style
       existing_rules: claude_md_exists, claude_md_content, claude_md_quality
     ```
  5. **Phase 3 — Generate:** dispatch 3 agents (claude-md-generator + sp-context-generator in parallel, automation-recommender in parallel with them). Pass PROJECT_PROFILE and CLAUDE_MD_EXISTS.
  6. **Phase 4 — Verify:** dispatch bootstrap-verifier. QUALITY_GRADE < A and ISSUES non-empty → re-dispatch claude-md-generator with ISSUES (max 1 retry, DD-5). After the retry Grade still < A → continue with a warning.
  7. **Phase 5 — Confirm:** notify ACTION_REQUIRED. Show: PROJECT_PROFILE summary, CLAUDE.md quality score, sp-context.md contents, recommendations. AskUserQuestion: Commit (Recommended) / Review and edit / Cancel. User edits → re-verify → Confirm.
  8. **Phase 6 — Commit:** check `.claude/` against .gitignore. `git add CLAUDE.md .claude/sp-context.md && git commit -m "chore: bootstrap sp flow context"`. Notify STAGE_COMPLETE.
  9. **Rules:** thin orchestrator without file operations, TodoWrite on every phase, content language — Russian.
- **Context:** `skills/fix/SKILL.md` (orchestrator phases + notify), `skills/do/SKILL.md` (parallel dispatch), `skills/task/SKILL.md` (AskUserQuestion + notify cycle), `skills/gca/reference/commit-convention.md`, all 9 agents in `skills/bootstrap/agents/`
- **Verify:** `head -1 skills/bootstrap/SKILL.md` → `---`. `grep -c "## Phase" skills/bootstrap/SKILL.md` → 7. `grep "agents/" skills/bootstrap/SKILL.md | wc -l` → at least 9 agent references.

### Task 6: Update existing agents — Step 0

- **Files:** `skills/task/agents/task-explorer.md` (edit), `skills/task/agents/task-architect.md` (edit), `skills/plan/agents/plan-explorer.md` (edit), `skills/plan/agents/plan-designer.md` (edit), `skills/do/agents/task-executor.md` (edit), `skills/do/agents/validator.md` (edit), `skills/do/agents/formatter.md` (edit), `skills/review/agents/code-reviewer.md` (edit, **DD-7: not review-analyzer.md**), `skills/explore/agents/explore-agent.md` (edit), `skills/fix/agents/fix-investigator.md` (edit)
- **Depends on:** none
- **Scope:** M
- **What:** Add "Step 0 — Context" with a graceful read of `.claude/sp-context.md` to 10 agents.
- **How:**
  Common insertion template (DD-6):
  ```markdown
  ### Step 0 — Context

  Read `.claude/sp-context.md` if the file exists.
  Use the data as additional context: stack, architecture, validation commands.
  If the file is absent — skip the step.
  ```
  Insertion points:
  - `task-explorer.md` — before `## Mission` (between lines 10 and 12)
  - `task-architect.md` — before `## Process` (between lines 10 and 12). Add: "Use sp-context.md together with CLAUDE.md"
  - `plan-explorer.md` — before `## Process` (between lines 11 and 13)
  - `plan-designer.md` — before `## Principles` (between lines 10 and 12)
  - `task-executor.md` — before `## Before You Begin` (between lines 28 and 30)
  - `validator.md` — before `### 1. Determine available commands` (between lines 25 and 27). Add: "If sp-context contains a Commands section — use the commands from there. Verify each one via `--help` or `--version` before running."
  - `formatter.md` — before `### 1. Determine the project formatter` (between lines 22 and 24). Add: "If sp-context contains a Format command — use it. Verify the command exists."
  - `code-reviewer.md` — before `## Step 1 — Collect data` (between lines 16 and 17)
  - `explore-agent.md` — line 37: extend the CLAUDE.md read, append `. If `.claude/sp-context.md` exists — read it as well.`
  - `fix-investigator.md` — line 39: extend the same way as `explore-agent.md`.
- **Context:** `skills/explore/agents/explore-agent.md:36-38` (expand pattern), `skills/fix/agents/fix-investigator.md:38-41` (expand pattern), `skills/do/agents/validator.md:25-36` (insertion point), `skills/do/agents/formatter.md:22-30` (insertion point)
- **Verify:** `grep -l "sp-context" skills/task/agents/task-explorer.md skills/task/agents/task-architect.md skills/plan/agents/plan-explorer.md skills/plan/agents/plan-designer.md skills/do/agents/task-executor.md skills/do/agents/validator.md skills/do/agents/formatter.md skills/review/agents/code-reviewer.md skills/explore/agents/explore-agent.md skills/fix/agents/fix-investigator.md` → all 10 files.

### Task 7: Update CLAUDE.md

- **Files:** `CLAUDE.md` (edit)
- **Depends on:** none
- **Scope:** S
- **What:** Add `/bootstrap` to the "Implemented skills" section.
- **How:** After the `/explore` line add: `- \`/bootstrap\` — prepare a project for the sp flow: stack detection, CLAUDE.md generation, sp-context.md creation`.
- **Context:** `CLAUDE.md:62-73` (Implemented skills)
- **Verify:** `grep "bootstrap" CLAUDE.md` → line in Implemented skills.

### Task 8: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Run the verification checks from the task file.
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
  Expected results: SKILL.md and agents start with `---`, 9 agents, 5 reference files, 10 files contain sp-context, `/bootstrap` in CLAUDE.md, `plugin.json` is valid.
- **Context:** `docs/ai/18-bootstrap/18-bootstrap-task.md` (Verification section)
- **Verify:** All commands return the expected result. On a mismatch — fix.

## Execution

- **Mode:** sub-agents
- **Parallel:** true
- **Reasoning:** 8 tasks, 4 parallel groups without overlaps. All files are in the same codebase. Task 6 (agent updates) is fully independent of bootstrap creation.
- **Order:**
  ```
  Group 1 (parallel):
    Task 1: Reference files
    Task 2: Detect agents
    Task 6: Update existing agents
    Task 7: Update CLAUDE.md
  --- barrier ---
  Group 2 (parallel):
    Task 3: Process agents (claude-md-generator, sp-context-generator)
    Task 4: Process agents (automation-recommender, bootstrap-verifier)
  --- barrier ---
  Group 3 (sequential):
    Task 5: SKILL.md orchestrator
  --- barrier ---
  Group 4 (sequential):
    Task 8: Validation
  ```

## Verification

- `head -1 skills/bootstrap/SKILL.md` → `---` (valid YAML frontmatter)
- `head -1 skills/bootstrap/agents/*.md` → each file starts with `---`
- `ls skills/bootstrap/agents/ | wc -l` → 9 agents
- `ls skills/bootstrap/reference/ | wc -l` → 5 reference files
- `grep -l "sp-context" skills/task/agents/task-explorer.md skills/task/agents/task-architect.md skills/plan/agents/plan-explorer.md skills/plan/agents/plan-designer.md skills/do/agents/task-executor.md skills/do/agents/validator.md skills/do/agents/formatter.md skills/review/agents/code-reviewer.md skills/explore/agents/explore-agent.md skills/fix/agents/fix-investigator.md` → all 10 files
- `grep "bootstrap" CLAUDE.md` → `/bootstrap` in Implemented skills
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK
- A repeat `/bootstrap` in the same project → updates files without errors

## Materials

- [Issue #18](https://github.com/projectory-com/sp/issues/18) — architecture, phases, agents
- [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) — rubric, templates, guidelines
- [claude-code-setup](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup) — stack detection, hooks, MCP
- `skills/task/SKILL.md` — orchestrator pattern with phases
- `skills/fix/SKILL.md` — cross-skill agent reuse, thin orchestrator
- `skills/do/SKILL.md` — parallel dispatch
- `skills/gca/reference/commit-convention.md` — commit convention
