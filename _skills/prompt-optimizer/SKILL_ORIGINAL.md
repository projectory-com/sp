---
name: prompt-optimizer
description: Improve and refine prompts for LLMs and AI coding tools. Use when asked to optimize, improve, rewrite, or fix a prompt. Triggers — "optimize prompt", "improve prompt", "улучши промпт", "оптимизируй промпт", "перепиши промпт". Also triggers when text is sent from Neovim prompt-optimizer plugin or via /prompt-optimizer slash command. Handles both general LLM prompts and software development prompts.
---

# Prompt Optimizer

Analyze and improve prompts for better LLM results. Output the improved prompt directly — minimize commentary.

## Modes

This skill is used in two contexts:

1. **Neovim** (`leader+po`): receives selected text, returns optimized prompt that replaces the selection. Output ONLY the prompt text — no commentary.
2. **Slash command** (`/prompt-optimizer <file>`): reads a file, optimizes the prompt inside, writes it back. Shows a brief summary of changes after writing.

## Analysis Framework

Evaluate the prompt across these dimensions (in priority order):

### 1. Intent Clarity

The single most impactful factor. Ask: "Could two people read this and produce the same output?"

- **Red flags**: ambiguous verbs ("handle", "manage", "fix", "improve"), missing success criteria, implicit assumptions
- **Fix**: replace vague verbs with specific actions, state expected observable behavior
  - "handle errors" → "catch NetworkError and TimeoutError, retry up to 3 times with exponential backoff, then throw UserFetchFailedError"

### 2. Scope Boundaries

Focused tasks produce better results than sprawling ones.

- **Red flags**: multiple unrelated changes, "and also..." patterns, no mention of what should NOT change
- **Fix**: split compound prompts into atomic tasks, add explicit constraints ("Only modify files in src/auth/")

### 3. Context Anchoring

Without anchors, the AI invents plausible but wrong assumptions.

- **Red flags**: no file paths or function names, no reference to existing patterns, assumes prior conversation context
- **Fix**: reference specific files and functions, name existing patterns to follow, mention relevant tech stack

### 4. Specificity

Vague words → vague output.

- **Red flags**: "good", "interesting", "properly", "fast", "clean"
- **Fix**: replace with concrete criteria
  - "interesting article" → "article with concrete examples and data"
  - "make it fast" → "response time < 200ms for 1000 concurrent users"

### 5. Acceptance Criteria

