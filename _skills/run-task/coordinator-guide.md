# Coordinator Guide

Reference for the execution session. You (the lead Claude session) are the coordinator. Read this guide after being launched in a worktree to execute an implementation plan via Agent Teams.

## Prerequisites

- You are running inside a worktree (`.worktrees/{branch}`)
- The implementation plan has been validated by `/run-task`
- `.claude/skills/run-task/` contains this file and the prompt templates

## Phase A: Load Context and Parse Plan

Load all three task documents (paths from the task index `.agents/plans/ui-fixes/ui-fixes.md`):

1. **[Plan]** — the original task description (problem statement, scope, acceptance criteria)
2. **[Design]** — the design document (technical analysis, proposed solution, rationale)
3. **[Implementation]** — the implementation plan with YAML frontmatter

From the implementation plan:

4. Extract YAML frontmatter between the first pair of `---` markers
5. Parse fields:
   - `task` — task slug
   - `goal` — one-sentence objective
   - `team.domains[]` — domain definitions with `id`, `label`, `files`, `estimated_complexity`
   - `team.dependencies[]` — inter-domain dependencies
   - `phases` — post-implementation configuration
6. Extract the markdown body — implementation steps grouped by `## Domain:` headers

Keep all three documents in context — they inform teammate prompts and review criteria.

## Phase B: Calculate Team Size

| Condition               | Implementers         | Reviewers |
| ----------------------- | -------------------- | --------- |
| 1 domain, all small     | 1                    | 1         |
| 2-3 domains, no large   | min(domain_count, 2) | 1         |
| 4+ domains OR any large | min(domain_count, 3) | 2         |

**1 implementer with multiple domains:** Assign domains sequentially, respecting dependency order. The implementer's prompt includes all domains with explicit ordering.

**2 reviewers:** `reviewer-spec` handles spec compliance, `reviewer-quality` handles code quality. They can work in parallel on different domains.

**1 reviewer:** Same agent does both passes sequentially per domain.

## Phase C: Create Team and Tasks

### C.1 Create Team

```
TeamCreate(team_name="{task-slug}")
```

### C.2 Create Implementation Tasks

For each domain, for each step in that domain's markdown section:

```
TaskCreate(
  subject="impl-{domain_id}: Step N — {step_title}",
  description="{full step text including code snippets}",
  activeForm="Implementing {step_title}"
)
```

### C.3 Create Review Tasks

For each domain, create two review tasks:

```
TaskCreate(
  subject="review-spec-{domain_id}: Spec compliance",
  description="Review domain {domain_id} for spec compliance.\n\nRequirements:\n{domain steps from plan}\n\nFiles that should have been modified:\n{domain file list}\n\nUse the spec compliance pass from reviewer-prompt.md.",
  activeForm="Reviewing spec compliance for {domain_id}"
)

TaskCreate(
  subject="review-quality-{domain_id}: Code quality",
  description="Review domain {domain_id} for code quality.\n\nUse the code quality pass from reviewer-prompt.md.",
  activeForm="Reviewing code quality for {domain_id}"
)
```

### C.4 Create Post-Implementation Tasks

Create tasks from `phases` configuration:

| Phase             | Task subject                      | Condition                        |
| ----------------- | --------------------------------- | -------------------------------- |
| `verification`    | "Run verification: {command}"     | Always                           |
| `simplification`  | "Run code simplifier"             | `phases.simplification == true`  |
| `formatting`      | "Run formatting: {command}"       | Always                           |
| `claude_md`       | "Update CLAUDE.md"                | `phases.claude_md == true`       |
| `project_docs`    | "Update project documentation"    | `phases.project_docs == true`    |
| PR                | "Commit and create PR"            | Always                           |
| `review`          | "Run code review"                 | `phases.review == true`          |
| Fix               | "Fix review issues"               | `phases.review == true`          |
| Final verify      | "Final verification"              | `phases.review == true`          |
| `report`          | "Write work report"               | `phases.report == true`          |

### C.5 Set Dependencies

Use `TaskUpdate(taskId, addBlockedBy=[...])`:

1. **Inter-domain:** If dependency `from: A, to: B, type: blocks` exists, all domain B impl tasks are blocked by all domain A impl tasks
2. **Review:** `review-spec-{domain}` is blocked by all impl tasks in that domain
3. **Quality after spec:** `review-quality-{domain}` is blocked by `review-spec-{domain}`
4. **Post-impl after reviews:** First post-impl task is blocked by all `review-quality-*` tasks
5. **Post-impl chain:** Each post-impl task is blocked by the previous one

## Phase D: Spawn Teammates

### D.1 Implementers

Build each implementer's prompt from `.claude/skills/run-task/implementer-prompt.md`:

1. Read the template
2. Replace `{DOMAIN_ID}` with the domain id
3. Replace `{TEAM_NAME}` with the task slug
4. Replace `{GOAL}` with the plan's `goal` field
5. Replace `{DOMAIN_LABEL}` with the domain label
6. Replace `{TASK_DESCRIPTION}` with the full text of the **[Plan]** document (the original task description)
7. Replace `{DESIGN_SUMMARY}` with the key sections of the **[Design]** document relevant to this domain (proposed solution, rationale, constraints)
8. Replace `{FULL_TEXT_OF_DOMAIN_STEPS}` with the complete markdown for that domain's steps (paste the text, don't reference the file)
9. Replace `{FILE_LIST}` with the domain's `files` array as bullet points
10. Replace `{COORDINATOR_NAME}` with your team member name (usually the team lead name)

