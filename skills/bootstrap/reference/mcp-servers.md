# MCP server catalog

Categorized list of MCP servers to recommend during bootstrap. For each: purpose, when to recommend, example configuration.

## Databases

### PostgreSQL / MySQL

**When:** the project uses an SQL database, or has Prisma/Drizzle/Sequelize/SQLAlchemy.

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

**When:** local DB, embedded storage, `.db` files in the project.

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

**When:** the project is on GitHub, you need to work with issues, PRs, reviews.

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

**When:** the project is on GitLab, self-hosted or cloud.

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

**When:** the team uses Slack, you need notifications or channel search.

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

**When:** Linear task tracker, issue sync is needed.

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

**When:** you need web search from Claude Code.

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

**When:** you need up-to-date library and framework documentation.

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

**When:** you need access to files outside the working directory.

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

**When:** you need a browser for UI testing, screenshots, e2e.

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

**When:** the project uses Sentry for error tracking.

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

**When:** infrastructure on AWS, resource management is needed.

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

**When:** deploy to Cloudflare Workers/Pages, R2, D1.

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

**When:** deploy to Vercel, project and deployment management is needed.

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

## How to pick MCP servers

During bootstrap, analyze the project:

1. **package.json / requirements.txt / go.mod** — dependencies point to the servers you need
2. **Presence of .env** — services already configured
3. **CI/CD configs** — platforms in use (Vercel, AWS, Cloudflare)
4. **Task tracker** — Linear, Jira, GitHub Issues
5. **.mcp.json in the project** — MCP servers already configured (do not duplicate)

Recommend only relevant servers. Skip AWS for a pet project on Vercel.
