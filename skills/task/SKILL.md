---
name: task
description: >-
  Draft a task file for AI implementation. Triggered when the user writes
  "create a task", "task from ticket", "draft a task", "prepare an implementation
  prompt", or passes a ticket URL / feature description.
---

# Draft a task for AI implementation

You are the orchestrator. Coordinate sub-agents and talk to the user.

Delegate codebase investigation through the Agent tool:

- Exploration → `agents/task-explorer.md`
- Architecture analysis → `agents/task-architect.md`

You formulate the task; you do not implement it.

---

## Input

`$ARGUMENTS` contains one or both of:

- **Ticket URL** — GitHub Issues, YouTrack, Jira, etc.
- **Task text** — description, code snippets, links

---

## Phases

### Phase 1 — Parse

**1. Fetch the ticket content:**

- GitHub Issues → `gh issue view <url>`
- Other trackers → take the content from the user's text; use the URL only for the slug

**2. Extract materials from the input:**
Collect a separate list of:

- links (Figma, docs, API)
- paths to files and screenshots
- pasted code snippets
- external resources

Copy this list verbatim into the `Materials` section.

**3. Build the task slug** — identifier + English kebab-case description:

- `86-black-jack-page` — from GitHub issue #86
- `R2-50-user-id-to-db` — from YouTrack R2-50
- `fix-navbar-overflow` — no URL, text only

Rule: ID from the URL + 2–4 descriptive words. No URL — description only.

**4.** Extract `TICKET_ID` from the slug (per `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`).

**Transition:** slug and TICKET_ID determined, materials saved → Phase 2.

---

### Phase 2 — Investigate

Invoke agents through the Agent tool (task-explorer and task-architect are defined in `agents/`).
The order is strictly sequential: architect depends on explorer findings.

**Step 1 — Launch task-explorer through the Agent tool:**

Prompt to the agent:

```
Investigate the codebase for this task: [paste the ticket essence].

Find and document:
1. Every file and function that will be touched (paths + line numbers)
2. Patterns and conventions in this part of the codebase
3. Tests covering the area of change
4. Dependencies — what may break on edit
5. Similar implementations in the project worth reusing

At the end — produce an essential file list: files REQUIRED to understand the topic.
```

**Step 2 — Read every file from the agent's essential file list.**
Each file feeds context into Synthesize.

**Step 3 — Launch task-architect through the Agent tool**

Prompt to the agent:

```
Based on these task-explorer findings: [paste findings]

Analyze the architecture of the area touched by the task: [task essence].

Determine:
1. Patterns and conventions to follow
2. Integration points and data flow
3. Architectural risks and what may break
4. If you find multiple incompatible approaches — describe each with trade-offs

Be concrete: files, lines, function names.
```

**Step 4 — Read additional files** if task-architect expanded the list.

**Stop criteria — Investigate is done when:**

- [ ] Entry points are identified with line numbers
- [ ] Patterns to reuse are found with example files
- [ ] Tests for the touched area are found, or their absence is confirmed
- [ ] Risk zones are identified

While any item stays open — launch another task-explorer.

**Transition:** all four criteria closed → Phase 3.

---

### Phase 3 — Synthesize

**Determine the task type — frontend or general:**

The task is **frontend** when findings contain:

- Technologies: React, Vue, CSS, Tailwind, SCSS, styled-components, Framer Motion, Three.js
- Files: .tsx, .jsx, .css, .scss in the essential file list or change map
- Artifacts: component, page, layout, screen, UI, modal, animation

Record: `TASK_TYPE = frontend | general`

**WARNING:** Read `reference/synthesize-guide.md` before writing.

**If `TASK_TYPE = frontend`:** also read `reference/frontend-guide.md`.
Read both files before starting.

Apply the 5 dimensions from synthesize-guide to the Phase 2 findings. For each dimension: one sentence of reasoning aloud, then the formulation.

**If `TASK_TYPE = frontend`:** for the Requirements, Constraints, and Verification dimensions, also apply the frontend checklists from frontend-guide.

