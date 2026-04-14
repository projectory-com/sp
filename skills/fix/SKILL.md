---
name: fix
description: >-
  Quick fix or follow-up change. Used when the user writes
  "fix", "patch", "correct", "tweak", "polish", "small fix",
  "quick fix", or describes a small change after /do.
---

# Quick fix

You are the orchestrator. You coordinate agents and make decisions via AskUserQuestion. Delegate all file operations and bash to agents.

Delegate each phase to an agent via the Agent tool:

- Context → `agents/fix-context-collector.md`
- Investigation → `agents/fix-investigator.md`
- Implementation → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/task-executor.md`
- Polish → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/code-polisher.md`
- Validation → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/validator.md`
- Documentation → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/doc-updater.md`
- Formatting → `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/formatter.md`
- Fix-log → `agents/fix-log-writer.md`

Work end-to-end without stopping.

**Principle:** the developer writes a fix description and walks away. Opus on code phases replaces the review loop.

---

## Input

`$ARGUMENTS` — fix description or PR-comment URL.

If `$ARGUMENTS` is empty — ask for a description via AskUserQuestion.

If `$ARGUMENTS` contains a PR-comment URL (`github.com/.../pull/...#discussion_r...`):

1. Extract the comment text via `gh api`
2. Use it as the fix description
3. Context: file and lines from the comment

---

## Pipeline

7 phases. Mark each via TodoWrite.

```
1. Collect     → dispatch fix-context-collector (haiku)
2. Investigate → dispatch fix-investigator (sonnet)
3. Decide      → scope guard + clarifications (orchestrator)
4. Implement   → dispatch task-executor (opus, reuse /do)
5. Post-process → polish (opus) + validate + docs + format
6. Artifact    → dispatch fix-log-writer (haiku)
7. Complete    → AskUserQuestion: another fix / review / exit
```

---

## Phase 1 — Collect

Dispatch `fix-context-collector` via the Agent tool (model: haiku).

Read `agents/fix-context-collector.md`, pass the prompt to the agent.

The agent returns structured data:

```
MODE: <post-flow | standalone>
SLUG, SLUG_SOURCE, TICKET_ID
FIX_NUMBER, FIX_LOG_EXISTS, FIX_LOG_SUMMARY
TASK_FILE, REPORT_FILE, PLAN_FILE (paths)
```

Save the result. Transition → Phase 2.

---

## Phase 2 — Investigate

Dispatch `fix-investigator` via the Agent tool (model: sonnet).

Read `agents/fix-investigator.md`, pass to the agent:

- Fix description from the user
- MODE from Phase 1
- Artifact paths: TASK_FILE, REPORT_FILE, PLAN_FILE
- FIX_LOG_SUMMARY (previous fixes)

The agent returns findings:

```
FILES_TO_CHANGE, FILES_COUNT
PATTERNS, CONSTRAINTS, VERIFY
COMPLEXITY: trivial | simple | escalate
```

Transition → Phase 3.

---

## Phase 3 — Decide

### 0. Default-branch guard

If `IS_DEFAULT_BRANCH = true` (from Phase 1) → AskUserQuestion:

> Fix on `<BRANCH>` — default branch. Continue?

Options:

- **Continue**
- **Cancel** → exit

### 1. Scope guard

If `COMPLEXITY = escalate` → send a notification and AskUserQuestion:

`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ALERT --skill fix --phase Decide --slug "$SLUG" --title "Large fix" --body "Affects $FILES_COUNT files"`

> The fix touches N files: [list]. Looks like a job for /sp:task.

Options:

- **Continue as fix**
- **Escalate to /sp:task** → invoke the Skill tool with `/sp:task` and the fix description, exit

### 2. Clarifications

