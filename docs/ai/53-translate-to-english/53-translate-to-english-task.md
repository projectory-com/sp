# Translate sp plugin content to English

**Slug:** 53-translate-to-english
**Тикет:** https://github.com/projectory-com/sp/issues/53
**Сложность:** complex
**Тип:** general

## Task

Translate all Russian-language content in the sp plugin (~4,400 lines across ~70 files) to English in a single atomic PR, keeping structural couplings (field labels, trigger phrases, embedded strings) consistent across consumers and producers.

## Context

### Архитектура области

Plugin ships three content layers that reference each other:

1. **Skills** (`skills/<name>/SKILL.md`) — 12 user-facing + 2 local (`.claude/skills/sp-create`, `.claude/skills/sp-release`). Frontmatter `description` is the activation heuristic. Body is LLM prompt.
2. **Agents** (`skills/<name>/agents/*.md`) — 24 subagents dispatched from SKILL.md via Agent tool. Frontmatter `description` drives dispatch matching. Body is subagent prompt.
3. **References & examples** (`skills/<name>/reference/*.md`, `skills/<name>/examples/*.md`) — format specs and sample artifacts consumed by agents during execution.

Data flow between skills uses **field labels in artifact files** as the contract: `/task` writes `docs/ai/<slug>/<slug>-task.md` with `**Сложность:**`; `/plan` reads `«Сложность»` at `skills/plan/SKILL.md:41` to extract `TASK_COMPLEXITY`. This is the only hard-coupled field — `Slug` is already English, `Complexity` in plan output already English, `/do` reads `«Complexity»` from plan files (decoupled).

Shell scripts (`lib/notify.sh`, `hooks/notify.sh`, `hooks/hooks.json`) and CI tooling (Prettier, Husky) are language-agnostic — no behavior depends on content language.

### Файлы для изменения

**SKILL.md — 14 files (1,341 Russian lines):**

- `skills/task/SKILL.md` (292), `skills/plan/SKILL.md` (311), `skills/do/SKILL.md` (303)
- `skills/fix/SKILL.md` (287), `skills/pr/SKILL.md` (160), `skills/gp/SKILL.md` (156)
- `skills/explore/SKILL.md` (149), `skills/hi/SKILL.md` (141), `skills/gca/SKILL.md` (133)
- `skills/review/SKILL.md` (91), `skills/gst/SKILL.md` (21), `skills/bootstrap/SKILL.md`
- `.claude/skills/sp-create/SKILL.md` (442), `.claude/skills/sp-release/SKILL.md` (403)

**Agents — 24 files (931 Russian lines):** all `skills/*/agents/*.md`

**References — 13 files (673 Russian lines):** all `skills/*/reference/*.md`

**Examples — 4 files (310 Russian lines):** all `skills/*/examples/*.md`

**Docs — 12 files (810 Russian lines):** `docs/*.md` (notify.md, do.md, gp.md, gca.md, task.md, plan.md, pr.md, fix.md, review.md, gst.md, explore.md, hi.md)

**Root content — 2 files:** `README.md` (238), `CLAUDE.md` (88)

**Metadata — 3 files:** `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json` (description fields only)

### Coupled pairs (must change atomically)

- `skills/task/SKILL.md:189` (`**Сложность:**`) + `skills/plan/SKILL.md:41` (`поля «Сложность»`) + `skills/task/examples/simple-task.md:63` + `skills/task/examples/complex-task.md:112` + `skills/plan/examples/simple-plan.md:16` + `skills/plan/examples/complex-plan.md:17` — rename all to `Complexity` in the same commit.
- `skills/plan/reference/plan-format.md:21-23` (`**Решение:**` / `**Обоснование:**` / `**Альтернатива:**`) — plan-designer reproduces these labels verbatim into output. Rename in format spec, examples, and agent prompts together.

### Паттерны для повторения

- Frontmatter format (unchanged): `name` identifier stays as-is, `description` field gets English trigger phrases. Keep YAML structure byte-identical except for string values.
- Section header convention: Russian `## Фаза N`, `## Вход`, `## Правила` → English `## Phase N`, `## Input`, `## Rules` (standard English in docs already established in `skills/gca/reference/commit-convention.md`).
- Commit messages are already mandated English in `skills/gca/reference/commit-convention.md:15`.
- Trigger phrases must be natural English imperatives, not literal translations: `построй план` → `build a plan` / `plan`, `закоммить` → `commit changes` / `commit`.
- Field-label convention for artifacts: English ASCII in `**Label:**` form.

### Тесты

No content-aware tests exist. No `.github/` CI directory. Validation surface:

- `pnpm run format:check` — Prettier, language-agnostic, will continue to pass.
- `python3 -c "import json; ..."` JSON manifest check — validates syntax only.
- `.husky/pre-commit` — runs `npx lint-staged` (Prettier on staged files).
- Manual smoke test of skills `/hi`, `/task`, `/plan`, `/do`, `/gca`, `/gp`, `/pr` via `claude --plugin-dir .`.

## Requirements

