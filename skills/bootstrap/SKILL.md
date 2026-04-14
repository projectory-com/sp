---
name: bootstrap
description: >-
  Prepare a project for the sp flow — stack detection, generation of CLAUDE.md
  and sp-context.md. Used when the user writes "bootstrap", "set up sp",
  "prepare the project", "sp init", "setup sp", "first run",
  "connect sp", "create CLAUDE.md".
---

# Prepare a project for the sp flow

You are the orchestrator. Coordinate agents and make decisions via AskUserQuestion. Agents perform all file operations.

Delegate each phase to an agent via the Agent tool:

- Stack → `agents/stack-detector.md`
- Architecture → `agents/architecture-mapper.md`
- Conventions → `agents/convention-scanner.md`
- Validation → `agents/validation-scanner.md`
- Rules → `agents/existing-rules-detector.md`
- Domain → `agents/domain-analyzer.md`
- CLAUDE.md → `agents/claude-md-generator.md`
- sp-context → `agents/sp-context-generator.md`
- Automation → `agents/automation-recommender.md`
- Verification → `agents/bootstrap-verifier.md`

Work from start to finish.

**Principle:** one-time project onboarding. Run once when connecting sp to a project.

---

## Input

`$ARGUMENTS` — optional project description.

If empty — the skill auto-detects stack, architecture and conventions.

---

## Pipeline

7 phases. Mark completion via TodoWrite.

```text
0. Preflight    → verify git-repo, not an sp-repo
1. Detect       → 6 parallel agents investigate the project
2. Synthesize   → aggregate PROJECT_PROFILE
3. Generate     → CLAUDE.md + sp-context + recommendations
4. Verify       → check files and quality
5. Confirm      → show the result, AskUserQuestion
6. Commit       → commit the artifacts
```

---

## Phase 0 — Preflight

Check two conditions before starting.

### 0a. Git repository

```bash
git rev-parse --is-inside-work-tree 2>/dev/null
```

Result false or error → tell the user: "/bootstrap only runs inside a git project." Exit.

### 0b. Not an sp-repo

```bash
test -f .claude-plugin/plugin.json && echo "SP_REPO" || echo "OK"
```

SP_REPO → tell the user: "/bootstrap is meant for target projects, not for sp plugins." Exit.

Both conditions passed → transition to Phase 1.

Mark in TodoWrite: `[x] Preflight`

---

## Phase 1 — Detect

Dispatch 6 agents **in parallel** via the Agent tool (6 calls at once):

1. **stack-detector** (haiku) — read `agents/stack-detector.md`, pass the prompt to the agent.
   Result → STACK_FINDINGS:

   ```text
   LANGUAGES, FRAMEWORKS, PACKAGE_MANAGER, RUNTIME, RUNTIME_VERSION
   ```

2. **architecture-mapper** (sonnet) — read `agents/architecture-mapper.md`, pass the prompt to the agent.
   Result → ARCH_FINDINGS:

   ```text
   PATTERN, LAYERS, ENTRY_POINTS, KEY_DIRS
   ```

3. **convention-scanner** (sonnet) — read `agents/convention-scanner.md`, pass the prompt to the agent.
   Result → CONV_FINDINGS:

   ```text
   NAMING, FILE_NAMING, IMPORT_STYLE, TEST_CONVENTIONS
   ```

4. **validation-scanner** (haiku) — read `agents/validation-scanner.md`, pass the prompt to the agent.
   Result → VAL_FINDINGS:

   ```text
   DEV, BUILD, TEST, LINT, FORMAT, TYPECHECK
   ```

5. **existing-rules-detector** (haiku) — read `agents/existing-rules-detector.md`, pass the prompt to the agent.
   Result → RULES_FINDINGS:

   ```text
   CLAUDE_MD_EXISTS, CLAUDE_MD_QUALITY, CLAUDE_MD_CONTENT, OTHER_RULES, DOC_CONTENT
   ```

