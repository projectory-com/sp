---
name: polish
description: Polish changed files before review - simplify code, format with Prettier, fix ESLint issues
user-invocable: true
---

# Polish Code Before Review

Run this skill after completing a feature/bugfix to clean up all changed files.

## Steps

### 1. Get Changed Files

First, identify files changed relative to main branch:

```bash
# Get both committed and uncommitted changes
git diff --name-only main...HEAD
git diff --name-only
```

Filter to only code files: `.ts`, `.tsx`, `.js`, `.jsx`

If no files found, report "No code files to polish" and stop.

### 2. Run Code Simplifier

For each changed file, use the Task tool with `subagent_type: "code-simplifier:code-simplifier"` to simplify and improve readability. Process files in parallel when possible.

Track results: files processed, files skipped, errors.

### 3. Run Prettier

Format all files at once:

```bash
pnpm exec prettier --write <file1> <file2> ...
```

Track result: success/failure.

### 4. Run ESLint

Fix lint issues:

```bash
pnpm exec eslint --fix <file1> <file2> ...
```

Track result: issues fixed, issues remaining.

### 5. Report Summary

Show final summary with status of each step:

- ✅ Success
- ⚠️ Partial (some issues remain)
- ❌ Failed

List all processed files and any manual actions needed.
