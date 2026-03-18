# Пример: complex-план

Показывает:

- sub-agents mode с параллельными группами
- Design decisions «2 подхода → выбор» (зафиксированный, не открытый)
- Cross-file intersection matrix
- DAG с barrier между группами
- Context isolation per task

---

## Вход — task-файл

```
docs/ai/RSA-44-leaderboard-realtime/RSA-44-leaderboard-realtime-task.md
Сложность: complex
```

---

## Что нашли агенты

> plan-explorer нашёл: SSE проще для read-only потока, WS-сервер уже есть но
> хардкодирован под player-station. File intersection: leaderboard.service.ts
> трогается и серверным task'ом и тестами, но тесты зависят от реализации → sequential.
>
> plan-designer: выбрал SSE (подход B из task-файла), декомпозировал на 5 tasks,
> нашёл 2 параллельные группы (сервер и клиент независимы до интеграции).

---

## Итоговый plan-файл

> Записывается в `docs/ai/RSA-44-leaderboard-realtime/RSA-44-leaderboard-realtime-plan.md`

---

# Real-time обновление leaderboard — план реализации

**Task:** docs/ai/RSA-44-leaderboard-realtime/RSA-44-leaderboard-realtime-task.md
**Complexity:** complex
**Mode:** sub-agents
**Parallel:** true

## Design decisions

### DD-1: Транспорт — SSE вместо WebSocket

**Решение:** Server-Sent Events через новый endpoint `GET /api/leaderboard/stream`.
**Обоснование:** Leaderboard — read-only поток (сервер → клиент). SSE: нативный `EventSource`, нет handshake, работает через стандартный HTTP. Не трогает `ws.server.ts` и player-station протокол.
**Альтернатива:** Расширить WS-сервер (подход A) — требует рефакторинга `ws.server.ts:23-45` (хардкод типов), ломает isolation player-station.

### DD-2: Push payload — полный state, не diff

**Решение:** При событии отправлять полный leaderboard state (массив до 20 записей).
**Обоснование:** Размер payload ~2KB. Diff-подход сложнее (мерж на клиенте), выигрыш минимален при таком объёме.
**Альтернатива:** Только изменившиеся строки — экономия ~1.5KB, сложнее реализация.

### DD-3: Fallback — polling как degradation

**Решение:** `useLeaderboard.ts` подключает EventSource, при ошибке/обрыве — fallback на polling 30 сек. Индикатор "live" / "offline" в UI.
**Обоснование:** Leaderboard на выставке, сеть нестабильна. Polling уже работает — оставить как safety net.
**Альтернатива:** Только SSE без fallback — пользователь видит стейл данные при обрыве.

## Tasks

### Task 1: SSE endpoint на сервере

- **Files:** `apps/game-api/src/routes/leaderboard-stream.ts` (create), `apps/game-api/src/routes/index.ts` (edit — зарегистрировать)
- **Depends on:** none
- **Scope:** M
- **What:** Создать GET /api/leaderboard/stream — SSE endpoint. При подключении: отправить текущий state. Регистрировать connection в leaderboard.service. Удалять при req.on('close').
- **Context:** `apps/game-api/src/routes/leaderboard.ts:1-55` (паттерн route), `apps/game-api/src/services/leaderboard.service.ts:34-67` (processEvent)
- **Verify:** `curl -N http://localhost:3000/api/leaderboard/stream` — получает `data:` с JSON

### Task 2: Push logic в leaderboard.service

- **Files:** `apps/game-api/src/services/leaderboard.service.ts` (edit — добавить SSE push)
- **Depends on:** none
- **Scope:** M
- **What:** Добавить массив SSE-клиентов. Метод `addClient(res)`, `removeClient(res)`. В `processEvent()` после записи в БД — push newState всем клиентам через `res.write()`.
- **Context:** `apps/game-api/src/services/leaderboard.service.ts:34-67` (текущий processEvent), `apps/game-api/src/routes/leaderboard-stream.ts` (Task 1 — как подключается)
- **Verify:** unit test: processEvent() вызывает write() на всех зарегистрированных клиентах

### Task 3: Клиент — EventSource + fallback

