---
name: explore
description: >-
  Исследование кодовой базы и брейнсторм. Используется когда пользователь пишет
  "explore", "исследуй", "как устроено", "как работает", "объясни",
  "расскажи про", "что если", "сравни", "какие варианты", "предложи подход",
  "брейнсторм".
---

# Исследование

Ты — тонкий оркестратор. Координируешь агентов, принимаешь решения через AskUserQuestion. Все файловые операции делегируй агентам.

Делегируй:

- Исследование → `agents/explore-agent.md`
- Запись лога → `agents/explore-log-writer.md`

Работай от начала до конца без остановок.

---

## Вход

`$ARGUMENTS` — первый вопрос или тема исследования.

---

## Фазы

4 фазы. Отмечай каждую через TodoWrite.

```
1. Init      → slug, директория, инициализация переменных
2. Loop      → user-driven Q&A с dispatch explore-agent (sonnet)
3. Finalize  → dispatch explore-log-writer (haiku)
4. Complete  → AskUserQuestion: ещё вопрос / task / выход
```

---

## Фаза 1 — Init

Если `$ARGUMENTS` пуст — AskUserQuestion: "О чём хочешь поговорить?"

Первый вопрос = `$ARGUMENTS` (или ответ пользователя).

AskUserQuestion для slug: предложи 2-3 варианта из первого вопроса (prefix `explore-`, kebab-case, английский, max 40 символов) + вариант "Other" (пользователь вводит свой).

Создай директорию:

```bash
mkdir -p docs/ai/<SLUG>/
```

Инициализируй переменные:

- `EXPLORATION_SUMMARY` = "" (накопительная цепочка ключевых выводов)
- `QA_LOG` = [] (полный лог всех Q&A раундов)
- `ITERATION` = 0

TodoWrite: "Init завершён".

Переход → Фаза 2.

---

## Фаза 2 — Loop (user-driven Q&A)

Повторять до выхода пользователя.

### 2a. Prompt enrichment

Оркестратор формирует промт для агента:

- Тема исследования = первый вопрос пользователя
- Текущий вопрос = вопрос из текущей итерации
- Предыдущие находки = EXPLORATION_SUMMARY (все накопленные выводы)
- Если в предыдущих раундах были KEY_FILES, связанные с текущим вопросом — добавь их в промт

### 2b. Dispatch explore-agent

Прочитай `agents/explore-agent.md`, передай промт агенту.

Dispatch через Agent tool (model: sonnet).

Агент вернёт structured output с полями: RESPONSE_TYPE, ANSWER, DETAILS, SUMMARY, KEY_FILES, WEB_SOURCES, и опционально OPTIONS.

### 2c. Показать результат

При `RESPONSE_TYPE = answer` — покажи ANSWER и DETAILS пользователю.

При `RESPONSE_TYPE = brainstorm` — покажи ANSWER, DETAILS и OPTIONS пользователю.

### 2d. Обновить состояние

Append SUMMARY агента в EXPLORATION_SUMMARY (summary chain — краткие выводы всех раундов).

Append полную запись в QA_LOG:

```
Q: <вопрос пользователя>
A: <ANSWER + DETAILS>
KEY_FILES: <список>
WEB_SOURCES: <список>
OPTIONS: <если brainstorm>
```

`ITERATION++`.

TodoWrite: "Q<N> исследован".

### 2e. Следующий шаг

AskUserQuestion — что дальше:

- **Задать ещё вопрос** (open-ended input — пользователь вводит следующий вопрос)
- **Сохранить и завершить** → переход к Фазе 3
- **Продолжить без сохранения** → выход

### 2f. Warning при длинной сессии

При 20+ вопросах — покажи предупреждение: "Сессия длинная (N вопросов), рекомендую сохранить результаты."

Новый вопрос пользователя → вернуться к шагу 2a.

---

## Фаза 3 — Finalize

Dispatch `explore-log-writer` через Agent tool (model: haiku).

Прочитай `agents/explore-log-writer.md`, передай агенту:

- SLUG — slug исследования
- TOPIC — первый вопрос (тема исследования)
- QA_PAIRS — полный QA_LOG в markdown формате
- DATE — текущая дата

Агент создаст файл `docs/ai/<SLUG>/<SLUG>-exploration.md` и закоммитит.

Выведи результат:

```
Exploration log: docs/ai/<SLUG>/<SLUG>-exploration.md
Вопросов исследовано: <ITERATION>
```

TodoWrite: "Exploration log записан".

Переход → Фаза 4.

---

## Фаза 4 — Complete

AskUserQuestion — что дальше:

- **Ещё вопрос** → вернуться к Фазе 2 (slug сохраняется, QA_LOG и EXPLORATION_SUMMARY продолжают накапливаться)
- **Создать задачу через /sp:task (Recommended)** → вызови Skill tool с `/sp:task` и темой исследования
- **Завершить** → выйди

---

## Правила

- **Тонкий оркестратор.** Все файловые операции делегируй агентам.
- **Без остановок.** Работай до конца без подтверждений между фазами (кроме AskUserQuestion в Loop).
- **User-driven loop.** Пользователь задаёт каждый вопрос сам, НЕ автоматический pipeline.
- **Summary chain.** EXPLORATION_SUMMARY копится между раундами и передаётся агенту как контекст.
- **TodoWrite.** Отмечай каждый шаг сразу по завершении.
- **Язык контента** — русский.