1. Translate all Russian prose in the file list above to natural, imperative, technical English matching the existing style.
2. Replace `**Сложность:**` field with `**Complexity:**` in task template (`skills/task/SKILL.md`), both example task files, both example plan files, and update `skills/plan/SKILL.md:41` to extract from `«Complexity»`.
3. Replace `**Решение:**` / `**Обоснование:**` / `**Альтернатива:**` labels in `skills/plan/reference/plan-format.md` with `**Decision:**` / `**Rationale:**` / `**Alternative:**`, and propagate to `skills/plan/examples/*.md` and the plan-designer agent prompt.
4. Translate all frontmatter `description` fields in SKILL.md and agent files to natural English trigger phrases. Keep `name` identifiers as-is.
5. In the 4 SKILL.md files containing `Язык контента — русский` (`skills/fix/SKILL.md`, `skills/review/SKILL.md`, `skills/explore/SKILL.md`, `skills/bootstrap/SKILL.md`), replace the rule with: `Language: match the ticket/input language, or follow project-level definition in CLAUDE.md/AGENTS.md`.
6. Translate embedded strings inside SKILL.md prompts: `notify.sh --title` and `--body` values, commit message templates like `docs(SLUG): add task definition`, example values inside templates.
7. Translate section headers (`## Фаза N`, `## Вход`, `## Правила`, `### Архитектура области`, `### Файлы для изменения`, `### Паттерны для повторения`, `### Тесты`, `## Материалы`) to their standard English equivalents consistently across skills, agents, references, examples, and docs.
8. Translate `README.md`, `CLAUDE.md`, all `docs/*.md` files.
9. Update `description` strings in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`.
10. Deliver as a single atomic PR on branch `53-translate-to-english`, matching issue #53.

## Constraints

- Do NOT modify `_skills/` directory (drafts, out of scope).
- Do NOT modify `docs/ai/` contents except this task file itself (ephemeral artifacts; `.gitignore` check applies per `/task` phase 5).
- Do NOT modify shell scripts (`lib/notify.sh`, `hooks/notify.sh`, `hooks/hooks.json`) — already English.
- Do NOT change YAML frontmatter `name` identifiers in any SKILL.md or agent file — only translate `description` values.
- Do NOT change skill/command paths or slash-command names (`/task`, `/plan`, `/do`, `/gca`, `/gp`, `/pr`, `/gst`, `/fix`, `/hi`, `/explore`, `/bootstrap`, `/review`).
- Do NOT translate code blocks beyond their comments and string literals; keep identifiers, variable names, and structured-output field names (`TICKET_ID`, `TASK_SLUG`, `TASK_COMPLEXITY`, `BRANCH`, `PUSH_STATUS`, etc.) unchanged.
- Do NOT split into phased PRs — single atomic delivery avoids the broken intermediate state where a Russian skill dispatches an English agent (or vice versa).
- Do NOT introduce an i18n/l10n framework — single-language plugin, English only.
- Do NOT leave bilingual duplicates — replace Russian with English, do not append.
- Do NOT rename files or directories; translation is content-only.
- Do NOT add or remove sections; preserve document structure section-for-section.

## Verification

- `pnpm run format:check` → exits 0 (no formatting regressions).
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); json.load(open('package.json')); print('OK')"` → prints `OK`.
- `grep -rP '[А-Яа-яЁё]' skills/ .claude/skills/ docs/ README.md CLAUDE.md .claude-plugin/ package.json --include='*.md' --include='*.json' -l` → returns nothing (no Russian Cyrillic remaining in scoped files).
- `head -1 skills/*/SKILL.md .claude/skills/*/SKILL.md commands/*.md` → every line is `---` (frontmatter structure preserved).
- `grep -l 'Сложность' skills/ -r` → empty (field-label rename complete).
- `grep -l 'Язык контента — русский' skills/ -r` → empty (language rule updated in all 4 skills).
- Manual smoke: `claude --plugin-dir .` then invoke `/hi` — skill activates on English trigger and responds in English.
- Manual smoke: run `/task` with a sample ticket → produces task file with `**Complexity:**` label.
- Manual smoke: feed the task file to `/plan` → plan-skill extracts `TASK_COMPLEXITY` without error and produces plan with `**Decision:**` / `**Rationale:**` / `**Alternative:**` labels.
- Manual smoke: all other skills (`/do`, `/gca`, `/gp`, `/pr`, `/gst`, `/fix`, `/explore`, `/review`, `/bootstrap`) activate on English trigger phrases and produce English output.
- Edge case: task file generated before this change (Russian labels in `docs/ai/`) is out of scope — regeneration not required per constraint.

## Материалы

- [GitHub issue #53](https://github.com/projectory-com/sp/issues/53)
- `skills/task/SKILL.md` — upstream source of task template (field labels)
- `skills/plan/SKILL.md:41` — downstream consumer of `Complexity` field
- `skills/plan/reference/plan-format.md:19-24` — plan output contract
- `skills/gca/reference/commit-convention.md:15` — English-commit mandate (already in place)
- `skills/fix/SKILL.md`, `skills/review/SKILL.md`, `skills/explore/SKILL.md`, `skills/bootstrap/SKILL.md` — `Язык контента` rule sites
- `skills/task/examples/simple-task.md`, `skills/task/examples/complex-task.md` — task artifact examples
- `skills/plan/examples/simple-plan.md`, `skills/plan/examples/complex-plan.md` — plan artifact examples
- `CLAUDE.md` — project conventions (update language note)
- `README.md` — user-facing entry point
