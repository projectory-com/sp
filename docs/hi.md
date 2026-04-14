# Skill /hi

Welcome skill — explains the sp marketplace layout, available skills, and the recommended workflow.
Entry point for new users of the plugin.

## Input

Fires automatically on prompts like: "how do I use sp?", "what is the marketplace?",
"which skills are available?", or on first contact with the plugin. No parameters.

```
/sp:hi
```

## Output

A structured overview:

- **Project description** — what sp is, inspiration
- **Skills catalog** — short description of each skill with example commands
- **Full cycle** — recommended sequence: task → plan → do → fix → review
- **Planned skills** — list of upcoming components
- **Installation** — command to install the plugin

## Notes

- Informational skill — no sub-agents, no side effects
- Prints content in the main thread

## Example

```
/sp:hi
```

Result: an overview of the sp marketplace and available skills.

## Connections

Entry point into the sp system. Recommends the full cycle: `/task` → `/plan` → `/do` → `/fix` → `/review`.
