# Шаблоны CLAUDE.md

Три шаблона для разных типов проектов. Выбирай подходящий, адаптируй под проект.

## Minimal — простой проект

Для скриптов, CLI-утилит, небольших библиотек (1-5 файлов).

```markdown
# CLAUDE.md

## Project

[Название] — [одно предложение: что делает, на чём написан].

## Commands

\`\`\`bash
[package-manager] install # установить зависимости
[package-manager] test # запустить тесты
[package-manager] build # собрать проект
\`\`\`

## Conventions

- [Язык/стиль кода]
- [Формат коммитов]
- [Ключевое соглашение]
```

## Comprehensive — стандартный проект

Для веб-приложений, API-сервисов, библиотек с тестами (5-50 файлов).

```markdown
# CLAUDE.md

## Project

[Название] — [что делает, ключевые технологии, для кого].

## Architecture

\`\`\`
src/
api/ # [роль]
services/ # [роль]
models/ # [роль]
utils/ # [роль]
tests/ # [структура тестов]
config/ # [что конфигурируется]
\`\`\`

[1-2 предложения о data flow: откуда входят данные, как проходят, куда выходят]

## Commands

\`\`\`bash
npm install # установить зависимости
npm run dev # запустить dev-сервер (port XXXX)
npm test # запустить тесты
npm run test:watch # тесты в watch-режиме
npm run lint # линтер
npm run build # production-сборка
\`\`\`

## Key Files

- `src/index.ts` — точка входа
- `src/config.ts` — конфигурация (env vars)
- `src/types.ts` — общие типы

## Conventions

- [Язык]: [версия], [стиль]
- Тесты: [фреймворк], файлы `*.test.ts` рядом с исходниками
- Коммиты: [conventional commits / свой формат]
- Ветки: [стратегия ветвления]

## Non-obvious

- [Почему X сделан так, а не иначе]
- [Известный workaround и причина]
- [Gotcha при работе с Y]
```

## Monorepo — мульти-пакетный проект

Для monorepo с workspace-ами (Turborepo, Nx, pnpm workspaces).

```markdown
# CLAUDE.md

## Project

[Название] — [назначение monorepo].

## Architecture

\`\`\`
apps/
web/ # [фреймворк] — [роль]
api/ # [фреймворк] — [роль]
admin/ # [фреймворк] — [роль]
packages/
ui/ # shared UI-компоненты
config/ # shared конфигурации (tsconfig, eslint)
db/ # Prisma-схема и клиент
utils/ # shared утилиты
\`\`\`

Зависимости между пакетами: `web` → `ui`, `db`, `utils`; `api` → `db`, `utils`.

## Commands

\`\`\`bash
pnpm install # установить все зависимости
pnpm dev # запустить все apps в dev-режиме
pnpm build # собрать все пакеты
pnpm test # тесты во всех пакетах
pnpm --filter web dev # запустить только web
pnpm --filter @scope/ui build # собрать только ui-пакет
\`\`\`

## Per-package notes

### apps/web

- Framework: [Next.js / Remix / etc]
- Port: [XXXX]
- [Специфичные команды или gotchas]

### apps/api

- Framework: [Express / Fastify / etc]
- Port: [XXXX]
- [Миграции БД: команда]

### packages/db

- ORM: [Prisma / Drizzle / etc]
- `pnpm --filter db generate` — сгенерировать клиент после изменения схемы
- `pnpm --filter db migrate` — применить миграции

## Conventions

- Package manager: [pnpm / npm / yarn] с workspaces
- Shared типы: в `packages/types`, импорт через `@scope/types`
- [Стратегия версионирования пакетов]
- [Правила добавления новых пакетов]

## Non-obvious

- [Порядок сборки пакетов важен: сначала X, потом Y]
- [Env vars: корневой .env vs per-app .env.local]
- [Gotcha: при изменении packages/db нужно перегенерировать клиент]
```

## Секции — когда включать

| Секция       | Minimal | Comprehensive | Monorepo |
| ------------ | ------- | ------------- | -------- |
| Project      | да      | да            | да       |
| Architecture | нет     | да            | да       |
| Commands     | да      | да            | да       |
| Key Files    | нет     | да            | нет      |
| Per-package  | нет     | нет           | да       |
| Conventions  | да      | да            | да       |
| Non-obvious  | нет     | да            | да       |
