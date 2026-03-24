# Code Review: 19-explore-skill

### Контекст и цель

PR реализует скилл `/explore` — read-only Q&A loop для исследования кодовой базы с накоплением контекста через summary chain. Скилл позволяет задавать вопросы об архитектуре, сравнивать подходы и проводить брейнсторм, записывая результат в structured exploration log. Архитектура построена по паттерну из `/fix`: тонкий оркестратор в SKILL.md + два stateless агента.

### Коммиты

| Hash    | Описание                                                       |
| ------- | -------------------------------------------------------------- |
| 78ff165 | feat(19-explore-skill): add exploration-log-format reference   |
| 1d9a797 | feat(19-explore-skill): add explore-agent                      |
| 6488d53 | feat(19-explore-skill): add explore-log-writer                 |
| ae23639 | feat(19-explore-skill): add SKILL.md orchestrator              |
| fc89bf2 | docs(19-explore-skill): add explore to hi and CLAUDE.md        |
| 5bc4ae3 | style(19-explore-skill): format exploration-log-format         |
| f0c2ab0 | docs(19-explore-skill): add execution report                   |
| c7dd0ff | docs(19-explore-skill): add task definition                    |
| 6971b78 | docs(19-explore-skill): add implementation plan                |

### Изменённые файлы

| Файл                                                        | +/-    | Описание                                              |
| ----------------------------------------------------------- | ------ | ----------------------------------------------------- |
| `skills/explore/SKILL.md`                                   | +173   | Оркестратор: 4 фазы, user-driven Q&A loop             |
| `skills/explore/agents/explore-agent.md`                    | +133   | Read-only исследователь, structured output            |
| `skills/explore/agents/explore-log-writer.md`               | +82    | Writer артефакта, коммит без ticket prefix            |
| `skills/explore/reference/exploration-log-format.md`        | +80    | Шаблон Q&A, brainstorm и summary секций               |
| `skills/hi/SKILL.md`                                        | +12    | Секция /explore в таблице скиллов и пример вызова     |
| `CLAUDE.md`                                                 | +1     | /explore перенесён в Implemented skills               |
| `docs/ai/19-explore-skill/19-explore-skill-plan.md`         | +166   | AI-артефакт: план реализации                          |
| `docs/ai/19-explore-skill/19-explore-skill-report.md`       | +58    | AI-артефакт: отчёт об исполнении                      |
| `docs/ai/19-explore-skill/19-explore-skill-task.md`         | +92    | AI-артефакт: task-файл                                |

### Ключевые участки для ревью

1. **`skills/explore/SKILL.md:фаза 2 — Loop`** — ядро скилла: схема prompt enrichment, формат QA_LOG, три варианта на выходе (ещё вопрос / сохранить / выйти). Определяет UX и расход токенов.

2. **`skills/explore/SKILL.md:фаза 4 — Complete`** — интеграция с `/sp:task` через Skill tool. Единственное место в PR, где один скилл вызывает другой; важно для понимания inter-skill composition.

3. **`skills/explore/agents/explore-agent.md:structured output`** — два типа ответа (`answer` и `brainstorm`) с разными полями. Поле `DETAILS` присутствует в structured output агента, но отсутствует в спецификации task-файла (там только `ANSWER` + `SUMMARY`).

4. **`skills/explore/agents/explore-agent.md:Self-check`** — механизм верификации file:line ссылок. Каждая ссылка должна быть перечитана перед включением в ответ; это ключевое требование для достоверности ответов.

5. **`skills/explore/agents/explore-agent.md:Classification + Research`** — разветвление на codebase / web / hybrid с приоритетом context7 MCP над WebSearch. Поведение при недоступном context7 определяет качество web-ответов.

6. **`skills/explore/agents/explore-log-writer.md:Шаг 2`** — guard на уже существующий файл: агент завершает с ошибкой вместо перезаписи. Решение корректное, но сценарий "Continue after Finalize → save again" не обработан.

7. **`skills/explore/reference/exploration-log-format.md:brainstorm формат`** — чеклист вариантов с `- [ ] **Other:** ___`. Соответствует требованиям task-файла; важно убедиться, что explore-log-writer корректно маппит `OPTIONS` в этот формат.

8. **`skills/explore/SKILL.md:фаза 1 — Init`** — оркестратор сам создаёт директорию через `mkdir -p`, нарушая принцип "тонкого оркестратора" (все файловые операции — агентам). Остальные FS-операции делегированы.

9. **`skills/hi/SKILL.md:57`** — `/sp:explore` добавлен в секцию "Полный цикл" перед `/sp:task`, что правильно отражает workflow: исследование → задача.

10. **`skills/explore/SKILL.md:правила`** — формулировка "без остановок" и user-driven loop декларированы в одном разделе. Противоречия нет, но формулировка может сбить агента при интерпретации.

### Сложные решения

1. **Потеря лога при обрыве сессии** (`skills/explore/SKILL.md:фаза 3 — Finalize`, `plan.md:DD-2`)

   QA_LOG хранится только в контексте оркестратора и записывается однократно при явном выборе "Сохранить и завершить". При обрыве сессии или выборе "Выйти без сохранения" все данные теряются.

   ```
   # Фаза 2, шаг 2e — три варианта:
   - Задать ещё вопрос          → продолжить накопление (лог не записан)
   - Сохранить и завершить      → Фаза 3 (лог записывается)
   - Продолжить без сохранения  → выход (лог не записывается)
   ```

   Решение принято осознанно (plan.md:DD-2): exploration log — справочный артефакт, не критичный. Альтернатива с temp-файлом отклонена как избыточная. Ревьюеру стоит оценить, приемлем ли этот trade-off для реальных сценариев использования (длинные сессии, ошибки LLM).

