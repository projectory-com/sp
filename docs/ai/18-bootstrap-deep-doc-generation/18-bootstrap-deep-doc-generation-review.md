# Review: 18-bootstrap-deep-doc-generation

**Slug:** 18-bootstrap-deep-doc-generation
**Issues found:** 5
**Issues fixed:** 2
**Issues skipped:** 3 (Minor, excluded by user)

## Summary

Расширение bootstrap pipeline новым detect-агентом `domain-analyzer` для извлечения доменного контекста из кода. 7 файлов затронуты, 1 создан. Pipeline: domain-analyzer → SKILL.md → claude-md-generator + sp-context-generator. Validation чеки пройдены.

## Issues

### Fixed

| #   | Severity  | Score | Category | File                          | Description                                          |
| --- | --------- | ----- | -------- | ----------------------------- | ---------------------------------------------------- |
| 1   | Important | 72    | quality  | `SKILL.md:179-184`            | Несоответствие ключей `CODE_WORKAROUNDS`/`workarounds` |
| 2   | Important | 68    | quality  | `SKILL.md:126` + `claude-md-generator.md` | Дедупликация невыполнима при параллельном dispatch    |

**Fix commit:** `c52a560`

### Skipped

| #   | Severity | Score | Category      | File                      | Description                                    | Reason              |
| --- | -------- | ----- | ------------- | ------------------------- | ---------------------------------------------- | ------------------- |
| 3   | Minor    | 45    | quality       | `domain-analyzer.md`      | Отсутствует Go-паттерн `func\w*Handler`        | Excluded by user    |
| 4   | Minor    | 38    | style         | Несколько агентов /do      | Непоследовательная нумерация "Шаг 0"           | Excluded by user    |
| 5   | Minor    | 30    | documentation | `domain-analyzer.md`      | Не описано поведение при пустых результатах     | Excluded by user    |

## Commits

- `c52a560` fix(18-bootstrap): fix pipeline key naming and add deduplication rule
