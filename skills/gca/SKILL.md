---
name: gca
description: Git staging and commit with smart file grouping. Activated when the user writes "commit", "gca", "make a commit", "commit changes", or after /task, /plan, /do, /review.
---

# Git Commit with smart grouping

Commit orchestrator: determines context, classifies files, groups them into atomic commits, forms messages.

---

## Step 1 — Context collection

Run in parallel:

```bash
git status --porcelain
```

```bash
git diff HEAD --stat
```

```bash
git branch --show-current
```

```bash
git ls-files --others --exclude-standard
```

If there are no changes — tell the user and stop.

---

## Step 2 — Context detection

Determine the mode: SP flow or standalone.

### SP flow detection

Does `$ARGUMENTS` contain a path under `docs/ai/` or a slug? Are there recent artifacts in `docs/ai/*/`? If yes:

- `MODE = sp-flow`
- `SLUG` = from the path or directory name
- `TICKET_ID` = extracted from the slug per `reference/commit-convention.md`

### Standalone mode

If SP flow is not detected:

- `MODE = standalone`
- `SLUG` = current branch name without prefix (`feature/`, `fix/`, `hotfix/`, `bugfix/`, `release/`). If the branch is `main`/`master`/`develop` — omit the slug.

---

## Step 3 — Ticket ID detection

Apply the cascade from `reference/commit-convention.md`:

1. **From `$ARGUMENTS`** — user passed a ticket ID or URL
2. **From the slug** (SP flow) — extract from the slug pattern
3. **From the branch name** (standalone) — extract via regex patterns
4. **Ask the user** — via AskUserQuestion: "No ticket" / "Enter number"

---

## Step 4 — Classification and staging

### SP flow mode

After a task/plan/do/review skill, commit only the artifact of that stage:

```
#86 docs(86-black-jack-page): add task definition
#86 docs(86-black-jack-page): add implementation plan
#86 docs(86-black-jack-page): add execution report
#86 docs(86-black-jack-page): add review report
```

### Standalone mode

Read `reference/staging-strategy.md` and apply it:

1. Collect all modified/new files
2. Classify them into groups (feature, test, docs, style, chore, sp-artifacts)
3. Determine atomic commits by group
4. Exclude .env, credentials, large binaries — warn the user about excluded files
5. Show the commit plan to the user via AskUserQuestion

---

## Step 5 — Message formation

Read `reference/commit-convention.md`. For each planned commit:

- Format: `TICKET type(SLUG): description` (NO colon after the ticket)
- Language: ALWAYS English
- Ticket ID first (if present)
- Description: one sentence, imperative mood

---

## Step 6 — Executing commits

For each planned commit:

1. `git add` specific files by name (not `git add -A`)
2. `git commit -m "<message>"` — no Co-Authored-By, no trailers
3. Show the result: hash, message, list of files

---

## Rules

- Commits in English. No exceptions.
- One commit — one logical change.
- Ticket ID first in the message (if present).
- Stage files by name, not `git add -A`.
- Exclude secrets, credentials, large binaries.
- Avoid `wip`, `temp`, `misc`.
- Exclude Co-Authored-By, Signed-off-by and any trailer lines.
- In standalone mode, request confirmation before executing multiple commits.

## Reference files

- **`reference/commit-convention.md`** — message format, ticket ID extraction, type table, slug logic
- **`reference/staging-strategy.md`** — file classification, grouping algorithm, commit order (standalone mode only)
