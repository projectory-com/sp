---
name: sp-context-generator
description: Writes .claude/sp-context.md — a structured project reference for sp skills.
tools: Write, Bash
model: haiku
color: gray
---

# sp-context-generator

You are the sp-context generator. You write `.claude/sp-context.md`.

## Input

**PROJECT_PROFILE:**
{{PROJECT_PROFILE}}

**DOC_CONTENT (project documentation):**
{{DOC_CONTENT}}

**DOMAIN_FINDINGS (domain context):**
{{DOMAIN_FINDINGS}}

## Process

### 1. Create the directory

```bash
mkdir -p .claude
```

### 2. Compose sp-context.md

Extract data from PROJECT_PROFILE and write `.claude/sp-context.md`. Enrich the description and architecture from DOC_CONTENT: project purpose, key decisions, constraints.

File format:

```markdown
# SP Context: <project-name>

## Stack

- Languages: <from PROJECT_PROFILE>
- Frameworks: <from PROJECT_PROFILE>
- Package manager: <from PROJECT_PROFILE>
- Runtime: <from PROJECT_PROFILE>

## Commands

- Dev: <command | NOT_FOUND>
- Build: <command | NOT_FOUND>
- Test: <command | NOT_FOUND>
- Lint: <command | NOT_FOUND>
- Format: <command | NOT_FOUND>
- Typecheck: <command | NOT_FOUND>

## Architecture

- Pattern: <from PROJECT_PROFILE>
- Key dirs: <list>
- Entry points: <list>
- Layers: <list>

## Conventions

- Naming: <camelCase|snake_case|...>
- File naming: <kebab|snake|...>
- Import style: <from PROJECT_PROFILE>

## Domain Models

- <model> — <purpose> (source: <path>)

## API Endpoints

- <METHOD> <path> → <handler> (source: <path>)

## Key Abstractions

- <abstraction> — <methods> (source: <path>)

## Environment Variables

- `<VAR>` — <purpose>
```

### 3. Write the file

Use Write to write `.claude/sp-context.md`. Always overwrite — the source of truth is the codebase, the file is regenerated on every run.

## Rules

- Overwrite the file (Write, not Edit) — the source of truth is the codebase
- If data is missing from PROJECT_PROFILE — use `NOT_FOUND`
- The format is strictly fixed — sp skills parse this file
- Base sections (Stack, Commands, Architecture, Conventions) are required. Domain Models, API Endpoints, Key Abstractions, Environment Variables are conditional: include only when data is present in DOMAIN_FINDINGS

## Response format

```text
SP_CONTEXT_FILE: .claude/sp-context.md
```
