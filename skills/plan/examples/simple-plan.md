# Пример: simple-план

Показывает:

- inline mode для простой задачи
- 3 tasks + validation
- Design decisions из кода, не из головы
- Minimal context per task

---

## Вход — task-файл

```
docs/ai/112-password-reset-email/112-password-reset-email-task.md
Сложность: simple
```

---

## Что нашёл plan-explorer

- `src/auth/login.ts:8-19` — паттерн handler: async, zod validation, AppError
- `src/auth/register.ts:31` — crypto.randomBytes для токенов
- `src/models/User.ts:34-35` — поля resetToken/resetTokenExpiry уже в схеме
- `src/services/email.ts:12` — метод send(to, subject, html)
- `src/routes/auth.ts:28` — точка регистрации маршрутов
- Пересечение: `src/routes/auth.ts` трогается в Task 1 и Task 2 (добавление маршрутов)
  но это append-only (разные строки), конфликт маловероятен

---

## Что решил plan-designer

**DD-1:** Token format — crypto.randomBytes(32).toString('hex')
потому что register.ts:31 использует этот паттерн.

**DD-2:** Token expiry — 1 час, константа TOKEN_EXPIRY_MS в config.
Стандарт для security-sensitive операций, нет существующей конвенции в проекте.

**Routing:** 3 tasks, один файл-пересечение (routes/auth.ts) но append-only → inline.

---

## Итоговый plan-файл

> Записывается в `docs/ai/112-password-reset-email/112-password-reset-email-plan.md`

---

# Add password reset via email — план реализации

**Task:** docs/ai/112-password-reset-email/112-password-reset-email-task.md
**Complexity:** simple
**Mode:** inline
**Parallel:** false

## Design decisions

### DD-1: Формат токена сброса

**Решение:** `crypto.randomBytes(32).toString('hex')` — 64-символьная hex строка.
**Обоснование:** Паттерн из `src/auth/register.ts:31` — проект уже использует этот подход.
**Альтернатива:** UUID v4 — нет причин отходить от существующего паттерна.

### DD-2: Срок жизни токена

**Решение:** 1 час. Константа `RESET_TOKEN_EXPIRY_MS = 3600000` в `src/config/index.ts`.
**Обоснование:** Стандарт для чувствительных операций. В проекте нет конвенции для TTL.
**Альтернатива:** 24 часа — менее безопасно для password reset.

## Tasks

### Task 1: forgot-password endpoint

- **Files:** `src/auth/forgot-password.ts` (create), `src/routes/auth.ts:28` (edit — добавить маршрут)
- **Depends on:** none
- **Scope:** M
- **What:** Создать handler POST /auth/forgot-password. Принимает {email}, ищет user, генерирует token, записывает в User, отправляет email. Если email не найден — 200 (не раскрывать).
- **Context:** `src/auth/login.ts:8-19` (паттерн handler+zod), `src/models/User.ts:34-35` (поля), `src/services/email.ts:12` (send), `src/config/index.ts` (APP_URL, EMAIL_FROM)
- **Verify:** `npm test src/auth/__tests__/forgot-password.test.ts` — зелёный

### Task 2: reset-password endpoint

- **Files:** `src/auth/reset-password.ts` (create), `src/routes/auth.ts` (edit — добавить маршрут)
- **Depends on:** Task 1
- **Scope:** M
- **What:** Создать handler POST /auth/reset-password. Принимает {token, newPassword}, проверяет token + expiry, обновляет passwordHash, очищает token fields. Невалидный/истёкший → 400.
- **Context:** `src/auth/forgot-password.ts` (Task 1 — как token записан), `src/models/User.ts:34-35`, `src/auth/login.ts:8-19` (паттерн)
- **Verify:** `npm test src/auth/__tests__/reset-password.test.ts` — зелёный

### Task 3: Тесты обоих endpoints

- **Files:** `src/auth/__tests__/forgot-password.test.ts` (create), `src/auth/__tests__/reset-password.test.ts` (create)
- **Depends on:** Task 1, Task 2
- **Scope:** M
- **What:** Написать тесты по образцу `src/auth/__tests__/login.test.ts`. Покрыть: существующий email → 200 + token в БД, несуществующий → 200, валидный token → 200 + пароль обновлён, истёкший → 400, повторный → 400.
- **Context:** `src/auth/__tests__/login.test.ts` (образец), `src/auth/forgot-password.ts`, `src/auth/reset-password.ts`
- **Verify:** `npm test src/auth/__tests__/` — все зелёные

### Task 4: Validation

- **Files:** —
- **Depends on:** all
- **Scope:** S
- **What:** Запустить полный validation suite.
- **Context:** —
- **Verify:** `npm test && npm run lint` — всё зелёное, 0 новых failures

## Execution

- **Mode:** inline
- **Parallel:** false
- **Reasoning:** 3 задачи + validation, все sequential (Task 2 зависит от Task 1, тесты от обоих), простая задача в одном модуле.
- **Order:** Task 1 → Task 2 → Task 3 → Task 4

## Resolved questions

1. **Срок жизни токена?** → 1 час (DD-2)
2. **Повторный запрос сброса?** → Перезаписать токен — проще, инвалидирует старый
3. **Rate limiting?** → Вне скоупа, отдельный тикет
4. **Формат ссылки?** → Полный URL через APP_URL из конфига
5. **Фронтенд?** → Только API, фронтенд отдельно

## Verification

- `npm test src/auth/__tests__/forgot-password.test.ts` — зелёный
- `npm test src/auth/__tests__/reset-password.test.ts` — зелёный
- `npm test` — общий suite без новых failures
- POST /auth/forgot-password с несуществующим email → 200
- POST /auth/reset-password с истёкшим токеном → 400

## Materials

- `src/models/User.ts:34-35` — поля resetToken / resetTokenExpiry
- `src/services/email.ts:12` — метод send()
- `src/auth/login.ts:8-19` — паттерн handler + zod
- `src/auth/__tests__/login.test.ts` — образец тестов
