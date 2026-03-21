# Пример: complex-задача

Полный one-shot пример. Показывает:

- работу параллельных агентов на сложной задаче
- Context с data flow и `file:line` ссылками для сложности **complex**
- Output Format «2 подхода с trade-offs» при конфликте паттернов от task-architect
- Constraints из конкретных архитектурных рисков
- Verification для многослойных изменений

---

## Вход — тикет

```
YouTrack RSA-44
Заголовок: Добавить real-time уведомления о событиях игры на leaderboard-экране

Описание:
Leaderboard обновляется только при перезагрузке страницы.
Изменения рейтинга (новый рекорд, смена позиции) должны отображаться
в реальном времени без перезагрузки.

Затронуто:
- leaderboard-screen (React, клиент)
- game-api (Node.js/Express, сервер)
- player-station — источник событий

Дизайн: анимация смены позиции описана в компоненте LeaderboardRow,
но триггер для её вызова отсутствует.
```

---

## Что нашли агенты (findings фазы Investigate)

> Внутренние заметки оркестратора, в итоговый файл не попадают.
> Три параллельных запуска: task-explorer x2, task-architect x2.

### task-explorer — архитектура leaderboard

**Клиент (`apps/leaderboard-screen/`):**

- `src/components/Leaderboard.tsx:1–120` — главный компонент, данные через
  `useLeaderboard()` hook (`src/hooks/useLeaderboard.ts:1–45`)
- `useLeaderboard` делает `fetch('/api/leaderboard')` каждые 30 секунд (polling,
  строка 23). Никакого WebSocket или SSE.
- `src/components/LeaderboardRow.tsx:67–89` — анимация смены позиции реализована:
  `positionChanged` prop триггерит CSS transition. Всегда `false`, не используется.
- Стейт: локальный `useState` в `useLeaderboard`, нет глобального стора.

**Сервер (`apps/game-api/`):**

- `src/routes/leaderboard.ts:1–55` — `GET /api/leaderboard` → читает из PostgreSQL
- `src/routes/game-events.ts:1–88` — `POST /api/game-events` — player-station
  отправляет сюда события (`score_update`, `player_join`, `player_leave`)
- Событие записывается в БД (`src/services/leaderboard.service.ts:34–67`),
  push отсутствует — клиент узнает при следующем polling.

**Essential files:**
`src/hooks/useLeaderboard.ts`, `src/components/Leaderboard.tsx`,
`src/routes/game-events.ts`, `src/services/leaderboard.service.ts`,
`src/routes/leaderboard.ts`

### task-explorer — похожие паттерны в проекте

- `apps/player-station/src/services/ws.service.ts:1–112` — **WebSocket есть**
  в player-station для связи с game-api. Паттерн: `ws://`, reconnect-логика,
  JSON-сообщения с полем `type`.
- `apps/game-api/src/services/ws.server.ts:1–78` — WS-сервер на game-api стороне,
  обслуживает player-station соединения. Broadcast метод есть: `broadcast(type, payload)`
  (строка 61), но используется только для player-station клиентов.
- **Конфликт:** player-station использует `ws` пакет напрямую. В `package.json` game-api Socket.IO отсутствует — только нативный `ws`.

### task-architect — анализ архитектуры (запуск 1: minimal changes)

**Подход A — расширить существующий WS-сервер:**
`ws.server.ts` умеет broadcast. Добавить leaderboard-screen как второй тип клиента.
При `POST /api/game-events` → `leaderboard.service` вызывает `ws.server.broadcast('leaderboard_update', newState)`.
Клиент: заменить polling в `useLeaderboard` на WS-соединение.

Риски: ws.server.ts написан под player-station протокол (строки 23–45 — хардкод типов сообщений). Второй тип клиента потребует рефакторинга connection management.

### task-architect — анализ архитектуры (запуск 2: clean architecture)

**Подход B — SSE (Server-Sent Events):**
Leaderboard — read-only поток данных сервер → клиент.
SSE проще WebSocket: нативный `EventSource`,
без handshake, без бинарного протокола, через стандартный HTTP.

Новый endpoint `GET /api/leaderboard/stream` — SSE. При событии в
`leaderboard.service` — push в открытые SSE-соединения.
Клиент: `useLeaderboard` добавляет `EventSource`, polling оставить как fallback.

Риски: управление списком активных SSE-соединений в `leaderboard.service`
(memory leak при незакрытых соединениях). Лимит 6 соединений HTTP/1.1 на домен — leaderboard-screen всегда один таб, не проблема.

**Вывод task-architect:** оба подхода валидны. Подход A быстрее (меньше новых файлов).
Подход B чище архитектурно, player-station протокол не затрагивает.

---

## Итоговый task-файл

> Записывается в `docs/ai/RSA-44-leaderboard-realtime/RSA-44-leaderboard-realtime-task.md`

---

# Real-time обновление leaderboard

**Тикет:** https://youtrack.example.com/issue/RSA-44
**Сложность:** complex

## Task

