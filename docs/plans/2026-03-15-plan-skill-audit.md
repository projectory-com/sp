# Plan skill audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Подготовить репозиторий к коммиту скилла `/plan` — обновить версии, метаданные, написать документацию, закоммитить.

**Architecture:** Один атомарный коммит. Изменения: version bump в двух JSON, обновление CLAUDE.md, создание docs/plan.md. Скилл skills/plan/ уже реализован и не требует правок.

**Tech Stack:** Markdown, JSON, git

---

### Task 1: Bump версии в plugin.json

**Files:**
- Modify: `.claude-plugin/plugin.json:3`

**Step 1: Изменить версию**

```json
"version": "0.4.0"
```

Строка 3: заменить `"0.3.0"` на `"0.4.0"`.

**Step 2: Verify**

Run: `python3 -c "import json; d=json.load(open('.claude-plugin/plugin.json')); assert d['version']=='0.4.0'; print('OK')"`
Expected: OK

---

### Task 2: Синхронизировать версию в marketplace.json

**Files:**
- Modify: `.claude-plugin/marketplace.json:11`

**Step 1: Изменить версию**

```json
"version": "0.4.0"
```

Строка 11: заменить `"0.2.0"` на `"0.4.0"`.

**Step 2: Verify**

Run: `python3 -c "import json; d=json.load(open('.claude-plugin/marketplace.json')); assert d['plugins'][0]['version']=='0.4.0'; print('OK')"`
Expected: OK

---

### Task 3: Обновить CLAUDE.md — Implemented + Planned skills

**Files:**
- Modify: `CLAUDE.md:56-58`

**Step 1: Заменить секцию Planned skills**

Заменить строки 56-58:
```markdown
## Planned skills

`/task` `/brain` `/plan` `/do` `/polish` `/pr` `/review` `/qa` `/fix` `/memorize` `/merge`
```

На:
```markdown
## Implemented skills

- `/task` — формирование задач для AI-реализации
- `/plan` — построение плана реализации по task-файлу

## Planned skills

`/brain` `/do` `/polish` `/pr` `/review` `/qa` `/fix` `/memorize` `/merge`
```

**Step 2: Verify**

Run: `grep -c "Implemented skills" CLAUDE.md`
Expected: 1

---

### Task 4: Создать docs/plan.md — документация скилла

**Files:**
- Create: `docs/plan.md`

**Step 1: Написать документацию**

Краткий обзор (50-80 строк): что делает, фазы, вход/выход, пример вызова, связи с другими скиллами.

Структура:
1. Заголовок и описание (2-3 предложения)
2. Вход — `$ARGUMENTS` путь к task-файлу
3. Фазы — таблица 6 фаз с кратким описанием каждой
4. Выход — путь и формат plan-файла
5. Routing — краткое описание трёх режимов
6. Пример использования — одна строка вызова
7. Связи — task → plan → do

Контент на русском. Стиль: как `docs/plugins.md` — лаконично, конкретно.

**Step 2: Verify**

Run: `test -f docs/plan.md && wc -l docs/plan.md`
Expected: файл существует, 50-80 строк

---

### Task 5: Validation и коммит

**Files:** все изменённые

**Step 1: JSON validation**

Run: `python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); json.load(open('.claude-plugin/marketplace.json')); print('OK')"`
Expected: OK

**Step 2: YAML frontmatter check**

Run: `head -1 skills/*/SKILL.md`
Expected: все начинаются с `---`

**Step 3: Commit**

```bash
git add skills/plan/ skills/task/SKILL.md .claude-plugin/plugin.json .claude-plugin/marketplace.json CLAUDE.md docs/plan.md docs/plans/ docs/ai/
git commit -m "feat: implement /plan skill — autonomous plan builder with routing and DAG

closes #8"
```
