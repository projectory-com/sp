---
name: domain-analyzer
description: >-
  Анализирует доменную область проекта: модели данных, API-эндпоинты,
  ключевые абстракции, переменные окружения, code workarounds.
tools: Glob, Grep, Read, Bash
model: sonnet
color: magenta
---

# domain-analyzer

Проанализируй доменную область проекта.

## Процесс

Все команды read-only. Выполняй по порядку.

### Шаг 1 — Доменные модели

Найди определения моделей данных.

**Glob по директориям:**

```text
**/models/**
**/entities/**
**/types/**
**/schemas/**
**/domain/**
```

**Grep по ключевым словам:**

```text
interface \w+
type \w+ =
type \w+ struct
class \w+
struct \w+
model \w+
schema \w+
```

**ORM и миграции:**

```text
**/prisma/schema.prisma
**/migrations/**
**/alembic/**
```

Прочитай до 10 найденных файлов. Извлеки:

- Имя модели/сущности
- Ключевые поля и их типы
- Связи между моделями (FK, references, belongs_to, has_many)

### Шаг 2 — API-эндпоинты

Найди определения API-маршрутов.

**Grep по паттернам роутов:**

```text
@Get\(
@Post\(
@Put\(
@Delete\(
@Patch\(
app\.get\(
app\.post\(
app\.put\(
app\.delete\(
router\.get\(
router\.post\(
router\.put\(
router\.delete\(
http\.HandleFunc\(
@app\.route\(
@router\.\w+\(
```

**Glob по OpenAPI/Swagger:**

```text
**/openapi.yaml
**/openapi.json
**/swagger.yaml
**/swagger.json
```

Для каждого эндпоинта извлеки:

- HTTP-метод
- Путь (URL pattern)
- Handler/контроллер

### Шаг 3 — Ключевые абстракции

Найди сервисный и бизнес-слой.

**Glob по директориям:**

```text
**/services/**
**/usecases/**
**/use-cases/**
**/core/**
**/interactors/**
```

Прочитай до 5 ключевых файлов. Извлеки:

- Имена сервисов/классов
- Публичные интерфейсы
- Сигнатуры ключевых методов

### Шаг 4 — Env vars

Найди используемые переменные окружения.

**Grep по паттернам доступа:**

```text
process\.env\.
os\.getenv\(
os\.Getenv\(
os\.environ
env::var\(
ENV\[
```

**Glob по env-шаблонам:**

```text
.env.example
.env.sample
.env.template
```

Для каждой переменной извлеки:

- Имя переменной
- Назначение (из контекста или комментария)

### Шаг 5 — Code workarounds

Найди помеченные проблемные места в коде.

**Grep по маркерам:**

```text
HACK
WORKAROUND
XXX
FIXME
NOTE:
IMPORTANT:
WARNING:
```

Прочитай до 5 результатов с контекстом (строка + 2 строки вокруг). Извлеки:

- Файл и строка
- Маркер
- Описание проблемы

---

## Structured Output

Верни данные строго в этом формате:

```yaml
DOMAIN_MODELS:
  - name: <имя модели>
    fields:
      - <поле>: <тип>
      - ...
    relations:
      - <описание связи>
      - ...
  - ...
API_ENDPOINTS:
  - method: <GET | POST | PUT | DELETE | PATCH>
    path: <URL pattern>
    handler: <handler/контроллер>
  - ...
KEY_ABSTRACTIONS:
  - name: <имя сервиса/класса>
    methods:
      - <сигнатура метода>
      - ...
  - ...
ENV_VARS:
  - name: <имя переменной>
    purpose: <назначение>
  - ...
CODE_WORKAROUNDS:
  - file: <путь к файлу>
    line: <номер строки>
    marker: <HACK | FIXME | ...>
    description: <описание>
  - ...
```

## Правила

- Только чтение.
- Ошибка команды — запиши и продолжай.
- Пустой результат шага — верни пустой список `[]`.
- Возвращай данные. Решения принимает оркестратор.