6. **domain-analyzer** (sonnet) — read `agents/domain-analyzer.md`, pass the prompt to the agent.
   domain-analyzer explores the domain model, API, abstractions and environment variables.
   Result → DOMAIN_FINDINGS:

   ```text
   DOMAIN_MODELS, API_ENDPOINTS, KEY_ABSTRACTIONS, ENV_VARS, CODE_WORKAROUNDS
   ```

Wait for all 6.

If an agent returns an error or an empty result — use empty values for that section and record the issue in VERIFY_NOTES.

Mark in TodoWrite: `[x] Detect`

Transition → Phase 2.

---

## Phase 2 — Synthesize

Aggregate the 6 findings into PROJECT_PROFILE:

```yaml
PROJECT_PROFILE:
  name: <from package.json/go.mod/Cargo.toml or directory name>
  languages: <from STACK_FINDINGS>
  frameworks: <from STACK_FINDINGS>
  package_manager: <from STACK_FINDINGS>
  runtime: <from STACK_FINDINGS>
  runtime_version: <from STACK_FINDINGS>

  architecture:
    pattern: <from ARCH_FINDINGS>
    layers: <from ARCH_FINDINGS>
    entry_points: <from ARCH_FINDINGS>
    key_dirs: <from ARCH_FINDINGS>

  commands:
    dev: <from VAL_FINDINGS>
    build: <from VAL_FINDINGS>
    test: <from VAL_FINDINGS>
    lint: <from VAL_FINDINGS>
    format: <from VAL_FINDINGS>
    typecheck: <from VAL_FINDINGS>

  conventions:
    naming: <from CONV_FINDINGS>
    file_naming: <from CONV_FINDINGS>
    import_style: <from CONV_FINDINGS>
    test_conventions: <from CONV_FINDINGS>

  existing_rules:
    claude_md_exists: <from RULES_FINDINGS>
    claude_md_quality: <from RULES_FINDINGS>
    claude_md_content: <from RULES_FINDINGS, if exists>
    other_rules: <from RULES_FINDINGS>
    doc_content: <from RULES_FINDINGS.DOC_CONTENT>

  domain:
    models: <from DOMAIN_FINDINGS>
    api_endpoints: <from DOMAIN_FINDINGS>
    key_abstractions: <from DOMAIN_FINDINGS>
    env_vars: <from DOMAIN_FINDINGS>
    code_workarounds: <from DOMAIN_FINDINGS>
```

If `$ARGUMENTS` is passed — add `user_description` to PROJECT_PROFILE.

Mark in TodoWrite: `[x] Synthesize`

Transition → Phase 3.

---

## Phase 3 — Generate

Dispatch 3 agents **in parallel** via the Agent tool:

1. **claude-md-generator** (sonnet) — read `agents/claude-md-generator.md`, pass to the agent:
   - the entire PROJECT_PROFILE
   - CLAUDE_MD_EXISTS from RULES_FINDINGS
   - CLAUDE_MD_CONTENT (if it exists)
   - DOC_CONTENT from PROJECT_PROFILE.existing_rules.doc_content
   - DOMAIN_FINDINGS from PROJECT_PROFILE.domain
     Result → CLAUDE_MD_STATUS:

   ```text
   STATUS: created|enriched
   SECTIONS_ADDED, SECTIONS_UPDATED, QUALITY_ESTIMATE
   ```

2. **sp-context-generator** (haiku) — read `agents/sp-context-generator.md`, pass to the agent:
   - the entire PROJECT_PROFILE
   - DOC_CONTENT from PROJECT_PROFILE.existing_rules.doc_content
   - DOMAIN_FINDINGS from PROJECT_PROFILE.domain
     Result → SP_CONTEXT_FILE (path to .claude/sp-context.md)

3. **automation-recommender** (haiku) — read `agents/automation-recommender.md`, pass to the agent:
   - PROJECT_PROFILE (stack, frameworks, commands)
     Result → RECOMMENDATIONS (list of automation recommendations)

Wait for all 3.

Mark in TodoWrite: `[x] Generate`

Transition → Phase 4.

---

## Phase 4 — Verify

Dispatch **bootstrap-verifier** (sonnet) via the Agent tool.

