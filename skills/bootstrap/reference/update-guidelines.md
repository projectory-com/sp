# CLAUDE.md update guidelines

What to include, what to exclude, red flags, and idempotency rules.

## Include

### Project-specific facts

- Exact build/test/lint/deploy commands, verified in the project
- Directory structure with roles (not a general framework description)
- Paths to key files: entry point, config, types
- Env vars required to run (without secret values)
- Runtime versions (Node 20, Python 3.12) if important for compatibility
- Non-obvious decisions: workarounds, gotchas, "why this way"

### Commands

- Each command is copyable and runnable as-is
- For commands with arguments — an example with a real value
- The `#` comment explains what it does, without repeating the command

```
# Good
npm run test:unit -- --watch    # tests in watch mode
npx prisma migrate dev          # apply migrations to the dev DB

# Bad
npm test    # run npm test
```

### Conventions

- Only what distinguishes this project from framework defaults
- Commit format, if non-standard
- Branching strategy, if non-standard
- Naming conventions, if they differ from language defaults

## Exclude

### Generic advice

Remove claims that are true for any project:

- "Write clean, maintainable code"
- "Follow SOLID principles"
- "Add tests for new features"
- "Use meaningful variable names"
- "Handle errors properly"

### Obvious from context

- Description of a programming language ("JavaScript is a dynamic language")
- Description of standard tools ("npm is a package manager")
- Framework tutorial ("React uses components")

### Temporary data

- TODO lists and plans (use issues/tasks)
- "Currently working on X" (will become stale)
- Last update dates (git log will show them)

## Red flags

Signs of a problematic CLAUDE.md:

| Red flag                             | Problem                                   | Fix                                  |
| ------------------------------------ | ----------------------------------------- | ------------------------------------ |
| File > 300 lines                     | Exceeds Claude's context window           | Move details into docs/              |
| Unverified commands                  | May not work                              | Run each before recording            |
| "Don't modify X" without a reason    | Unclear why, people will violate it       | Add the reason                       |
| Duplicating README                   | README is for humans, CLAUDE.md for Claude | Remove the overlap                   |
| Listing every project file           | Noise, Claude sees files via tools        | Keep only the key ones               |
| Generic coding guidelines            | Don't help, take up context               | Remove entirely                      |
| IDE instructions (VSCode settings)   | Claude doesn't use an IDE                 | Remove or move them out              |

## Idempotency rules

On re-running bootstrap against the same project, CLAUDE.md must not grow uncontrollably.

### Principles

1. **Merge, not append** — if a section exists, update its content, don't duplicate the section
2. **Check before writing** — read the current CLAUDE.md, compare against the new data
3. **Don't lose manual edits** — preserve user-added sections on update
4. **Determinism** — the same project yields the same result on re-run

### Update algorithm

```
1. Read the current CLAUDE.md
2. For each section:
   a. Section exists and is current → don't touch
   b. Section exists but is outdated → update the content
   c. Section missing → add it in the right place
   d. Section exists but is user-added (not from the template) → preserve
3. Remove duplicates
4. Verify that commands work
```

### Markers of user content

Sections added by the user (not from the bootstrap template) are preserved on update. Identified by headings not present in the template.
