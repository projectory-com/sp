# /bootstrap skill — preparing a project for the sp flow

**Slug:** 18-bootstrap
**Ticket:** https://github.com/projectory-com/sp/issues/18
**Complexity:** complex
**Type:** general

## Task

Create the `/bootstrap` skill — a one-shot preparation of a project for the sp flow. The skill detects the stack and architecture, generates or enriches CLAUDE.md up to Grade A, creates `.claude/sp-context.md`, and produces recommendations for hooks and MCP. Update 7 agents: each one reads `sp-context.md` when present; otherwise it works as before.

## Context

### Area architecture

The sp plugin is a skill marketplace for Claude Code. Each skill lives in `skills/<name>/` and contains `SKILL.md` (orchestrator), optional `agents/` (sub-agents), and `reference/` (supporting materials).

Skill structure:

```
skills/<name>/
  SKILL.md              # orchestrator, YAML frontmatter (name, description)
  agents/<role>.md       # sub-agents, frontmatter (name, description, tools, model, color)
  reference/<file>.md    # templates, rules, guides
```

Models by role: haiku — data collection and write; sonnet — exploration and review; opus — architecture and implementation.

Inside a skill paths are relative (`reference/file.md`). Between skills they are absolute: `${CLAUDE_PLUGIN_ROOT}/skills/<name>/reference/file.md`.

### Files to create

**SKILL.md and agents (15 files):**

- `skills/bootstrap/SKILL.md` — orchestrator, 6 phases (Preflight → Detect → Synthesize → Generate → Verify → Confirm → Commit)
- `skills/bootstrap/agents/stack-detector.md` — haiku, cyan, read-only. Determines languages, frameworks, package manager, runtime
- `skills/bootstrap/agents/architecture-mapper.md` — sonnet, yellow, read-only. Builds a map of directories, layers, entry points, patterns
- `skills/bootstrap/agents/convention-scanner.md` — sonnet, yellow, read-only. Extracts naming, import style, code style from the code
- `skills/bootstrap/agents/validation-scanner.md` — haiku, cyan, read-only. Collects lint/test/build/format commands from configs and scripts
- `skills/bootstrap/agents/existing-rules-detector.md` — haiku, cyan, read-only. Searches for CLAUDE.md, README, CONTRIBUTING, .cursorrules and assesses quality
- `skills/bootstrap/agents/claude-md-generator.md` — sonnet, green, write. Creates or augments CLAUDE.md per template and quality-criteria
- `skills/bootstrap/agents/sp-context-generator.md` — haiku, gray, write. Writes `.claude/sp-context.md` per template
- `skills/bootstrap/agents/automation-recommender.md` — haiku, cyan, read-only. Produces recommendations for hooks and MCP
- `skills/bootstrap/agents/bootstrap-verifier.md` — sonnet, cyan, read-only. Verifies files: sections, paths, commands

**Reference files (5 files):**

- `skills/bootstrap/reference/quality-criteria.md` — adapted rubric from claude-md-management (6 criteria, 100 points, grades A-F)
- `skills/bootstrap/reference/claude-md-template.md` — CLAUDE.md templates (minimal, comprehensive, monorepo)
- `skills/bootstrap/reference/update-guidelines.md` — what to include, what to exclude, red flags
- `skills/bootstrap/reference/hooks-patterns.md` — hook patterns by stack from claude-code-setup
- `skills/bootstrap/reference/mcp-servers.md` — recommended MCP servers by integration type

Build the reference files on top of [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) and [claude-code-setup](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup).

### Files to change (updating 7 agents)

Add "Step 0 — Context" to each agent — a graceful read of `sp-context.md`:

- `skills/task/agents/task-explorer.md` — before "1. Feature discovery" (line 17)
- `skills/task/agents/task-architect.md` — before "1. Pattern analysis" (line 14), extend the existing CLAUDE.md read
- `skills/plan/agents/plan-explorer.md` — before the first process step
- `skills/plan/agents/plan-designer.md` — before the first process step
- `skills/do/agents/task-executor.md` — before "Read all files from Context" (after "Before You Begin")
- `skills/do/agents/validator.md` — before validation (critical: takes Validation Commands)
- `skills/do/agents/formatter.md` — before formatting (critical: takes the format command)
- `skills/review/agents/review-analyzer.md` — before analysis (takes Conventions, Architecture)
- `skills/explore/agents/explore-agent.md` — extend line 37 (already reads CLAUDE.md, add sp-context.md)
- `skills/fix/agents/fix-investigator.md` — extend line 39 (already reads CLAUDE.md, add sp-context.md)

Also update:

- `CLAUDE.md` — add `/bootstrap` to the "Implemented skills" section

### Patterns to reuse

**Orchestrator SKILL.md with phases:** `skills/task/SKILL.md` — 6 phases with TodoWrite, notify.sh, AskUserQuestion. Reuse the structure: input, phases, rules.

**Parallel agent dispatch:** `skills/do/SKILL.md` — parallel groups via the Agent tool. Apply in Phase 1 (5 agents at once).

**Read-only agents:** `skills/explore/agents/explore-agent.md` — tools: `Glob, Grep, LS, Read, Bash, WebSearch, WebFetch`. No Write or Edit. Apply to the 5 detect agents and automation-recommender.

**Notifications:** `bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type TYPE --skill bootstrap --phase PHASE --slug "bootstrap" --title "..." --body "..."`. ACTION_REQUIRED before AskUserQuestion, STAGE_COMPLETE on completion.

