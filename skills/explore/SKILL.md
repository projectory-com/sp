---
name: explore
description: >-
  Codebase exploration and brainstorming. Activates when the user writes
  "explore", "explain", "compare", "what if", "brainstorm",
  "investigate", "figure out", "analyze", "how is it built", "how does it work",
  "tell me about", "why", "what are the options",
  "suggest an approach", "show the architecture".
---

# Exploration

Orchestrate the exploration. Make decisions via AskUserQuestion. Delegate file operations to agents.

Delegate:

- Exploration → `agents/explore-agent.md`
- Log writing → `agents/explore-log-writer.md`

Work without stopping.

---

## Input

`$ARGUMENTS` — the first question or exploration topic.

---

## Phases

3 phases.

```
1. Init      → initialize variables
2. Loop      → user-driven Q&A with dispatch explore-agent (sonnet)
3. Finalize  → slug, dispatch explore-log-writer (haiku)
```

---

## Phase 1 — Init

If `$ARGUMENTS` is empty — ask via AskUserQuestion: "What would you like to talk about?"

Treat `$ARGUMENTS` or the user's reply as the first question.

Read `agents/explore-agent.md` — use it across every Loop iteration without re-reading.

Initialize variables:

- `EXPLORATION_SUMMARY` = "" (cumulative chain of key findings)
- `QA_LOG` = [] (full log of all Q&A rounds)
- `ITERATION` = 0

Transition → Phase 2.

---

## Phase 2 — Loop (user-driven Q&A)

Repeat until the user exits.

### 2a. Prompt enrichment

The orchestrator builds the prompt for the agent:

- Exploration topic = the user's first question
- Current question = the question from the current iteration
- Previous findings = EXPLORATION_SUMMARY

### 2b. Dispatch explore-agent

Dispatch via the Agent tool (model: sonnet). The agent file is already read in Init.

The agent returns structured output: RESPONSE_TYPE, ANSWER, DETAILS, SUMMARY, KEY_FILES, WEB_SOURCES. For an open question — also OPTIONS.

### 2c. Show the result

For `RESPONSE_TYPE = answer` — show ANSWER and DETAILS to the user.

For `RESPONSE_TYPE = brainstorm` — show ANSWER, DETAILS and OPTIONS to the user.

### 2d. Update state

Append the agent's SUMMARY to EXPLORATION_SUMMARY.

Append the full record to QA_LOG. Pass all fields without compression:

```
Q: <user's question>
CONTEXT: <why the question was asked — what led to it, what problem it solves, how it connects to previous questions>
ANSWER: <ANSWER from explore-agent — the main answer>
DETAILS: <DETAILS from explore-agent — in full, with file:line and code fragments>
SUMMARY: <SUMMARY from explore-agent — conclusion for the current question>
KEY_FILES: <list>
WEB_SOURCES: <list>
OPTIONS: <if brainstorm>
```

Build CONTEXT yourself as the orchestrator — based on the flow of the conversation, previous questions and the user's current goal.

`ITERATION++`.

### 2e. Next step

AskUserQuestion — what's next:

- **Ask another question**
- **Save and finish** → go to Phase 3
- **Continue without saving** → end the skill, do not write the log

### 2f. Warning on a long session

At 20+ questions — warn: "The session is long (N questions), I recommend saving the results."

A new user question → return to step 2a.

---

## Phase 3 — Finalize

Via AskUserQuestion offer 2-3 slug variants based on the exploration topic (prefix `explore-`, kebab-case, English, up to 40 characters). Add an "Other" option for manual input.

Dispatch `explore-log-writer` via the Agent tool (model: haiku).

Read `agents/explore-log-writer.md`. Pass to the agent:

- SLUG — the exploration slug
- TOPIC — the first question (exploration topic)
- QA_PAIRS — the full QA_LOG. Each record contains fields: Q, CONTEXT, ANSWER, DETAILS, SUMMARY, KEY_FILES, WEB_SOURCES, OPTIONS (if brainstorm). Pass all fields without compression.
- DATE — the current date

The agent will create the file `docs/ai/<SLUG>/<SLUG>-exploration.md`.

Print the result:

```
Exploration log: docs/ai/<SLUG>/<SLUG>-exploration.md
Questions explored: <ITERATION>
```

TodoWrite: "Exploration log written".

---

## Rules

- Delegate file operations to agents — don't do them yourself.
- Work without confirmations between phases; AskUserQuestion in Init and Loop.
- Wait for questions from the user.
- Accumulate findings in EXPLORATION_SUMMARY and pass to the agent as context.
- Mark phases via TodoWrite (Init, Finalize), not every question.
- Language: match the ticket/input language, or follow the project-level definition in CLAUDE.md / AGENTS.md.
