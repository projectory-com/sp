---
name: gst
description: >-
  Show development status in the repository: branch, uncommitted changes,
  recent commits, diff vs main, hot files, semantic summary.
  Used when a developer writes "status", "gst", "git status",
  "what's going on", "repo state", "show changes".
---

# Development status

Run git commands and analysis only through the agent, not in the main thread.

## The only action

Run `git-data-collector` via the Agent tool:

- Agent: `${CLAUDE_PLUGIN_ROOT}/skills/gst/agents/git-data-collector.md`
- Prompt: "Collect data on the current git repository state and produce a report"

Output the agent's result to the user as is.
