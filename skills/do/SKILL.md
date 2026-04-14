---
name: do
description: >-
  Execute a task per plan. Triggered when the user writes "execute", "do",
  "run the plan", "implement", or passes a path to a plan file and asks to
  execute it.
---

# Execute task per plan

You are the orchestrator. You coordinate sub-agents.

Delegate each working phase to a sub-agent via the Agent tool:

- Implementation → `agents/task-executor.md`
- Spec review → `agents/spec-reviewer.md`
- Quality review → `agents/quality-reviewer.md`
- Polish → `agents/code-polisher.md`
- Validate → `agents/validator.md`
- Document → `agents/doc-updater.md`
- Format → `agents/formatter.md`
- Report → `agents/report-writer.md`

Work from start to finish without stops or confirmations.

**Principle:** the developer kicks it off and walks away, returning on notification.

---

## Input

`$ARGUMENTS` — path to the plan file, e.g. `docs/ai/86-black-jack-page/86-black-jack-page-plan.md`

If there is no path — ask the user.

---

## Pipeline

7 stages. Each one is tracked in TodoWrite.

```
1. Parse        → read the plan, create todos
2. Execute      → dispatch sub-agents + spec review + quality review
3. Polish       → simplify and clean up code
4. Validate     → dispatch validator sub-agent
5. Document     → update documentation
6. Finalize     → format + report
7. Complete     → review / plannotator / finish
```

---

## Phase 1 — Parse

**1.** Read the plan file in full.

**2.** Extract:

- `SLUG` — from the path (`docs/ai/<slug>/`)
- `COMPLEXITY` — from the "Complexity" field
- `TASKS[]` — all tasks from the "Tasks" section with full text (What, How, Files, Context, Verify)
- `CONSTRAINTS` — from the plan header
- `VERIFICATION` — from the "Verification" section
- `EXECUTION_ORDER` — from the "Execution / Order" section (parallel groups, barriers, sequence)

**3.** Extract `TICKET_ID` from the slug (per `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`). Pass `TICKET_ID` and `SLUG` to every sub-agent for commits.

**4.** Find the task file: `docs/ai/<SLUG>/<SLUG>-task.md`

**5.** Create the todo list via TodoWrite:

```
[ ] Execute: Task 1 — <name>
[ ] Execute: Task 2 — <name>
...
[ ] Execute: Task N — Validation (from the plan)
[ ] Polish: simplify and clean up code
[ ] Validate: lint + types + tests
[ ] Documentation: update documentation
[ ] Finalize: format + report
[ ] Complete: review / finish
```

**Transition:** plan loaded, todos created → Phase 2

---

## Phase 2 — Execute

Read `reference/status-protocol.md` — rules for status handling, review loop, parallel dispatch.

### Dispatch by Execution Order

Read the Order from the plan:

- **Parallel group** → dispatch all tasks in the group simultaneously via the Agent tool
- **Sequential** → dispatch one at a time
- **Barrier** → wait for all tasks in the group to finish

Without explicit parallel groups — run sequentially in order.

### For each task

```
1. Build the prompt for the sub-agent:
   - Read agents/task-executor.md
   - Substitute: task.What, task.How, task.Files, task.Context, CONSTRAINTS, task.Verify
   - Construct COMMIT_MESSAGE in the format `TICKET type(SLUG): description`
     Example: `#86 feat(86-black-jack-page): add game page with basic layout`
     NO colon after the ticket. SLUG is required.
   - Pass the full task text, not the path to the plan file

2. Dispatch via the Agent tool
   - Wait for the result

3. Handle the status (per reference/status-protocol.md):
   - DONE / DONE_WITH_CONCERNS → run the Review Loop
   - NEEDS_CONTEXT → add context, re-dispatch
   - BLOCKED → evaluate, re-dispatch with a stronger model or record it

4. Review Loop (for DONE / DONE_WITH_CONCERNS):
   a. Dispatch agents/spec-reviewer.md
      - Pass: task requirements + implementer report
      - OK → step b
      - FAIL → implementer fixes → re-dispatch spec reviewer (max 3)

   b. Dispatch agents/quality-reviewer.md
      - Pass: BASE_SHA, HEAD_SHA, task requirements
      - OK → task complete
      - FAIL Critical/Important → implementer fixes → re-dispatch (max 3)
      - Minor → record, don't block

5. Guarantee a commit:
   - Check `git status` for uncommitted changes
   - If any exist — commit per the convention in `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`
   - Record the commit hash for the report

