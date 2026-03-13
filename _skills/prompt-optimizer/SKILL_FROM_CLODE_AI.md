---
name: prompt-improver
description: Improve and refine user prompts for AI-assisted coding tools like Claude Code, Cursor, Copilot, and similar systems. Use this skill whenever the user asks to improve, refine, review, or optimize a development prompt, or when the user drafts a task description for an AI coding assistant and wants it to be more effective. Also trigger when the user says things like "make this prompt better", "help me write a prompt for Claude Code", "optimize my coding prompt", "rewrite this task for AI", or pastes a raw prompt asking for feedback. This skill focuses specifically on software development prompts — not general writing or marketing prompts.
---

# Prompt Improver for AI-Assisted Development

A skill that analyzes and improves prompts intended for AI coding assistants (Claude Code, Cursor, Copilot, etc.), making them more effective, unambiguous, and likely to produce correct results on the first attempt.

## Why this matters

The quality of output from AI coding tools is directly proportional to the quality of the input prompt. A vague prompt leads to generic code that needs multiple revision cycles. A well-structured prompt produces targeted, project-aware code in one shot. The difference between a 2-minute fix and a 30-minute back-and-forth is often just prompt quality.

## Analysis Framework

When improving a prompt, evaluate it across these dimensions in order of importance:

### 1. Intent Clarity

The single most impactful factor. Ask: "Could two different senior developers read this prompt and produce the same output?"

**Red flags:**
- Ambiguous verbs: "handle", "manage", "deal with", "fix", "improve"
- Missing success criteria: no way to verify the output is correct
- Implicit assumptions about what the AI "should know"

**Improvement approach:**
- Replace vague verbs with specific actions: "handle errors" → "catch NetworkError and TimeoutError in fetchUser(), retry up to 3 times with exponential backoff, then throw a custom UserFetchFailedError"
- State the observable behavior expected after the change

### 2. Scope Boundaries

AI coding tools perform best with focused, atomic tasks. A prompt that touches 5 files across 3 subsystems will produce worse results than 5 focused prompts.

**Red flags:**
- Multiple unrelated changes in one prompt
- "And also..." / "while you're at it..." patterns
- No mention of what should NOT be changed

**Improvement approach:**
- Split compound prompts into sequential atomic tasks
- Add explicit constraints: "Only modify files in src/auth/. Do not change any existing tests."
- Define the blast radius: which files, functions, or modules are in scope

### 3. Context Anchoring

The AI needs to know WHERE it's working and WHAT already exists. Without anchors, it invents plausible but wrong assumptions.

**Red flags:**
- No file paths or function names mentioned
- No reference to existing patterns, conventions, or architecture
- Assumes the AI remembers previous conversation context

**Improvement approach:**
- Reference specific files: "In src/api/userController.ts, in the getUser handler..."
- Name existing patterns: "Follow the same error handling pattern used in orderController.ts"
- Mention relevant tech stack details when they affect implementation

### 4. Acceptance Criteria

How will we know the change is correct? This helps both the AI (narrowing solution space) and the developer (verifying output).

**Red flags:**
- No testable assertions
- "It should work" / "Make sure it's good"
- No mention of edge cases

**Improvement approach:**
- Add concrete checks: "After this change, `npm test` should pass", "The endpoint should return 404 when userId doesn't exist"
- Mention relevant edge cases the implementation must handle
- Specify error behaviors, not just happy paths

### 5. Output Format Expectations

Tell the AI what you need back — just code? A plan first? Explanation of tradeoffs?

**Red flags:**
- No indication whether to explain or just implement
- No preference for approach when multiple valid solutions exist

**Improvement approach:**
- "Implement this directly, no explanation needed"
- "First outline your approach, then implement after I confirm"
- "Show me 2 approaches with tradeoffs before implementing"

## Improvement Process

### Step 1: Classify the prompt type

Determine what kind of development task this is:

| Type | Characteristics | Key requirements |
|------|----------------|------------------|
| Bug fix | Something broken, needs diagnosis | Error messages, reproduction steps, expected vs actual behavior |
| Feature | New functionality | Spec, acceptance criteria, integration points |
| Refactor | Restructure without behavior change | Current structure, target structure, "tests must still pass" |
| Config/DevOps | Infrastructure, build, deploy | Environment details, current config, desired state |
| Exploration | "How should I..." / design question | Constraints, goals, tradeoffs that matter |

### Step 2: Identify gaps

Run through the 5 dimensions above. Note what's missing or ambiguous. Not every prompt needs all 5 — a quick typo fix doesn't need acceptance criteria. Match the level of detail to the task complexity.

