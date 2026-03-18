# Пример: complex-задача

Полный one-shot пример. Показывает:

- как работают параллельные агенты на сложной задаче
- Context с data flow и `file:line` ссылками для сложности **complex**
- Output Format «2 подхода с trade-offs» когда task-architect нашёл конфликт паттернов
- Constraints из конкретных архитектурных рисков
- Verification для многослойных изменений

---

## Вход — тикет

```
YouTrack RSA-44
Заголовок: Добавить real-time уведомления о событиях игры на leaderboard-экране

Описание:
Leaderboard сейчас обновляется только при перезагрузке страницы.
Нужно чтобы изменения рейтинга (новый рекорд, смена позиции) отображались
в реальном времени без перезагрузки.

Затронуто:
- leaderboard-screen (React, клиент)
- game-api (Node.js/Express, сервер)
- player-station — источник событий

Дизайн: анимация смены позиции уже описана в существующем компоненте LeaderboardRow,
просто нет триггера для её вызова.
```

---

## Что нашли агенты (findings фазы Investigate)

> Внутренние заметки оркестратора — в итоговый файл не попадают.
> Три параллельных запуска: task-explorer ×2, task-architect ×2.

### task-explorer — архитектура leaderboard

**Клиент (`apps/leaderboard-screen/`):**

- `src/components/Leaderboard.tsx:1–120` — главный компонент, данные через
  `useLeaderboard()` hook (`src/hooks/useLeaderboard.ts:1–45`)
- `useLeaderboard` делает `fetch('/api/leaderboard')` каждые 30 секунд (polling,
  строка 23). Никакого WebSocket или SSE.
- `src/components/LeaderboardRow.tsx:67–89` — анимация смены позиции уже реализована:
  `positionChanged` prop триггерит CSS transition. Не используется — всегда `false`.
- Стейт: локальный `useState` в `useLeaderboard`, нет глобального стора.

**Сервер (`apps/game-api/`):**

- `src/routes/leaderboard.ts:1–55` — `GET /api/leaderboard` → читает из PostgreSQL
- `src/routes/game-events.ts:1–88` — `POST /api/game-events` — player-station
  отправляет сюда события (`score_update`, `player_join`, `player_leave`)
- Событие записывается в БД (`src/services/leaderboard.service.ts:34–67`),
  после чего **ничего не происходит** — клиент узнает при следующем polling.

**Essential files:**
`src/hooks/useLeaderboard.ts`, `src/components/Leaderboard.tsx`,
`src/routes/game-events.ts`, `src/services/leaderboard.service.ts`,
`src/routes/leaderboard.ts`

### task-explorer — похожие паттерны в проекте

- `apps/player-station/src/services/ws.service.ts:1–112` — **WebSocket уже есть**
  в player-station для связи с game-api. Паттерн: `ws://`, reconnect логика,
  JSON-сообщения с полем `type`.
- `apps/game-api/src/services/ws.server.ts:1–78` — WS-сервер на game-api стороне,
  обслуживает player-station соединения. Broadcast метод есть: `broadcast(type, payload)`
  (строка 61), но используется только для player-station клиентов.
- **Конфликт:** player-station использует `ws` пакет напрямую. В `package.json`
  game-api нет Socket.IO — только нативный `ws`.

### task-architect — анализ архитектуры (запуск 1: minimal changes)

**Подход A — расширить существующий WS-сервер:**
`ws.server.ts` уже умеет broadcast. Добавить leaderboard-screen как второй тип клиента.
При `POST /api/game-events` → `leaderboard.service` вызывает `ws.server.broadcast('leaderboard_update', newState)`.
Клиент: заменить polling в `useLeaderboard` на WS-соединение.

Риски: ws.server.ts написан под player-station протокол (строки 23–45 — хардкод
типов сообщений). Добавление второго типа клиента потребует рефакторинга
connection management.

### task-architect — анализ архитектуры (запуск 2: clean architecture)

**Подход B — SSE (Server-Sent Events):**
Leaderboard — read-only поток данных в одну сторону (сервер → клиент).
SSE проще WebSocket для этого случая: нативный браузерный `EventSource`,
нет handshake, нет бинарного протокола, работает через стандартный HTTP.

Новый endpoint `GET /api/leaderboard/stream` — SSE. При событии в
`leaderboard.service` — push в открытые SSE-соединения.
Клиент: `useLeaderboard` добавляет `EventSource`, polling оставить как fallback.

Риски: нужно управлять списком активных SSE-соединений в `leaderboard.service`
(memory leak если не закрывать). Не работает через HTTP/1.1 с лимитом 6 соединений
на домен — но leaderboard-screen всегда один таб, не проблема.

**Вывод task-architect:** оба подхода валидны. Подход A быстрее (меньше новых файлов),
Подход B чище архитектурно и не трогает player-station протокол.

---

## Итоговый task-файл

> Пишется в `docs/ai/RSA-44-leaderboard-realtime/RSA-44-leaderboard-realtime-task.md`

---

# Real-time обновление leaderboard

**Тикет:** https://youtrack.example.com/issue/RSA-44
**Сложность:** complex

