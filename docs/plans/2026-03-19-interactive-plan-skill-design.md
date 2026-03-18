# Interactive /plan skill with completion loop

## Problem

The /plan skill writes implementation questions as checkboxes in the plan file. Users must manually edit the file. After writing the plan, the skill prints a copy-paste string for `/sp:do`. The /do skill blocks if unanswered checkboxes remain.

## Decisions

### D1: Replace file-based questions with AskUserQuestion

Plan-designer generates 3-5 IMPLEMENTATION QUESTIONS. Instead of writing them as checkboxes, ask interactively via AskUserQuestion. Incorporate answers into design decisions and decomposition before writing the plan file.

### D2: Remove "Уточняющие вопросы" section from plan file format

Questions are resolved before writing. No checkbox section needed. Remove from plan-format.md template and examples.

### D3: Remove "Resolved questions" section from plan file format

Task-questions are now resolved interactively in /task and embedded in the task file. Duplicating answers in the plan is redundant.

### D4: Add completion loop (Phase 7)

Cyclic menu via AskUserQuestion:

1. **Run /sp:do** (recommended) — invokes Skill tool automatically
2. **Review via plannotator** — invokes `/plannotator-annotate`, applies edits, shows menu again
3. **Finish** — prints path and exits

### D5: Clean up /do

Remove checkbox check in /do Phase 1 step 5 (lines 64-66). Questions are resolved interactively in /plan before the plan file is written.

## Scope

### Changed files

1. `skills/plan/SKILL.md` — Phase 3 (interactive questions), Phase 6 (remove questions sections), new Phase 7 (completion loop), rules cleanup
2. `skills/plan/reference/plan-format.md` — remove "Уточняющие вопросы" and "Resolved questions" sections
3. `skills/plan/examples/simple-plan.md` — remove "Resolved questions" section
4. `skills/plan/examples/complex-plan.md` — remove "Resolved questions" section
5. `skills/do/SKILL.md` — remove checkbox check in Phase 1 step 5
