# sp — roadmap: от task до merge без дёрганий

**Дата:** 2026-03-14
**Статус:** draft
**Автор:** Ivan Hilkov / Claude

---

## Проблема

Текущий workflow (superpowers: brainstorm → write-plan → execute-plan + ручной review) требует постоянного внимания разработчика в моменты, где оно не нужно. Три конкретных боли:

1. **Drip-feed brainstorm.** Вопросы прилетают по одному, каждый через 30-60 сек. Нельзя переключиться — выпадешь из контекста. 5-8 вопросов × 1 мин ожидания = 15+ мин привязанности к экрану.
2. **Слепой execute.** Нет автоматического выбора стратегии выполнения (inline / sub-agents / agent-team). Разработчик решает сам, каждый раз заново.
3. **Review fatigue.** К третьей задаче ревью деградирует до "работает — мержу". Нет автоматического quality gate.

## Целевое состояние

Четыре скилла образуют pipeline. Каждый — атомарная фаза с одной точкой принятия решения.

```
/sp:task → /sp:plan → /sp:do → /sp:review
   ↓           ↓          ↓          ↓
 task.md    plan.md    report.md  review.md
 (async)   (1 checkpoint) (async+notify) (auto-gate)
```

Разработчик активно работает в двух точках:

- **Написание task** — формулирует задачу, запускает, уходит
- **Approve plan** — один раз смотрит план целиком, отвечает на все вопросы, утверждает

Всё остальное — async с notification.

---

## Архитектурные решения

### AD-1: Один checkpoint вместо drip-feed

**Контекст:** superpowers:brainstorm задаёт вопросы интерактивно — по одному. Это даёт точность, но убивает возможность переключиться.

**Решение:** `/sp:plan` делает brainstorm + planning автономно. Агент сам принимает решения на основе кодовой базы, записывая reasoning в план. Все нерешённые вопросы копятся и выдаются одним батчем.

**Trade-off:** Потеря интерактивности. Агент может пойти не туда. Компенсация — план показывается целиком, easy to correct.

### AD-2: Routing встроен в план, не в execute

**Контекст:** Решение "как выполнять" (inline / sub-agents / agent-team) зависит от структуры задач, их зависимостей и того, какие файлы затрагиваются. Эта информация доступна при планировании.

**Решение:** `/sp:plan` анализирует план и записывает routing decision:

| Критерий                                | Mode             |
| --------------------------------------- | ---------------- |
| complexity: trivial/simple, files ≤ 3   | `inline`         |
| complexity: medium, tasks independent   | `sub-agents`     |
| complexity: medium/complex, cross-layer | `agent-team`     |
| tasks share no files + DAG allows       | `parallel: true` |

`/sp:do` читает mode из плана и действует. Разработчик не принимает это решение.

### AD-3: Review как automated quality gate

**Контекст:** Code review — самое дорогое по когнитивной нагрузке. При 3+ задачах одновременно человек перестаёт реально смотреть код.

**Решение:** `/sp:review` запускает 3 параллельных sub-agent'а:

- **code-reviewer** — качество кода, naming, паттерны, лишний код
- **spec-checker** — сверка с requirements из task-файла (каждый → ✅/❌)
- **code-simplifier** — предложения по упрощению

Findings приоритизируются: 🔴 Block / 🟡 Fix / 🟢 Nit. Человек видит не diff, а отчёт.

### AD-4: Hooks для side-effects, скиллы для orchestration

**Контекст:** Hooks (PreToolUse, PostToolUse, Stop, SubagentStop) — мощный инструмент, но ненадёжный для orchestration (timing, async issues).

**Решение:** Hooks используются строго для:

- Notification (Telegram) по Stop/SubagentStop
- Logging коммитов в report
- Quick-lint после file edits (PostToolUse)

Orchestration (порядок задач, routing, checkpoint) живёт в скиллах.

### AD-5: Один task → одна директория → полная трассировка

```
docs/ai/<task-slug>/
  <task-slug>-task.md      # /sp:task
  <task-slug>-plan.md      # /sp:plan
  <task-slug>-report.md    # /sp:do
  <task-slug>-review.md    # /sp:review
```

Каждый файл — артефакт конкретной фазы. Можно вернуться к любой задаче и понять что было.

---

## Фазы реализации

### Phase 1 — Core pipeline

Цель: закрыть drip-feed и слепой execute. После Phase 1 workflow работает от task до выполнения без дёрганий.

