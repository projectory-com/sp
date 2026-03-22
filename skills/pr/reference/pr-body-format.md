# Формат PR body

Форматы, маппинг секций и маркеры для агента `pr-body-generator`.

## SP markers

Оборачивай контент в маркеры:

```markdown
<!-- sp:start -->

...контент...

<!-- sp:end -->
```

При update — заменяй только контент между маркерами. Текст вне маркеров принадлежит пользователю.

## Формат sp_full (review + report)

```markdown
<!-- sp:start -->

## Summary

<1-3 предложения из review "Контекст и цель">

## Attention

<Ключевые участки из review — файлы и строки, на что смотреть при ревью>

## Design decisions

<Сложные решения из review — что выбрано и почему>

## Questions

<Вопросы к ревьюеру из review>

## Risks

<Риски из review>

## Test plan

<Manual verification из report как GitHub checkboxes>

- [ ] <сценарий 1>
- [ ] <сценарий 2>

## Changes

<Changes summary из report — таблица файлов>

| Файл | Action | Описание |
| ---- | ------ | -------- |
| ...  | ...    | ...      |

## Commits

<Список коммитов>

## Validation

<Validation results из report>

---

<!-- sp:end -->
```

## Формат sp_partial (только report)

Секции Attention, Design decisions, Questions, Risks — опустить (нет review).

```markdown
<!-- sp:start -->

## Summary

<Summary из report Tasks table + коммитов>

## Test plan

<Manual verification из report>

## Changes

<Changes из report>

## Commits

<Список коммитов>

---

<!-- sp:end -->
```

## Формат fallback (нет артефактов sp)

```markdown
<!-- sp:start -->

## Summary

<Сгенерированное summary из коммитов>

## Changes

| Файл | +/- |
| ---- | --- |
| ...  | ... |

## Commits

<git log>

## Test plan

- [ ] ...

---

<!-- sp:end -->
```

## Маппинг review → PR body

| Секция review              | Секция PR        |
| -------------------------- | ---------------- |
| Контекст и цель            | Summary          |
| Ключевые участки для ревью | Attention        |
| Сложные решения            | Design decisions |
| Вопросы к ревьюеру         | Questions        |
| Риски и влияние            | Risks            |

## Маппинг report → PR body

| Секция report         | Секция PR                     |
| --------------------- | ----------------------------- |
| Tasks table (статусы) | Summary (дополнение)          |
| Manual verification   | Test plan (GitHub checkboxes) |
| Changes summary       | Changes                       |
| Commits list          | Commits                       |
| Validation results    | Validation                    |

## PR template интеграция

Если существует `.github/pull_request_template.md`:

1. Заполнить секции template данными по маппингу заголовков:
   - `## Summary` / `## Description` / `## What` → "Контекст и цель" из review
   - `## Test plan` / `## Testing` / `## How to test` → manual verification из report
   - `## Ticket` / `## Issue` / `## Related` → auto-link из ticket ID
2. Секции без маппинга — оставить пустыми
3. sp-секцию (`<!-- sp:start/end -->`) добавить после template-секций

## Auto-link

| Ticket ID  | Формат             |
| ---------- | ------------------ |
| `#86`      | `Closes #86`       |
| `R2-208`   | `Ticket: R2-208`   |
| `PROJ-123` | `Ticket: PROJ-123` |
| none       | опустить           |

## Auto-labels

| Commit type | Label         |
| ----------- | ------------- |
| feat        | enhancement   |
| fix         | bug           |
| refactor    | maintenance   |
| docs        | documentation |

Назначать label только если он существует в `AVAILABLE_LABELS`.

## Логика update

1. Получить текущий PR body
2. Если содержит `<!-- sp:start -->` → заменить контент между маркерами
3. Если маркеров нет → вставить sp-секцию перед body
4. Текст вне маркеров сохранить
