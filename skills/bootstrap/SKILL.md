---
name: bootstrap
description: >-
  Подготовка проекта к sp flow — детекция стека, генерация CLAUDE.md и
  sp-context.md. Используется когда пользователь пишет "bootstrap", "настрой sp",
  "подготовь проект", "инициализация sp", "setup sp", "первый запуск",
  "подключить sp", "создай CLAUDE.md".
---

# Подготовка проекта к sp flow

Ты — оркестратор. Координируешь агентов, принимаешь решения через AskUserQuestion. Агенты выполняют все файловые операции.

Делегируй каждую фазу агенту через Agent tool:

- Стек → `agents/stack-detector.md`
- Архитектура → `agents/architecture-mapper.md`
- Конвенции → `agents/convention-scanner.md`
- Валидация → `agents/validation-scanner.md`
- Правила → `agents/existing-rules-detector.md`
- Домен → `agents/domain-analyzer.md`
- CLAUDE.md → `agents/claude-md-generator.md`
- sp-context → `agents/sp-context-generator.md`
- Автоматизация → `agents/automation-recommender.md`
- Верификация → `agents/bootstrap-verifier.md`

Работай от начала до конца.

**Принцип:** одноразовый онбординг проекта. Запускается один раз при подключении sp к проекту.

---

## Вход

`$ARGUMENTS` — опциональное описание проекта.

Если пуст — скилл автоматически определит стек, архитектуру и конвенции.

---

## Pipeline

7 фаз. Отмечай завершение через TodoWrite.

```text
0. Preflight    → проверить git-repo, не sp-repo
1. Detect       → 6 параллельных агентов исследуют проект
2. Synthesize   → агрегация PROJECT_PROFILE
3. Generate     → CLAUDE.md + sp-context + рекомендации
4. Verify       → проверить файлы и качество
5. Confirm      → показать результат, AskUserQuestion
6. Commit       → закоммитить артефакты
```

---

## Фаза 0 — Preflight

Проверь два условия перед стартом.

### 0a. Git-репозиторий

```bash
git rev-parse --is-inside-work-tree 2>/dev/null
```

Результат false или ошибка → сообщи пользователю: "/bootstrap работает только внутри git-проекта." Выйди.

### 0b. Не sp-репозиторий

```bash
test -f .claude-plugin/plugin.json && echo "SP_REPO" || echo "OK"
```

SP_REPO → сообщи: "/bootstrap предназначен для целевых проектов, не для sp-плагинов." Выйди.

Оба условия пройдены → переход к Фазе 1.

Отметь в TodoWrite: `[x] Preflight`

---

## Фаза 1 — Detect

Dispatch 6 агентов **параллельно** через Agent tool (6 вызовов одновременно):

1. **stack-detector** (haiku) — прочитай `agents/stack-detector.md`, передай промт агенту.
   Результат → STACK_FINDINGS:

   ```text
   LANGUAGES, FRAMEWORKS, PACKAGE_MANAGER, RUNTIME, RUNTIME_VERSION
   ```

2. **architecture-mapper** (sonnet) — прочитай `agents/architecture-mapper.md`, передай промт агенту.
   Результат → ARCH_FINDINGS:

   ```text
   PATTERN, LAYERS, ENTRY_POINTS, KEY_DIRS
   ```

3. **convention-scanner** (sonnet) — прочитай `agents/convention-scanner.md`, передай промт агенту.
   Результат → CONV_FINDINGS:

   ```text
   NAMING, FILE_NAMING, IMPORT_STYLE, TEST_CONVENTIONS
   ```

4. **validation-scanner** (haiku) — прочитай `agents/validation-scanner.md`, передай промт агенту.
   Результат → VAL_FINDINGS:

   ```text
   DEV, BUILD, TEST, LINT, FORMAT, TYPECHECK
   ```

5. **existing-rules-detector** (haiku) — прочитай `agents/existing-rules-detector.md`, передай промт агенту.
   Результат → RULES_FINDINGS:

   ```text
   CLAUDE_MD_EXISTS, CLAUDE_MD_QUALITY, CLAUDE_MD_CONTENT, OTHER_RULES, DOC_CONTENT
   ```

