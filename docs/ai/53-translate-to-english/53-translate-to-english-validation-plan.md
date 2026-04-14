# Translation validation plan

**Branch:** 53-translate-to-english
**Scope:** every file modified in commits `31c50d0..08f660d` (~70 files translated, plus artifacts).

## Validation axes

For each file (or family), a validator checks three axes:

### A. Translation & coupling

- No Cyrillic characters anywhere (`rg '[А-Яа-яЁё]'` on file is empty).
- YAML frontmatter `name:` byte-identical to pre-translation.
- `description:` field translated to a natural English trigger phrase.
- Code identifiers, paths, slash-command names, structured-output field names (TICKET_ID, TASK_SLUG, BRANCH, STATUS, etc.), em-dashes, code block contents preserved.
- Coupled labels consistent: `Complexity`, `Decision`, `Rationale`, `Alternative` (no legacy Russian forms).
- R5 language rule (where applicable): exact canonical bullet present.
- Cross-references to sibling files (`agents/*.md`, `reference/*.md`, `${CLAUDE_PLUGIN_ROOT}/...`) still resolve to existing paths.

### B. Elements of Style (Strunk, via skill `elements-of-style:writing-clearly-and-concisely`)

- **Active voice** — flag passive constructions ("is done by", "was written by") where they weaken the sentence.
- **Omit needless words** — flag phrases like "the fact that", "it is important to note that", "in order to", "due to the fact that".
- **Use definite, specific, concrete language** — flag vague nouns ("things", "stuff") and hedges ("kind of", "rather", "somewhat").
- **Put statements in positive form** — flag unnecessary "not un-X" or "not dissimilar" constructions.
- **Parallel construction** — flag lists and series whose items have inconsistent grammatical structure.
- **Imperative mood** for orchestrator instructions and rules — flag descriptive statements that should be direct commands.

### C. Plugin-dev conventions (via `plugin-dev:skill-development`, `plugin-dev:agent-development`, `plugin-dev:command-development`)

- **SKILL.md frontmatter**: `name` (kebab-case identifier) + `description` that explains _when to activate_ the skill (trigger phrase style, not a generic feature description).
- **Agent frontmatter**: `name` (kebab-case) + `description` usable for dispatch matching.
- **Progressive disclosure**: skills reference their agents/references by relative path, not by inlining content.
- **`${CLAUDE_PLUGIN_ROOT}`** usage: correct for absolute-path references to sibling plugin resources (hooks, MCP, cross-skill agent paths).
- **`$ARGUMENTS` placeholder** (commands only): used correctly.
- **No emojis** in source unless the user requested them (sp style).
- **Kebab-case** file and directory names.

## Validation groups

Eight parallel validation batches. Each batch dispatches one agent covering the listed files.

| # | Batch | Files | Count |
| --- | --- | --- | --- |
| V1 | task + plan family | `skills/task/**/*.md`, `skills/plan/**/*.md` | 17 |
| V2 | do family | `skills/do/**/*.md` | 11 |
| V3 | fix + review + explore | `skills/fix/**/*.md`, `skills/review/**/*.md`, `skills/explore/**/*.md` | 15 |
| V4 | bootstrap family | `skills/bootstrap/**/*.md` | 16 |
| V5 | gca + gp + gst + pr | `skills/gca/**/*.md`, `skills/gp/**/*.md`, `skills/gst/**/*.md`, `skills/pr/**/*.md` | 17 |
| V6 | hi + local dev skills | `skills/hi/SKILL.md`, `.claude/skills/sp-create/SKILL.md`, `.claude/skills/sp-release/SKILL.md` | 3 |
| V7 | README + CLAUDE + docs | `README.md`, `CLAUDE.md`, `docs/*.md` | 16 |
| V8 | JSON metadata | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json` | 3 |

Total: 98 validation units across 70 unique files (some appear in multiple axes).

## Issue severity

- **Critical** — translation incomplete (Cyrillic remains), coupling broken, frontmatter `name:` changed, cross-reference broken.
- **Important** — R5 rule missing or malformed, structural sp-convention violation, passive voice in imperative prompt, ambiguous description frontmatter.
- **Minor** — wordiness, weak verbs, stylistic inconsistency, cosmetic arrow/dash issues.

## Output

Each validator returns a table of issues with `severity`, `file:line`, `axis` (A/B/C), `description`, `fix_hint`. Orchestrator aggregates into `docs/ai/53-translate-to-english/53-translate-to-english-validation.md`.
