# Example: simple task

A complete one-shot example. Shows:

- Context detail for **simple** complexity
- Verification with concrete commands
- How agent findings turn into file sections

---

## Input — ticket

```
GitHub Issue #112
Title: Add password reset via email

Description:
Users can't reset their password if they forget it.
Need to add "Forgot password?" flow:
1. User enters email on /forgot-password page
2. System sends reset link to email
3. User clicks link → goes to /reset-password?token=xxx
4. User sets new password

Figma: https://figma.com/file/aB3k.../forgot-password
```

---

## What the agents found (Investigate findings)

> Internal orchestrator notes; they do not land in the final file.
> They show how agent findings transform into Context / Constraints / Verification sections.

**task-explorer found:**

- Authentication: `src/auth/` — `login.ts`, `register.ts`, `middleware.ts`
- User model: `src/models/User.ts:1–89`, field `passwordHash` (bcrypt); fields `resetToken` and `resetTokenExpiry` **already in the schema** (lines 34–35) but unused
- Email: `src/services/email.ts` — nodemailer wrapper, method `send(to, subject, html)` (line 12)
- Router: `src/routes/auth.ts` — registers `/login` and `/register`, route-registration point (line 28)
- Tests: `src/auth/__tests__/login.test.ts`, `register.test.ts` — pattern clear, ~90% coverage
- No tests on email.ts
- Essential files: `src/models/User.ts`, `src/auth/login.ts`, `src/services/email.ts`, `src/routes/auth.ts`

**task-architect found:**

- Handler pattern: every auth handler is an async `(req, res) => void`, validation via `zod` (src/auth/login.ts:8–19), errors via `AppError` (src/utils/errors.ts:5)
- Config: `src/config/index.ts` — `APP_URL`, `EMAIL_FROM` already present
- Tokens in the project are generated via `crypto.randomBytes` (example: src/auth/register.ts:31)
- Token lifetime constant not defined — ask the user

---

## Final task file

> This file is written to `docs/ai/112-password-reset-email/112-password-reset-email-task.md`

---

# Add password reset via email

**Slug:** 112-password-reset-email
**Ticket:** https://github.com/org/repo/issues/112
**Complexity:** simple
**Type:** general

## Task

Implement the password-reset-via-email flow: an endpoint to request a reset,
an email with a reset link, and an endpoint to set a new password by token.
Write the plan (files + order), wait for confirmation before implementation.

## Context

Authentication lives in `src/auth/` — `login.ts`, `register.ts`, `middleware.ts`.
Add new handlers there; register routes in `src/routes/auth.ts:28`.

Handler pattern (copy exactly): async `(req, res) => void`, validation via zod
(example: `src/auth/login.ts:8–19`), errors via `AppError` (`src/utils/errors.ts:5`).

User model (`src/models/User.ts:34–35`) — fields `resetToken` and `resetTokenExpiry`
are in the schema but unused. No migration needed.

Email: `src/services/email.ts:12` — method `send(to, subject, html)`, ready to use.
Generate tokens via `crypto.randomBytes` (pattern: `src/auth/register.ts:31`).
Config `APP_URL` and `EMAIL_FROM` — `src/config/index.ts`.

Tests: `src/auth/__tests__/` — structure example in `login.test.ts`.

## Requirements

1. `POST /auth/forgot-password` — accepts `{ email }`, finds the user,
   writes `resetToken` and `resetTokenExpiry` on User, sends an email with the link
   `APP_URL/reset-password?token=<token>`. If the email isn't found — return 200
   (don't leak account existence).
2. `POST /auth/reset-password` — accepts `{ token, newPassword }`, validates the token
   and expiry, updates `passwordHash`, clears `resetToken` and `resetTokenExpiry`.
3. Invalid or expired token → 400 with an error message.
4. Write tests for both endpoints following `src/auth/__tests__/login.test.ts`.

## Constraints

- Do not change existing auth endpoints (`/login`, `/register`) or their tests.
- Do not change the User model schema — fields `resetToken` / `resetTokenExpiry` exist.
- Do not add new dependencies — use `src/services/email.ts` and `crypto`.
- Email template — plain HTML, no external templating engines.

## Verification

- `npm test src/auth/__tests__/forgot-password.test.ts` — all tests green
- `npm test` — full suite, no new failures
- `POST /auth/forgot-password` with existing email → 200, email sent,
  `resetToken` and `resetTokenExpiry` written to the DB
- `POST /auth/forgot-password` with unknown email → 200 (not 404)
- `POST /auth/reset-password` with valid token → 200, password updated,
  `resetToken` and `resetTokenExpiry` cleared
- `POST /auth/reset-password` with expired token → 400
- `POST /auth/reset-password` with unknown token → 400
- Token reuse after a successful reset → 400

## Materials

- [Figma — forgot password flow](https://figma.com/file/aB3k.../forgot-password)
- `src/models/User.ts` — fields resetToken / resetTokenExpiry (lines 34–35)
- `src/services/email.ts` — method send()
- `src/auth/login.ts` — handler + zod validation example
- `src/auth/__tests__/login.test.ts` — test structure example
