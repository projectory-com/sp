# Fix Log Format

Формат файла `<slug>-fixes.md` и отдельных записей.

---

## Header файла (при создании)

```markdown
# Fix Log: <SLUG>

**Task:** docs/ai/<SLUG>/<SLUG>-task.md
```

---

## Формат записи

```markdown
## Fix N: <краткое описание>

**Дата:** <YYYY-MM-DD>
**Статус:** done | blocked

### Что изменено

<1-3 предложения — что сделано и почему>

### Файлы

| Файл   | Action                         | Описание             |
| ------ | ------------------------------ | -------------------- |
| <path> | <created / modified / deleted> | <описание изменения> |

### Validation

<результаты lint/types/tests/build>

### Concerns

<если были, иначе секцию опустить>
```

---

## Коммиты

Список коммитов записывай после секции Validation:

```markdown
### Коммиты

- `<hash>` <message>
- `<hash>` <message>
```

---

## Правила

- Каждая запись начинается с `## Fix N:`.
- N — порядковый номер (1, 2, 3...).
- Секция Concerns — только при наличии. Без concerns секцию опусти.
- Статус: `done` или `blocked`. Без emoji.
- Дата: формат `YYYY-MM-DD`.
