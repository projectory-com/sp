# Пример: simple-задача

Полный one-shot пример. Показывает:

- уровень детализации Context для сложности **simple**
- Verification с конкретными командами
- трансформацию findings агентов в секции файла

---

## Вход — тикет

```
GitHub Issue #112
Заголовок: Add password reset via email

Описание:
Users can't reset their password if they forget it.
Need to add "Forgot password?" flow:
1. User enters email on /forgot-password page
2. System sends reset link to email
3. User clicks link → goes to /reset-password?token=xxx
4. User sets new password

Figma: https://figma.com/file/aB3k.../forgot-password
```

---

## Что нашли агенты (findings фазы Investigate)

> Внутренние заметки оркестратора, в итоговый файл не попадают.
> Показывают трансформацию findings агентов в секции Context / Constraints / Verification.

**task-explorer нашёл:**

- Аутентификация: `src/auth/` — `login.ts`, `register.ts`, `middleware.ts`
- User model: `src/models/User.ts:1–89`, поле `passwordHash` (bcrypt), поля `resetToken` и `resetTokenExpiry` **есть в схеме** (строки 34–35), но не используются
- Email: `src/services/email.ts` — обёртка над nodemailer, метод `send(to, subject, html)` (строка 12)
- Роутер: `src/routes/auth.ts` — регистрирует `/login` и `/register`, точка добавления маршрутов (строка 28)
- Тесты: `src/auth/__tests__/login.test.ts`, `register.test.ts` — паттерн понятен, покрытие ~90%
- Нет тестов на email.ts
- Essential files: `src/models/User.ts`, `src/auth/login.ts`, `src/services/email.ts`, `src/routes/auth.ts`

**task-architect нашёл:**

- Паттерн handler: все auth-handlers — async функции `(req, res) => void`, валидация через `zod` (src/auth/login.ts:8–19), ошибки через `AppError` (src/utils/errors.ts:5)
- Конфиг: `src/config/index.ts` — `APP_URL`, `EMAIL_FROM` уже есть
- Токены в проекте генерируются через `crypto.randomBytes` (пример: src/auth/register.ts:31)
- Срок жизни токена как константа не задан — уточни у пользователя

---

## Итоговый task-файл

> Этот файл записывается в `docs/ai/112-password-reset-email/112-password-reset-email-task.md`

---

# Add password reset via email

**Тикет:** https://github.com/org/repo/issues/112
**Сложность:** simple

## Task

Реализовать flow сброса пароля через email: endpoint запроса сброса,
отправка письма со ссылкой, endpoint установки нового пароля по токену.
Напиши план (файлы + порядок), жди подтверждения перед реализацией.

## Context

Аутентификация живёт в `src/auth/` — `login.ts`, `register.ts`, `middleware.ts`.
Новые handlers добавляй туда же, маршруты регистрируй в `src/routes/auth.ts:28`.

Паттерн handler (повтори точно): async `(req, res) => void`, валидация через zod
(пример: `src/auth/login.ts:8–19`), ошибки через `AppError` (`src/utils/errors.ts:5`).

User model (`src/models/User.ts:34–35`) — поля `resetToken` и `resetTokenExpiry`
есть в схеме, не используются. Миграция не нужна.

Email: `src/services/email.ts:12` — метод `send(to, subject, html)`, готов к использованию.
Токены генерируй через `crypto.randomBytes` (паттерн: `src/auth/register.ts:31`).
Конфиг `APP_URL` и `EMAIL_FROM` — `src/config/index.ts`.

Тесты: `src/auth/__tests__/` — образец структуры в `login.test.ts`.

## Requirements

1. `POST /auth/forgot-password` — принимает `{ email }`, находит пользователя,
   записывает `resetToken` и `resetTokenExpiry` в User, отправляет письмо со ссылкой
   `APP_URL/reset-password?token=<token>`. Если email не найден — возвращает 200
   (не раскрывать существование аккаунта).
2. `POST /auth/reset-password` — принимает `{ token, newPassword }`, проверяет токен
   и срок жизни, обновляет `passwordHash`, очищает `resetToken` и `resetTokenExpiry`.
3. Невалидный или истёкший токен → 400 с сообщением об ошибке.
4. Напиши тесты для обоих endpoints по образцу `src/auth/__tests__/login.test.ts`.

## Constraints

- Существующие auth-endpoints (`/login`, `/register`) и их тесты не изменять.
- Схему User model не изменять — поля `resetToken` / `resetTokenExpiry` есть.
- Новые зависимости не добавлять — использовать `src/services/email.ts` и `crypto`.
- Email-шаблон — plain HTML без внешних шаблонизаторов.

## Verification

- `npm test src/auth/__tests__/forgot-password.test.ts` — все тесты зелёные
- `npm test` — общий suite без новых failures
- `POST /auth/forgot-password` с существующим email → 200, письмо отправлено,
  `resetToken` и `resetTokenExpiry` записаны в БД
- `POST /auth/forgot-password` с несуществующим email → 200 (не 404)
- `POST /auth/reset-password` с валидным токеном → 200, пароль обновлён,
  `resetToken` и `resetTokenExpiry` очищены
- `POST /auth/reset-password` с истёкшим токеном → 400
- `POST /auth/reset-password` с несуществующим токеном → 400
- Повторное использование токена после успешного сброса → 400

## Материалы

- [Figma — forgot password flow](https://figma.com/file/aB3k.../forgot-password)
- `src/models/User.ts` — поля resetToken / resetTokenExpiry (строки 34–35)
- `src/services/email.ts` — метод send()
- `src/auth/login.ts` — образец паттерна handler + zod валидация
- `src/auth/__tests__/login.test.ts` — образец структуры тестов
