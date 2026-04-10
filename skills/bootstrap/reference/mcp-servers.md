# Каталог MCP-серверов

Категоризированный список MCP-серверов для рекомендации в bootstrap. Для каждого: назначение, когда рекомендовать, пример конфигурации.

## Databases

### PostgreSQL / MySQL

**Когда:** проект использует SQL-базу, есть Prisma/Drizzle/Sequelize/SQLAlchemy.

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/dbname"
      }
    }
  }
}
```

### SQLite

**Когда:** локальная БД, embedded storage, `.db` файлы в проекте.

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "path/to/database.db"]
    }
  }
}
```

## Version Control

### GitHub

**Когда:** проект на GitHub, нужна работа с issues, PRs, reviews.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>"
      }
    }
  }
}
```

### GitLab

**Когда:** проект на GitLab, self-hosted или cloud.

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gitlab"],
      "env": {
        "GITLAB_TOKEN": "<token>",
        "GITLAB_URL": "https://gitlab.com"
      }
    }
  }
}
```

## Communication

### Slack

**Когда:** команда использует Slack, нужны нотификации или поиск по каналам.

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-..."
      }
    }
  }
}
```

### Linear

**Когда:** трекер задач Linear, нужна синхронизация issues.

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-linear"],
      "env": {
        "LINEAR_API_KEY": "<key>"
      }
    }
  }
}
```

## Search

### Brave Search

**Когда:** нужен веб-поиск из Claude Code.

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "<key>"
      }
    }
  }
}
```

### Context7

**Когда:** нужна актуальная документация библиотек и фреймворков.

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

## Development

### Filesystem

**Когда:** нужен доступ к файлам за пределами рабочей директории.

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]
    }
  }
}
```

### Puppeteer / Playwright

**Когда:** нужен браузер для тестирования UI, скриншоты, e2e.

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

### Sentry

**Когда:** проект использует Sentry для error tracking.

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "mcp-server-sentry"],
      "env": {
        "SENTRY_AUTH_TOKEN": "<token>"
      }
    }
  }
}
```

## Cloud

### AWS

**Когда:** инфраструктура на AWS, нужно управление ресурсами.

```json
{
  "mcpServers": {
    "aws": {
      "command": "npx",
      "args": ["-y", "mcp-server-aws"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "<key>",
        "AWS_SECRET_ACCESS_KEY": "<secret>"
      }
    }
  }
}
```

### Cloudflare

**Когда:** деплой на Cloudflare Workers/Pages, R2, D1.

```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "npx",
      "args": ["-y", "@cloudflare/mcp-server-cloudflare"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "<token>"
      }
    }
  }
}
```

### Vercel

**Когда:** деплой на Vercel, нужно управление проектами и деплоями.

```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "mcp-server-vercel"],
      "env": {
        "VERCEL_TOKEN": "<token>"
      }
    }
  }
}
```

## Как выбирать MCP-серверы

При bootstrap анализируй проект:

1. **package.json / requirements.txt / go.mod** — зависимости указывают на нужные серверы
2. **Наличие .env** — уже настроенные сервисы
3. **CI/CD конфиги** — используемые платформы (Vercel, AWS, Cloudflare)
4. **Трекер задач** — Linear, Jira, GitHub Issues
5. **.mcp.json в проекте** — уже настроенные MCP-серверы (не дублировать)

Рекомендуй только релевантные серверы. Пропускай AWS для pet-проекта на Vercel.