Read `agents/bootstrap-verifier.md`, pass the prompt to the agent.

The agent checks CLAUDE.md and .claude/sp-context.md and returns:

```yaml
FILES_OK, SECTIONS_OK, COMMANDS_OK, PATHS_OK
QUALITY_SCORE: <0-100>
QUALITY_GRADE: <A|B|C|D|F>
ISSUES: <list of problems>
```

### Handling the result

- **QUALITY_GRADE = A** → transition to Phase 5
- **QUALITY_GRADE < A and ISSUES is non-empty** → re-dispatch claude-md-generator with ISSUES (max 1 retry):
  1. Pass ISSUES to the claude-md-generator agent
  2. Wait for completion
  3. Re-dispatch bootstrap-verifier
  4. If after retry Grade < A → continue with a warning, record VERIFY_NOTES

Mark in TodoWrite: `[x] Verify`

Transition → Phase 5.

---

## Phase 5 — Confirm

### Notification

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill bootstrap --phase Confirm --slug "bootstrap" --title "Bootstrap ready" --body "CLAUDE.md and sp-context.md created"
```

### Show the result

Show the user:

1. **PROJECT_PROFILE summary:** stack, architecture, commands (compact)
2. **CLAUDE.md quality:** Grade + score from verification
3. **Contents of .claude/sp-context.md:** first 30 lines
4. **Recommendations:** RECOMMENDATIONS from automation-recommender
5. **Notes:** VERIFY_NOTES (if any after retry)

### User choice

AskUserQuestion with 3 options:

1. **Commit (Recommended)** — commit the artifacts and finish
2. **Review and edit** — the user edits files manually, then re-verify → return to Confirm
3. **Cancel** — do not commit, exit

**Handling:**

- **Commit** → transition to Phase 6
- **Review and edit** → wait for the user's signal, re-dispatch bootstrap-verifier, return to Confirm
- **Cancel** → tell the user "Bootstrap cancelled. The CLAUDE.md and .claude/sp-context.md files remain on disk." Exit.

Mark in TodoWrite: `[x] Confirm`

---

## Phase 6 — Commit

### 6a. Check .gitignore

```bash
grep -q "^\.claude/" .gitignore 2>/dev/null && echo "IGNORED" || echo "OK"
```

If IGNORED → warn the user:

> `.claude/` is in .gitignore. sp-context.md will not be included in the commit.

AskUserQuestion:

1. **Add exception `!.claude/sp-context.md`** — append it to .gitignore and commit both files
2. **Commit only CLAUDE.md** — skip sp-context
3. **Cancel commit** — exit

### 6b. Git commit

```bash
git add CLAUDE.md .claude/sp-context.md
git commit -m "chore: bootstrap sp flow context"
```

If the user chose "only CLAUDE.md" in step 6a:

```bash
git add CLAUDE.md
git commit -m "chore: bootstrap sp flow context"
```

### 6c. Notification

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill bootstrap --phase Complete --slug "bootstrap" --title "Bootstrap complete" --body "CLAUDE.md + sp-context.md committed"
```

### 6d. Summary

Show:

- Commit hash (from `git log -1 --format=%h`)
- Paths to files: `CLAUDE.md`, `.claude/sp-context.md`
- Next step: "The project is ready to work with sp. Try `/sp:task` to create the first task."

Mark in TodoWrite: `[x] Commit`

---

## Rules

- **Thin orchestrator.** Only agents call Read/Write/Edit.
- **No stops.** Work to the end without confirmations between phases (except Confirm).
- **Parallel dispatch.** Phase 1: 6 agents. Phase 3: 3 agents.
- **TodoWrite.** Mark each phase immediately upon completion.
- **CLI output.** Run commands with long output through `2>&1 | tail -20`.
- **Idempotency.** On re-run: CLAUDE.md is extended (Edit via an agent), sp-context is overwritten (Write via an agent).
- **Language.** Match the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md.
- **Substitution.** When dispatching an agent, replace `{{PLACEHOLDER}}` in the prompt with data from findings. Agents receive real values, not template variables.