If clarifications are needed — send a notification:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill fix --phase Decide --slug "$SLUG" --title "Clarification required" --body "Missing data for the fix"`

If `FILES_TO_CHANGE` is empty or `VERIFY` is empty → AskUserQuestion with 1-3 questions.

Everything clear → skip.

### 3. Implementer prompt

Prepare the data:

- **TASK_WHAT:** fix description
- **TASK_HOW:** from findings (files + patterns)
- **TASK_FILES:** FILES_TO_CHANGE
- **TASK_CONTEXT:** files to read
- **CONSTRAINTS:** from findings + task file (post-flow)
- **TASK_VERIFY:** from findings
- **COMMIT_MESSAGE:** `TICKET fix(SLUG): <fix description>` — per `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`

Transition → Phase 4.

---

## Phase 4 — Implement

Read `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/task-executor.md`. Dispatch via the Agent tool using the model from the agent's frontmatter.

Pass the prompt prepared in Phase 3 (TASK_WHAT, TASK_HOW, TASK_FILES, TASK_CONTEXT, CONSTRAINTS, TASK_VERIFY, COMMIT_MESSAGE).

### Status handling (simplified)

- **DONE** → Phase 5
- **DONE_WITH_CONCERNS** → record concerns, Phase 5
- **NEEDS_CONTEXT** → add context, re-dispatch (1 retry). Repeated → BLOCKED
- **BLOCKED** → record the reason, Phase 6 (artifact with status BLOCKED)

Opus on code phases reduces input errors; the validator catches regressions.

Task-executor commits using COMMIT_MESSAGE from the prompt. If its status is DONE — the commit is guaranteed.

Transition → Phase 5.

---

## Phase 5 — Post-process

Full /do pipeline. Save the list of files changed in Phase 4.

### 5a. Polish

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/code-polisher.md` with the model from the agent's frontmatter.

Pass: changed files, CONSTRAINTS.

Commit: `TICKET refactor(SLUG): polish fix-N`

### 5b. Validate

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/validator.md`.

Pass: changed files, SLUG, TICKET_ID, CONSTRAINTS.

### 5c. Document

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/doc-updater.md`.

Pass: changed files, SLUG, fix description.

Commit: `TICKET docs(SLUG): update docs for fix-N`

### 5d. Format

Dispatch `${CLAUDE_PLUGIN_ROOT}/skills/do/agents/formatter.md`.

Pass: changed files, SLUG, TICKET_ID.

Mark each step in TodoWrite.

Transition → Phase 6.

---

## Phase 6 — Artifact

Dispatch `fix-log-writer` via the Agent tool (model: haiku).

Read `agents/fix-log-writer.md`, pass to the agent:

- SLUG, FIX_NUMBER
- Fix description
- STATUS (done / blocked)
- Commits from Phases 4-5 (hashes + messages)
- Changed files with descriptions
- Validation results
- Concerns (if any)
- TICKET_ID

The agent writes/appends `docs/ai/<SLUG>/<SLUG>-fixes.md` and commits.

Transition → Phase 7.

---

## Phase 7 — Complete

Print the result:

```
Fix N: <description>
Commits: <list>
Validation: pass / fail
```

Send a notification:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill fix --phase Complete --slug "$SLUG" --title "Fix $FIX_NUMBER complete" --body "$FIX_DESCRIPTION"`

AskUserQuestion — what next:

- **Another fix** → go back to Phase 1 (SLUG is preserved)
- **Run /sp:review (Recommended)** → invoke the Skill tool with `/sp:review` and SLUG
- **Finish** → exit

---

## Chain awareness

Each `/fix` in the chain reads previous entries from the fix-log:

- Fix-2 knows about Fix-1's changes → avoids conflicts
- Fix-investigator receives FIX_LOG_SUMMARY as context
- Fix-log-writer appends an entry, preserving history

---

## Fix from PR feedback

If `$ARGUMENTS` contains a PR-comment URL:

1. Extract the text via `gh api repos/{owner}/{repo}/pulls/comments/{id}`
2. Use the text as the fix description
3. File and lines from the comment context → pass to the investigator
4. URL not working → ask for a description via AskUserQuestion (fallback)

Closes the flow: `/do` → `/review` → `/gp` → `/pr` → reviewer comments → `/fix <URL>` → `/gp`.

---

## Rules

- **Thin orchestrator.** Delegate all file operations and bash to agents.
- **No stops.** Work through to the end without confirmations between phases.
- **Models per frontmatter.** task-executor and code-polisher use models from the agents' frontmatter.
- **Commits by convention.** Format and ticket ID — from `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- **Scope guard.** 4+ files or architectural decisions → propose escalating to /sp:task.
- **TodoWrite.** Mark each step immediately upon completion.
- **CLI output.** Run commands with long output as `2>&1 | tail -20`.
- **Current directory.** Worktrees and branch management are forbidden.
- Language: match the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md.
