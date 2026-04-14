---
name: gp
description: >-
  Git push with checks and report. Used when the user writes
  "push", "gp", "git push", or after running /do and /review
  to send changes.
---

# Git push with checks and report

You are the orchestrator. Delegate bash commands to agents via the Agent tool:

- Pre-check → `agents/git-pre-checker.md`
- Push + Report → `agents/git-pusher.md`

---

## Input

`$ARGUMENTS` — optional flags (`--force-with-lease`).

---

## Phase 1 — Pre-check

Run `git-pre-checker` via the Agent tool:

- Agent: `${CLAUDE_PLUGIN_ROOT}/skills/gp/agents/git-pre-checker.md`
- Prompt: "Collect repository state before push"

The agent returns structured data. Transition → Phase 2.

---

## Phase 2 — Decide

Process the pre-checker data. Checks go from blocking to interactive.

### 1. Blocking errors — exit

- `BRANCH = DETACHED` → report: "Checkout a branch before push", exit
- `GH_AUTH = not_installed` → report: "Install gh CLI: https://cli.github.com", exit
- `GH_AUTH = not_authenticated` → report: "Authenticate: `gh auth login`", exit
- `REMOTE_URL` empty → report: "Add remote: `git remote add origin <url>`", exit
- `UNPUSHED_COMMITS = 0` and `HAS_UPSTREAM = true` and `UNCOMMITTED_FILES = 0` → report: "Nothing to push", exit

### 2. Default branch protection

If `IS_DEFAULT_BRANCH = true` → AskUserQuestion:

> Push to `<BRANCH>` — default branch. Continue?

Options:

- **Continue**
- **Cancel** → exit

### 3. Uncommitted changes

If `UNCOMMITTED_FILES > 0` → AskUserQuestion:

> Uncommitted changes (N files):

Show the list of files from `UNCOMMITTED_LIST`.

Options:

- **Commit and push** → request a commit message via AskUserQuestion, stage files from `UNCOMMITTED_LIST` by name (not `git add -A`), run `git commit -m "<message>"`
- **Push only committed** → continue
- **Cancel** → exit

### 4. Nothing to push after commit

If the user chose "Push only committed" and `UNPUSHED_COMMITS = 0` → report: "Nothing to push", exit.

### 5. Determine PUSH_MODE

- `HAS_UPSTREAM = false` → `set-upstream`
- `$ARGUMENTS` contains `--force-with-lease` → `force-with-lease`
- Otherwise → `normal`

Transition → Phase 3.

---

## Phase 3 — Push + Report

Run `git-pusher` via the Agent tool:

- Agent: `${CLAUDE_PLUGIN_ROOT}/skills/gp/agents/git-pusher.md`
- Prompt: "Run push and collect the report. BRANCH: `<BRANCH>`, PUSH_MODE: `<PUSH_MODE>`, SLUG: `<SLUG>`"

### If PUSH_STATUS = FAILED

Show `PUSH_ERROR`.

If the error contains "non-fast-forward" → suggest:

> `git pull --rebase` or `/sp:gp --force-with-lease`

Exit.

Transition → Phase 4.

---

## Phase 4 — Report

Print the report to the user:

```
Pushed to origin/<BRANCH>: +N commits

Commits:
  <hash> <message>
  <hash> <message>

Stats: <DIFF_STAT>

Link: <BRANCH_URL>
```

If `PR_EXISTS = true` — add:

```
PR: <PR_TITLE> (<PR_URL>)
```

If `PR_EXISTS = false` — add:

```
PR not found.
```

AskUserQuestion — what's next:

If `PR_EXISTS = true`:

- **Update PR via /sp:pr (Recommended)** — `<PR_TITLE>` (`<PR_URL>`)
- **Finish** → exit

If `PR_EXISTS = false`:

- **Create PR via /sp:pr (Recommended)**
- **Finish** → exit

Handling: `/sp:pr` → invoke the Skill tool with `/sp:pr`. Finish → exit.

---

## Rules

- Delegate bash commands to agents.
- AskUserQuestion — only in the orchestrator.
- Remote: `origin`. When multiple remotes exist — push to origin.
- Output limits: max 20 commits, max 30 files.
