---
name: sp-release
description: >-
  Publishing the sp plugin: quality checks, documentation validation, version bump,
  tag, push, GitHub release. Used when the user writes "release",
  "publish", "ship version", "make a release",
  "prepare a release", "new version".
---

# Release Orchestrator

You are the orchestrator for publishing the sp plugin. Run the pipeline without pauses between phases. Use AskUserQuestion only in Phase 2 and Phase 3a.

Run all bash commands and file operations yourself (not through agents), except for Phase 1 where 4 agents work in parallel.

---

## Input

`$ARGUMENTS` — optional: `patch`, `minor`, `major`, or a specific version (`1.8.0`).

---

## Pipeline

6 phases. Create a TodoWrite at the start:

```
[ ] Preflight: verify repository state
[ ] Quality: run quality checks
[ ] Review: agree on results with the user
[ ] Publish: bump, commit, tag, push
[ ] Release: create a GitHub release
[ ] Notify: send a notification
```

---

## Phase 0 — Preflight

Run the checks sequentially. On the first error — report and exit.

### 0a. Project root

```bash
test -f .claude-plugin/plugin.json
```

If the file is not found → report: "Run from the sp project root (the directory containing .claude-plugin/plugin.json).". Exit.

### 0b. main branch

```bash
git branch --show-current
```

If not `main` → report: "Release only from the main branch. Current branch: `<branch>`". Exit.

### 0c. Clean working tree

```bash
git status --porcelain
```

If not empty → report: "There are uncommitted changes. Commit or stash them before releasing." Show the list of files. Exit.

### 0d. GitHub CLI

```bash
gh auth status 2>&1
```

If there's an error → report: "Authenticate: `gh auth login`". Exit.

### 0e. Gather data

```bash
CURRENT_VERSION=$(jq -r .version .claude-plugin/plugin.json)
PREV_TAG=$(git tag --sort=-creatordate | head -1)
```

If `PREV_TAG` is empty — remember that there are no tags.

Gather commits since the last tag:

```bash
# If PREV_TAG exists
git log --oneline --no-merges ${PREV_TAG}..HEAD

# If there are no tags
git log --oneline --no-merges -30
```

Remember `CURRENT_VERSION`, `PREV_TAG`, `COMMITS` (list of commits).

Determine commit types by prefix (feat, fix, docs, chore, refactor, etc.). Remember `HAS_FEATURES` (whether there are feat commits).

If there are 0 commits → report: "No commits since the last release ($PREV_TAG). Nothing to publish." Exit.

TodoWrite: mark "Preflight" as done.

---

## Phase 1 — Quality Checks

Run 4 agents in parallel via the Agent tool (model: sonnet, subagent_type: general-purpose). All agents are read-only — they do not modify files.

### Agent 1 — Prose quality

Agent prompt:

> Check the text quality in the markdown files of the sp project. Work in the current directory.
>
> Read all files: `skills/*/SKILL.md` and `docs/*.md`.
>
> For each file, check the text (prose only, not code/yaml/tables) against the rules:
>
> 1. **Active voice** — "The agent gathers data" instead of "Data is gathered by the agent"
> 2. **Positive statements** — "Use X" instead of "Don't forget to use X"
> 3. **Concrete language** — avoid vague words: "various", "appropriate", "certain", "some"
> 4. **Extra words** — remove words that add no meaning: "in general", "essentially", "basically", "as such"
> 5. **Brevity** — phrases that can be shortened without losing meaning
>
> Do NOT check: YAML frontmatter, code blocks, tables, command lists.
> Language: match the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md.
>
> Return structured output:
>
> ```
> TOTAL_FILES: <number of checked files>
> ISSUES_COUNT: <total issue count>
> ISSUES:
>   - FILE: <path> | LINE: <quote up to 80 chars> | RULE: <rule number> | SUGGESTION: <how to fix>
>   - ...
> ```
>
> If there are no issues — `ISSUES_COUNT: 0` and an empty ISSUES.

### Agent 2 — Skill structure

Agent prompt:

