# CLAUDE.md templates

Three templates for different project types. Pick the one that fits and adapt it to the project.

## Minimal — simple project

For scripts, CLI utilities, small libraries (1-5 files).

```markdown
# CLAUDE.md

## Project

[Name] — [one sentence: what it does, what it's written in].

## Commands

\`\`\`bash
[package-manager] install # install dependencies
[package-manager] test # run tests
[package-manager] build # build the project
\`\`\`

## Conventions

- [Language/code style]
- [Commit format]
- [Key convention]
```

## Comprehensive — standard project

For web apps, API services, libraries with tests (5-50 files).

```markdown
# CLAUDE.md

## Project

[Name] — [what it does, key technologies, for whom].

## Architecture

\`\`\`
src/
api/ # [role]
services/ # [role]
models/ # [role]
utils/ # [role]
tests/ # [test structure]
config/ # [what is configured]
\`\`\`

[Data flow: where data comes in → how it flows → where it goes out]

## Commands

\`\`\`bash
npm install # install dependencies
npm run dev # start the dev server (port XXXX)
npm test # run tests
npm run test:watch # tests in watch mode
npm run lint # linter
npm run build # production build
\`\`\`

## Key Files

- `src/index.ts` — entry point
- `src/config.ts` — configuration (env vars)
- `src/types.ts` — shared types

## Conventions

- [Language]: [version], [style]
- Tests: [framework], `*.test.ts` files next to sources
- Commits: [conventional commits / custom format]
- Branches: [branching strategy]

## Environment

- `VAR_NAME` — [purpose]

## Non-obvious

- [Why X is done this way and not another]
- [Known workaround and reason]
- [Gotcha when working with Y]
```

## Monorepo — multi-package project

For monorepos with workspaces (Turborepo, Nx, pnpm workspaces).

```markdown
# CLAUDE.md

## Project

[Name] — [purpose of the monorepo].

## Architecture

\`\`\`
apps/
web/ # [framework] — [role]
api/ # [framework] — [role]
admin/ # [framework] — [role]
packages/
ui/ # shared UI components
config/ # shared configs (tsconfig, eslint)
db/ # Prisma schema and client
utils/ # shared utilities
\`\`\`

Dependencies between packages: `web` → `ui`, `db`, `utils`; `api` → `db`, `utils`.

## Commands

\`\`\`bash
pnpm install # install all dependencies
pnpm dev # run all apps in dev mode
pnpm build # build all packages
pnpm test # tests across all packages
pnpm --filter web dev # run only web
pnpm --filter @scope/ui build # build only the ui package
\`\`\`

## Per-package notes

### apps/web

- Framework: [Next.js / Remix / etc]
- Port: [XXXX]
- [Specific commands or gotchas]

### apps/api

- Framework: [Express / Fastify / etc]
- Port: [XXXX]
- [DB migrations: command]

### packages/db

- ORM: [Prisma / Drizzle / etc]
- `pnpm --filter db generate` — regenerate the client after a schema change
- `pnpm --filter db migrate` — apply migrations

## Conventions

- Package manager: [pnpm / npm / yarn] with workspaces
- Shared types: in `packages/types`, imported via `@scope/types`
- [Package versioning strategy]
- [Rules for adding new packages]

## Environment

- Root `.env` — variables shared across all apps
- Per-app `.env.local` — overrides for a specific app (not committed)
- `VAR_NAME` — [purpose]

## Non-obvious

- [Package build order matters: first X, then Y]
- [Env vars: root .env vs per-app .env.local]
- [Gotcha: when changing packages/db you must regenerate the client]
```

## Sections — when to include

| Section      | Minimal | Comprehensive | Monorepo |
| ------------ | ------- | ------------- | -------- |
| Project      | yes     | yes           | yes      |
| Architecture | no      | yes           | yes      |
| Commands     | yes     | yes           | yes      |
| Key Files    | no      | yes           | no       |
| Per-package  | no      | no            | yes      |
| Conventions  | yes     | yes           | yes      |
| Environment  | no      | yes           | yes      |
| Non-obvious  | no      | yes           | yes      |
