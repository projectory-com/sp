# Skill /pr

Creates or updates a GitHub Pull Request. Builds the description from sp flow artifacts
(review + report), targeting what reviewers need to check. Without artifacts, falls back
to commits and diff. Supports PR templates, auto-labels, and update markers.

## Input

`$ARGUMENTS` (optional) — flags: `--draft`, `--base <branch>`.

```
/sp:pr
/sp:pr --draft
/sp:pr --base develop
```

## Phases

| Phase | Name         | What happens                                                                         |
| ----- | ------------ | ------------------------------------------------------------------------------------ |
| 1     | **Collect**  | Sub-agent collects: branch, slug, PR, review/report files, template, commits, labels |
| 2     | **Decide**   | Orchestrator: blocking errors, create vs update, draft, DATA_SOURCE                  |
| 3     | **Generate** | Sub-agent synthesizes the PR body from review/report or fallback                     |
| 4     | **Execute**  | Orchestrator: `gh pr create` or `gh pr edit`, labels                                 |
| 5     | **Next**     | Orchestrator: completion                                                             |

## Data sources (DATA_SOURCE)

| Source       | Condition             | PR body contents                                                  |
| ------------ | --------------------- | ----------------------------------------------------------------- |
| `sp_full`    | review + report found | Summary, Attention, Design decisions, Questions, Risks, Test plan |
| `sp_partial` | report only           | Summary, Test plan, Changes, Commits                              |
| `fallback`   | no sp artifacts       | Summary from commits, Changes, Commits, generic Test plan         |

## PR body

The skill wraps generated content in `<!-- sp:start -->` / `<!-- sp:end -->` markers.
On update, the skill replaces only the content between the markers and preserves the user's text.

Principle: the description answers "what to check during review".

## Auto-link and auto-labels

Ticket ID from slug: `86-feature` → `Closes #86`, `R2-208-feature` → `Ticket: R2-208`.

Labels from commit types: `feat` → `enhancement`, `fix` → `bug`, `refactor` → `maintenance`.
Only labels that exist in the repository are applied.

## Sub-agents

| Agent               | Model  | Role                                                        |
| ------------------- | ------ | ----------------------------------------------------------- |
| `pr-data-collector` | haiku  | Collects data: PR, review/report, template, commits, labels |
| `pr-body-generator` | sonnet | Synthesizes the PR body from artifacts (reasoning task)     |

## Example

```
/sp:pr
```

Result: a PR on GitHub with a structured description from review and report.

## Connections

Typical flow: `/task` → `/plan` → `/do` → `/review` → `/gca` → `/gp` → `/pr`.
Works standalone — creates a PR from commits without sp artifacts.
Uses `reference/pr-body-format.md` for body format and section mapping.
