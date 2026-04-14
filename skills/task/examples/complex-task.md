# Example: complex task

A complete one-shot example. Shows:

- parallel agents on a complex task
- Context with data flow and `file:line` references for **complex** complexity
- Output Format "2 approaches with trade-offs" when task-architect finds pattern conflicts
- Constraints derived from concrete architectural risks
- Verification for multi-layer changes

---

## Input — ticket

```
YouTrack RSA-44
Title: Add real-time game-event notifications on the leaderboard screen

Description:
The leaderboard only refreshes on page reload.
Rating changes (new record, position swap) should appear in real time
without a reload.

Affected:
- leaderboard-screen (React, client)
- game-api (Node.js/Express, server)
- player-station — event source

Design: the LeaderboardRow component describes the position-change animation,
but the trigger that invokes it is missing.
```

---

## What the agents found (Investigate findings)

> Internal orchestrator notes; they do not land in the final file.
> Three parallel runs: task-explorer x2, task-architect x2.

### task-explorer — leaderboard architecture

**Client (`apps/leaderboard-screen/`):**

- `src/components/Leaderboard.tsx:1–120` — main component, data via
  `useLeaderboard()` hook (`src/hooks/useLeaderboard.ts:1–45`)
- `useLeaderboard` calls `fetch('/api/leaderboard')` every 30 seconds (polling,
  line 23). No WebSocket or SSE.
- `src/components/LeaderboardRow.tsx:67–89` — position-change animation implemented:
  `positionChanged` prop triggers the CSS transition. Always `false`, unused.
- State: local `useState` in `useLeaderboard`, no global store.

**Server (`apps/game-api/`):**

- `src/routes/leaderboard.ts:1–55` — `GET /api/leaderboard` → reads from PostgreSQL
- `src/routes/game-events.ts:1–88` — `POST /api/game-events` — player-station
  posts events here (`score_update`, `player_join`, `player_leave`)
- Events are written to the DB (`src/services/leaderboard.service.ts:34–67`),
  no push — the client only learns on the next poll.

**Essential files:**
`src/hooks/useLeaderboard.ts`, `src/components/Leaderboard.tsx`,
`src/routes/game-events.ts`, `src/services/leaderboard.service.ts`,
`src/routes/leaderboard.ts`

### task-explorer — similar patterns in the project

- `apps/player-station/src/services/ws.service.ts:1–112` — **WebSocket already exists**
  in player-station for talking to game-api. Pattern: `ws://`, reconnect logic,
  JSON messages with a `type` field.
- `apps/game-api/src/services/ws.server.ts:1–78` — the WS server on the game-api side,
  serving player-station connections. A broadcast method is there: `broadcast(type, payload)`
  (line 61), but it's used only for player-station clients.
- **Conflict:** player-station uses the `ws` package directly. Socket.IO is not in game-api's `package.json` — only the native `ws`.

### task-architect — architecture analysis (run 1: minimal changes)

**Approach A — extend the existing WS server:**
`ws.server.ts` already supports broadcast. Add leaderboard-screen as a second client type.
On `POST /api/game-events` → `leaderboard.service` calls `ws.server.broadcast('leaderboard_update', newState)`.
Client: replace polling in `useLeaderboard` with a WS connection.

Risks: `ws.server.ts` is written for the player-station protocol (lines 23–45 hardcode message types). A second client type will force a refactor of connection management.

### task-architect — architecture analysis (run 2: clean architecture)

**Approach B — SSE (Server-Sent Events):**
The leaderboard is a read-only server → client stream.
SSE is simpler than WebSocket: native `EventSource`,
no handshake, no binary protocol, over standard HTTP.

New endpoint `GET /api/leaderboard/stream` — SSE. On an event in
`leaderboard.service` — push to open SSE connections.
Client: `useLeaderboard` adds `EventSource`, keeps polling as a fallback.

