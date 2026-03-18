# Commit Convention

Conventional Commits, scope = slug задачи, ticket ID из slug.

---

## Формат

```
<type>(<slug>): <описание> [<ticket-id>]
```

Описание — на языке plan-файла. Краткое, одно предложение.

---

## Извлечение ticket ID из slug

Slug содержит ID тикета в начале. Правила:

| Паттерн slug                                   | Ticket ID | Пример     |
| ---------------------------------------------- | --------- | ---------- |
| Начинается с числа: `86-black-jack-page`       | `#86`     | `[#86]`    |
| Начинается с `R\d+-\d+`: `R2-50-user-id-to-db` | `R2-50`   | `[R2-50]`  |
| Без ID: `fix-navbar-overflow`                  | нет       | без скобок |

Regex: `^\d+` → `#<число>`. `^R\d+-\d+` → как есть.

---

## Типы по этапам pipeline

| Этап                      | Тип        | Пример                                           |
| ------------------------- | ---------- | ------------------------------------------------ |
| Task: реализация фичи     | `feat`     | `feat(86-black-jack-page): SSE endpoint [#86]`   |
| Task: тесты               | `test`     | `test(R2-50-user-id-to-db): unit tests [R2-50]`  |
| Task: validation из плана | `chore`    | `chore(86-black-jack-page): validation [#86]`    |
| Polish                    | `refactor` | `refactor(86-black-jack-page): polish [#86]`     |
| Validate fix              | `fix`      | `fix(86-black-jack-page): fix lint errors [#86]` |
| Documentation             | `docs`     | `docs(86-black-jack-page): update docs [#86]`    |
| Format                    | `chore`    | `chore(86-black-jack-page): format [#86]`        |

---

## Правила

- Один коммит на один этап. Не объединять.
- Slug берётся из plan-файла (из пути `docs/ai/<slug>/`).
- Ticket ID извлекается из slug автоматически.
- Не использовать `wip`, `temp`, `misc`.
- Если task содержит и реализацию и тесты — `feat` (тесты вместе с фичей).
- Если task только тесты — `test`.
