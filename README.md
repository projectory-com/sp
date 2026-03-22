# sp

![sp — обзор команд и воркфлоу](sp.png)

Маркетплейс скиллов и команд для Claude Code, вдохновлённый:

- [obra/superpowers](https://github.com/obra/superpowers).
- [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)

## Скиллы

### /task — формирование задачи

Принимает URL тикета или текст описания. Исследует кодовую базу, анализирует архитектуру, формирует промт-задачу с контекстом, requirements, constraints и уточняющими вопросами. [Подробнее →](docs/task.md)

```
/sp:task https://github.com/owner/repo/issues/86
/sp:task добавить тёмную тему в настройки
```

**Выход:** `docs/ai/<slug>/<slug>-task.md`

### /plan — построение плана реализации

Читает task-файл, исследует кодовую базу, принимает design decisions, декомпозирует на атомарные tasks с зависимостями, определяет порядок выполнения (sequential/parallel), проводит review плана. [Подробнее →](docs/plan.md)

```
/sp:plan docs/ai/86-black-jack-page/86-black-jack-page-task.md
```

**Выход:** `docs/ai/<slug>/<slug>-plan.md`

### /do — выполнение задачи по плану

Dispatch-ит sub-agents для каждого task. После каждого — двухэтапный review (spec compliance → code quality). Полирует код, валидирует (lint, types, tests, build), обновляет документацию, пишет отчёт. [Подробнее →](docs/do.md)

```
/sp:do docs/ai/86-black-jack-page/86-black-jack-page-plan.md
```

**Выход:** реализованный код + `docs/ai/<slug>/<slug>-report.md`

### /review — подготовка отчёта для code review

Анализирует все изменения относительно origin/main. Формирует отчёт: ключевые участки, сложные решения, риски, вопросы к ревьюеру, ручные сценарии проверки. [Подробнее →](docs/review.md)

```
/sp:review 86-black-jack-page
```

**Выход:** `docs/ai/<slug>/<slug>-review.md`

### /gca — git commit с умной группировкой

Анализирует изменённые файлы, классифицирует по группам (feature, test, docs, style, chore), формирует атомарные коммиты с Conventional Commits на английском. Определяет ticket ID из аргументов, ветки или SP flow. [Подробнее →](docs/gca.md)

```
/sp:gca
/sp:gca #86
/sp:gca https://github.com/owner/repo/issues/86
```

### /gp — git push с проверками и отчётом

Проверяет состояние репозитория (ветка, upstream, uncommitted changes, gh auth), пушит в remote, выводит отчёт: отправленные коммиты, diff stat, ссылка на ветку, статус PR. [Подробнее →](docs/gp.md)

```
/sp:gp
/sp:gp --force-with-lease
```

### /pr — создание и обновление Pull Request

Создаёт или обновляет GitHub PR. Формирует description из артефактов sp flow (review + report): ключевые участки, design decisions, вопросы к ревьюеру, риски, test plan. Без артефактов — fallback на коммиты и diff. Поддерживает PR template и auto-labels. [Подробнее →](docs/pr.md)

```
/sp:pr
/sp:pr --draft
/sp:pr --base develop
```

### /gst — статус репозитория

Показывает статус разработки: ветка, изменения, коммиты относительно main, горячие файлы, семантическая сводка. [Подробнее →](docs/gst.md)

```
/sp:gst
```

### /hi — обзор скиллов

Приветственный скилл — объясняет доступные скиллы и рекомендуемый цикл работы. Точка входа для новых пользователей. [Подробнее →](docs/hi.md)

```
/sp:hi
```

## Полный цикл

```
/sp:task <тикет или описание>     # сформировать задачу
  → ответить на вопросы в файле
/sp:plan <путь к task-файлу>      # построить план
  → ответить на вопросы в файле
/sp:do <путь к plan-файлу>        # выполнить план
/sp:review <slug>                 # подготовить review
/sp:gp                           # push в remote
/sp:pr                           # создать pull request
```

## Структура

```
sp/
├── .claude-plugin/
│   ├── plugin.json          # манифест плагина
│   └── marketplace.json     # реестр плагинов маркетплейса
├── skills/
│   ├── hi/                  # приветствие и обзор скиллов
│   ├── task/                # формирование задачи
│   │   ├── SKILL.md
│   │   ├── agents/          # task-explorer, task-architect
│   │   ├── reference/       # synthesize-guide, frontend-guide, elements-of-style
│   │   └── examples/
│   ├── plan/                # построение плана
│   │   ├── SKILL.md
│   │   ├── agents/          # plan-explorer, plan-designer, plan-reviewer
│   │   ├── reference/       # routing-rules, plan-format, elements-of-style
│   │   └── examples/
│   ├── do/                  # выполнение плана
│   │   ├── SKILL.md
│   │   ├── agents/          # task-executor, spec-reviewer, quality-reviewer, code-polisher, doc-updater
│   │   └── reference/       # status-protocol, report-format
│   ├── review/              # подготовка code review
│   │   ├── SKILL.md
│   │   └── agents/          # review-analyzer
│   ├── gca/                 # git commit с умной группировкой
│   │   ├── SKILL.md
│   │   └── reference/       # commit-convention, staging-strategy
│   ├── gp/                  # git push с проверками
│   │   ├── SKILL.md
│   │   └── agents/          # git-pre-checker, git-pusher
│   ├── pr/                  # создание и обновление PR
│   │   ├── SKILL.md
│   │   ├── agents/          # pr-data-collector, pr-body-generator
│   │   └── reference/       # pr-body-format
│   └── gst/                 # статус репозитория
│       ├── SKILL.md
│       └── agents/          # git-data-collector
├── commands/
└── docs/                    # документация по каждому скиллу
```

## Установка

```bash
# Добавить маркетплейс
claude marketplace add github:projectory-com/sp

# Локально (для разработки)
git clone https://github.com/projectory-com/sp.git
claude --plugin-dir ./sp
```

## Планируемые скиллы

`/polish` `/qa` `/fix` `/memorize` `/merge`

## Разработка

Скилл:

```
skills/<имя>/SKILL.md
```

Команда:

```
commands/<имя>.md
```

Оба формата используют YAML frontmatter с полями `name` и `description`.

## Референсы

- https://github.com/Q00/ouroboros
- https://github.com/Yeachan-Heo/oh-my-claudecode
- https://plannotator.ai/
- superpowers-lab

## Лицензия

MIT