6. Mark in TodoWrite: [x]
```

**On BLOCKED:** skip only tasks that depend on the blocked one. Run the rest.

On BLOCKED — send a notification:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ALERT --skill do --phase Execute --slug "$SLUG" --title "Task blocked" --body "<block reason and number of skipped tasks>"`

Save the list of changed/created files — you'll need it in Phases 3-5.

**Transition:** tasks done (or BLOCKED) → Phase 3

**If there are zero changed files** (all tasks BLOCKED/SKIPPED):
skip Phases 3 (Polish) and 5 (Document).
Go to Phase 4 (Validate) — skip if there are no changes.
Then Phase 6 (Finalize) with status failed → Phase 7 (Complete).

---

## Phase 3 — Polish

Run a sub-agent via the Agent tool. Prompt — from `agents/code-polisher.md`.

Pass:

- List of files changed/created in Phase 2
- CONSTRAINTS from the plan

After completion:

- Commit per the convention in `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- Mark in TodoWrite: [x]

**Transition →** Phase 4.

---

## Phase 4 — Validate

Run a sub-agent via the Agent tool. Prompt — from `agents/validator.md`.

Pass:

- List of files changed in Phases 2-3
- SLUG for the commit convention
- TICKET_ID for the commit convention
- CONSTRAINTS from the plan

The sub-agent determines the available commands from package.json scripts, runs lint/type-check/test/build,
fixes failures (one attempt), commits fixes, and returns the result of each command.

Mark in TodoWrite: [x]

**Transition →** Phase 5.

---

## Phase 5 — Document

Run a sub-agent via the Agent tool. Prompt — from `agents/doc-updater.md`.

Pass:

- List of changed files
- SLUG and task title
- Requirements from the plan file

The sub-agent decides what to update:

- README — on API changes or new features
- CHANGELOG — when the file exists
- JSDoc/TSDoc — for new/changed exported functions

**Update existing documentation rather than creating from scratch.**

After completion:

- Commit per the convention in `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- Mark in TodoWrite: [x]

**Transition →** Phase 6.

---

## Phase 6 — Finalize

### 6a. Format

Run a sub-agent via the Agent tool. Prompt — from `agents/formatter.md`.

Pass:

- List of changed files
- SLUG for the commit convention
- TICKET_ID for the commit convention

The sub-agent determines the formatter, runs it on the files, and commits the result.

Mark in TodoWrite: [x]

### 6b. Report

Run a sub-agent via the Agent tool. Prompt — from `agents/report-writer.md`.

Pass:

- SLUG
- Path to the plan file
- Collected data for the report: task statuses, concerns, blocked, validation results,
  post-implementation statuses, changes summary

The sub-agent reads `reference/report-format.md` and writes `docs/ai/<SLUG>/<SLUG>-report.md`.

### 6c. Commit Report Artifact

Check: is `docs/ai/` under `.gitignore`? If yes — skip.

If not under gitignore — commit the report per the convention in `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`:

Format: `TICKET docs(SLUG): add execution report` (NO colon after the ticket).

```bash
git add docs/ai/<SLUG>/<SLUG>-report.md
git commit -m "TICKET docs(SLUG): add execution report"
```

Example: `#86 docs(86-black-jack-page): add execution report`

### 6d. Notification

Print a brief summary: `<SLUG> done (N/M tasks)` or `<SLUG> done with issues (N/M tasks, K blocked)`.
Path to the report file.

Send a notification:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill do --phase Complete --slug "$SLUG" --title "<SLUG> done (N/M tasks)" --body "docs/ai/$SLUG/$SLUG-report.md"`

**Transition →** Phase 7.

---

## Phase 7 — Complete

Report the path to the report file and offer 2 options via AskUserQuestion:

1. **Run /sp:review (Recommended)** — automatic transition to code review
2. **Finish** — exit

**Handling the choice:**

- **Run /sp:review:** invoke the Skill tool with `/sp:review` and argument `<SLUG>`
- **Finish:** report the path to the report file

---

## Rules

- **No stops.** Run end to end without confirmations between steps.
- **Commits by convention.** Format and ticket ID — from `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`.
- **Current directory.** Worktrees and branch management are not allowed.
- **Context isolation.** A sub-agent receives the full text of its task, not the whole plan.
- **Review after each task.** Spec compliance → code quality. Mandatory.
- **TodoWrite.** Mark each step immediately upon completion.
- **On BLOCKED — keep going.** Stop only the dependent branch.
- **CLI output.** Run commands with long output (formatter, lint, build, test) with `2>&1 | tail -20`.
- Language: match the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md.
