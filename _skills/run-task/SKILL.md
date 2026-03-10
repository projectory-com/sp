---
name: run-task
description: Execute an implementation plan with YAML frontmatter via the coordinator guide. Validates, then runs the full plan to completion.
user-invocable: true
---

# Run Task

Validates an implementation plan and executes it to completion using the coordinator guide.

**Usage:** `/run-task 01` (task number from the index)

## Step 1: Load context

1. Read the task index: `.agents/plans/ui-fixes/ui-fixes.md`
2. Find the task matching the provided number (e.g. `01`)
3. Read **all three documents** for this task (links are in the index entry):
   - **[Plan]** — the original task description (problem statement, scope, acceptance criteria)
   - **[Design]** — the design document (technical analysis, proposed solution, rationale)
   - **[Implementation]** — the implementation plan with YAML frontmatter (step-by-step instructions)
4. If the implementation plan does not exist, tell the user to run `/plan-task` first and stop
5. Keep all three documents in context — the coordinator and teammates need the full picture to make correct decisions

## Step 2: Parse and validate YAML frontmatter

Read the implementation plan file. Extract YAML frontmatter between the first pair of `---` markers.

If the file has no YAML frontmatter (old-format plan), warn the user:

> This plan uses the old linear format without YAML frontmatter. It is compatible with `executing-plans` or `subagent-driven-development`, but not with Agent Teams. To use Agent Teams, re-run `/plan-task` to generate a new-format plan.

Then stop.

### Required fields

| Field                      | Type   | Description                                                                 |
| -------------------------- | ------ | --------------------------------------------------------------------------- |
| `task`                     | string | Task slug (e.g. `01-logout-google-contrast`)                                |
| `team.domains[]`           | array  | At least one domain. Each: `id`, `label`, `files[]`, `estimated_complexity` |
| `team.dependencies[]`      | array  | May be empty. Each: `from`, `to`, `type`                                    |
| `phases.verification`      | string | Build/lint command                                                          |
| `phases.pr_branch`         | string | Git branch name                                                             |
| `phases.pr_commit_message` | string | Commit message                                                              |

### Validation checks

Run all checks. Report ALL failures (not just the first):

1. **Files exist:** Every file in `team.domains[].files` exists on disk
2. **No overlap:** No file appears in more than one domain
3. **Valid refs:** All `team.dependencies[].from` and `.to` reference valid domain `id` values
4. **No cycles:** Dependencies form a DAG (directed acyclic graph)
5. **Valid complexity:** Each `estimated_complexity` is one of `small`, `medium`, `large`

If any validation fails, report the specific errors and stop.

## Step 3: Prepare worktree

Check if the worktree already exists:

```bash
test -d .worktrees/{phases.pr_branch}
```

- **If it exists:** `cd` into it and continue to Step 4.
- **If it does not exist:** Follow the `/use-worktree {phases.pr_branch}` skill steps to create it, then `cd` into it.

After this step you must be working inside the worktree directory.

## Step 4: Calculate team composition

Count domains and assess complexity:

| Condition                         | Implementers         | Reviewers | Size label |
| --------------------------------- | -------------------- | --------- | ---------- |
| 1 domain, all small complexity    | 1                    | 1         | small      |
| 2-3 domains, no domain is large   | min(domain_count, 2) | 1         | medium     |
| 4+ domains OR any domain is large | min(domain_count, 3) | 2         | large      |

If 2 reviewers: one handles spec compliance (`reviewer-spec`), one handles code quality (`reviewer-quality`).
If 1 reviewer: same agent does both passes sequentially.

## Step 5: Display summary

Show validation results before execution begins:

```
Plan validated: {task}
  Worktree:     .worktrees/{pr_branch} ✓
  Domains:      {count} ({comma-separated domain ids})
  Dependencies: {summary, e.g. "css → ui (blocks)" or "none"}
  Team:         {N} implementer(s) + {M} reviewer(s) ({size_label} task)
  Steps:        {implementation_step_count} implementation + post-impl phases

Executing...
```

## Step 6: Execute the plan

Read the coordinator guide at `.claude/skills/run-task/coordinator-guide.md` and **follow it exactly from Phase C onward** (you already completed Phases A-B during validation above).

Specifically:

1. **Phase C:** Create team, implementation tasks, review tasks, post-impl tasks, set dependencies
2. **Phase D:** Spawn implementer and reviewer teammates using the prompt templates
3. **Phase E:** Coordinate the implementation and review loops
4. **Phase F:** Run post-implementation phases (verification, formatting, commit, PR, etc.)
5. **Phase G:** Teardown — shutdown teammates, delete team, report results

**Do NOT stop after validation. Execute the entire plan to completion.**

## Reference Files

- `coordinator-guide.md` — step-by-step coordinator behavior (Phases A-G)
- `implementer-prompt.md` — template for building implementer teammate prompts
- `reviewer-prompt.md` — template for building reviewer teammate prompts