Classify complexity: trivial / simple / medium / complex.

**Question validation:**

Re-read `$ARGUMENTS`. Filter out questions already answered in the prompt — per synthesize-guide.md, section "Validate against the user's input".
Fold the user's decisions into Requirements/Constraints as facts.

**Interactive clarifications:**

Draft 3–7 clarifying questions per the rules in synthesize-guide.md.
Before the first AskUserQuestion call — send a notification:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill task --phase Synthesize --slug "$TASK_SLUG" --title "Clarifying questions" --body "<brief list of question topics>"`

Ask the user via AskUserQuestion in batches of 1–4 questions.

For each question:

- 2–4 answer options with explanations
- Recommended option first, labeled `(Recommended)`
- The user may pick "Other" for free-form input

After each batch of answers — revise Requirements, Constraints, and Context.
Fold the answers into the section wording.

Repeat until every question is answered.

**Transition:** 5 dimensions applied, questions asked and answers folded in → Phase 4.

---

### Phase 4 — Write

**1.** `mkdir -p docs/ai/<task-slug>`

**2.** Read the example to calibrate tone and detail level:

- trivial / simple → `examples/simple-task.md`
- medium / complex → `examples/complex-task.md`

**3.** Write `docs/ai/<task-slug>/<task-slug>-task.md`:

```
# <Task title>

**Slug:** <task-slug>
**Ticket:** <URL or "—">
**Complexity:** <trivial | simple | medium | complex>
**Type:** <frontend | general>

## Task

<One sentence — what to do.>

## Context

### Area architecture
<Data flow, entry points, abstraction layers>

### Files to change
<Paths + lines — entry points for implementation>

### Patterns to reuse
<Similar implementations with paths — what to reuse>

### Tests
<Existing coverage, what to cover next>

## Requirements

1. <Concrete, verifiable requirement>
2. ...

## Constraints

- <What NOT to change>
- <Which approaches to avoid>
- <What not to break>

## Verification

- `<command>` → <expected result>
- <expected behavior>
- <edge cases>

## Materials

- [Description](url)
- `path/to/file`
```

**4.** Dispatch a subagent to copyedit the task file:

- Pass the path to the written file and `reference/elements-of-style-rules.md`
- The subagent edits prose: active voice, concrete language, drop needless words
- The subagent overwrites the file with the edits

**Transition →** Phase 5.

---

### Phase 5 — Commit Artifact

Auto-commit the task artifact.

**1.** Check: is `docs/ai/` in `.gitignore`? If yes — tell the user and skip the commit.

**2.** If not — commit the artifact per the convention in `${CLAUDE_PLUGIN_ROOT}/skills/gca/reference/commit-convention.md`:

Commit format: `TICKET docs(SLUG): add task definition` (NO colon after ticket).

```bash
git add docs/ai/<task-slug>/<task-slug>-task.md
git commit -m "TICKET docs(SLUG): add task definition"
```

Example: `#86 docs(86-black-jack-page): add task definition`

Commit only the task artifact, no other files.

---

### Phase 6 — Complete

Report the file path and task slug, then run the finishing loop.

Send a notification:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill task --phase Complete --slug "$TASK_SLUG" --title "Task ready" --body "docs/ai/$TASK_SLUG/$TASK_SLUG-task.md"`

**Loop:**

Offer 3 options through AskUserQuestion:

1. **Run /sp:plan (Recommended)** — auto-handoff to planning
2. **Review via plannotator** — interactive review of the task file
3. **Finish** — exit

**Handle the choice:**

- **Run /sp:plan:** call the Skill tool with `/sp:plan` and the argument `docs/ai/<task-slug>/<task-slug>-task.md`. Exit.
- **Review via plannotator:** call the Skill tool with `/plannotator-annotate` and the path to the task file. Apply the returned annotations, overwrite the file. Loop back to the start.
- **Finish:** report the file path. Exit.

---

## Rules

- Language: match the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md.
- task-slug — English kebab-case
- One task — one file, no decomposition
- Write in active voice. Omit needless words. Name files and lines instead of abstractions.