## Task

Добавить real-time доставку событий изменения рейтинга от game-api
к leaderboard-screen — без polling, с триггером существующей анимации
в `LeaderboardRow`.

Предложи 2 подхода с trade-offs (см. Requirements). После выбора —
напиши план файлов и порядок изменений, жди подтверждения, потом код.

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
смены позиции реализована, prop `positionChanged` всегда `false`. Точка подключения —
передать `true` при получении обновления.

Стейт локальный в `useLeaderboard` (`useState`, строка 12) — менять не нужно,
достаточно вызвать `setLeaderboard(newData)` при получении события.

### Сервер

`apps/game-api/src/routes/game-events.ts:1–88` — точка входа событий от player-station.
После записи в БД вызывает `leaderboard.service.processEvent()` (строка 71) —
отсюда нужно тригерить push.

`apps/game-api/src/services/leaderboard.service.ts:34–67` — `processEvent()` обновляет
рейтинг и возвращает новый leaderboard state. Точка добавления push-логики.

**Существующий WS:** `apps/game-api/src/services/ws.server.ts:61` — метод `broadcast(type, payload)` есть,
но обслуживает только player-station клиентов. Протокол хардкодирован (строки 23–45).

Зависимости: `ws` пакет уже есть в game-api. Socket.IO — нет.

### Тесты

`apps/game-api/src/routes/__tests__/game-events.test.ts` — integration тесты,
моки для `leaderboard.service`. Паттерн для новых тестов.

`apps/leaderboard-screen/src/hooks/__tests__/` — директория существует, пуста.

## Requirements

Реализуй один из двух подходов — выбор после ответа на уточняющий вопрос #1.

**Подход A — расширить WebSocket:**

1. Рефакторить `ws.server.ts` — добавить типизацию клиентов (`player-station` vs `leaderboard`), сохранить обратную совместимость с player-station протоколом.
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

- Не изменять протокол player-station ↔ game-api WS — `ws.server.ts:23–45` (хардкод типов) менять только если выбран Подход A, и только с сохранением обратной совместимости.
- Не изменять `LeaderboardRow.tsx` — только передать правильный `positionChanged` prop из родителя.
- Не добавлять Socket.IO — в проекте только нативный `ws`.
- Polling в `useLeaderboard.ts:23` убрать (Подход A) или оставить как fallback (Подход B) — не оставлять два параллельных источника данных без fallback-логики.
- Не трогать `apps/player-station/` — изменения только в `game-api` и `leaderboard-screen`.

## Verification

- `npm test --workspace=apps/game-api` — все тесты зелёные
- `npm test --workspace=apps/leaderboard-screen` — все тесты зелёные
- player-station отправляет `score_update` → leaderboard-screen обновляется
  без перезагрузки, анимация смены позиции срабатывает
- Обрыв соединения leaderboard-screen → реконнект без потери данных
- player-station соединение (WS) продолжает работать без изменений после деплоя
- Открыть 3 leaderboard-screen одновременно → все получают обновление
- `processEvent()` вызван → push отправлен до ответа на `POST /api/game-events`

## Уточняющие вопросы

1. **Какой транспорт выбрать для push от game-api к leaderboard-screen?**
   - [ ] Подход A: расширить существующий WS — меньше новых файлов, трогает ws.server.ts
   - [ ] Подход B: SSE — новый endpoint, не трогает WS-протокол, чище для read-only потока
   - [ ] Свой вариант: \_\_\_

2. **Оставить polling как fallback при потере real-time соединения?**
   - [ ] Да — деградирует до 30-секундного обновления, пользователь не видит разрыва
   - [ ] Нет — показывать индикатор "соединение потеряно", polling не нужен
   - [ ] Свой вариант: \_\_\_

3. **Что отправлять при push — полный leaderboard или только diff?**
   - [ ] Полный state — проще, leaderboard обычно до 20 записей, размер не критичен
   - [ ] Только изменившиеся строки — оптимальнее, сложнее мерджить на клиенте
   - [ ] Свой вариант: \_\_\_

4. **Нужна ли аутентификация на SSE-endpoint или WS-соединении leaderboard-screen?**
   - [ ] Нет — leaderboard публичные данные, экран в закрытой сети выставки
   - [ ] Да — токен как query param при подключении
   - [ ] Свой вариант: \_\_\_

5. **Анимация при первом подключении (initial load) — нужна?**
   - [ ] Нет — анимация только при изменении позиции после подключения
   - [ ] Да — анимировать первую отрисовку как "все появляются"
   - [ ] Свой вариант: \_\_\_

## Материалы

- `apps/leaderboard-screen/src/hooks/useLeaderboard.ts` — polling строка 23
- `apps/leaderboard-screen/src/components/LeaderboardRow.tsx:67–89` — анимация positionChanged
- `apps/game-api/src/services/ws.server.ts:61` — метод broadcast()
- `apps/game-api/src/services/leaderboard.service.ts:34–67` — processEvent()
- `apps/game-api/src/routes/game-events.ts:71` — точка входа событий
