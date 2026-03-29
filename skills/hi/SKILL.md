---
name: hi
description: >-
  Приветственный скилл — объясняет доступные скиллы плагина sp и как с ними работать.
  Используется когда пользователь пишет "hi", "привет", "что умеешь",
  "помощь", "help", "с чего начать", "какие скиллы",
  или при первом знакомстве с sp.
---

# Добро пожаловать в sp

**sp** — маркетплейс скиллов и команд для Claude Code, вдохновлённый [obra/superpowers](https://github.com/obra/superpowers).

## Скиллы

### /task — формирование задачи

Принимает URL тикета или текст описания. Исследует кодовую базу, анализирует архитектуру и формирует промт-задачу: контекст, requirements, constraints, уточняющие вопросы.

**Вход:** URL тикета или текст → **Выход:** `docs/ai/<slug>/<slug>-task.md`

```
/sp:task https://github.com/owner/repo/issues/86

добавить тёмную тему в настройки
```

### /plan — построение плана реализации

Читает task-файл, исследует кодовую базу, принимает design decisions и декомпозирует задачу на атомарные tasks с зависимостями и порядком.

**Вход:** путь к task-файлу → **Выход:** `docs/ai/<slug>/<slug>-plan.md`

```
/sp:plan docs/ai/86-black-jack-page/86-black-jack-page-task.md
```

### /do — выполнение задачи по плану

Делегирует tasks sub-agents, проводит двухэтапный review (spec compliance -> code quality), полирует код, валидирует, обновляет документацию, пишет отчёт.

**Вход:** путь к plan-файлу → **Выход:** реализованный код + `docs/ai/<slug>/<slug>-report.md`

```
/sp:do docs/ai/86-black-jack-page/86-black-jack-page-plan.md
```

### /review — подготовка отчёта для code review

Анализирует изменения относительно origin/main. Формирует отчёт: ключевые участки, сложные решения, риски, вопросы к ревьюеру, сценарии ручной проверки.

**Вход:** task-slug → **Выход:** `docs/ai/<slug>/<slug>-review.md`

```
/sp:review 86-black-jack-page
```

## Полный цикл

```
/sp:explore <тема>                # исследовать кодовую базу
/sp:task <тикет или описание>     # сформировать задачу
  → ответить на вопросы в файле
/sp:plan <путь к task-файлу>      # построить план
  → ответить на вопросы в файле
/sp:do <путь к plan-файлу>        # выполнить план
/sp:fix <описание>               # быстрый фикс после /do
/sp:review <slug>                 # подготовить review
/sp:gp                           # push в remote
/sp:pr                           # создать pull request
```

### /gca — git commit с умной группировкой

Анализирует изменённые файлы, классифицирует по группам, формирует атомарные коммиты с Conventional Commits на английском. Ticket ID определяет из аргументов, ветки или SP flow.

**Вход:** опционально ticket ID или URL -> **Выход:** атомарные git-коммиты

```
/sp:gca
/sp:gca #86
```

### /gp — git push с проверками и отчётом

Проверяет состояние репозитория (ветка, upstream, uncommitted changes, gh auth), пушит в remote, выводит отчёт: отправленные коммиты, diff stat, ссылка на ветку, статус PR.

**Вход:** опционально `--force-with-lease` → **Выход:** push + отчёт

```
/sp:gp
/sp:gp --force-with-lease
```

### /pr — создание и обновление Pull Request

Создаёт или обновляет GitHub PR из артефактов sp flow (review + report). Формирует description с ключевыми участками, design decisions, вопросами к ревьюеру. Без артефактов — fallback на коммиты. Поддерживает PR template, auto-labels, `<!-- sp:start/end -->` маркеры для update.

**Вход:** опционально `--draft`, `--base <branch>` → **Выход:** PR на GitHub

```
/sp:pr
/sp:pr --draft
```

### /fix — быстрый фикс

Compressed pipeline для мелких доработок (1-3 файла). Исследует кодовую базу, реализует фикс (opus), полирует, валидирует, записывает в fix-log. Два режима: post-flow (после task/plan/do) и standalone. Поддерживает цепочки фиксов и fix from PR comment URL.

**Вход:** описание фикса или URL PR-комментария → **Выход:** код + `docs/ai/<slug>/<slug>-fixes.md`

```
/sp:fix поправить валидацию email
/sp:fix https://github.com/owner/repo/pull/42#discussion_r123456
```

### /explore — исследование кодовой базы

Read-only Q&A loop для исследования кодовой базы и обсуждения подходов. Классифицирует вопросы (codebase / web / hybrid), ищет в коде и интернете, накапливает контекст через summary chain, записывает exploration log.

**Вход:** тема или вопрос → **Выход:** `docs/ai/<slug>/<slug>-exploration.md`

```
/sp:explore как работает аутентификация
/sp:explore сравни Framer Motion и react-spring для наших анимаций
```

## Планируемые скиллы

| Скилл       | Назначение          |
| ----------- | ------------------- |
| `/polish`   | Полировка кода      |
| `/qa`       | Тестирование        |
| `/memorize` | Сохранение в память |
| `/merge`    | Мерж веток          |

## Установка

```bash
claude marketplace add github:projectory-com/sp
```
