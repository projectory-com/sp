# Report Format

Format of the output file `<slug>-report.md`. Written in Phase 6.

---

## Template

```markdown
# Report: <slug>

**Plan:** <path to the plan file>
**Mode:** <actual mode (inline | sub-agents)>
**Status:** ✅ complete | ⚠️ partial | ❌ failed

## Tasks

| #   | Task       | Status                | Commit    | Concerns          |
| --- | ---------- | --------------------- | --------- | ----------------- |
| 1   | <name>     | ✅ DONE               | `abc1234` | —                 |
| 2   | <name>     | ⚠️ DONE_WITH_CONCERNS | `def5678` | see below         |
| 3   | <name>     | ❌ BLOCKED            | —         | see below         |
| 4   | <name>     | ⏭️ SKIPPED            | —         | depends on Task 3 |
| 5   | Validation | ✅ DONE               | `ghi9012` | —                 |

## Post-implementation

| Step          | Status  | Commit    |
| ------------- | ------- | --------- |
| Simplify      | ✅ done | `aaa1111` |
| Cleanup       | ✅ done | `bbb2222` |
| Validate      | ✅ pass | —         |
| Documentation | ✅ done | `ccc3333` |
| Format        | ✅ done | `ddd4444` |

## Concerns

### Task 2: <name>

<concerns text from the sub-agent>

## Blocked

### Task 3: <name>

**Reason:** <block reason>
**Impact:** Task 4 skipped (depends on Task 3)

## Validation
```

npm run lint ✅
npm run type-check ✅
npm test ✅ (47 passed, 0 failed)
npm run build ✅

```

## Changes summary

| File | Action | Description |
|---|---|---|
| src/auth/forgot-password.ts | created | POST /auth/forgot-password handler |
| src/auth/reset-password.ts | created | POST /auth/reset-password handler |
| src/routes/auth.ts | modified | Added new routes |

## Commits

- `abc1234` feat(112-password-reset): forgot-password endpoint
- `def5678` feat(112-password-reset): reset-password endpoint
- `ghi9012` test(112-password-reset): endpoint tests
- `jkl3456` chore(112-password-reset): validation
- `aaa1111` refactor(112-password-reset): simplify
- `bbb2222` chore(112-password-reset): cleanup
- `ccc3333` docs(112-password-reset): update documentation
- `ddd4444` chore(112-password-reset): format
```

---

## Rules

- **Status** is derived from tasks:
  - All DONE → `✅ complete`
  - Some BLOCKED or SKIPPED, but the majority DONE → `⚠️ partial`
  - Majority BLOCKED → `❌ failed`
- **Concerns** and **Blocked** sections — only when there are matching tasks.
- **Changes summary** — collect from FILES_CHANGED of all sub-agents.
- **Commits** — chronological order, including post-implementation.