How will we know the change is correct? (Scale to task complexity — a typo fix doesn't need this.)

- **Red flags**: no testable assertions, "it should work", no edge cases
- **Fix**: add concrete checks ("npm test should pass", "return 404 when userId doesn't exist"), specify error behaviors

## Process

### Step 1: Classify and calibrate

Determine task type and match effort to complexity:

| Complexity | Analysis depth | Example |
|-----------|---------------|---------|
| **Trivial** | Intent clarity is enough | Typo fix, rename, one-liner |
| **Simple** | Intent + scope | Single-function change, add a field |
| **Medium** | All 5 dimensions | New endpoint, refactor a module |
| **Complex** | All 5 + suggest sub-tasks | New subsystem, architectural change |

For development prompts, also identify the type:

| Type | Key requirements |
|------|-----------------|
| Bug fix | Error messages, repro steps, expected vs actual |
| Feature | Spec, acceptance criteria, integration points |
| Refactor | Current structure, target structure, "tests must pass" |
| Config/DevOps | Environment details, current config, desired state |
| Exploration | Constraints, goals, tradeoffs that matter |

### Step 2: Identify gaps

Run through the 5 dimensions. Note what's missing or ambiguous. Not every prompt needs all 5.

### Step 3: Rewrite

For **development prompts**, use this structure (adapt as needed):

```
## Task
[One clear sentence]

## Context
[Files, functions, architecture, tech stack]

## Requirements
[Specific, testable — each independently verifiable]

## Constraints
[What NOT to change, approaches to avoid]

## Verification
[How to confirm correctness]
```

For **general prompts**, apply these rules:
- Fix errors — spelling, grammar, punctuation in the original language
- Clarify intent — make implicit goals explicit
- Add missing context — audience, format, constraints (only genuinely missing)
- Structure — headers/lists for complex prompts, prose for simple ones
- Cut fluff — omit needless words, active voice over passive
- Advanced techniques ONLY when warranted: chain-of-thought, few-shot examples, role assignment, step-by-step decomposition

### Step 4: Output

**Proportionality:**
- 1-2 sentence prompt → 1-3 sentences (fix errors, sharpen wording)
- Paragraph prompt → structured paragraph (add clarity, cut fluff)
- Multi-part prompt → headers/sections (organize, fill gaps)

**Response format:**
1. **Improved prompt** — ready to copy-paste
2. **What changed** (2-3 sentences) — key improvements and why they matter

For trivial improvements: output just the prompt, no commentary needed.

## Rules

**DO:**
- Preserve the original language (Russian stays Russian, English stays English)
- Preserve the original intent — improve formulation, not change the task
- Keep the same scope — don't add tasks the author didn't request
- Match output complexity to input complexity

**DO NOT:**
- Over-engineer simple prompts with unnecessary structure
- Add "You are an expert..." to every prompt — only when domain expertise matters
- Wrap output in code fences, quotes, or separators unless the prompt itself needs them
- Add boilerplate context that doesn't serve the specific task

## Anti-patterns

| Anti-pattern | Problem | Fix |
|-------------|---------|-----|
| Kitchen sink | Multiple unrelated tasks | Split into separate prompts |
| Phantom context | "Fix the bug we discussed" | Restate the bug inline |
| Vague scope | "Update the user module" | Specify files and functions |
| Missing negatives | No constraints on what to preserve | Add "do not change..." section |
| Assumed knowledge | References internal APIs without details | Include type signatures or endpoints |
| Premature optimization | "Make it fast" without data | Ask for measurable target |
| Over-specification | Dictating exact implementation line by line | State the goal, let AI choose approach |
| Bloating | 2-line prompt inflated to 20 lines | Match output complexity to input |

## Examples

### Example 1: Vague bug fix

**Original:**
> Fix the login bug

**Improved:**
> ## Task
> Fix authentication failure when users log in with email addresses containing "+" (e.g., user+tag@gmail.com).
>
> ## Context
> - Auth logic: `src/auth/loginHandler.ts`, `validateCredentials()`
> - Email validation: `isValidEmail()` in `src/utils/validation.ts`
>
> ## Requirements
> - Emails with "+" pass validation and authenticate correctly
> - Existing email validation rules still apply
>
> ## Verification
> - Add test case in `tests/auth/login.test.ts` for "+" emails
> - Existing auth tests must still pass

### Example 2: Overloaded request → split

**Original:**
> Add dark mode to the app and also fix the navbar on mobile and update the footer links

**Improved** (3 separate prompts):
> **Prompt 1:** Add dark mode toggle. Use CSS custom properties in `src/styles/theme.css`. Toggle button in `Header` component. Persist in localStorage. Default to system `prefers-color-scheme`.
>
> **Prompt 2:** Fix navbar on viewports below 768px. Hamburger menu in `src/components/Navbar.tsx` overflows on 320px width. Stack items vertically in a slide-out drawer.
>
> **Prompt 3:** Update footer links in `src/components/Footer.tsx`: "Blog" href → `/blog`, add "Changelog" → `/changelog`, remove "Old Docs" link.

### Example 3: Already good enough

**Original:**
> In `src/api/routes/orders.ts`, add GET `/orders/:id/receipt` that returns a PDF receipt. Use `generatePDF()` from `src/utils/pdf.ts`. Content-Type `application/pdf`. Return 404 if not found. Add tests in `tests/api/orders.test.ts`.

**Assessment:** Already well-structured — clear intent, file references, specific behavior, tests mentioned. Minor suggestion: specify Content-Disposition (inline vs attachment). Otherwise, use as-is.

## Edge cases

- **Prompt is already good**: Say so. Don't add complexity for its own sake.
- **Intent completely unclear**: Ask clarifying questions instead of guessing.
- **Exploratory task**: Restructure as a question: "Analyze X considering Y constraints. Present tradeoffs before implementing."
- **Contains sensitive data**: Note that API keys/secrets should be replaced with placeholders.
