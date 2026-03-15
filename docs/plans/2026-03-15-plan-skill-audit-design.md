# Design: аудит и коммит скилла /plan

**Дата:** 2026-03-15
**Тикет:** https://github.com/projectory-com/sp/issues/8
**Статус:** approved

## Контекст

Скилл `/plan` реализован (7 файлов, 922 строки, 10/10 критериев тикета #8). Нужно подготовить репозиторий к коммиту: синхронизировать версии, обновить метаданные, написать документацию.

## Решения

1. **Version bump:** 0.3.0 → 0.4.0 (новый скилл = minor bump)
2. **Документация:** `docs/plan.md`, краткий обзор (50-80 строк)
3. **CLAUDE.md:** два раздела — Implemented skills + Planned skills
4. **Правки task/SKILL.md:** в тот же коммит (поле Slug связано с plan)
5. **Issue #8:** закрыть через `closes #8` в commit message
6. **Стратегия коммита:** один атомарный коммит

## Изменения

| Файл | Действие | Что именно |
|------|----------|------------|
| `skills/plan/` (7 файлов) | add | Весь скилл |
| `skills/task/SKILL.md` | edit | Поле `**Slug:**` в выходном формате |
| `skills/plan/SKILL.md` | edit | Убран "drip-feed", TASK_SLUG из поля Slug |
| `.claude-plugin/plugin.json` | edit | version 0.3.0 → 0.4.0 |
| `.claude-plugin/marketplace.json` | edit | version 0.2.0 → 0.4.0 |
| `CLAUDE.md` | edit | Implemented + Planned skills |
| `docs/plan.md` | create | Краткая документация скилла |

## Commit message

```
feat: implement /plan skill — autonomous plan builder with routing and DAG

closes #8
```
