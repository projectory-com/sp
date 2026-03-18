# sp

![sp — обзор команд и воркфлоу](sp.png)

Маркетплейс скиллов и команд для Claude Code, вдохновлённый:

- [obra/superpowers](https://github.com/obra/superpowers).
- [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)

## Скиллы

### /task — формирование задачи

Принимает URL тикета или текст описания. Исследует кодовую базу, анализирует архитектуру, формирует промт-задачу с контекстом, requirements, constraints и уточняющими вопросами.

```
/sp:task https://github.com/owner/repo/issues/86
/sp:task добавить тёмную тему в настройки
```

**Выход:** `docs/ai/<slug>/<slug>-task.md`

### /plan — построение плана реализации

Читает task-файл, исследует кодовую базу, принимает design decisions, декомпозирует на атомарные tasks с зависимостями, определяет порядок выполнения (sequential/parallel), проводит review плана.

```
/sp:plan docs/ai/86-black-jack-page/86-black-jack-page-task.md
```

**Выход:** `docs/ai/<slug>/<slug>-plan.md`

### /do — выполнение задачи по плану

Dispatch-ит sub-agents для каждого task. После каждого — двухэтапный review (spec compliance → code quality). Полирует код, валидирует (lint, types, tests, build), обновляет документацию, пишет отчёт.

```
/sp:do docs/ai/86-black-jack-page/86-black-jack-page-plan.md
```

**Выход:** реализованный код + `docs/ai/<slug>/<slug>-report.md`

### /review — подготовка отчёта для code review

Анализирует все изменения относительно origin/main. Формирует отчёт: ключевые участки, сложные решения, риски, вопросы к ревьюеру, ручные сценарии проверки.

```
/sp:review 86-black-jack-page
```

**Выход:** `docs/ai/<slug>/<slug>-review.md`

## Полный цикл

```
/sp:task <тикет или описание>     # сформировать задачу
  → ответить на вопросы в файле
/sp:plan <путь к task-файлу>      # построить план
  → ответить на вопросы в файле
/sp:do <путь к plan-файлу>        # выполнить план
/sp:review <slug>                 # подготовить review
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
│   │   └── reference/       # status-protocol, commit-convention, report-format
│   └── review/              # подготовка code review
│       └── SKILL.md
├── commands/
├── docs/
└── _skills/                 # черновики
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

`/polish` `/pr` `/qa` `/fix` `/memorize` `/merge`

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