> Check the structure of each skill in the `skills/` directory. Work in the current directory.
>
> For each `skills/<name>/`:
>
> 1. **Frontmatter**: read SKILL.md, verify the `name` and `description` fields are present in the YAML frontmatter. The `name` field must match the directory name.
> 2. **Trigger phrases**: the description must contain at least 3 concrete trigger phrases (words/expressions that activate the skill). Count them.
> 3. **Agents**: if SKILL.md references files in `agents/` — verify that the `agents/` directory exists and contains the mentioned files.
> 4. **Reference**: if SKILL.md references files in `reference/` — verify they are present.
> 5. **Examples**: if SKILL.md references files in `examples/` — verify they are present.
> 6. **Third-person**: the description must be in third person ("Used when...", not "Use when...").
>
> Return structured output:
>
> ```
> TOTAL_SKILLS: <number>
> ISSUES_COUNT: <total issue count>
> ISSUES:
>   - SKILL: <name> | CHECK: <check number> | DETAIL: <problem description>
>   - ...
> ```

### Agent 3 — Freshness of README and CLAUDE.md

Agent prompt:

> Reconcile README.md and CLAUDE.md with the actual project contents. Work in the current directory.
>
> Step 1: Get the list of all skills from the filesystem (`ls skills/`).
> Step 2: Get the list of all documentation files (`ls docs/*.md`).
> Step 3: Read README.md.
> Step 4: Read CLAUDE.md.
>
> Checks:
>
> 1. **README — skills**: each skill from `skills/` must have a section in README (heading `### /<name>`).
> 2. **README — links**: each skill section must contain `[More →](docs/<name>.md)`, and the file `docs/<name>.md` must exist.
> 3. **README — project structure**: the "Structure" section must contain all skill directories.
> 4. **CLAUDE.md — Implemented skills**: the section must list all skills from `skills/`.
> 5. **CLAUDE.md — Planned skills**: must not contain skills that are already implemented (present in `skills/`).
>
> Return structured output:
>
> ```
> SKILLS_ON_DISK: <comma-separated list>
> DOCS_ON_DISK: <comma-separated list>
> ISSUES_COUNT: <number>
> ISSUES:
>   - CHECK: <number> | DETAIL: <what's wrong, e.g. "skills/explore missing from README">
>   - ...
> ```

### Agent 4 — Freshness of SKILL.md instructions

Agent prompt:

> Verify that the instructions inside SKILL.md files reference existing files. Work in the current directory.
>
> For each `skills/<name>/SKILL.md`:
>
> 1. Read the contents of SKILL.md.
> 2. Find all file references: patterns `agents/<file>.md`, `reference/<file>.md`, `examples/<file>.md`, any relative paths to .md files.
> 3. For each reference found, verify that the file `skills/<name>/<reference>` exists on disk.
>
> Return structured output:
>
> ```
> TOTAL_SKILLS: <number>
> TOTAL_REFS: <total number of references found>
> MISSING_COUNT: <number of missing files>
> REFS:
>   - SKILL: <name> | REF: <path> | STATUS: <exists | missing>
>   - ... (only missing; if everything is fine — empty list)
> ```

Wait for all 4 agents to finish. Collect the results.

TodoWrite: mark "Quality" as done.

---

## Phase 2 — Review & Decide

Show the summary:

```
sp v<CURRENT_VERSION> — release preflight

Commits since <PREV_TAG>: <N>

Prose quality:        <N> issues
Skill structure:      <N> issues
Documentation:        <N> discrepancies
Links in SKILL.md:    <N> missing
```

### If issues > 0

Print the details of all issues, then AskUserQuestion:

- **Fix the issues** — the orchestrator fixes the found problems via the Edit tool, then re-runs only the failed agents to confirm
- **Continue with issues** — proceed to Phase 3
- **Cancel** — exit

If "Fix the issues" is chosen:

1. Fix the problems via the Edit tool (prose — rephrase, links — repair, README — extend).
2. Re-run only the agents whose checks had issues.
3. Show the updated summary.
4. If issues remain → repeat the AskUserQuestion (same options). Maximum 2 fix cycles, after which only "Continue" or "Cancel".

### If issues == 0

Report: "Checks passed, no issues." Transition to Phase 3.

TodoWrite: mark "Review" as done.

---

## Phase 3 — Publish

### 3a. Determine the version

If `$ARGUMENTS` contains `patch`, `minor`, `major`:
- `patch`: `X.Y.Z` → `X.Y.(Z+1)`
- `minor`: `X.Y.Z` → `X.(Y+1).0`
- `major`: `X.Y.Z` → `(X+1).0.0`

If `$ARGUMENTS` contains a specific version (format `N.N.N`) — use it.

Otherwise AskUserQuestion:

If `HAS_FEATURES = true`:

- **Minor (<computed>)** (Recommended) — there are new features
- **Patch (<computed>)**
- **Major (<computed>)**

If `HAS_FEATURES = false`:

- **Patch (<computed>)** (Recommended) — fixes and chore only
- **Minor (<computed>)**
- **Major (<computed>)**

Remember `NEW_VERSION`.

### 3b. Update the version

Update the version in 3 files via the Edit tool:

1. `.claude-plugin/plugin.json` — replace `"version": "<CURRENT_VERSION>"` with `"version": "<NEW_VERSION>"`
2. `.claude-plugin/marketplace.json` — replace `"version": "<CURRENT_VERSION>"` in the block with `"name": "sp"` with `"version": "<NEW_VERSION>"`
3. `package.json` — replace `"version": "<CURRENT_VERSION>"` with `"version": "<NEW_VERSION>"`

### 3c. Format

```bash
pnpm run format
```

### 3d. Commit

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json package.json
git commit -m "chore: bump version to <NEW_VERSION>"
```

No Co-Authored-By, no trailers.

If the commit fails (pre-commit hook) — run `pnpm run format`, re-stage the files, retry the commit.

### 3e. Tag

```bash
git tag -a v<NEW_VERSION> -m "v<NEW_VERSION>"
```

### 3f. Push

```bash
git push origin main && git push origin v<NEW_VERSION>
```

TodoWrite: mark "Publish" as done.

---

## Phase 4 — GitHub Release

Compose the release body from `COMMITS` (gathered in Phase 0).

### Body format

```markdown
## What's new

- **`/skill-name`** — description of the change (#PR)
- Other significant changes

## Full changelog

- <hash> <commit subject>
- <hash> <commit subject>
```

### Composition logic

- feat commits → expanded description in "What's new" (read the PR description or the commit for context)
- fix/refactor/docs/chore → bullet list in "Full changelog"
- Exclude the commit `chore: bump version to <NEW_VERSION>` from both sections

### Create the release

```bash
gh release create v<NEW_VERSION> --title "v<NEW_VERSION>" --notes "<BODY>"
```

Remember the release URL from the output.

TodoWrite: mark "Release" as done.

---

## Phase 5 — Complete + Notify

### 5a. Telegram notification

```bash
bash ./lib/notify.sh \
  --type STAGE_COMPLETE \
  --skill release \
  --phase Complete \
  --slug "v<NEW_VERSION>" \
  --title "sp v<NEW_VERSION> released" \
  --body "<RELEASE_URL>"
```

### 5b. Summary

Print:

```
sp v<NEW_VERSION> released

Commit: <hash> chore: bump version to <NEW_VERSION>
Tag: v<NEW_VERSION>
Release: <RELEASE_URL>
```

TodoWrite: mark "Notify" as done.

---

## Rules

- Work without pauses between phases. AskUserQuestion — only in Phase 2 and 3a.
- Phase 1 agents — read-only, do not modify files.
- One commit: all 3 version files in a single commit.
- No Co-Authored-By, Signed-off-by, or any trailers.
- On preflight error — exit, do not propose a fix.
- On publish error (commit/push/tag) — show the error and instructions for a manual fix.
- Language: match the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md. Commit messages and release notes — in English.