Доставить события изменения рейтинга от game-api к leaderboard-screen
в реальном времени — без polling, с триггером анимации в `LeaderboardRow`.

Предложи 2 подхода с trade-offs (см. Requirements). После выбора
напиши план файлов и порядок изменений, жди подтверждения перед кодом.

## Context

### Data flow сейчас

```
player-station → POST /api/game-events → leaderboard.service (пишет в БД)
                                                    ↓ (ничего)
leaderboard-screen → GET /api/leaderboard (polling каждые 30 сек)
                     ↑
              useLeaderboard.ts:23
```

### Data flow после

```
player-station → POST /api/game-events → leaderboard.service
                                                    ↓ push
leaderboard-screen ←————————————————————————————————
```

### Клиент

`apps/leaderboard-screen/src/hooks/useLeaderboard.ts:23` — polling каждые 30 сек,
точка замены на real-time соединение.

`apps/leaderboard-screen/src/components/LeaderboardRow.tsx:67–89` — анимация
смены позиции реализована, prop `positionChanged` всегда `false`. Передай `true`
при получении обновления.

Стейт локальный в `useLeaderboard` (`useState`, строка 12) — достаточно вызвать
`setLeaderboard(newData)` при получении события.

### Сервер

`apps/game-api/src/routes/game-events.ts:1–88` — точка входа событий от player-station.
После записи в БД вызывает `leaderboard.service.processEvent()` (строка 71) —
точка добавления push.

`apps/game-api/src/services/leaderboard.service.ts:34–67` — `processEvent()` обновляет
рейтинг и возвращает новый leaderboard state. Добавь push-логику здесь.

**Существующий WS:** `apps/game-api/src/services/ws.server.ts:61` — метод `broadcast(type, payload)`
обслуживает только player-station клиентов. Протокол хардкодирован (строки 23–45).

Зависимости: `ws` пакет есть в game-api. Socket.IO отсутствует.

### Тесты

`apps/game-api/src/routes/__tests__/game-events.test.ts` — integration тесты,
моки для `leaderboard.service`. Паттерн для новых тестов.

`apps/leaderboard-screen/src/hooks/__tests__/` — директория существует, пуста.

## Requirements

Реализуй один из двух подходов — выбери после ответа на уточняющий вопрос #1.

**Подход A — расширить WebSocket:**

1. Рефакторить `ws.server.ts` — добавить типизацию клиентов (`player-station` vs `leaderboard`), сохранив обратную совместимость с player-station протоколом.
2. При `processEvent()` в `leaderboard.service` — вызвать `ws.server.broadcast('leaderboard_update', newState)` только для leaderboard-клиентов.
3. В `useLeaderboard.ts` — заменить polling на WS-соединение, при `leaderboard_update` вызвать `setLeaderboard`.
4. Написать тесты: broadcast вызывается при processEvent, клиент обновляет стейт.

**Подход B — SSE:**

1. Добавить `GET /api/leaderboard/stream` — SSE endpoint, регистрирует соединение в `leaderboard.service`.
2. `leaderboard.service` хранит список активных SSE-клиентов, при `processEvent()` — push всем.
3. Закрытие соединения (`req.on('close')`) — удалять из списка (предотвратить memory leak).
4. В `useLeaderboard.ts` — добавить `EventSource('/api/leaderboard/stream')`, polling оставить как fallback при ошибке соединения.
5. Написать тесты: SSE endpoint отправляет событие, fallback на polling при обрыве.

## Constraints

- Протокол player-station <-> game-api WS — `ws.server.ts:23–45` (хардкод типов) менять только при Подходе A, с сохранением обратной совместимости.
- `LeaderboardRow.tsx` не изменять — передавай `positionChanged` prop из родителя.
- Socket.IO не добавлять — в проекте только нативный `ws`.
- Polling в `useLeaderboard.ts:23` убрать (Подход A) или оставить как fallback (Подход B) — два параллельных источника данных без fallback-логики недопустимы.
- `apps/player-station/` не трогать — изменения только в `game-api` и `leaderboard-screen`.

## Verification

- `npm test --workspace=apps/game-api` — все тесты зелёные
- `npm test --workspace=apps/leaderboard-screen` — все тесты зелёные
- player-station отправляет `score_update` → leaderboard-screen обновляется без перезагрузки, анимация смены позиции срабатывает
- Обрыв соединения leaderboard-screen → реконнект без потери данных
- player-station соединение (WS) после деплоя работает без изменений
- Открыть 3 leaderboard-screen одновременно → все получают обновление
- `processEvent()` вызван → push отправлен до ответа на `POST /api/game-events`

## Материалы

- `apps/leaderboard-screen/src/hooks/useLeaderboard.ts` — polling строка 23
- `apps/leaderboard-screen/src/components/LeaderboardRow.tsx:67–89` — анимация positionChanged
- `apps/game-api/src/services/ws.server.ts:61` — метод broadcast()
- `apps/game-api/src/services/leaderboard.service.ts:34–67` — processEvent()
- `apps/game-api/src/routes/game-events.ts:71` — точка входа событий
