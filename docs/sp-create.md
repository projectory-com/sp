# Skill /sp-create

Skill factory for the sp plugin. Takes a description of a new skill and runs the full pipeline: task analysis, design with a mermaid diagram, implementation, quality validation, documentation integration.

A local skill — works when developing in the sp repository (`.claude/skills/sp-create/`), not part of the published plugin.

## Input

`$ARGUMENTS` — description of the skill: what it should do, usage examples, ticket URL, or file path.

```
/sp:sp-create a skill for automated code review with bug hunting
/sp:sp-create https://github.com/projectory-com/sp/issues/44
```

If the argument is empty, the skill asks for a description via AskUserQuestion.

## Phases

| Phase | Name          | What happens                                                         |
| ----- | ------------- | -------------------------------------------------------------------- |
| 0     | **Preflight** | Verify the run is from the sp project root                           |
| 1     | **Analyze**   | 2 parallel agents: task analysis + analysis of existing skills       |
| 2     | **Design**    | Name (kebab-case), architecture, mermaid flow diagram, plan          |
| 3     | **Confirm**   | Align the plan with the user (max 3 revision cycles)                 |
| 4     | **Implement** | Create SKILL.md, agents, reference files                             |
| 5     | **Validate**  | 2 parallel agents: prose check (elements-of-style) + structure check |
| 6     | **Integrate** | Documentation in docs/, update README.md and CLAUDE.md, format       |
| 7     | **Complete**  | Final summary + offer to commit via `/sp:gca`                        |

## Output

Full set of files for the new skill:

```
skills/<name>/
├── SKILL.md                # the main skill file
├── agents/                 # sub-agents (if needed)
│   └── <agent-name>.md
└── reference/              # templates and formats (if needed)
    └── <topic>.md
docs/<name>.md              # skill documentation
```

Updated README.md and CLAUDE.md with an entry for the new skill.

## Sub-agents

Agents are created inline (prompts in SKILL.md) and launched via the Agent tool with `subagent_type: general-purpose`.

| Agent              | Model  | Role                                                            |
| ------------------ | ------ | --------------------------------------------------------------- |
| Agent 1 (Analyze)  | sonnet | Task analysis: goal, triggers, input/output, phases, complexity |
| Agent 2 (Analyze)  | sonnet | Analysis of existing skills: patterns, conventions, templates   |
| Agent 3 (Validate) | sonnet | Prose check against elements-of-style rules                     |
| Agent 4 (Validate) | sonnet | Structure validation against skill-development best practices   |

## Example

```
/sp:sp-create a skill for auto-merging PRs after CI passes
```

Result: creates skill `/merge` in `skills/merge/`, documentation in `docs/merge.md`, and adds entries to README.md and CLAUDE.md.

## Connections

Local skill for sp development. Creates skills that become part of the pipeline:

```
/sp:sp-create → new skill in skills/
                ↓
/sp:gca → /sp:gp → /sp:pr → /sp:sp-release
```

`/sp:sp-create` creates skills; `/sp:sp-release` publishes them — together they form the plugin development cycle.
