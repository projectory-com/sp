# Status Protocol

Sub-agent status protocol and review loop.

---

## Implementer statuses

A sub-agent returns one of four statuses after executing a task.

### DONE

Task done. Verify passes. Commit made.

**Orchestrator action:**

1. If the sub-agent didn't commit — commit
2. Run spec review → quality review (see Review Loop)
3. Mark the task in TodoWrite
4. Move to the next task

### DONE_WITH_CONCERNS

Task done, but the sub-agent has doubts. The code works, Verify passes.

**Orchestrator action:**

1. Read the concerns
2. Concern about correctness or scope — evaluate before review:
   - Justified → record, continue to review
   - Critical → stop as BLOCKED
3. Observation-level concern (file bloating, atypical pattern) — record and continue
4. Record concerns in the report data
5. Commit if not done, run the review loop

### NEEDS_CONTEXT

The sub-agent ran out of information. Task not completed.

**Orchestrator action:**

1. Read exactly what's needed
2. Find the information (files, context from the plan)
3. Re-dispatch the sub-agent with the added context (max 1 retry)
4. After retry still NEEDS_CONTEXT → re-dispatch with a stronger model
5. That didn't help either → BLOCKED

### BLOCKED

The task cannot be completed.

**Orchestrator action:**

1. Evaluate the blocker:
   - Context problem → give more context, re-dispatch
   - Task too complex → re-dispatch with a stronger model
   - Task too large → split into parts (if possible within the plan)
   - Plan is wrong → record, continue with independent tasks
2. Mark dependent tasks as SKIPPED
3. Continue with independent tasks

**Don't stop the whole execution.** Block only the tasks depending on the blocked one.

---

## Review Loop

After each DONE/DONE_WITH_CONCERNS — a two-stage review.

### Stage 1 — Spec Compliance Review

Dispatch `agents/spec-reviewer.md`:

- Pass: task requirements + implementer report
- The reviewer verifies against the code, not the report

**Result:**

- ✅ Spec compliant → Stage 2
- ❌ Issues → implementer fixes → re-dispatch spec reviewer (max 3 iterations)
- 3 iterations without ✅ → record issues, continue to quality review

### Stage 2 — Code Quality Review

Dispatch `agents/quality-reviewer.md`:

- Pass: BASE_SHA, HEAD_SHA, task requirements
- Dispatch only after ✅ from the spec reviewer

**Result:**

- ✅ Approved → task complete
- ❌ Critical/Important issues → implementer fixes → re-dispatch quality reviewer (max 3 iterations)
- Minor issues — record, don't block
- 3 iterations without ✅ → record issues, continue

---

## Model Escalation

When a sub-agent can't cope:

1. First dispatch — the model from the agent frontmatter (usually sonnet)
2. BLOCKED or NEEDS_CONTEXT again → re-dispatch with opus
3. Opus also fails → record as BLOCKED, escalate in the report

---

## Parallel Dispatch

When there are parallel groups in the Execution Order:

```
Group 1 (parallel): Task 1, Task 2
─── barrier ───
Group 2 (sequential): Task 3 → Task 4
```

**Rules:**

- Parallel group: dispatch all tasks at once via the Agent tool
- Barrier: wait for all tasks in the group before the next one
- Sequential: dispatch one at a time in dependency order
- A task in a parallel group is BLOCKED → keep the remaining tasks in the group running

**Not parallel:**

- Tasks touch the same files (file intersection)
- Tasks are linked via depends_on
- The plan has no explicit parallel groups

---

## Tracking

For each task, record:

- Status (DONE / DONE_WITH_CONCERNS / BLOCKED / SKIPPED)
- Concerns (text, if any)
- Block reason (text, if BLOCKED)
- Commit hash (if there was a commit)
- Retry count (0, 1, or 2 with model escalation)
- Spec review result (✅/❌ + issues)
- Quality review result (✅/❌ + issues)
- Files changed by the sub-agent (FILES_CHANGED)

All data goes into the report file.
