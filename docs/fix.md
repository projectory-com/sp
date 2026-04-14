# Skill /fix

Compressed pipeline for small changes and fixes (1–3 files). Replaces the unstructured
"just fix it in chat" with a structured pipeline: investigation, implementation (opus), post-processing, artifact.
Two modes: post-flow (after task/plan/do) and standalone. Supports chains of fixes and "fix from PR comment URL".

## Input

`$ARGUMENTS` — fix description or PR comment URL.

```
/sp:fix fix email validation — it doesn't handle empty strings
/sp:fix bump reconnect timeout from 5s to 15s
/sp:fix https://github.com/owner/repo/pull/42#discussion_r123456
```

## Phases

| Phase | Name             | What happens                                                              |
| ----- | ---------------- | ------------------------------------------------------------------------- |
| 1     | **Collect**      | Sub-agent determines mode, slug, fix number, artifact paths, branch       |
| 2     | **Investigate**  | Sub-agent finds files, patterns, constraints, and estimates complexity    |
| 3     | **Decide**       | Orchestrator: scope guard, clarifications, prepare the implementer prompt |
| 4     | **Implement**    | Sub-agent (opus) implements the fix and commits                           |
| 5     | **Post-process** | Sub-agents: polish (opus), validate, docs, format                         |
| 6     | **Artifact**     | Sub-agent writes the fix log                                              |
| 7     | **Complete**     | Orchestrator: summary, AskUserQuestion (another fix / review / exit)      |

## Output

Implemented code + an entry in `docs/ai/<slug>/<slug>-fixes.md`.

The fix log contains: description, status, changed files, validation results, commits.

## Sub-agents

| Agent                   | Model  | Role                                                                |
| ----------------------- | ------ | ------------------------------------------------------------------- |
| `fix-context-collector` | haiku  | Collects context: mode, slug, ticket ID, fix number, artifact paths |
| `fix-investigator`      | sonnet | Codebase exploration: files, patterns, constraints, complexity      |
| `task-executor` (/do)   | opus   | Implements the fix, self-review, commit                             |
| `code-polisher` (/do)   | opus   | Simplifies and cleans up code                                       |
| `validator` (/do)       | haiku  | Lint, type-check, tests, build + auto-fix                           |
| `doc-updater` (/do)     | sonnet | Updates README, CHANGELOG, JSDoc                                    |
| `formatter` (/do)       | haiku  | Formats code                                                        |
| `fix-log-writer`        | haiku  | Writes / appends to the fix log artifact                            |

## Example

```
/sp:fix fix email validation
```

Result: opus implements, polishes, and validates the fix; the skill appends an entry to `docs/ai/<slug>/<slug>-fixes.md`.

## Connections

```
/sp:task → /sp:plan → /sp:do → /sp:fix → /sp:review
```

`/fix` complements `/do` with targeted changes. On scope guard (4+ files), escalate to `/sp:task`.
Reuses 5 agents from `/do` (task-executor, code-polisher, validator, doc-updater, formatter).