Spawn:

```
Task(
  subagent_type="general-purpose",
  team_name="{task-slug}",
  name="impl-{domain_id}",
  prompt="{assembled prompt}"
)
```

If one implementer handles multiple domains, include all domains in the prompt with ordering instructions.

### D.2 Reviewers

Build each reviewer's prompt from `.claude/skills/run-task/reviewer-prompt.md`:

1. Read the template
2. Replace `{REVIEWER_NAME}` with `reviewer` (or `reviewer-spec`/`reviewer-quality` if 2 reviewers)
3. Replace `{TEAM_NAME}` with the task slug
4. Replace `{COORDINATOR_NAME}` with your team member name

Spawn:

```
Task(
  subagent_type="general-purpose",
  team_name="{task-slug}",
  name="reviewer",
  prompt="{assembled prompt}"
)
```

## Phase E: Coordination Loop

Monitor progress via automatic message delivery from teammates.

### E.1 Normal Flow

1. **Implementer marks task complete** → Assign the `review-spec-{domain}` task to the reviewer (set `owner` via `TaskUpdate`)
2. **Spec review passes** → Assign `review-quality-{domain}` to the reviewer
3. **Quality review passes** → Domain is fully complete
4. **All domains complete** → Proceed to Phase F

### E.2 Review Failure Loop

When a reviewer reports issues:

1. Send the reviewer's feedback to the implementer via `SendMessage`
2. Implementer fixes the issues
3. Reassign the same review task to the reviewer
4. Reviewer re-reviews
5. Repeat until approved

**Maximum 3 cycles per review task.** Track:

```
cycles = { "{domain}-spec": 0, "{domain}-quality": 0 }
```

After 3 failed cycles: stop the loop, report to the user with full context (what was tried, reviewer's latest feedback, implementer's latest response).

### E.3 Handling Questions

- **Implementer asks a question** → Read the message, relay to the user as text. When the user responds, send the answer back via `SendMessage` to the implementer.
- **Reviewer asks a question** → Same: relay to user, forward answer.

### E.4 Handling Blockers

- **Build/lint fails** → Inspect errors, identify which domain's files caused them, send errors to relevant implementer
- **Teammate goes idle without completing** → Send a follow-up `SendMessage`. After 2 follow-ups with no response, escalate to user
- **File ownership violation** → If `git diff` shows a teammate edited files outside their domain, warn them and ask them to revert

## Phase F: Post-Implementation

Execute these directly (not via teammates). Run them sequentially.

1. **Verification:** Run `{phases.verification}` (e.g., `pnpm build && pnpm lint`). If it fails, identify the cause, send errors to the relevant implementer, and fix before proceeding.

2. **Simplification:** If `phases.simplification` is true, run `code-simplifier:code-simplifier` on the files listed in all domains.

3. **Formatting:** Run `{phases.formatting}` (e.g., `pnpm format && pnpm lint`).

4. **CLAUDE.md:** If `phases.claude_md` is true, run `claude-md-management:revise-claude-md`.

5. **Project docs:** If `phases.project_docs` is true, review `doc/` directory and update any files affected by the changes.

6. **Commit and PR:**
   - Stage all modified files: `git add {all domain files}`
   - Commit with `{phases.pr_commit_message}`
   - Create PR: use `close-worktree` skill or `gh pr create --head {pr_branch} --base main`

7. **Code review:** If `phases.review` is true, run `code-review:code-review`.

8. **Fix review issues:** Address findings from code review. Re-run verification after fixes.

9. **Final verification:** Run `{phases.verification}` one last time.

10. **Report:** If `phases.report` is true, write a report to `.agents/plans/{category}/{slug}/YYYY-MM-DD-{slug}-report.md`. Include: summary of changes, files modified, decisions made, issues encountered, review findings, final status.

Mark each post-impl `TaskUpdate` as completed as you go.

## Phase G: Teardown

1. Send `SendMessage(type="shutdown_request")` to each teammate
2. Wait for all shutdown confirmations (or timeout after 60 seconds)
3. Call `TeamDelete` to remove the team and task list
4. Report to user: task complete, PR URL, any outstanding issues

## Error Reference

| Scenario                          | Action                                                    |
| --------------------------------- | --------------------------------------------------------- |
| Implementer asks a question       | Relay to user, send answer via `SendMessage`              |
| Review fails (cycle 1-3)          | Send feedback to implementer → fix → re-review            |
| Review fails after 3 cycles       | Stop, escalate to user with full context                  |
| Build/lint fails                  | Identify domain, send errors to implementer               |
| Teammate unresponsive             | 2 follow-ups via `SendMessage`, then escalate             |
| File ownership violation          | Warn teammate, ask to revert                              |
| Unexpected merge conflict         | Stop all implementers, resolve manually                   |

## Verification-Before-Completion

Never claim success without evidence. Before ANY completion claim:

1. Run `{phases.verification}` — see exit code 0
2. Run `git diff --stat` — confirm only expected files changed
3. Check PR was created — see PR URL from `gh`

Do NOT trust teammate reports. Verify independently.
