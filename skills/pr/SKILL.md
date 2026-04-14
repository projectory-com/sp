---
name: pr
description: Create or update a GitHub Pull Request. Activated on "pr", "pull request", "create pr", "update pr", "open pr", or after /gp.
---

# Creating and updating Pull Requests

You are the orchestrator. Delegate to agents via the Agent tool:

- Data collection → `agents/pr-data-collector.md`
- Body generation → `agents/pr-body-generator.md`

---

## Input

`$ARGUMENTS` — optional flags (`--draft`, `--base <branch>`).

---

## Phase 1 — Collect

Run `pr-data-collector` via the Agent tool:

- Agent: `${CLAUDE_PLUGIN_ROOT}/skills/pr/agents/pr-data-collector.md`
- Prompt: "Collect data for creating a PR"

The agent returns structured data. Transition → Phase 2.

---

## Phase 2 — Decide

Process the collector's data strictly in order.

### 1. Blocking errors — exit

- `GH_AUTH = not_installed` → report: "Install gh CLI: https://cli.github.com", exit
- `GH_AUTH = not_authenticated` → report: "Authenticate: `gh auth login`", exit
- `BRANCH` matches `DEFAULT_BRANCH` → report: "PR from default branch is not possible", exit
- `COMMITS_COUNT = 0` and `PR_EXISTS = false` → report: "No commits. Push first: `/sp:gp`", exit

### 2. Create vs Update

- `PR_EXISTS = true` → `MODE = UPDATE`
- `PR_EXISTS = false` → `MODE = CREATE`

### 3. Draft (CREATE only)

If `$ARGUMENTS` contains `--draft` → `IS_DRAFT = true`, skip the question.

Send a notification before the PR type question:
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill pr --phase Decide --slug "$TICKET_ID" --title "PR type selection" --body "Ready for review or Draft?"`

Otherwise → AskUserQuestion:

> Create PR as...

Options:

- **Ready for review (Recommended)**
- **Draft**

### 4. Determine DATA_SOURCE

- `REVIEW_FILE` found → `DATA_SOURCE = sp_full`
- Only `REPORT_FILE` found → `DATA_SOURCE = sp_partial`
- Neither found → `DATA_SOURCE = fallback`

### 5. Base branch

If `$ARGUMENTS` contains `--base <branch>` → `BASE_BRANCH = <branch>`.
Otherwise → `BASE_BRANCH = DEFAULT_BRANCH`.

Transition → Phase 3.

---

## Phase 3 — Generate body

Run `pr-body-generator` via the Agent tool:

- Agent: `${CLAUDE_PLUGIN_ROOT}/skills/pr/agents/pr-body-generator.md`
- Pass: DATA_SOURCE, REVIEW_CONTENT, REPORT_CONTENT, PR_TEMPLATE_CONTENT, COMMITS, DIFF_STAT, TICKET_ID, PR_BODY (on update), PR_HAS_SP_MARKERS, MODE

The agent returns ready markdown. Transition → Phase 4.

---

## Phase 4 — Execute

### PR title

Form the title: `<TICKET_ID> <short description from summary>`.
If `MODE = UPDATE` — do not change the title.

### CREATE

```bash
gh pr create --title "$TITLE" --body "$BODY" --base "$BASE_BRANCH" [--draft]
```

After creation — add labels:

```bash
# Mapping from COMMIT_TYPES → labels (only those existing in AVAILABLE_LABELS)
gh pr edit <NUMBER> --add-label "<label>"
```

### UPDATE

```bash
gh pr edit <PR_NUMBER> --body "$NEW_BODY"
```

Add labels if needed.

### Print the result

```
PR created: <URL>              # or "PR updated: <URL>"
  Title: <title>
  Labels: <labels>
  Ticket: <ticket_id>
  Source: <DATA_SOURCE>
```

Send a notification (with URL — final artifact of the cycle):
`bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill pr --phase Complete --slug "$TICKET_ID" --title "PR $MODE" --body "$PR_URL"`

Transition → Phase 5.

---

## Phase 5 — Next step

AskUserQuestion — what's next:

- **Finish (Recommended)** → exit

> Note: integration with `/code-review` will appear in a future version.
> Until implemented — finish without additional suggestions.

---

## Rules

- Delegate bash commands to agents. Exception: `gh pr create/edit` in Phase 4.
- AskUserQuestion — only in the orchestrator.
- Wrap PR body in `<!-- sp:start/end -->` markers.
- On update — preserve user text outside the markers.
- Assign only labels that exist in the repository.
- Limits: max 30 commits.

## Reference files

- **`reference/pr-body-format.md`** — PR body format, review/report section mapping, markers, template integration, auto-link, auto-labels
