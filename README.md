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
├── skills/                  # скиллы (автообнаружение)
│   ├── hello/
│   │   └── SKILL.md
│   └── task/
│       └── SKILL.md
├── commands/                # slash-команды (пока пусто)
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
| `hello`   | skill | `/sp:hello` | Приветствие и обзор структуры маркетплейса           |
| `task`    | skill | `/sp:task`  | Создание задачи из тикета (GitHub Issues, YouTrack)  |

## Планируемые команды

`/brain` `/plan` `/do` `/polish` `/pr` `/review` `/qa` `/fix` `/memorize` `/merge`

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

## Поиск правильного решения

- https://github.com/Q00/ouroboros
- https://github.com/Yeachan-Heo/oh-my-claudecode
- https://plannotator.ai/

## Посмотреть и понять зачем эти плагины нужны? как их использовать? 

- superpowers-lab
- 

## Лицензия

MIT
