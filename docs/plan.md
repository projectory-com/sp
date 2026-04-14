# Skill /plan

Builds an implementation plan from a task file. Reads the task, explores the codebase via sub-agents,
makes architectural decisions, decomposes the work into atomic tasks, and picks the execution strategy.
The output is a plan file that `/sp:do` executes autonomously.

## Input

`$ARGUMENTS` — path to the task file produced by `/sp:task`.

```
/sp:plan docs/ai/86-black-jack-page/86-black-jack-page-task.md
```

## Phases

Runs 6 sequential phases autonomously; one checkpoint for user input.

| Phase | Name           | What happens                                                                                                |
| ----- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| 1     | **Load**       | Read the task file, extract fields: title, slug, complexity, requirements, constraints                      |
| 2     | **Explore**    | Sub-agent `plan-explorer` explores the codebase: change map, patterns, file intersection matrix             |
| 3     | **Design**     | Sub-agent `plan-designer` makes design decisions, decomposes into tasks, builds the dependency DAG          |
| 4     | **Route**      | Pick the execution strategy (mode + parallel) from the routing rules table                                  |
| 5     | **Checkpoint** | The single approval point: all decisions, tasks, and routing in one batch. The user edits or says `approve` |
| 6     | **Write**      | Write the plan file to `docs/ai/<slug>/<slug>-plan.md`                                                      |

## Output

File `docs/ai/<slug>/<slug>-plan.md` with the following structure:

- **Header** — Task, Complexity, Mode, Parallel
- **Design decisions** — numbered (DD-1, DD-2…), with rationale and alternatives
- **Tasks** — atomic tasks with files, dependencies, scope (S/M/L), verify command
- **Execution** — mode, parallel, order (text DAG)
- **Resolved questions** — closed questions with answers
- **Verification** — criteria from the task file

`/sp:do` reads the `Mode` and `Parallel` header fields directly.

## Routing

Three execution modes, chosen by complexity, task count, and file intersections:

| Mode         | When                                                            | Characteristic                                                          |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `inline`     | Simple tasks, 1–3 tasks, single module                          | Sequential in the current thread, minimum overhead                      |
| `sub-agents` | 3+ tasks, independent groups exist                              | Each task is a separate sub-agent; parallel groups run at the same time |
| `agent-team` | Cross-layer (frontend + backend + tests), coordination required | A team of agents with shared context via TeamCreate                     |

The orchestrator decides based on the file intersection matrix from the Design phase.

## Sub-agents

| Agent           | Model  | Role                                                                                  |
| --------------- | ------ | ------------------------------------------------------------------------------------- |
| `plan-explorer` | sonnet | Codebase exploration: files to change, patterns, intersections, size estimate         |
| `plan-designer` | sonnet | Architecture: design decisions, decomposition into tasks, DAG, routing recommendation |

## Example

```
/sp:plan docs/ai/86-black-jack-page/86-black-jack-page-task.md
```

## Connections

```
/sp:task → /sp:plan → /sp:do → /sp:review
```

`/task` defines the task. `/plan` builds the implementation plan. `/do` executes the plan.
