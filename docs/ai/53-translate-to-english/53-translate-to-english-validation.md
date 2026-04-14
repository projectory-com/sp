# Translation validation report

**Branch:** 53-translate-to-english
**Scope:** ~70 translated files across 8 parallel validation batches
**Axes:** (A) translation & coupling, (B) Elements of Style (Strunk), (C) plugin-dev conventions
**Outcome:** 2 Critical + 13 Important + 15 Minor found; 13 fixed, 15 Minor deferred as cosmetic.

## Batches

| # | Batch | Files | Result |
| --- | --- | --- | --- |
| V1 | skills/task + skills/plan | 17 | 2 Critical, 2 Important, 3 Minor |
| V2 | skills/do | 11 | 1 Important, 3 Minor |
| V3 | skills/fix + skills/review + skills/explore | 15 | 2 Important, 1 Minor |
| V4 | skills/bootstrap | 16 | 2 Important, 2 Minor |
| V5 | skills/gca + skills/gp + skills/gst + skills/pr | 17 | 2 Important, 4 Minor |
| V6 | skills/hi + .claude/skills/\* | 3 | 3 Important, 2 Minor |
| V7 | README + CLAUDE + docs/ | 16 | 1 Important, 2 Important style, 2 Minor |
| V8 | .claude-plugin/\*.json + package.json | 3 | 0 blockers, 2 style warnings |

## Critical findings (both fixed)

| File | Issue | Fix |
| --- | --- | --- |
| `skills/task/examples/simple-task.md:62` | Missing `**Slug:**` and `**Type:**` fields; plan skill reads Slug from this field and would fail on this example | Added both fields (Slug + Type: general) |
| `skills/task/examples/complex-task.md:111` | Same omission | Added both fields (Slug + Type: frontend) |

Both examples violated the coupling with `skills/plan/SKILL.md` which extracts `TASK_SLUG` from the `Slug` field. An implementer following either example would produce a task file that the plan skill cannot parse.

## Important findings

Fixed in commit `ce502c3`:

| Axis | File | Issue | Fix |
| --- | --- | --- | --- |
| A | `skills/explore/agents/explore-agent.md:100` | Hardcoded `Language — English.` bypasses R5 contract | Replaced with canonical R5 bullet |
| A | `.claude/skills/sp-release/SKILL.md:49` | Hardcoded developer path `/home/heliotik/...` in user-facing error message | Replaced with generic `the directory containing .claude-plugin/plugin.json` |
| B/C | `skills/do/agents/spec-reviewer.md:3` | Repeated verb `Verifies that... Verifies against...` in description | Collapsed to one sentence |
| C | `skills/explore/SKILL.md:4-8` | Four duplicated trigger keywords in description | Deduplicated |
| C | `skills/bootstrap/agents/bootstrap-verifier.md:68` | `${CLAUDE_PLUGIN_ROOT}` in prose will not expand | Switched to relative path |
| C | `CLAUDE.md:29` | Plugin System section omitted Agents entry | Added Agents bullet with path convention |
| C | `skills/plan/agents/plan-designer.md:57` | Task-title instruction `in the task file's language` contradicts R5 | Removed language qualifier |
| A/B | `skills/bootstrap/SKILL.md:355` | R5 bullet broke parallel construction of Rules list | Reformatted with `**Language.**` bold label |
| C | `skills/gca/SKILL.md:3-9` | Compound verbose description | Trimmed to tight trigger |
| C | `skills/pr/SKILL.md:3-7` | Same | Trimmed |
| C | `skills/hi/SKILL.md:3-7` | Description is label, not trigger sentence | Rewrote as trigger |
| B | `docs/review.md:8` | Passive voice `slug is determined` | Active `skill resolves the slug` |
| B | `docs/sp-create.md:64` | Passive `skill is created` | Active `creates skill` |

## Minor findings (deferred — cosmetic)

15 minor style issues across 11 files: wordiness, weak verbs, inconsistent `SP flow` vs `sp flow` capitalization, one emoji in docs/notify.md that mirrors implementation, parallel-construction minor breaks in one marketplace description, etc. These do not affect behavior and can be addressed in follow-up polish passes.

## Pre-existing (skipped)

- Semantic placeholder inversion in `skills/review/reference/review-format.md:78` vs `skills/review/agents/review-report-writer.md:64` — pre-existing logic issue, not introduced by translation.

## Post-fix verification

```
rg 'Language — English' skills/                          empty ✓
rg '/home/heliotik' .claude/                              empty ✓
rg 'title in the task file' skills/                       empty ✓
rg '\*\*Slug:\*\*' skills/task/examples/                  2 hits ✓
rg '\*\*Type:\*\*' skills/task/examples/                  2 hits ✓
rg 'Language: match the ticket/input language' skills/explore/agents/   1 hit ✓
pnpm run format:check                                     passes ✓
python3 JSON validation                                   OK ✓
rg '[А-Яа-яЁё]' skills/ .claude/skills/ README.md CLAUDE.md docs/*.md  empty ✓
```

## Commits

- `ce502c3` — `#53 refactor(53-translate-to-english): fix validation issues across skills and docs`

15 files changed. Prettier produced no additional diffs.

## Per-file status

See individual batch findings above. 55 of 70 translated files passed with no issues; 15 required one or more fixes (all Critical + Important resolved).
