# Skill /do

Executes a task from a plan end to end without stopping. Reads the plan file,
runs tasks, runs the post-implementation pipeline (simplify, cleanup, validate,
document), and writes a report. The developer kicks it off and walks away —
and comes back to a notification.

## Input

`$ARGUMENTS` — path to the plan file produced by `/sp:plan`.

```
/sp:do docs/ai/86-black-jack-page/86-black-jack-page-plan.md
```

## Pipeline

TodoWrite tracks each of the 7 stages. No confirmations between steps.

| Stage | Name         | What happens                                                                                   |
| ----- | ------------ | ---------------------------------------------------------------------------------------------- |
| 1     | **Parse**    | Read the plan file, extract Mode, tasks, depends_on, verification. Build the todo list.        |
| 2     | **Execute**  | Run tasks: inline (trivial/simple) or sub-agents sequential (medium/complex). Status protocol. |
| 3     | **Simplify** | Sub-agent simplifies code: over-engineering, duplication, unneeded abstractions                |
| 4     | **Cleanup**  | Sub-agent removes cruft: debug logs, commented-out code, unused imports                        |
| 5     | **Validate** | Direct execution: lint, type-check, tests, build. One retry on failure.                        |
| 6     | **Document** | Sub-agent updates README, CHANGELOG, JSDoc/TSDoc for new exports                               |
| 7     | **Report**   | Write the report file, format code, send notification                                          |

## Output

File `docs/ai/<slug>/<slug>-report.md` with the following structure:

- **Header** — Plan, Mode, Status (complete / partial / failed)
- **Tasks** — per-task status table (DONE, BLOCKED, SKIPPED)
- **Post-implementation** — statuses for simplify, cleanup, validate, document, format
- **Concerns** — concerns raised by sub-agents (when DONE_WITH_CONCERNS)
- **Validation** — result of each command (lint, tests, build)
- **Changes summary** — files, actions, descriptions
- **Commits** — hashes and messages in chronological order

## Execution modes

`/do` reads the mode from the plan file's `Mode` and `Complexity` fields:

| Mode                    | When             | Characteristic                                                      |
| ----------------------- | ---------------- | ------------------------------------------------------------------- |
| `inline`                | trivial / simple | Sequential in the current thread, minimum overhead                  |
| `sub-agents sequential` | medium / complex | Each task is a separate sub-agent via Agent tool, context isolation |

V1 runs everything sequentially. `/do` ignores `Parallel: true` in the plan.
`Mode: agent-team` → falls back to sub-agents sequential.

## Status protocol

Sub-agents return a status after running a task:

| Status               | Meaning                      | Orchestrator action                                 |
| -------------------- | ---------------------------- | --------------------------------------------------- |
| `DONE`               | Task complete, verify passes | Commit, next task                                   |
| `DONE_WITH_CONCERNS` | Complete but with concerns   | Commit, record concerns in the report               |
| `NEEDS_CONTEXT`      | Missing information          | Add context, re-dispatch (max 1 retry)              |
| `BLOCKED`            | Cannot proceed               | Skip dependent tasks, keep running independent ones |

## Sub-agents

| Agent              | Model  | Role                                                           |
| ------------------ | ------ | -------------------------------------------------------------- |
| `task-executor`    | opus   | Runs one task: implementation, verification, commit            |
| `spec-reviewer`    | sonnet | Checks the implementation against the spec                     |
| `quality-reviewer` | sonnet | Evaluates code quality: patterns, readability, edge cases      |
| `code-polisher`    | opus   | Simplifies code: over-engineering, duplication, extra wrappers |
| `validator`        | haiku  | Lint, type-check, tests, build + auto-fix                      |
| `doc-updater`      | sonnet | Updates README, CHANGELOG, JSDoc/TSDoc                         |
| `formatter`        | haiku  | Detects the formatter and runs it on changed files             |
| `report-writer`    | haiku  | Writes the structured report file                              |

## Example

```
/sp:do docs/ai/86-black-jack-page/86-black-jack-page-plan.md
```

## Connections

```
/sp:task → /sp:plan → /sp:do → /sp:review
```

`/task` defines the task. `/plan` builds the plan. `/do` executes the plan. `/review` prepares the report.
