# sp

![sp — обзор команд и воркфлоу](sp.png)

Маркетплейс скиллов и команд для Claude Code, вдохновлённый: 

- [obra/superpowers](https://github.com/obra/superpowers).
- [obra/the-elements-of-style](https://github.com/obra/the-elements-of-style)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)

## Структура

```
sp/
├── .claude-plugin/
│   ├── plugin.json          # манифест плагина
│   └── marketplace.json     # реестр плагинов маркетплейса
├── skills/                  # скиллы (автообнаружение по SKILL.md)
│   ├── hi/
│   │   └── SKILL.md
│   ├── task/
│   │   ├── SKILL.md
│   │   ├── agents/          # субагенты (task-explorer, task-architect)
│   │   ├── reference/       # справочные материалы
│   │   └── examples/        # примеры task-файлов
│   └── plan/
│       ├── SKILL.md
│       ├── agents/          # субагенты (plan-explorer, plan-designer)
│       ├── reference/       # routing rules, формат plan-файла
│       └── examples/        # примеры планов (simple, complex)
├── commands/                # slash-команды
├── docs/                    # документация
├── _skills/                 # черновики (не часть плагина)
└── README.md
```

## Установка

### Добавить маркетплейс

```
/plugin marketplace add projectory-com/sp
```

### Установить плагин

```
/plugin install sp@sp
```

### Локально (для разработки)

```bash
git clone https://github.com/projectory-com/sp.git
```

```
/plugin marketplace add ./sp
```

## Использование

После установки доступны:

| Компонент | Тип   | Вызов       | Описание                                            |
| --------- | ----- | ----------- | --------------------------------------------------- |
| `hi`      | skill | `/sp:hi`    | Приветствие и обзор структуры маркетплейса           |
| `task`    | skill | `/sp:task`  | Формирование задачи для AI-реализации из тикета или описания фичи |
| `plan`    | skill | `/sp:plan`  | Построение плана реализации по task-файлу            |

Pipeline: `/sp:task` → `/sp:plan` → `/sp:do` (будущий)

## Планируемые скиллы

`/brain` `/do` `/polish` `/pr` `/review` `/qa` `/fix` `/memorize` `/merge`

## Разработка

Для добавления нового скилла:

```
skills/<имя-скилла>/SKILL.md
```

Для добавления новой команды:

```
commands/<имя-команды>.md
```

Оба формата используют YAML frontmatter с полями `name` и `description`.

## Документация

- `docs/plan.md` — описание скилла /plan (фазы, routing, субагенты)
- `docs/plugins.md` — создание плагинов (структура, компоненты, тестирование)
- `docs/plugin-marketplaces.md` — схема маркетплейса, sources, дистрибуция
- `docs/roadmap.md` — roadmap: pipeline task → plan → do → review

## Лицензия

MIT