Risks: managing the active SSE connection list in `leaderboard.service`
(memory leak if connections aren't closed). HTTP/1.1 6-connection-per-domain limit — the leaderboard screen is always a single tab, not an issue.

**task-architect verdict:** both approaches are valid. Approach A is faster (fewer new files).
Approach B is architecturally cleaner and leaves the player-station protocol alone.

---

## Final task file

> Written to `docs/ai/RSA-44-leaderboard-realtime/RSA-44-leaderboard-realtime-task.md`

---

# Real-time leaderboard updates

**Slug:** RSA-44-leaderboard-realtime
**Ticket:** https://youtrack.example.com/issue/RSA-44
**Complexity:** complex
**Type:** frontend

## Task

Deliver rating-change events from game-api to leaderboard-screen
in real time — no polling, with the animation trigger in `LeaderboardRow`.

Offer 2 approaches with trade-offs (see Requirements). After the choice
write the plan of files and change order, wait for confirmation before coding.

## Context

### Data flow today

```
player-station → POST /api/game-events → leaderboard.service (writes to DB)
                                                    ↓ (nothing)
leaderboard-screen → GET /api/leaderboard (polling every 30s)
                     ↑
              useLeaderboard.ts:23
```

### Data flow after

```
player-station → POST /api/game-events → leaderboard.service
                                                    ↓ push
leaderboard-screen ←————————————————————————————————
```

### Client

`apps/leaderboard-screen/src/hooks/useLeaderboard.ts:23` — polling every 30s,
the replacement point for a real-time connection.

`apps/leaderboard-screen/src/components/LeaderboardRow.tsx:67–89` — position-change
animation implemented, prop `positionChanged` always `false`. Pass `true`
when an update arrives.

State is local in `useLeaderboard` (`useState`, line 12) — it's enough to call
`setLeaderboard(newData)` on event.

### Server

`apps/game-api/src/routes/game-events.ts:1–88` — entry point for player-station events.
After the DB write it calls `leaderboard.service.processEvent()` (line 71) —
the point to add push.

`apps/game-api/src/services/leaderboard.service.ts:34–67` — `processEvent()` updates
the rating and returns the new leaderboard state. Add push logic here.

**Existing WS:** `apps/game-api/src/services/ws.server.ts:61` — method `broadcast(type, payload)`
serves only player-station clients. Protocol hardcoded (lines 23–45).

Dependencies: `ws` is in game-api. Socket.IO is absent.

### Tests

`apps/game-api/src/routes/__tests__/game-events.test.ts` — integration tests,
mocks for `leaderboard.service`. Pattern for new tests.

`apps/leaderboard-screen/src/hooks/__tests__/` — directory exists, empty.

## Requirements

Implement one of two approaches — pick after answering clarifying question #1.

**Approach A — extend WebSocket:**

1. Refactor `ws.server.ts` — add client typing (`player-station` vs `leaderboard`), keeping the player-station protocol backward-compatible.
2. In `processEvent()` in `leaderboard.service` — call `ws.server.broadcast('leaderboard_update', newState)` for leaderboard clients only.
3. In `useLeaderboard.ts` — replace polling with a WS connection; on `leaderboard_update` call `setLeaderboard`.
4. Write tests: broadcast fires on processEvent, client updates state.

**Approach B — SSE:**

1. Add `GET /api/leaderboard/stream` — SSE endpoint, registers the connection in `leaderboard.service`.
2. `leaderboard.service` keeps a list of active SSE clients; on `processEvent()` push to all.
3. On close (`req.on('close')`) — remove from the list (prevent memory leak).
4. In `useLeaderboard.ts` — add `EventSource('/api/leaderboard/stream')`, keep polling as fallback on connection error.
5. Write tests: SSE endpoint emits the event, polling fallback kicks in on disconnect.

## Constraints

- The player-station ↔ game-api WS protocol — `ws.server.ts:23–45` (hardcoded types) — change only in Approach A, preserving backward compatibility.
- Do not change `LeaderboardRow.tsx` — pass `positionChanged` from the parent.
- Do not add Socket.IO — only the native `ws` is in the project.
- Remove polling in `useLeaderboard.ts:23` (Approach A) or keep as fallback (Approach B) — two parallel data sources without fallback logic are not allowed.
- Do not touch `apps/player-station/` — changes are limited to `game-api` and `leaderboard-screen`.

## Verification

- `npm test --workspace=apps/game-api` — all tests green
- `npm test --workspace=apps/leaderboard-screen` — all tests green
- player-station emits `score_update` → leaderboard-screen updates without reload, position-change animation fires
- leaderboard-screen connection drop → reconnect with no data loss
- player-station connection (WS) works unchanged after deploy
- Open 3 leaderboard-screens at once → all receive updates
- `processEvent()` fires → push sent before the response to `POST /api/game-events`

## Materials

- `apps/leaderboard-screen/src/hooks/useLeaderboard.ts` — polling on line 23
- `apps/leaderboard-screen/src/components/LeaderboardRow.tsx:67–89` — positionChanged animation
- `apps/game-api/src/services/ws.server.ts:61` — method broadcast()
- `apps/game-api/src/services/leaderboard.service.ts:34–67` — processEvent()
- `apps/game-api/src/routes/game-events.ts:71` — event entry point
