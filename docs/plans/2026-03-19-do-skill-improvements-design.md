# /do skill improvements

## Problems

1. Sequential tasks don't get individual commits — only parallel tasks do
2. Validate phase runs via Bash directly instead of sub-agent
3. CLI commands with long output flood the context
4. No completion loop at the end (review suggestion)

## Decisions

### D1: Orchestrator guarantees commit after review loop

Add explicit step 6 in Phase 2 after review loop: check `git status`, commit uncommitted changes. This ensures every task (sequential or parallel) gets its own commit.

### D2: Validate via sub-agent

Replace Phase 4 Bash-based validation with sub-agent dispatch. Create `agents/validator.md` agent. Sub-agent determines commands from package.json, runs them, fixes failures, commits fixes.

### D3: Limit CLI output with `2>&1 | tail -20`

Add rule to SKILL.md and sub-agent prompts: all commands with potentially long output (formatter, lint, build, test) must use `2>&1 | tail -20`.

### D4: Completion loop (Phase 7)

After report and notification — AskUserQuestion cycle:

1. Run /sp:review (recommended) → Skill tool
2. Review via plannotator → Skill tool → apply edits → loop
3. Finish → exit

## Scope

### Changed files

1. `skills/do/SKILL.md` — Phase 2 (commit guarantee), Phase 4 (sub-agent), Phase 6 (format tail), new Phase 7 (completion loop), rules
2. `skills/do/agents/task-executor.md` — add `2>&1 | tail -20` rule
3. `skills/do/agents/code-polisher.md` — add `2>&1 | tail -20` rule
4. New: `skills/do/agents/validator.md` — validation sub-agent
