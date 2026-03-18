# Frontend Guide

Этот файл читается только если `TASK_TYPE = frontend` — в дополнение к `synthesize-guide.md`.

Цель: помочь сформулировать Requirements, Constraints и Verification для frontend-задач так,
чтобы реализатор не принял ни одного визуального решения самостоятельно.

---

## Принцип

Frontend-задачи проваливаются не потому что реализатор не умеет в React.
Они проваливаются потому что task-файл не отвечает на вопросы:

- Какой конкретно font-family использовать?
- Какой easing у transition?
- Что происходит на mobile breakpoint?
- Что считать «правильным» визуально?

Задача промт-инженера — перевести тикет и Figma-ссылку в конкретные,
проверяемые визуальные требования.

---

## Шаг 1 — Design context: что найти в Investigate

Перед Synthesize у тебя должны быть answers на эти вопросы.
Если task-explorer не нашёл — добавь в уточняющие вопросы.

**Typography:**

- Какие font-family используются в проекте? (из CSS variables, tailwind config, или globals)
- Есть ли type scale? (из `typography.ts`, `tailwind.config.js`, или CSS)

**Color system:**

- Как определены цвета — CSS variables, Tailwind tokens, JS theme object?
- Конкретные имена токенов для primary, surface, border, text (из файлов)

**Spacing:**

- Используется ли 4px или 8px grid? (из tailwind config или дизайн-системы)

**Animation:**

- Какая библиотека для анимаций? (Framer Motion, GSAP, CSS-only)
- Есть ли стандартные easings/durations в проекте? (из `animations.ts` или CSS vars)

**Breakpoints:**

- Какие breakpoints используются? (из tailwind config или CSS media queries)
- Mobile-first или desktop-first подход?

**Component patterns:**

- Как именно устроены похожие компоненты? (пути + структура из findings)

---

## Шаг 2 — Requirements: как писать визуальные требования

### Правило: каждое визуальное требование содержит конкретное значение

Не оставляй реализатору пространство для интерпретации в визуальных деталях.

**Before / After:**

```
# Плохо — реализатор будет гадать
- Добавить анимацию появления карточек
- Карточка должна выглядеть интерактивной при hover
- Использовать цвета из дизайн-системы
```

```
# Хорошо — все значения конкретны
- При mount: карточки появляются с staggered fade-in, задержка 60ms между элементами,
  длительность 300ms, easing: ease-out. Использовать Framer Motion (уже в проекте).
- Hover state: box-shadow переходит к `--shadow-md` за 180ms ease-out,
  translateY(-2px) за то же время. Одна transition, не два отдельных.
- Цвета строго из CSS variables: background → `--color-surface`,
  border → `--color-border`, text → `--color-text-primary`.
```

### Чеклист для frontend Requirements

Для каждого визуального элемента в задаче — пройдись по чеклисту:

**Typography** (если задача касается текста):

- [ ] font-family — конкретное значение или токен из проекта
- [ ] font-size — значение или scale step (`text-sm`, `--font-size-body`)
- [ ] font-weight — число или токен (`font-medium`, `500`)
- [ ] line-height — значение (`leading-relaxed`, `1.6`)
- [ ] letter-spacing — если нестандартный

**Color** (если задача касается цвета):

- [ ] Конкретные CSS variables или Tailwind tokens для каждого цвета
- [ ] Цвет в разных состояниях: default, hover, active, disabled, focus
- [ ] Dark mode — нужен ли, как переключается в проекте

**Spacing & Layout**:

- [ ] Конкретные padding/margin значения или tokens (`p-4`, `gap-6`, `--space-md`)
- [ ] Breakpoints — как меняется layout на mobile/tablet/desktop
- [ ] Alignment и distribution — flex/grid конфигурация

**Animation & Motion**:

- [ ] Trigger — когда запускается (mount, hover, scroll, click)
- [ ] Property — что анимируется (opacity, transform, height)
- [ ] Duration — миллисекунды
- [ ] Easing — функция (`ease-out`, `cubic-bezier(0.4, 0, 0.2, 1)`)
- [ ] Delay — если staggered
- [ ] Библиотека — CSS transition, Framer Motion, GSAP

**Interactive states**:

