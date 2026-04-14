# CLAUDE.md quality rubric

CLAUDE.md quality scoring across 6 criteria. Maximum 100 points, grades A-F.

## Criteria

### 1. Commands (20 points)

Are build, test, lint, deploy documented?

| Points | Description                                                              |
| ------ | ------------------------------------------------------------------------ |
| 20     | All key commands with explanations, covering build/test/lint/deploy      |
| 15     | Core commands present, but without explanations or missing one category  |
| 10     | Only build or only test, the rest absent                                 |
| 5      | Mentioned in passing without exact commands                              |
| 0      | Commands absent                                                          |

### 2. Architecture (20 points)

Is the project structure described: directories, key files, data flow?

| Points | Description                                       |
| ------ | ------------------------------------------------- |
| 20     | Directory tree with roles and data flow           |
| 15     | Directory tree with roles, but without data flow  |
| 10     | Directories listed without explaining their roles |
| 5      | General description without structure             |
| 0      | Architecture not described                        |

### 3. Non-obvious (15 points)

Are non-obvious decisions, gotchas, workarounds, required env vars captured?

| Points | Description                                                         |
| ------ | ------------------------------------------------------------------- |
| 15     | 3+ non-obvious facts ("why this way"), env vars documented          |
| 10     | 1-2 non-obvious facts                                               |
| 5      | Mentioned without explanation                                       |
| 0      | Absent                                                              |

### 4. Conciseness (15 points)

Is the file concise, free of generic advice and boilerplate?

| Points | Description                                                             |
| ------ | ----------------------------------------------------------------------- |
| 15     | Every line carries project-specific information                         |
| 10     | 1-2 generic sections, but the core is concrete                          |
| 5      | Half is generic advice ("write clean code", "follow best practices")    |
| 0      | Mostly boilerplate                                                      |

### 5. Currency (15 points)

Is the file current? Commands run, paths exist, versions match?

| Points | Description                                          |
| ------ | ---------------------------------------------------- |
| 15     | Everything is verifiable and current at review time  |
| 10     | Mostly current, 1-2 outdated facts                   |
| 5      | A significant portion is outdated                    |
| 0      | File has not been updated since major changes        |

### 6. Actionability (15 points)

Can Claude Code act from this file without additional questions?

| Points | Description                                                             |
| ------ | ----------------------------------------------------------------------- |
| 15     | Claude can build/test/lint/deploy without clarifications                |
| 10     | Can perform core operations, but edge cases need clarifications         |
| 5      | Clarifications are needed for basic operations                          |
| 0      | The file does not help                                                  |

## Grades

| Grade | Points | Description                                 |
| ----- | ------ | ------------------------------------------- |
| A     | 90-100 | Production-ready, Claude works autonomously |
| B     | 70-89  | Good foundation, minimal clarifications     |
| C     | 55-69  | Working file, but missing important sections |
| D     | 40-54  | Basic skeleton, needs work                  |
| F     | 0-39   | Absent or useless                           |

## Scoring process

1. **Read CLAUDE.md** in full
2. **Verify commands** — run `build`, `test`, `lint` from the file and confirm they work
3. **Verify paths** — confirm the directories and files mentioned exist
4. **Score each criterion** — assign points with rationale
5. **Sum up** — determine the grade
6. **Formulate recommendations** — top 3 improvements to raise the grade

### Example output

```yaml
FILES_OK: true
SECTIONS_OK: true — Project: present, Architecture: present, Commands: present, Conventions: present
COMMANDS_OK: false — build: pass, test: pass, lint: pass, deploy: fail (not found)
PATHS_OK: false — src/: exist, config/: exist, src/config.ts: missing (moved to src/config/index.ts)
QUALITY_SCORE: 85
QUALITY_GRADE: B
ISSUES:
  - Commands: deploy command missing from package.json (-5 Commands)
  - Non-obvious: 2 gotchas without explanations of the reasons (-5 Non-obvious)
  - Currency: outdated path src/config.ts → src/config/index.ts (-5 Currency)
```