- **Files:** `apps/leaderboard-screen/src/hooks/useLeaderboard.ts` (edit)
- **Depends on:** none
- **Scope:** M
- **What:** Добавить EventSource('/api/leaderboard/stream'). При message — `setLeaderboard(data)`. При error — fallback на polling. Добавить state `isLive: boolean`.
- **Context:** `apps/leaderboard-screen/src/hooks/useLeaderboard.ts:1-45` (текущий hook, polling на строке 23), `apps/leaderboard-screen/src/components/Leaderboard.tsx:1-120` (как hook используется)
- **Verify:** Компонент получает обновления без перезагрузки. При kill SSE → fallback polling.

### Task 4: Анимация positionChanged

- **Files:** `apps/leaderboard-screen/src/components/Leaderboard.tsx` (edit — передать prop)
- **Depends on:** Task 3
- **Scope:** S
- **What:** Сравнить предыдущий и новый leaderboard state. Для строк с изменённой позицией — передать `positionChanged={true}` в LeaderboardRow. Не изменять LeaderboardRow.tsx.
- **Context:** `apps/leaderboard-screen/src/components/LeaderboardRow.tsx:67-89` (анимация, prop positionChanged), `apps/leaderboard-screen/src/hooks/useLeaderboard.ts` (Task 3 — как state обновляется)
- **Verify:** При изменении позиции в рейтинге — CSS transition срабатывает

### Task 5: Тесты

- **Files:** `apps/game-api/src/routes/__tests__/leaderboard-stream.test.ts` (create), `apps/leaderboard-screen/src/hooks/__tests__/useLeaderboard.test.ts` (create)
- **Depends on:** Task 1, Task 2, Task 3
- **Scope:** M
- **What:** Server: SSE endpoint отправляет event при processEvent(), connection cleanup при close. Client: hook переключается на EventSource, fallback на polling при ошибке.
- **Context:** `apps/game-api/src/routes/__tests__/game-events.test.ts` (паттерн тестов), Task 1-3 файлы
- **Verify:** `npm test --workspace=apps/game-api && npm test --workspace=apps/leaderboard-screen` — зелёные

### Task 6: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Полный validation: lint, types, tests обоих workspace'ов.
- **Context:** —
- **Verify:** `npm test --workspace=apps/game-api && npm test --workspace=apps/leaderboard-screen && npm run lint` — всё зелёное

## Execution

- **Mode:** sub-agents
- **Parallel:** true
- **Reasoning:** 5 tasks + validation. Task 1, 2 (server) и Task 3 (client) не имеют общих файлов — параллелятся. Task 4 зависит от 3, Task 5 от 1-3. Все в одной кодовой базе, координация между server/client не нужна до интеграции.
- **Order:**
  ```
  Group 1 (parallel):
    Task 1: SSE endpoint
    Task 2: Push logic
    Task 3: Client EventSource
  ─── barrier ───
  Group 2 (sequential):
    Task 4: Анимация (depends on Task 3)
  ─── barrier ───
  Group 3 (sequential):
    Task 5: Тесты (depends on 1, 2, 3)
    Task 6: Validation (depends on all)
  ```

## Resolved questions

1. **Транспорт?** → SSE (DD-1)
2. **Fallback polling?** → Да, при потере SSE (DD-3)
3. **Push payload?** → Полный state (DD-2)
4. **Auth на SSE?** → Нет — leaderboard публичные данные, экран в закрытой сети
5. **Анимация при initial load?** → Нет — только при изменении после подключения

## Verification

- `npm test --workspace=apps/game-api` — все тесты зелёные
- `npm test --workspace=apps/leaderboard-screen` — все тесты зелёные
- player-station отправляет score_update → leaderboard обновляется без перезагрузки
- Анимация смены позиции срабатывает
- Обрыв SSE → fallback на polling, данные не теряются
- 3 leaderboard-screen одновременно → все получают обновления

## Materials

- `apps/leaderboard-screen/src/hooks/useLeaderboard.ts:23` — polling
- `apps/leaderboard-screen/src/components/LeaderboardRow.tsx:67-89` — анимация
- `apps/game-api/src/services/leaderboard.service.ts:34-67` — processEvent()
- `apps/game-api/src/routes/game-events.ts:71` — точка входа событий
