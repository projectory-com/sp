# Report Format

Формат выходного файла `<slug>-report.md`. Записывается в Фазе 7.

---

## Шаблон

```markdown
# Report: <slug>

**Plan:** <путь к plan-файлу>
**Mode:** <фактический mode (inline | sub-agents)>
**Status:** ✅ complete | ⚠️ partial | ❌ failed

## Tasks

| #   | Task       | Status                | Commit    | Concerns          |
| --- | ---------- | --------------------- | --------- | ----------------- |
| 1   | <название> | ✅ DONE               | `abc1234` | —                 |
| 2   | <название> | ⚠️ DONE_WITH_CONCERNS | `def5678` | см. ниже          |
| 3   | <название> | ❌ BLOCKED            | —         | см. ниже          |
| 4   | <название> | ⏭️ SKIPPED            | —         | depends on Task 3 |
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

### Task 2: <название>

<текст concerns от sub-agent'а>

## Blocked

### Task 3: <название>

**Reason:** <причина блокировки>
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

## Правила

- **Status** определяется по tasks:
  - Все DONE → `✅ complete`
  - Есть BLOCKED или SKIPPED но большинство DONE → `⚠️ partial`
  - Большинство BLOCKED → `❌ failed`
- Секции **Concerns** и **Blocked** включаются только если есть соответствующие tasks.
- **Changes summary** — собирается из FILES_CHANGED всех sub-agent'ов.
- **Commits** — в хронологическом порядке, включая post-implementation.