6. **domain-analyzer** (sonnet) — прочитай `agents/domain-analyzer.md`, передай промт агенту.
   domain-analyzer исследует доменную модель, API, абстракции и переменные окружения.
   Результат → DOMAIN_FINDINGS:

   ```text
   DOMAIN_MODELS, API_ENDPOINTS, KEY_ABSTRACTIONS, ENV_VARS, CODE_WORKAROUNDS
   ```

Дождись всех 6.

Если агент вернул ошибку или пустой результат — используй пустые значения для соответствующей секции и запиши проблему в VERIFY_NOTES.

Отметь в TodoWrite: `[x] Detect`

Переход → Фаза 2.

---

## Фаза 2 — Synthesize

Агрегируй 6 findings в PROJECT_PROFILE:

```yaml
PROJECT_PROFILE:
  name: <из package.json/go.mod/Cargo.toml или имени директории>
  languages: <из STACK_FINDINGS>
  frameworks: <из STACK_FINDINGS>
  package_manager: <из STACK_FINDINGS>
  runtime: <из STACK_FINDINGS>
  runtime_version: <из STACK_FINDINGS>

  architecture:
    pattern: <из ARCH_FINDINGS>
    layers: <из ARCH_FINDINGS>
    entry_points: <из ARCH_FINDINGS>
    key_dirs: <из ARCH_FINDINGS>

  commands:
    dev: <из VAL_FINDINGS>
    build: <из VAL_FINDINGS>
    test: <из VAL_FINDINGS>
    lint: <из VAL_FINDINGS>
    format: <из VAL_FINDINGS>
    typecheck: <из VAL_FINDINGS>

  conventions:
    naming: <из CONV_FINDINGS>
    file_naming: <из CONV_FINDINGS>
    import_style: <из CONV_FINDINGS>
    test_conventions: <из CONV_FINDINGS>

  existing_rules:
    claude_md_exists: <из RULES_FINDINGS>
    claude_md_quality: <из RULES_FINDINGS>
    claude_md_content: <из RULES_FINDINGS, если exists>
    other_rules: <из RULES_FINDINGS>
    doc_content: <из RULES_FINDINGS.DOC_CONTENT>

  domain:
    models: <из DOMAIN_FINDINGS>
    api_endpoints: <из DOMAIN_FINDINGS>
    key_abstractions: <из DOMAIN_FINDINGS>
    env_vars: <из DOMAIN_FINDINGS>
    code_workarounds: <из DOMAIN_FINDINGS>
```

Если передан `$ARGUMENTS` — добавь `user_description` в PROJECT_PROFILE.

Отметь в TodoWrite: `[x] Synthesize`

Переход → Фаза 3.

---

## Фаза 3 — Generate

Dispatch 3 агента **параллельно** через Agent tool:

1. **claude-md-generator** (sonnet) — прочитай `agents/claude-md-generator.md`, передай агенту:
   - PROJECT_PROFILE целиком
   - CLAUDE_MD_EXISTS из RULES_FINDINGS
   - CLAUDE_MD_CONTENT (если существует)
   - DOC_CONTENT из PROJECT_PROFILE.existing_rules.doc_content
   - DOMAIN_FINDINGS из PROJECT_PROFILE.domain
     Результат → CLAUDE_MD_STATUS:

   ```text
   STATUS: created|enriched
   SECTIONS_ADDED, SECTIONS_UPDATED, QUALITY_ESTIMATE
   ```

2. **sp-context-generator** (haiku) — прочитай `agents/sp-context-generator.md`, передай агенту:
   - PROJECT_PROFILE целиком
   - DOC_CONTENT из PROJECT_PROFILE.existing_rules.doc_content
   - DOMAIN_FINDINGS из PROJECT_PROFILE.domain
     Результат → SP_CONTEXT_FILE (путь к .claude/sp-context.md)

3. **automation-recommender** (haiku) — прочитай `agents/automation-recommender.md`, передай агенту:
   - PROJECT_PROFILE (стек, фреймворки, commands)
     Результат → RECOMMENDATIONS (список рекомендаций по автоматизации)

Дождись всех 3.

Отметь в TodoWrite: `[x] Generate`

Переход → Фаза 4.

---

## Фаза 4 — Verify

Dispatch **bootstrap-verifier** (sonnet) через Agent tool.

Прочитай `agents/bootstrap-verifier.md`, передай промт агенту.

Агент проверит CLAUDE.md и .claude/sp-context.md, вернёт:

```yaml
FILES_OK, SECTIONS_OK, COMMANDS_OK, PATHS_OK
QUALITY_SCORE: <0-100>
QUALITY_GRADE: <A|B|C|D|F>
ISSUES: <список проблем>
```

### Обработка результата

- **QUALITY_GRADE = A** → переход к Фазе 5
- **QUALITY_GRADE < A и ISSUES непуст** → re-dispatch claude-md-generator с ISSUES (макс 1 retry):
  1. Передай ISSUES агенту claude-md-generator
  2. Дождись завершения
  3. Re-dispatch bootstrap-verifier
  4. Если после retry Grade < A → продолжи с warning, запиши VERIFY_NOTES

Отметь в TodoWrite: `[x] Verify`

Переход → Фаза 5.

---

## Фаза 5 — Confirm

### Нотификация

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type ACTION_REQUIRED --skill bootstrap --phase Confirm --slug "bootstrap" --title "Bootstrap готов" --body "CLAUDE.md и sp-context.md созданы"
```

### Показать результат

Выведи пользователю:

1. **Сводка PROJECT_PROFILE:** стек, архитектура, команды (компактно)
2. **CLAUDE.md quality:** Grade + score из верификации
3. **Содержимое .claude/sp-context.md:** первые 30 строк
4. **Рекомендации:** RECOMMENDATIONS от automation-recommender
5. **Замечания:** VERIFY_NOTES (если были после retry)

### Выбор пользователя

AskUserQuestion с 3 вариантами:

1. **Закоммитить (Recommended)** — коммит артефактов и завершение
2. **Просмотреть и отредактировать** — пользователь правит файлы вручную, затем re-verify → вернуться к Confirm
3. **Отменить** — не коммитить, выйти

**Обработка:**

- **Закоммитить** → переход к Фазе 6
- **Просмотреть и отредактировать** → дождись сигнала от пользователя, re-dispatch bootstrap-verifier, вернись к Confirm
- **Отменить** → сообщи "Bootstrap отменён. Файлы CLAUDE.md и .claude/sp-context.md остались на диске." Выйди.

Отметь в TodoWrite: `[x] Confirm`

---

## Фаза 6 — Commit

### 6a. Проверь .gitignore

```bash
grep -q "^\.claude/" .gitignore 2>/dev/null && echo "IGNORED" || echo "OK"
```

Если IGNORED → предупреди пользователя:

> `.claude/` в .gitignore. sp-context.md не попадёт в коммит.

AskUserQuestion:

1. **Добавить исключение `!.claude/sp-context.md`** — дописать в .gitignore и коммитить оба файла
2. **Коммитить только CLAUDE.md** — пропустить sp-context
3. **Отменить коммит** — выйти

### 6b. Git commit

```bash
git add CLAUDE.md .claude/sp-context.md
git commit -m "chore: bootstrap sp flow context"
```

Если на шаге 6a пользователь выбрал "только CLAUDE.md":

```bash
git add CLAUDE.md
git commit -m "chore: bootstrap sp flow context"
```

### 6c. Нотификация

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh --type STAGE_COMPLETE --skill bootstrap --phase Complete --slug "bootstrap" --title "Bootstrap завершён" --body "CLAUDE.md + sp-context.md закоммичены"
```

### 6d. Итог

Покажи:

- Commit hash (из `git log -1 --format=%h`)
- Пути к файлам: `CLAUDE.md`, `.claude/sp-context.md`
- Следующий шаг: "Проект готов к работе с sp. Попробуй `/sp:task` для создания первой задачи."

Отметь в TodoWrite: `[x] Commit`

---

## Правила

- **Тонкий оркестратор.** Read/Write/Edit вызывают только агенты.
- **Без остановок.** Работай до конца без подтверждений между фазами (кроме Confirm).
- **Параллельный dispatch.** Phase 1: 6 агентов. Phase 3: 3 агента.
- **TodoWrite.** Отмечай каждую фазу сразу по завершении.
- **Вывод CLI.** Запускай команды с длинным выводом через `2>&1 | tail -20`.
- **Идемпотентность.** При повторном запуске: CLAUDE.md дополняется (Edit через агента), sp-context перезаписывается (Write через агента).
- **Язык контента** — русский.
- **Подстановка.** При dispatch агента замени `{{PLACEHOLDER}}` в промте на данные из findings. Агенты получают реальные значения, не шаблонные переменные.