2. **Поле DETAILS в structured output агента vs task-файл** (`skills/explore/agents/explore-agent.md:76-97`)

   Агент возвращает поля `ANSWER` + `DETAILS` + `SUMMARY`. Task-файл (req. 3) описывает только `ANSWER` + `SUMMARY`. Оркестратор в SKILL.md:91 корректно показывает оба поля:

   ```
   При `RESPONSE_TYPE = answer` — покажи ANSWER и DETAILS пользователю.
   ```

   DETAILS не попадает в QA_LOG (SKILL.md:99-107 — логируется только `ANSWER + DETAILS` как единый блок). Это разумно, но отклонение от спецификации нужно зафиксировать явно.

3. **Фаза Complete допускает возврат к Loop после Finalize** (`skills/explore/SKILL.md:159`)

   После записи лога пользователь может выбрать "Ещё вопрос" и вернуться к Loop с теми же SLUG и QA_LOG. Новые вопросы добавляются в контекст, но при повторном "Сохранить и завершить" log-writer завершится с ошибкой (файл уже существует, SKILL.md:41-42). Сценарий не покрыт.

   ```
   # explore-log-writer.md:41-42
   Файл существует → агент завершает работу с ошибкой: файл уже создан.
   ```

### Вопросы к ревьюеру

1. Сценарий "Continue after Finalize": пользователь вернулся из Complete в Loop, задал ещё вопросы, нажал "Сохранить" — log-writer упадёт с ошибкой. Нужно ли разрешить append в существующий файл или вообще заблокировать возврат в Loop после Finalize?

2. Поле DETAILS в structured output агента не описано в task-файле. Это намеренное расширение или несогласованность? Стоит ли зафиксировать в task или убрать поле из агента?

3. `mkdir -p` в фазе Init выполняется оркестратором напрямую (SKILL.md:53-55), нарушая принцип "тонкого оркестратора". Насколько это принципиально — перенести операцию в explore-log-writer, который уже делает `mkdir -p` сам?

4. При возврате к Loop после Finalize (Complete:159) slug и QA_LOG сохраняются, но новые Q&A пары уже не смогут быть сохранены. Нужен ли явный warning пользователю?

5. context7 MCP — опциональная зависимость. Агент "проверяет доступность" (explore-agent.md:59), но механизм проверки нигде не задан. Как агент должен определить, установлен ли context7?

6. Trigger phrases в description (`SKILL.md:3-7`) включают очень широкие фразы: "объясни", "расскажи про". Не будет ли /explore активироваться в ситуациях, где пользователь имеет в виду другой скилл?

### Риски и влияние

- **Потеря данных при обрыве**: все Q&A пары хранятся только в контексте оркестратора; при сбое LLM или timeout сессии данные не восстановимы.
- **Несовместимость с существующими скиллами**: SKILL.md не изменяет существующие скиллы; изменения в `skills/hi/SKILL.md` и `CLAUDE.md` строго аддитивны.
- **Расход токенов при длинных сессиях**: EXPLORATION_SUMMARY растёт на ~200 токенов за вопрос; при 20 вопросах это ~4000 токенов дополнительного контекста на каждый dispatch. Риск управляемый, warning при 20+ вопросах есть.
- **Зависимость от context7**: если MCP недоступен, качество web-ответов деградирует к WebSearch без структурированной документации. Нет явного fallback с предупреждением пользователю.
- **Auto-discovery**: скилл не регистрируется в plugin.json/marketplace.json — это корректно по архитектуре, но зависит от наличия SKILL.md в нужной директории.

### Тесты и ручные проверки

**Авто-тесты:**

- YAML frontmatter: `head -1 skills/explore/SKILL.md skills/explore/agents/*.md skills/explore/reference/*.md` → каждый файл начинается с `---`
- Манифесты: `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"` → OK
- Форматирование: `pnpm run format:check` → без ошибок
- Tools без Write/Edit: `grep "tools:" skills/explore/agents/explore-agent.md` не содержит Write или Edit

**Ручные сценарии:**

1. `claude --plugin-dir . /sp:explore как устроена система скиллов` → скилл активируется, задаёт вопрос про slug, предлагает 2-3 варианта, инициализирует loop.
2. Задать 2-3 вопроса о кодовой базе → explore-agent возвращает ANSWER с file:line ссылками; ссылки должны реально существовать в файлах.
3. Задать brainstorm-вопрос ("какие варианты для X?") → агент возвращает OPTIONS; оркестратор показывает чеклист вариантов.
4. Выбрать "Сохранить и завершить" → explore-log-writer создаёт файл в `docs/ai/<slug>/`, делает git commit без ticket prefix.
5. После Finalize выбрать "Ещё вопрос" → задать вопрос → выбрать "Сохранить" → ожидается ошибка log-writer (файл уже существует). Проверить, как оркестратор обрабатывает ошибку агента.
6. Задать вопрос о внешней библиотеке ("как работает Prettier?") → агент должен использовать web-источники, а не только кодовую базу.
7. `/sp:explore` без аргументов → оркестратор задаёт AskUserQuestion "О чём хочешь поговорить?" перед инициализацией slug.

### Out of scope

- Поддержка append в уже существующий exploration log — намеренно не реализована; log создаётся однократно.
- Автоматическая генерация вопросов — скилл user-driven, пайплайн вопросов не предусмотрен.
- Регистрация в plugin.json/marketplace.json — auto-discovery через SKILL.md достаточно.
- Persistent state между сессиями — QA_LOG живёт только в контексте текущей сессии; persisting требует temp-файла (отклонено в DD-2).
- Интеграция с `/sp:plan` напрямую — Complete предлагает только `/sp:task` как следующий шаг.
