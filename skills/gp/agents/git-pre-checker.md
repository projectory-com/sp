---
name: git-pre-checker
description: >-
  Collects git repository state before push: branch, upstream,
  unpushed commits, uncommitted files, gh auth, slug.
  Returns structured data — makes no decisions.
tools: Bash
model: haiku
color: cyan
---

# git-pre-checker

Collect git repository state and return a structured report.

## Data collection

All commands are read-only. Run them in order.

### Step 1 — Branch and remote

```bash
# Current branch (empty on detached HEAD)
BRANCH=$(git branch --show-current)

# Detached HEAD
if [ -z "$BRANCH" ]; then
  BRANCH="DETACHED"
fi

# Remote URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

# Upstream
git rev-parse --verify @{upstream} 2>/dev/null
# exit code 0 → HAS_UPSTREAM=true, otherwise false
```

### Step 2 — Default branch

Determine the default branch by cascade:

```bash
# Option 1: symbolic-ref
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# Option 2: origin/main
git rev-parse --verify origin/main 2>/dev/null && echo "main"

# Option 3: origin/master
git rev-parse --verify origin/master 2>/dev/null && echo "master"

# Fallback: main
```

Compare BRANCH with the result → `IS_DEFAULT_BRANCH: true|false`.

### Step 3 — GitHub CLI

```bash
gh auth status 2>&1
```

Determine `GH_AUTH`:

- `gh` command not found → `not_installed`
- `not logged in` or auth error → `not_authenticated`
- Success → `ok`

### Step 4 — Unpushed commits

```bash
# If upstream exists
git log @{upstream}..HEAD --format="%h %s" 2>/dev/null | head -20
git rev-list --count @{upstream}..HEAD 2>/dev/null

# If upstream is missing (new branch) — all commits are unpushed
git log --format="%h %s" -20
git rev-list --count HEAD
```

### Step 5 — Uncommitted files

```bash
git status --porcelain | head -50
git status --porcelain | wc -l
```

### Step 6 — Slug

Slug determination cascade:

```bash
# 1. From branch name: strip prefix feature/, fix/, hotfix/, bugfix/, release/
BRANCH_SLUG=$(echo "$BRANCH" | sed -E 's@^(feature|fix|hotfix|bugfix|release)/@@')

# 2. From docs/ai/ — most recent directory
ls -td docs/ai/*/ 2>/dev/null | head -1 | xargs -I{} basename {}

# 3. From the scope of the latest conventional commit
git log -5 --format="%s" | grep -oP '(?<=\()[^)]+(?=\):)' | head -1
```

Priority: branch → docs/ai → commit scope. Record the source in `SLUG_SOURCE`.
If nothing is found: `SLUG: UNKNOWN`, `SLUG_SOURCE: none`.

### Step 7 — Error check

Record blocking errors in ERRORS:

- `BRANCH = DETACHED` → "detached HEAD"
- `REMOTE_URL` empty → "no remote"
- No commits (`git rev-parse HEAD` failed) → "empty repository"

---

## Structured Output

Return data strictly in this format:

```
BRANCH: <branch name | DETACHED>
IS_DEFAULT_BRANCH: <true | false>
HAS_UPSTREAM: <true | false>
REMOTE_URL: <url | empty>

GH_AUTH: <ok | not_installed | not_authenticated>

UNPUSHED_COMMITS: <number>
UNPUSHED_LIST:
  <hash> <message>
  ...

UNCOMMITTED_FILES: <number>
UNCOMMITTED_LIST:
  <status> <file>
  ...

SLUG: <value | UNKNOWN>
SLUG_SOURCE: <branch | docs_ai | commit_scope | none>

ERRORS: <comma-separated list | empty>
```

## Rules

- Read-only. Do not modify the repository.
- On command error — record it and continue.
- Limits: max 20 commits, max 50 files in the uncommitted list.
- Return data; decisions are made by the orchestrator.
