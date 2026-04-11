# Глубокая генерация доменного контекста в bootstrap

**Slug:** 18-bootstrap-deep-doc-generation
**Тикет:** #18
**Сложность:** medium
**Тип:** general

## Task

Создать detect-агент `domain-analyzer` в bootstrap pipeline. Агент извлекает доменный контекст из кода (модели данных, API-эндпоинты, ключевые абстракции, переменные окружения, code workarounds) и передаёт результаты в генераторы CLAUDE.md и sp-context.md.

## Context

### Архитектура области

Bootstrap pipeline работает в 7 фаз. Доменный анализ затрагивает три:

```
Phase 1 Detect  → 5 агентов параллельно → добавить 6-го (domain-analyzer)
Phase 2 Synthesize → PROJECT_PROFILE → добавить секцию domain
Phase 3 Generate → claude-md-generator + sp-context-generator → передать DOMAIN_FINDINGS
```

Пять detect-агентов анализируют инфраструктуру: стек, команды, naming, структуру директорий. Ни один не извлекает доменную логику из кода: не анализирует моделей данных, API-контрактов, абстракций.

### Файлы для изменения

- `skills/bootstrap/agents/domain-analyzer.md` — **создать** новый detect-агент
- `skills/bootstrap/SKILL.md:45,85,118,167,186,196` — добавить 6-й агент в Phase 1, секцию domain в PROJECT_PROFILE, передачу DOMAIN_FINDINGS в Phase 3
- `skills/bootstrap/agents/claude-md-generator.md:15-20,41-53` — вход DOMAIN_FINDINGS, использование для data flow, env vars, non-obvious
- `skills/bootstrap/agents/sp-context-generator.md:13-18,34-66` — вход DOMAIN_FINDINGS, 4 новые секции
- `skills/bootstrap/reference/claude-md-template.md:33-85,159-169` — секция Environment, обогащение data flow и Non-obvious placeholders
- `skills/bootstrap/reference/quality-criteria.md:33-40` — уточнение критерия Non-obvious
- `skills/bootstrap/agents/bootstrap-verifier.md` — проверка новых секций sp-context.md

### Паттерны для повторения

Все detect-агенты следуют единому паттерну: YAML frontmatter с `name`, `description`, `tools`, `model`, `color`; шаги с bash/glob/grep/read командами (read-only); Structured Output в YAML-блоке; секция "Правила" с ограничениями.

`existing-rules-detector.md` — ближайший аналог: structured output в YAML с вложенными списками.

`task-explorer.md` (`skills/task/agents/task-explorer.md`) — референс для глубокого анализа кода: трассировка типов, извлечение API-эндпоинтов, анализ абстракций. Переиспользовать grep-паттерны.

### Тесты

Тестов нет. Верификация — валидация frontmatter и consistency pipeline.

## Requirements

1. Создать `skills/bootstrap/agents/domain-analyzer.md` (модель: sonnet) с 5 шагами:
   - **Доменные модели** — найти определения в `models/`, `entities/`, `types/`, `schemas/`, `domain/` (glob). Найти ключевые слова: `interface`, `type`, `class`, `struct`, `model`, `schema` (grep). Для ORM поискать миграции, Prisma schema, Alembic. Извлечь имена, поля, связи между сущностями.
   - **API-эндпоинты** — найти декораторы роутов: `@Get`, `@Post`, `app.get`, `router.`, `func.*Handler`, `@app.route` (grep). Поискать OpenAPI/Swagger спеки. Извлечь метод HTTP, путь, имя handler.
   - **Ключевые абстракции** — прочитать до 5 файлов из `services/`, `usecases/`, `core/`, `domain/`. Найти публичные интерфейсы и сигнатуры методов.
   - **Env vars** — найти обращения: `process.env`, `os.getenv`, `os.Getenv`, `env::var`, `ENV[` (grep). Поискать `.env.example`, `.env.template`. Извлечь имя и назначение каждой переменной.
   - **Code workarounds** — найти маркеры: `HACK`, `WORKAROUND`, `XXX`, `FIXME`, `NOTE:`, `IMPORTANT:`, `WARNING:` (grep). Извлечь расположение и контекст (строка плюс 2 строки вокруг).
2. Structured output: `DOMAIN_MODELS`, `API_ENDPOINTS`, `KEY_ABSTRACTIONS`, `ENV_VARS`, `CODE_WORKAROUNDS`.
3. Добавить domain-analyzer 6-м параллельным агентом в Phase 1 Detect (`SKILL.md`).
4. Добавить секцию `domain` в PROJECT_PROFILE (Phase 2 Synthesize).
5. Передать DOMAIN_FINDINGS в claude-md-generator и sp-context-generator (Phase 3 Generate).
6. `claude-md-generator` использует DOMAIN_FINDINGS: добавить data flow в Architecture (1-2 предложения), создать секцию Environment, упомянуть code workarounds в Non-obvious.
7. `sp-context-generator` добавляет в sp-context.md четыре секции: Domain Models, API, Key Abstractions, Environment.
8. Добавить секцию Environment в `claude-md-template.md`: для comprehensive и monorepo шаблонов.
9. Обновить критерий Non-obvious в `quality-criteria.md`: упомянуть workarounds из кода.
10. `bootstrap-verifier` проверяет наличие новых секций в sp-context.md (опционально).
11. Без лимитов на количество записей — domain-analyzer решает сам, что ключевое.

## Constraints

- Оставить существующие 5 detect-агентов без изменений — domain-analyzer создать отдельно
- CLAUDE.md < 300 строк — доменные детали за пределами summary выносить в sp-context.md
- `automation-recommender` не требует DOMAIN_FINDINGS — не передавать
- domain-analyzer только читает код: tools Glob, Grep, Read, Bash (без Write/Edit)
- Идемпотентность: sp-context.md перезаписать (Write), CLAUDE.md обновить (Edit с проверкой секций)
- Генерация условна: domain-analyzer извлекает из кода только то, чего нет в DOC_CONTENT
- Расширить sp-context.md (новые секции), оставить существующие 4 без изменений
- Язык контента — русский

## Verification

- `head -1 skills/bootstrap/agents/domain-analyzer.md` → `---` (frontmatter верен)
- `head -1 skills/bootstrap/SKILL.md` → `---`
- `grep -c "domain-analyzer" skills/bootstrap/SKILL.md` → >= 3 (Phase 1, 2, 3)
- `grep -c "DOMAIN_FINDINGS" skills/bootstrap/agents/claude-md-generator.md` → >= 2
- `grep -c "DOMAIN_FINDINGS" skills/bootstrap/agents/sp-context-generator.md` → >= 2
- `grep "Domain Models" skills/bootstrap/agents/sp-context-generator.md` → found
- `grep "Environment" skills/bootstrap/reference/claude-md-template.md` → found
- `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('OK')"` → OK

## Материалы

- `skills/bootstrap/SKILL.md` — оркестратор pipeline
- `skills/bootstrap/agents/existing-rules-detector.md` — паттерн для structured output
- `skills/bootstrap/agents/claude-md-generator.md` — генератор CLAUDE.md
- `skills/bootstrap/agents/sp-context-generator.md` — генератор sp-context.md
- `skills/bootstrap/reference/claude-md-template.md` — шаблоны CLAUDE.md
- `skills/bootstrap/reference/quality-criteria.md` — рубрика качества
- `skills/bootstrap/reference/update-guidelines.md` — правила включения/исключения
- `skills/bootstrap/agents/bootstrap-verifier.md` — верификатор
- `skills/task/agents/task-explorer.md` — референс глубокого анализа кода