**Complexity calibration:**
- **Trivial** (typo, rename, one-liner) → Intent clarity is enough
- **Simple** (single-function change, add a field) → Intent + scope
- **Medium** (new endpoint, refactor a module) → All 5 dimensions
- **Complex** (new subsystem, architectural change) → All 5 + suggest breaking into sub-tasks

### Step 3: Rewrite the prompt

Produce an improved version using this structure (adapt as needed — not every section is always required):

```
## Task
[One clear sentence describing what to do]

## Context
[Relevant files, functions, architecture, tech stack details]

## Requirements
[Specific, testable requirements — each one independently verifiable]

## Constraints
[What NOT to change, approaches to avoid, dependencies to respect]

## Verification
[How to confirm the change works correctly]
```

### Step 4: Show the diff

Present the original alongside the improved version. Briefly explain the most important changes you made and why. Keep explanations focused — the developer should understand the value immediately.

## Anti-patterns to catch

These patterns in prompts reliably lead to poor AI output. Flag them explicitly:

| Anti-pattern | Problem | Fix |
|-------------|---------|-----|
| Kitchen sink | Multiple unrelated tasks | Split into separate prompts |
| Phantom context | "Fix the bug we discussed" | Restate the bug inline |
| Vague scope | "Update the user module" | Specify files and functions |
| Missing negatives | No constraints on what to preserve | Add "do not change..." section |
| Assumed knowledge | References internal APIs without details | Include relevant type signatures or endpoints |
| Premature optimization | "Make it fast" without profiling data | Ask for measurable target: "Response time < 200ms for 1000 concurrent users" |
| Over-specification | Dictating exact implementation line by line | State the goal, let the AI choose the approach |

## Response format

When improving a prompt, structure your response as:

1. **Assessment** (2-3 sentences): What's the prompt trying to do? What's the biggest gap?
2. **Improved prompt**: The rewritten version, ready to copy-paste
3. **What changed** (brief): The key improvements, focusing on why they matter

Do not over-explain. The developer should spend more time reading the improved prompt than reading your commentary about it.

## Examples

**Example 1: Vague bug fix**

Original:
> Fix the login bug

Improved:
> ## Task
> Fix the authentication failure when users log in with email addresses containing a "+" character (e.g., user+tag@gmail.com).
>
> ## Context
> - Auth logic is in `src/auth/loginHandler.ts`, specifically the `validateCredentials()` function
> - The email is validated by `isValidEmail()` in `src/utils/validation.ts`
>
> ## Requirements
> - Emails with "+" should pass validation and authenticate correctly
> - Existing email validation rules (format, domain check) must still apply
>
> ## Verification
> - Add a test case in `tests/auth/login.test.ts` for "+" emails
> - Existing auth tests must still pass

**Example 2: Overloaded feature request**

Original:
> Add dark mode to the app and also fix the navbar on mobile and update the footer links

Improved (split into 3 prompts):
> **Prompt 1:** Add dark mode toggle to the app. Use CSS custom properties defined in `src/styles/theme.css`. Add a toggle button in the `Header` component (`src/components/Header.tsx`). Persist preference in localStorage. Default to system preference via `prefers-color-scheme`.
>
> **Prompt 2:** Fix navbar layout on viewports below 768px. The hamburger menu in `src/components/Navbar.tsx` currently overflows on iPhone SE (320px width). Menu items should stack vertically in a slide-out drawer.
>
> **Prompt 3:** Update footer links in `src/components/Footer.tsx`: replace "Blog" href with `/blog`, add "Changelog" linking to `/changelog`, remove "Old Docs" link entirely.

**Example 3: Prompt that's already good enough**

Original:
> In `src/api/routes/orders.ts`, add a GET `/orders/:id/receipt` endpoint that returns a PDF receipt. Use the existing `generatePDF()` from `src/utils/pdf.ts`. The response should have Content-Type `application/pdf`. Return 404 if order not found. Add tests in `tests/api/orders.test.ts`.

Assessment: This prompt is already well-structured. It has clear intent, file references, specific behavior, and mentions tests. Minor suggestion: specify whether the PDF should be inline or attachment (Content-Disposition header). Otherwise, ready to use as-is.

## Edge cases

- **If the prompt is already good**: Say so. Don't add complexity for the sake of it. A minor suggestion or two is fine.
- **If intent is completely unclear**: Ask clarifying questions instead of guessing. Better to get it right than to "improve" something in the wrong direction.
- **If the task is exploratory**: Restructure as a question prompt: "Analyze X and suggest approaches considering Y constraints. Present tradeoffs before implementing."
- **If the prompt contains sensitive data**: Note that API keys, passwords, or secrets should be replaced with placeholders before sending to an AI tool.
