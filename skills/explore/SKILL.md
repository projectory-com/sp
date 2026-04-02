---
name: explore
description: >-
  Исследование кодовой базы и брейнсторм. Активируется когда пользователь пишет
  "explore", "explain", "compare", "what if", "brainstorm",
  "исследуй", "разберись", "проанализируй", "как устроено", "как работает",
  "объясни", "расскажи про", "почему", "что если", "сравни", "какие варианты",
  "предложи подход", "покажи архитектуру", "брейнсторм".
---

# Исследование

Оркестрируй исследование. Принимай решения через AskUserQuestion. Файловые операции делегируй агентам.

Делегируй:

- Исследование → `agents/explore-agent.md`
- Запись лога → `agents/explore-log-writer.md`

Работай без остановок.

---

## Вход

`$ARGUMENTS` — первый вопрос или тема исследования.

---

## Фазы

3 фазы.

```
1. Init      → инициализация переменных
2. Loop      → user-driven Q&A с dispatch explore-agent (sonnet)
3. Finalize  → slug, dispatch explore-log-writer (haiku)
```

---

## Фаза 1 — Init

Если `$ARGUMENTS` пуст — спроси через AskUserQuestion: "О чём хочешь поговорить?"

Первым вопросом считай `$ARGUMENTS` или ответ пользователя.

Прочитай `agents/explore-agent.md` — используй во всех итерациях Loop без повторного чтения.

Инициализируй переменные:

- `EXPLORATION_SUMMARY` = "" (накопительная цепочка ключевых выводов)
- `QA_LOG` = [] (полный лог всех Q&A раундов)
- `ITERATION` = 0

Переход → Фаза 2.

---

## Фаза 2 — Loop (user-driven Q&A)

Повторяй до выхода пользователя.

### 2a. Prompt enrichment

Оркестратор формирует промт для агента:

- Тема исследования = первый вопрос пользователя
- Текущий вопрос = вопрос из текущей итерации
- Предыдущие находки = EXPLORATION_SUMMARY

### 2b. Dispatch explore-agent

Dispatch через Agent tool (model: sonnet). Файл агента уже прочитан в Init.

Агент вернёт structured output: RESPONSE_TYPE, ANSWER, DETAILS, SUMMARY, KEY_FILES, WEB_SOURCES. При открытом вопросе — также OPTIONS.

### 2c. Показать результат

При `RESPONSE_TYPE = answer` — покажи ANSWER и DETAILS пользователю.

При `RESPONSE_TYPE = brainstorm` — покажи ANSWER, DETAILS и OPTIONS пользователю.

### 2d. Обновить состояние

Добавь SUMMARY агента в EXPLORATION_SUMMARY.

Добавь полную запись в QA_LOG:

```
Q: <вопрос пользователя>
A: <ANSWER + DETAILS>
KEY_FILES: <список>
WEB_SOURCES: <список>
OPTIONS: <если brainstorm>
```

`ITERATION++`.

### 2e. Следующий шаг

AskUserQuestion — что дальше:

- **Задать ещё вопрос**
- **Сохранить и завершить** → переход к Фазе 3
- **Продолжить без сохранения** → завершить скилл, лог не записывать

### 2f. Warning при длинной сессии

При 20+ вопросах — предупреди: "Сессия длинная (N вопросов), рекомендую сохранить результаты."

Новый вопрос пользователя → вернуться к шагу 2a.

---

## Фаза 3 — Finalize

Через AskUserQuestion предложи 2-3 slug-варианта по теме исследования (prefix `explore-`, kebab-case, английский, до 40 символов). Добавь вариант "Other" для ввода вручную.

Dispatch `explore-log-writer` через Agent tool (model: haiku).

Прочитай `agents/explore-log-writer.md` и передай агенту:

- SLUG — slug исследования
- TOPIC — первый вопрос (тема исследования)
- QA_PAIRS — полный QA_LOG в markdown формате
- DATE — текущая дата

Агент создаст файл `docs/ai/<SLUG>/<SLUG>-exploration.md`.

Выведи результат:

```
Exploration log: docs/ai/<SLUG>/<SLUG>-exploration.md
Вопросов исследовано: <ITERATION>
```

TodoWrite: "Exploration log записан".

---

## Правила

- Делегируй файловые операции агентам — сам не выполняй.
- Работай без подтверждений между фазами; AskUserQuestion в Init и Loop.
- Жди вопросов от пользователя.
- Накапливай выводы в EXPLORATION_SUMMARY и передавай агенту как контекст.
- Отмечай фазы через TodoWrite (Init, Finalize), не каждый вопрос.
- Язык контента — русский.
