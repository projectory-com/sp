# Telegram-нотификации

Двухслойная система оповещений: скиллы записывают JSON в очередь, stop-hook отправляет накопленные сообщения в Telegram.
Нотификации работают по принципу opt-in — без env-переменных система молча пропускает отправку.

---

## Настройка

### 1. Создать бота

- Открой [@BotFather](https://t.me/BotFather) в Telegram
- Отправь `/newbot` и следуй инструкциям
- Сохрани полученный token (формат `123456789:ABC...`)

### 2. Получить chat_id

- Отправь любое сообщение своему боту
- Вызови API:
  ```bash
  curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | jq '.result[0].message.chat.id'
  ```
- Сохрани полученный `chat_id`

### 3. Задать переменные окружения

Добавь в `~/.zshrc` (или `~/.bashrc`):

```bash
export CC_TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
export CC_TELEGRAM_CHAT_ID="YOUR_CHAT_ID"
```

Затем перезагрузи shell: `source ~/.zshrc`

Переменные пробрасываются в hook через `allowedEnvVars` в `hooks/hooks.json`.

---

## Типы нотификаций

| Тип             | Маркер | Когда срабатывает                             |
| --------------- | ------ | --------------------------------------------- |
| ACTION_REQUIRED | ⏸      | Перед вопросами, требующими ответа            |
| STAGE_COMPLETE  | ✅     | Задача, план, PR или другой артефакт готов    |
| ALERT           | ⚠️     | Блокировка, scope guard, критическая ситуация |

Все три типа всегда включены.

---

## Карта точек нотификаций

| Скилл | Фаза       | Тип             | Описание                     |
| ----- | ---------- | --------------- | ---------------------------- |
| task  | Synthesize | ACTION_REQUIRED | Уточняющие вопросы по задаче |
| task  | Complete   | STAGE_COMPLETE  | Task-файл готов              |
| plan  | Design     | ACTION_REQUIRED | Вопросы по реализации        |
| plan  | Complete   | STAGE_COMPLETE  | План готов                   |
| do    | Execute    | ALERT           | Task заблокирован            |
| do    | Complete   | STAGE_COMPLETE  | Реализация завершена         |
| fix   | Decide     | ALERT           | Большой фикс (scope guard)   |
| fix   | Decide     | ACTION_REQUIRED | Требуется уточнение          |
| fix   | Complete   | STAGE_COMPLETE  | Fix завершён                 |
| pr    | Decide     | ACTION_REQUIRED | Выбор типа PR (draft/ready)  |
| pr    | Complete   | STAGE_COMPLETE  | PR создан или обновлён       |

---

## Тестирование

Вызови notify.sh напрямую и проверь очередь:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/lib/notify.sh \
  --type STAGE_COMPLETE \
  --skill task \
  --phase Complete \
  --slug test \
  --title "Test" \
  --body "test body"
```

Затем проверь содержимое файла очереди:

```bash
cat .sp/notify-pending.json
```

Файл должен содержать JSON-объект с одной записью уведомления. Stop-hook (`hooks/notify.sh`) заберёт его при завершении сессии и отправит в Telegram.

---

## Зависимости

- **jq** — для работы с JSON (обязательно для обоих скриптов)
- **curl** — для отправки HTTP-запросов к Telegram Bot API (обязательно для stop-hook)

При отсутствии jq или curl скрипты завершаются с exit 0.

---

## Troubleshooting

| Проблема                      | Проверка                                                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Нотификации не приходят       | Проверь что `CC_TELEGRAM_BOT_TOKEN` и `CC_TELEGRAM_CHAT_ID` заданы: `echo $CC_TELEGRAM_BOT_TOKEN`                                                                     |
| curl not found                | Установи curl: `sudo apt install curl` / `brew install curl`                                                                                                          |
| jq not found                  | Установи jq: `sudo apt install jq` / `brew install jq`                                                                                                                |
| Ошибка 401 от Telegram        | Неверный bot token — пересоздай через @BotFather                                                                                                                      |
| Ошибка 400 (chat not found)   | Неверный chat_id — отправь сообщение боту и повтори getUpdates                                                                                                        |
| Очередь не очищается          | Проверь, что `hooks/notify.sh` указан в `hooks/hooks.json` как stop-hook                                                                                              |
| Telegram недоступен / timeout | curl ждёт до 8 секунд (hook timeout 10s). При сбое `notify-pending.json` удаляется, повторная отправка не производится. Удалить вручную: `rm .sp/notify-pending.json` |