| #   | Что                                                                 | Файлы                                                                                                                                         | Зависит от              |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1.1 | `/sp:plan` — batched brainstorm + design plan + impl plan + routing | `skills/plan/SKILL.md`, `skills/plan/agents/plan-designer.md`, `skills/plan/agents/plan-architect.md`, `skills/plan/reference/plan-format.md` | `/sp:task` (существует) |
| 1.2 | `/sp:do` — smart execute с тремя стратегиями                        | `skills/do/SKILL.md`, `skills/do/agents/task-executor.md`                                                                                     | `/sp:plan` (1.1)        |
| 1.3 | Notification hook — Telegram ping                                   | `.claude/hooks/notify.sh` или HTTP hook                                                                                                       | —                       |

### Phase 2 — Quality gate

Цель: автоматическое ревью. После Phase 2 — полный pipeline task → merge.

| #   | Что                                                    | Файлы                                                                                                     | Зависит от         |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------ |
| 2.1 | `/sp:review` — automated review с тремя sub-agents     | `skills/review/SKILL.md`, `skills/review/agents/code-reviewer.md`, `skills/review/agents/spec-checker.md` | `/sp:do` (1.2)     |
| 2.2 | `/sp:fix` — принимает findings из review, делает fixes | `skills/fix/SKILL.md`                                                                                     | `/sp:review` (2.1) |

### Phase 3 — Polish

Цель: DX и удобство. Вещи без которых жить можно, но с ними лучше.

| #   | Что                                                         | Файлы                             | Зависит от |
| --- | ----------------------------------------------------------- | --------------------------------- | ---------- |
| 3.1 | `/sp:status` — показывает фазу задачи                       | `commands/status.md`              | Phase 1    |
| 3.2 | Chain commands — task автоматически предлагает plan         | Обновление `skills/task/SKILL.md` | Phase 1    |
| 3.3 | Dashboard hook — обновляет статус в Google Sheet или Notion | `.claude/hooks/dashboard.sh`      | Phase 2    |

---

## Формат plan-файла (выход /sp:plan)

```markdown
# <Заголовок>

**Task:** <путь к task-файлу>
**Complexity:** <trivial | simple | medium | complex>
**Mode:** <inline | sub-agents | agent-team>
**Parallel:** <true | false>

## Design decisions

<Архитектурные решения с reasoning. Каждое — почему именно так.>

## Implementation plan

### Task 1: <название>

- **Files:** <пути>
- **Depends on:** <task N | none>
- **Agent:** <main | sub-agent-name | team-role>
- **Steps:**
  1. ...

### Task 2: ...

## Execution order

<DAG или sequence — визуально понятный порядок>

## Open questions

1. **Вопрос?**
   - [ ] Вариант A
   - [ ] Вариант B

## Validation

- <команда> → <ожидаемый результат>
```

## Формат review-файла (выход /sp:review)

```markdown
# Review: <slug>

**Commits:** <N коммитов>
**Verdict:** 🟢 clean | 🟡 needs fixes | 🔴 blocked

## Spec compliance

| #   | Requirement | Status | Notes             |
| --- | ----------- | ------ | ----------------- |
| 1   | ...         | ✅     | —                 |
| 2   | ...         | ❌     | Missing edge case |

## Code quality findings

### 🔴 Blockers

- ...

### 🟡 Fixes

- ...

### 🟢 Nits

- ...

## Simplification proposals

- ...
```

---

## Открытые вопросы

1. **Plan approval UX.** Как именно выглядит checkpoint в `/sp:plan`? Варианты:
   - Вывод в терминал + ожидание "approve" / правок
   - Запись plan-файла + message "review and run /sp:do when ready"
   - Elicitation dialog (если поддерживается)

2. **Granularity of sub-agents в /sp:do.** Один sub-agent на task из плана? Или один sub-agent на "фазу" (impl → simplify → cleanup)?

3. **Review scope.** Ревьюить каждый коммит отдельно или весь diff целиком? (весь diff проще, но теряет контекст отдельных изменений)

4. **Error recovery в /sp:do.** Если sub-agent падает — retry? skip + report? stop all?

5. **Integration с существующим /sp:task.** Менять формат task-файла или plan подстраивается под текущий?

---

## Референсы

- [obra/superpowers](https://github.com/obra/superpowers) — brainstorm → write-plan → execute-plan flow
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) — code-simplifier, code-review, feature-dev
- [Claude Code: Sub-agents](https://code.claude.com/docs/en/sub-agents) — Task tool, isolation: worktree
- [Claude Code: Agent Teams](https://code.claude.com/docs/en/agent-teams) — experimental, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
- [Claude Code: Hooks](https://code.claude.com/docs/en/hooks) — PreToolUse, PostToolUse, Stop, SubagentStop, Notification
- [sp Issue #1](https://github.com/projectory-com/sp/issues/1) — оригинальный /do issue
