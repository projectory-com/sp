---
name: plan-task
description: Create design and implementation plans for a UI fix task by number
user-invocable: true
---

# Plan Task

Creates a design plan and implementation plan for a task from the UI fixes backlog.

**Usage:** `/plan-task 06` (task number from the index)

## Step 1: Load task context

1. Read the task index: `.agents/plans/ui-fixes/ui-fixes.md`
2. Find the task matching the provided number (e.g. `06`)
3. Determine the task slug folder (e.g. `06-pointer-cursor-audit`)
4. Read the detailed task file inside that folder (e.g. `.agents/plans/ui-fixes/06-pointer-cursor-audit/06-pointer-cursor-audit.md`)
5. If the task already has Design/Implementation links in the index, warn the user and ask whether to overwrite

## Step 2: Design plan

Use `superpowers:brainstorming` to explore requirements and solution options.

Write the design plan following `elements-of-style:writing-clearly-and-concisely` — clear statements, active voice, no filler.

For UI components, use `frontend-design` when designing interface solutions.

Save as: `.agents/plans/ui-fixes/<NN-slug>/YYYY-MM-DD-<slug>-design.md`

## Step 3: Implementation plan

Create an implementation plan optimized for Agent Teams execution via `/run-task`.

Save as: `.agents/plans/ui-fixes/<NN-slug>/YYYY-MM-DD-<slug>-implementation.md`

### Plan format: YAML frontmatter + markdown body

The plan header directs to `run-task` for execution:

> **For Claude:** Use `/run-task <NN>` to validate and launch this plan via Agent Teams.

#### YAML frontmatter (between `---` markers)

```yaml
---
task: '<NN-slug>'
design_doc: 'YYYY-MM-DD-<slug>-design.md'
goal: '<one sentence>'
tech:
  - '<technology 1>'

team:
  domains:
    - id: <short-id>
      label: '<human-readable name>'
      files:
        - <file-path>
      estimated_complexity: small | medium | large

  dependencies:
    - from: <domain-id>
      to: <domain-id>
      type: blocks | soft

phases:
  verification: 'pnpm build && pnpm lint'
  simplification: true | false
  formatting: 'pnpm format && pnpm lint'
  claude_md: true | false
  project_docs: true | false
  pr_branch: '<NN-slug>'
  pr_commit_message: |
    <conventional commit message>
  review: true | false
  report: true | false
---
```

#### Markdown body — implementation steps grouped by domain

```markdown
## Domain: <id> — <label>

### Step N: <title>

**File:** `<path>`
**Depends on:** <domain_id>/Step M (if cross-domain dependency)

[detailed instructions with before/after code snippets]
```

### Domain grouping rules

- **Each file appears in exactly one domain.** No overlap — this prevents merge conflicts between implementers.
- **Group by functional area.** E.g., CSS/theme changes in one domain, component changes in another, store changes in a third.
- **Dependencies form a DAG.** `blocks` means the source domain must complete AND pass review before the target starts. `soft` means recommended order but parallelizable.
- **Complexity per domain:** `small` (1-2 files, straightforward), `medium` (3-5 files or non-trivial logic), `large` (6+ files or architectural).

### Phases configuration

The `phases` section replaces the old mandatory stages list. Set boolean/string values:

| Phase               | Value            | When to enable                                                      |
| ------------------- | ---------------- | ------------------------------------------------------------------- |
| `verification`      | command string   | Always (usually `pnpm build && pnpm lint`)                          |
| `simplification`    | `true`/`false`   | True unless change is trivial (1-2 line edit)                       |
| `formatting`        | command string   | Always (usually `pnpm format && pnpm lint`)                         |
| `claude_md`         | `true`/`false`   | True if task introduces new patterns, slices, hooks, or conventions |
| `project_docs`      | `true`/`false`   | True if task affects files documented in `doc/`                     |
| `pr_branch`         | string           | Always — matches the worktree branch name (= task slug)             |
| `pr_commit_message` | multiline string | Always — conventional commit format                                 |
| `review`            | `true`/`false`   | True for non-trivial changes                                        |
| `report`            | `true`/`false`   | True by default                                                     |

The `run-task` coordinator executes these phases automatically after all domain implementations and reviews complete. They do not appear as numbered steps in the markdown body.

### Backwards compatibility

Plans in this format work with `/run-task` (Agent Teams). Plans can also be executed manually via `executing-plans` or `subagent-driven-development` — the YAML frontmatter is ignored and the markdown body is followed as a linear sequence.

## Step 4: Update index

Update `.agents/plans/ui-fixes/ui-fixes.md`:
- Add Design and Implementation links to the task entry (same format as tasks 09 and 10)

## Step 5: Create worktree

Create an isolated git worktree using `use-worktree`.
Branch name = task slug folder name (e.g. `06-pointer-cursor-audit`).

After the worktree is created, append a **Worktree** section to the implementation plan file:

```markdown
## Worktree

- **Branch:** `<branch-name>`
- **Path:** `<absolute-path-to-worktree>`

```bash
cd <absolute-path-to-worktree>
```
```

This gives the user a ready-to-copy command for opening the worktree in a new tmux pane.
