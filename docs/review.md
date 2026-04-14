# Skill /review

Prepares a code review report. Analyzes changes against origin/main via a sub-agent
and produces a report with key areas, complex decisions, risks, and questions for the reviewer.

## Input

`$ARGUMENTS` — task slug or path to a task file. When no argument is provided, the skill resolves the slug
from the branch or the latest directory under `docs/ai/`.

```
/sp:review 86-black-jack-page
/sp:review docs/ai/86-black-jack-page/86-black-jack-page-task.md
/sp:review
```

## Phases

| Phase | Name         | What happens                                                                           |
| ----- | ------------ | -------------------------------------------------------------------------------------- |
| 1     | **Parse**    | Resolve SLUG and TICKET_ID from arguments, task file path, or branch name              |
| 2     | **Analyze**  | Sub-agent `review-analyzer` collects git data and analyzes changes across 7 dimensions |
| 3     | **Commit**   | Auto-commit the artifact: `TICKET docs(SLUG): add review report`                       |
| 4     | **Complete** | Output the path to the review file                                                     |

## Output

File `docs/ai/<slug>/<slug>-review.md` with 7 sections:

- **Context and goal** — the task, what was implemented
- **Commits and files** — commit list, affected files with stats
- **Key areas** — code that needs close attention
- **Complex decisions** — architectural and technical decisions with rationale
- **Questions for the reviewer** — items that require discussion
- **Risks** — potential problems, regressions, edge cases
- **Tests and checks** — coverage, manual verification scenarios

## Sub-agents

| Agent             | Model  | Role                                                                 |
| ----------------- | ------ | -------------------------------------------------------------------- |
| `review-analyzer` | sonnet | Collects git data, analyzes diff, writes a 7-dimension review report |

## Example

```
/sp:review 86-black-jack-page
```

Result: `docs/ai/86-black-jack-page/86-black-jack-page-review.md`

## Connections

```
/sp:task → /sp:plan → /sp:do → /sp:review
```

`/review` closes the development cycle. Analyzes the `/task`, `/plan`, `/do` artifacts and the code changes.
