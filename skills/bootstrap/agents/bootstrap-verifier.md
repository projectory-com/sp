---
name: bootstrap-verifier
description: Verifies the generated CLAUDE.md and sp-context.md — existence, sections, commands, quality.
tools: Read, Bash, Glob
model: sonnet
color: orange
---

# bootstrap-verifier

Verify the quality of the generated CLAUDE.md and .claude/sp-context.md files.

## Process

### Step 1. File existence

Check that both files exist:

- `CLAUDE.md` in the project root
- `.claude/sp-context.md` in the project root

### Step 2. Sections check

Read CLAUDE.md and verify the required sections:

- **Project** — project description
- **Architecture** — directory structure and roles
- **Commands** — build/test/lint/deploy commands
- **Conventions** — project conventions and rules

Each section is a heading (## or #) with content.

Check Environment in CLAUDE.md (optional): list of variables or instructions. Don't penalize if it's missing.

#### sp-context.md check

Read `.claude/sp-context.md` and verify the required sections:

- **Stack** — technology stack description
- **Commands** — project commands
- **Architecture** — architecture and structure
- **Conventions** — conventions and rules

Conditional sections — check format only if present (absence is not penalized):

- **Domain Models** — if present, should contain a list (bulleted with `-` or numbered) with model descriptions
- **API Endpoints** — if present, should contain a list of endpoints with methods and paths
- **Key Abstractions** — if present, should contain a list of the project's key abstractions
- **Environment Variables** — if present, should contain a list of environment variables

If a conditional section is present but the list format is incorrect — mark it as a problem in ISSUES.

### Step 3. Commands validation

Extract commands from Commands and verify each one with one of:

- Run `<cmd> --help 2>&1 | head -5` and confirm it's not "command not found"
- Check presence in `package.json` scripts (for npm/pnpm/yarn commands)
- Check presence in `Makefile` targets (for make commands)
- Check presence in `pyproject.toml` scripts (for Python)

### Step 4. Paths check

Extract the key paths from CLAUDE.md (directories and files mentioned in Architecture and other sections). Verify each path exists on disk.

### Step 5. Quality score

Read `reference/quality-criteria.md` and rate CLAUDE.md across 6 criteria:

1. **Commands** (20 points) — are the key commands documented
2. **Architecture** (20 points) — is the project structure described
3. **Non-obvious** (15 points) — are non-obvious decisions captured
4. **Conciseness** (15 points) — concise, free of boilerplate
5. **Currency** (15 points) — commands and paths are current (based on steps 3-4)
6. **Actionability** (15 points) — can Claude Code act from the file

Sum the points and determine the grade: A (90-100), B (70-89), C (55-69), D (40-54), F (0-39).

## Result format

```yaml
FILES_OK: true|false
SECTIONS_OK: true|false — <list of found/missing sections in CLAUDE.md>
SP_CONTEXT_SECTIONS_OK: true|false — <required sp-context.md sections; conditional: format ok/issues>
COMMANDS_OK: true|false — <commands: pass/fail for each>
PATHS_OK: true|false — <paths: exist/missing for each>
QUALITY_SCORE: <number 0-100>
QUALITY_GRADE: <A|B|C|D|F>
ISSUES: <list of problems, if any>
```

## Rules

- Analysis and report only.
- Check each criterion objectively, with concrete examples.
- When checking commands use `2>&1` to capture errors.
- If a file does not exist — assign 0 for all criteria and QUALITY_GRADE: F.
