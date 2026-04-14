# Exploration Log Format

Format for the file `<slug>-exploration.md` and Q&A records.

## File header (on creation)

```markdown
# Exploration: {{TOPIC}}

**Date:** {{YYYY-MM-DD}}
**Questions:** {{N}}
```

---

## Q&A record format

```markdown
## Q{{N}}: {{question}}

### Context

{{Why the question was asked — what led to it, what problem it solves, how it connects to previous questions. 1-2 sentences.}}

### Answer

{{ANSWER from explore-agent — the main answer to the question. Without implementation details.}}

### Details

{{DETAILS from explore-agent — specifics: file:line references, code fragments, mechanism explanations. May be several paragraphs.}}

### Key files

- `{{path/to/file.ts}}:{{LINE}}` — {{short description of why the file is important}}
- `{{path/to/other.ts}}:{{LINE}}` — {{short description}}

### Sources

- {{link or source mention}}
```

---

## Brainstorm record format

A brainstorm record additionally contains an `### Options` section after `### Details`.

```markdown
## Q{{N}}: {{question}} (brainstorm)

### Context

{{Why the question was asked — context of the choice or comparison.}}

### Answer

{{ANSWER — general overview of the situation and recommendation.}}

### Details

{{DETAILS — analysis of the current state, constraints, dependencies.}}

### Options

- [ ] **{{Option label}}** — {{description, pros/cons}}
- [ ] **{{Option label}}** — {{description, pros/cons}}
- [ ] **Other:** \_\_\_

### Key files

- `{{path/to/file.ts}}:{{LINE}}` — {{short description}}

### Sources

- {{link or source mention}}
```

---

## Final summary format

```markdown
## Summary

{{3-5 sentences. Topic, key takeaways, decisions made and deferred.}}
```

---

## Rules

- Number Q from 1, strictly sequentially.
- Use date format `YYYY-MM-DD`.
- Do not use emoji.
- The `### Context` section is required for every record.
- The `### Answer` and `### Details` sections are separate sections, do not merge into prose.
- The `### Sources` section — only when WEB_SOURCES are present.
- The `### Options` section — only in brainstorm records.
- The `## Summary` section — at the end, after all Q&A records.