**Cross-skill links:** `skills/fix/SKILL.md` — `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/task-executor.md`. Apply for the link to commit-convention.

**Graceful degradation:** "If `sp-context.md` exists — read it. Otherwise — determine the context on your own."

### Tests

No tests. Validation runs via:

```bash
# Check YAML frontmatter
head -1 skills/bootstrap/SKILL.md skills/bootstrap/agents/*.md
# Check JSON manifests
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"
# Check that reference files exist
ls skills/bootstrap/reference/
```

## Requirements

1. Create `skills/bootstrap/SKILL.md` — orchestrator with 6 phases: Preflight (git-repo, not sp-repo), Detect (5 parallel read-only agents), Synthesize (PROJECT_PROFILE aggregation), Generate (claude-md-generator + sp-context-generator + automation-recommender), Verify (file and CLAUDE.md quality checks), Confirm (AskUserQuestion: commit / edit / cancel), Commit (git add + commit).
2. Create 10 agents in `skills/bootstrap/agents/` with correct frontmatter (name, description, tools, model, color). Read-only agents — no Write/Edit. Write agents (claude-md-generator, sp-context-generator) — with Write/Edit.
3. Create 5 reference files in `skills/bootstrap/reference/` based on [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) and [claude-code-setup](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup). Adapt them for bootstrap, do not copy verbatim.
4. Phase 0 (Preflight): `git rev-parse --is-inside-work-tree` + make sure `.claude-plugin/plugin.json` is absent. On invalid environment — abort with a message.
5. Phase 1 (Detect): launch 5 agents in parallel via the Agent tool. Each returns structured output. The orchestrator waits for all five to complete before Synthesize.
6. Phase 2 (Synthesize): the orchestrator aggregates findings into PROJECT_PROFILE (in-memory). Structure: name, languages, frameworks, package_manager, architecture (pattern, layers, entry_points, key_dirs), commands (dev, build, test, lint, format, typecheck), conventions, existing_rules.
7. Phase 3 (Generate): claude-md-generator creates or augments CLAUDE.md (Edit when it exists, Write when it is new). sp-context-generator writes `.claude/sp-context.md` (always Write). automation-recommender produces recommendation text, does not modify files.
8. Phase 4 (Verify): bootstrap-verifier checks: files exist, required sections are present, paths in CLAUDE.md are valid, validation commands run. Target — Grade A (90+ points). On problems the orchestrator fixes via Edit.
9. Phase 5 (Confirm): show a summary (PROJECT_PROFILE, quality score, file contents, recommendations). AskUserQuestion: Commit (Recommended) / Review and edit / Cancel. On edit — re-verify, then Confirm.
10. Phase 6 (Commit): `git add CLAUDE.md .claude/sp-context.md && git commit`. Format: `chore: bootstrap sp flow context`. STAGE_COMPLETE notification.
11. Update 7+ agents — add "Step 0 — Context" with a graceful read of `sp-context.md`. Format: "If it exists — read it. Otherwise — work as before." No hard dependency.
12. `/bootstrap` is idempotent: a repeat run updates files and preserves the user's CLAUDE.md content. sp-context.md is fully overwritten — the source of truth remains the codebase.
13. Add `/bootstrap` to the "Implemented skills" section in `CLAUDE.md`.

## Constraints

- Leave `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` unchanged.
- claude-md-generator augments the existing CLAUDE.md via Edit, preserving user content. Write only for a new file.
- automation-recommender produces recommendation text for Phase 5 and does not modify files.
- Commit sp-context.md (`.claude/sp-context.md`). If `.claude/` is in `.gitignore` — warn the user in Phase 6.
- Agents read sp-context.md when it is present; without it they work as before. Hard dependency is forbidden.
- Leave `_skills/` (drafts) and `docs/` (except `docs/ai/`) unchanged.
- Issue #18 scope — removing hardcoded toolchains from skills is moved to #54.
- Skill content — in Russian. task-slug and files — English kebab-case.

## Verification

- `head -1 skills/bootstrap/SKILL.md` → `---` (valid YAML frontmatter)
- `head -1 skills/bootstrap/agents/*.md` → each file begins with `---`
- `ls skills/bootstrap/agents/ | wc -l` → 10 agents
- `ls skills/bootstrap/reference/ | wc -l` → 5 reference files
- `grep -l "sp-context" skills/task/agents/task-explorer.md skills/task/agents/task-architect.md skills/plan/agents/plan-explorer.md skills/plan/agents/plan-designer.md skills/do/agents/task-executor.md skills/do/agents/validator.md skills/do/agents/formatter.md skills/review/agents/review-analyzer.md skills/explore/agents/explore-agent.md skills/fix/agents/fix-investigator.md` → all 10 files mention sp-context
- `grep "bootstrap" CLAUDE.md` → `/bootstrap` in the Implemented skills list
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK (manifest not broken)
- Repeat run of `/bootstrap` → updates files without errors, the user's CLAUDE.md content is preserved

## Materials

- [Issue #18](https://github.com/projectory-com/sp/issues/18) — architecture, phases, agents
- [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) — CLAUDE.md quality rubric, templates, guidelines
- [claude-code-setup](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup) — stack detection, hooks, MCP
- `skills/task/SKILL.md` — orchestrator pattern with phases, notify, commit
- `skills/explore/agents/explore-agent.md` — read-only agent pattern
- `skills/fix/SKILL.md` — cross-skill agent reuse pattern
- `skills/gca/reference/commit-convention.md` — commit convention
