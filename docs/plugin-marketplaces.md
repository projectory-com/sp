# Create and distribute a plugin marketplace

> Источник: https://code.claude.com/docs/en/plugin-marketplaces

## Overview

Создание и распространение маркетплейса включает:

1. **Создание плагинов**: commands, agents, hooks, MCP servers, LSP servers
2. **Создание marketplace.json**: реестр плагинов в `.claude-plugin/marketplace.json`
3. **Хостинг**: push в GitHub/GitLab/другой git-хостинг
4. **Распространение**: пользователи добавляют через `/plugin marketplace add`

## Marketplace Schema

### Обязательные поля

| Поле      | Тип    | Описание                   | Пример         |
| --------- | ------ | -------------------------- | -------------- |
| `name`    | string | Идентификатор (kebab-case) | `"acme-tools"` |
| `owner`   | object | Информация о владельце     |                |
| `plugins` | array  | Список плагинов            |                |

### Owner

| Поле    | Тип    | Обязательное | Описание      |
| ------- | ------ | ------------ | ------------- |
| `name`  | string | Да           | Имя владельца |
| `email` | string | Нет          | Email         |

### Метаданные (опционально)

| Поле                   | Тип    | Описание                              |
| ---------------------- | ------ | ------------------------------------- |
| `metadata.description` | string | Описание маркетплейса                 |
| `metadata.version`     | string | Версия маркетплейса                   |
| `metadata.pluginRoot`  | string | Базовая директория для путей плагинов |

## Plugin Entries

### Обязательные поля плагина

| Поле     | Тип            | Описание                   |
| -------- | -------------- | -------------------------- |
| `name`   | string         | Идентификатор (kebab-case) |
| `source` | string\|object | Где взять плагин           |

### Опциональные поля плагина

| Поле          | Тип            | Описание                           |
| ------------- | -------------- | ---------------------------------- |
| `description` | string         | Описание плагина                   |
| `version`     | string         | Версия                             |
| `author`      | object         | Автор (`name`, `email`)            |
| `homepage`    | string         | URL документации                   |
| `repository`  | string         | URL репозитория                    |
| `license`     | string         | SPDX лицензия                      |
| `keywords`    | array          | Теги для поиска                    |
| `category`    | string         | Категория                          |
| `tags`        | array          | Теги                               |
| `strict`      | boolean        | Контроль authority (default: true) |
| `commands`    | string\|array  | Пути к командам                    |
| `agents`      | string\|array  | Пути к агентам                     |
| `hooks`       | string\|object | Конфигурация хуков                 |
| `mcpServers`  | string\|object | MCP серверы                        |
| `lspServers`  | string\|object | LSP серверы                        |

## Plugin Sources

| Source        | Тип                        | Поля                               |
| ------------- | -------------------------- | ---------------------------------- |
| Relative path | `string` (`"./my-plugin"`) | —                                  |
| `github`      | object                     | `repo`, `ref?`, `sha?`             |
| `url`         | object                     | `url` (.git), `ref?`, `sha?`       |
| `git-subdir`  | object                     | `url`, `path`, `ref?`, `sha?`      |
| `npm`         | object                     | `package`, `version?`, `registry?` |
| `pip`         | object                     | `package`, `version?`, `registry?` |

### Примеры

**Относительный путь** (плагин в том же репо):

```json
{ "name": "my-plugin", "source": "./plugins/my-plugin" }
```

**GitHub**:

```json
{
  "name": "github-plugin",
  "source": { "source": "github", "repo": "owner/plugin-repo", "ref": "v2.0.0" }
}
```

**Git URL**:

```json
{
  "name": "git-plugin",
  "source": { "source": "url", "url": "https://gitlab.com/team/plugin.git" }
}
```

**npm**:

```json
{
  "name": "npm-plugin",
  "source": { "source": "npm", "package": "@acme/claude-plugin", "version": "2.1.0" }
}
```

## Strict Mode

| Значение         | Поведение                                                                      |
| ---------------- | ------------------------------------------------------------------------------ |
| `true` (default) | `plugin.json` — authority. Marketplace дополняет.                              |
| `false`          | Marketplace entry — полное определение. Конфликт с plugin.json вызовет ошибку. |

## Установка

```shell
# Добавить маркетплейс
/plugin marketplace add owner/repo

# Установить плагин
/plugin install plugin-name@marketplace-name

# Обновить маркетплейс
/plugin marketplace update

# Валидация
/plugin validate .
```

## Настройка для команды

В `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": { "source": "github", "repo": "your-org/claude-plugins" }
    }
  },
  "enabledPlugins": {
    "plugin-name@marketplace-name": true
  }
}
```

## Версионирование

- Версия в `plugin.json` всегда приоритетнее версии в `marketplace.json`
- Для relative-path плагинов — ставьте версию в marketplace entry
- Для остальных — в `plugin.json`