- [ ] hover — визуальное изменение + transition
- [ ] focus-visible — ring/outline для accessibility
- [ ] active/pressed — тактильный отклик
- [ ] disabled — opacity + cursor
- [ ] loading — skeleton или spinner

---

## Шаг 3 — Constraints: что защищать в frontend-задачах

### Что всегда добавлять в Constraints для frontend:

**Шрифты — защити от замены:**

```
- Не заменять font-family — использовать только то что уже в проекте
  (найдено: [конкретные значения из Investigate])
- Не подключать новые шрифты через Google Fonts или @import
```

**Токены — защити от хардкода:**

```
- Все цвета только через CSS variables / Tailwind tokens — не хардкодить hex
- Все размеры через токены — не хардкодить px значения вне дизайн-системы
```

**Анимации — защити от избыточности:**

```
- Не добавлять анимации которых нет в тикете
- prefers-reduced-motion: все motion-эффекты должны отключаться через media query
```

**Существующие компоненты — защити от дублирования:**

```
- Использовать существующий [ComponentName] из [path] — не создавать дубль
- Не изменять props interface существующих компонентов
```

**Anti-convergence (из frontend-design скилла):**

```
- Не использовать Inter/Roboto/Arial если они не в проекте
- Не добавлять purple gradient — не соответствует дизайн-системе проекта
- Следовать установленному visual style, не вводить новую эстетику
```

---

## Шаг 4 — Verification: как проверять frontend-задачи

### Проблема с frontend Verification

Нельзя написать `curl` для проверки «выглядит правильно».
Но можно написать конкретные поведенческие проверки.

**Уровни Verification для frontend:**

**1. Автоматические (если есть тесты в проекте):**

```
- `npm test src/components/Card.test.tsx` — все тесты зелёные
- `npm run type-check` — нет TypeScript ошибок
- `npm run lint` — нет eslint ошибок
```

**2. Визуальные чеклисты (ручная проверка, но конкретная):**

```
- Открыть компонент на desktop (1440px): карточки в 3 колонки с gap 24px
- Открыть на mobile (375px): карточки в 1 колонку, padding 16px с боков
- Hover на карточку: shadow появляется за 180ms, нет рывков
- Tab через элементы: focus ring виден на каждом интерактивном элементе
- Включить prefers-reduced-motion в OS: все анимации отсутствуют
- Dark mode (если есть): все цвета переключаются через CSS variables
```

**3. Accessibility:**

```
- Изображения имеют alt текст
- Интерактивные элементы доступны с клавиатуры
- Contrast ratio текста ≥ 4.5:1 (можно проверить в Chrome DevTools)
```

### Before / After для Verification:

```
# Плохо — непроверяемо
- Анимация работает корректно
- Выглядит хорошо на мобильных
- Hover state есть
```

```
# Хорошо — конкретные проверки
- `npm run type-check` — 0 ошибок
- Resize до 375px: layout переключается в 1 колонку, текст не обрезается
- Hover на кнопку: translateY(-2px) + shadow за 180ms, без рывков
- Tab к кнопке: focus ring 2px solid var(--color-focus) виден
- System dark mode ON: все поверхности используют --color-surface-dark
- prefers-reduced-motion ON в OS: открыть страницу, анимации отсутствуют
```

---

## Уточняющие вопросы для frontend-задач

Если Investigate не дал ответы на ключевые вопросы — добавляй в вопросы:

```
1. **Нужен ли dark mode для этого компонента?**
   - [ ] Да — переключение через CSS variables (паттерн уже в проекте)
   - [ ] Нет — компонент только light
   - [ ] Свой вариант: ___

2. **Как обрабатывать анимации при prefers-reduced-motion?**
   - [ ] Полностью отключить все transitions и animations
   - [ ] Оставить opacity-only переходы (без transform)
   - [ ] Свой вариант: ___

3. **Какой breakpoint считать переходом mobile → desktop?**
   - [ ] md (768px) — стандарт Tailwind в проекте
   - [ ] lg (1024px) — если компонент сложный
   - [ ] Свой вариант: ___

4. **Нужны ли skeleton-состояния при загрузке данных?**
   - [ ] Да — по паттерну из [существующий компонент]
   - [ ] Нет — достаточно spinner
   - [ ] Свой вариант: ___
```
