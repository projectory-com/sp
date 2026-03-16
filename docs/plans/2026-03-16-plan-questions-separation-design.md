# Разделение вопросов в /plan — дизайн

## Проблема

`/plan` загружает уточняющие вопросы из task-файла (`OPEN_QUESTIONS`) и повторно показывает их в Checkpoint вместе с новыми вопросами от plan-designer. Пользователь видит дубли — те же вопросы что были в `/task`.

`/task` спрашивает про WHAT (scope, requirements, constraints).
`/plan` должен спрашивать про HOW (архитектура, паттерны, trade-offs реализации).

## Решение

Точечные правки в `/plan` SKILL.md — 4 изменения.

### 1. Фаза 1 — Load: переименовать переменную

`OPEN_QUESTIONS` → `TASK_QUESTIONS`. Пометить как контекст для plan-designer, не для повторного показа.

### 2. Фаза 3 — Design: уточнить промпт plan-designer

Текущее:
```
5. OPEN QUESTIONS — только если ответ влияет на реализацию
   и его нет в коде. Максимум 3 новых вопроса.
```

Новое:
```
5. IMPLEMENTATION QUESTIONS — максимум 3. Только про HOW:
   архитектура, паттерны, trade-offs реализации.
   НЕ дублировать вопросы из task-файла (они про scope/requirements).

   Хорошо: «Какой паттерн — Strategy или Template Method?»
   Плохо: «Какие поля нужны в форме?» (scope → task)
```

### 3. Фаза 5 — Checkpoint: две секции вместо одной

Текущее: одна секция "Open questions" со всеми вопросами.

Новое:
```
## Нерешённые вопросы из задачи
(только если в task-файле есть вопросы без чекмарков)

## Вопросы по реализации
(новые от plan-designer — про архитектуру и trade-offs)
```

### 4. plan-format.md: уточнить Resolved questions

В секции `Resolved questions` указать что фиксируются ответы обоих типов: из задачи и по реализации.

## Затрагиваемые файлы

- `skills/plan/SKILL.md` — основные правки (фазы 1, 3, 5)
- `skills/plan/reference/plan-format.md` — формат Resolved questions
