return {
  name = "prompt-optimizer",
  dir = vim.fn.stdpath("config"),
  lazy = false,
  config = function()
    -- Спиннер для отображения прогресса (в командной строке)
    local spinner_frames = { "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" }
    local spinner_index = 1
    local spinner_timer = nil

    local function start_spinner(message)
      spinner_index = 1
      spinner_timer = vim.uv.new_timer()
      spinner_timer:start(0, 100, vim.schedule_wrap(function()
        spinner_index = (spinner_index % #spinner_frames) + 1
        vim.api.nvim_echo({{ spinner_frames[spinner_index] .. " " .. message, "Comment" }}, false, {})
      end))
    end

    local function stop_spinner(final_message, level)
      if spinner_timer then
        spinner_timer:stop()
        spinner_timer:close()
        spinner_timer = nil
      end
      -- Очищаем командную строку
      vim.api.nvim_echo({{"", ""}}, false, {})
      -- Показываем финальное сообщение через notify
      if final_message then
        vim.notify(final_message, level or vim.log.levels.INFO)
      end
    end

    -- Получение visual selection
    local function get_visual_selection()
      local start_pos = vim.fn.getpos("'<")
      local end_pos = vim.fn.getpos("'>")

      -- getpos возвращает [bufnum, lnum, col, off] (1-indexed)
      local start_line = start_pos[2]
      local end_line = end_pos[2]

      -- Проверка что marks валидны
      if start_line == 0 or end_line == 0 then
        return nil
      end

      -- Определяем был ли это linewise selection (V mode)
      -- В V-mode колонка '> будет очень большой (v:maxcol = 2147483647)
      local is_linewise = end_pos[3] >= 2147483647 or start_pos[3] >= 2147483647

      local start_col, end_col

      if is_linewise then
        -- Для linewise берём целые строки
        start_col = 0
        local end_line_content = vim.api.nvim_buf_get_lines(0, end_line - 1, end_line, false)[1]
        end_col = end_line_content and #end_line_content or 0
      else
        -- Для character-wise selection
        start_col = start_pos[3] - 1 -- convert to 0-indexed
        end_col = end_pos[3] -- stay as-is for end

        -- Корректировка end_col
        local end_line_content = vim.api.nvim_buf_get_lines(0, end_line - 1, end_line, false)[1]
        if end_line_content then
          end_col = math.min(end_col, #end_line_content)
        end
      end

      local ok, lines = pcall(vim.api.nvim_buf_get_text, 0, start_line - 1, start_col, end_line - 1, end_col, {})

      if not ok then
        return nil
      end

      return {
        text = table.concat(lines, "\n"),
        bufnr = vim.api.nvim_get_current_buf(),
        start_line = start_line,
        start_col = start_col,
        end_line = end_line,
        end_col = end_col,
      }
    end

    -- Системный промт для Claude — роль, процесс, формат вывода
    local function build_system_prompt()
      return [[
Ты — редактор промтов. Твоя единственная задача — переписать промт для получения лучшего результата от LLM.

## Процесс работы

1. Используй скилл /prompt-optimizer — он содержит детальные правила оптимизации промтов. Следуй ему.

2. Изучи контекст проекта:
   - Используй Read, Grep, Glob для анализа кодовой базы
   - Используй скиллы feature-dev (code-explorer, code-architect) для понимания архитектуры
   - Используй elements-of-style (writing-clearly-and-concisely) для качества текста
   - Используй frontend-design если промт связан с фронтендом

3. Перепиши промт с учётом найденного контекста

4. Добавь секцию "## Уточняющие вопросы" с 3-5 вопросами, ответы на которые помогут LLM лучше выполнить задачу

## Формат вывода

Выведи ТОЛЬКО текст оптимизированного промта — включая секцию вопросов.

Допустимо: примеры кода, markdown-форматирование, разделители, списки.
ЗАПРЕЩЕНО: преамбулы, пояснения, комментарии о процессе, предложения записать файл.

## Важно

- У тебя НЕТ доступа к Edit/Write. Результат вставляется в редактор автоматически — не предлагай записать файл.
- Не выводи ничего кроме текста промта. Никаких "Here's...", "Вот оптимизированный...", "Готово!".
- Сохраняй язык оригинала.
]]
    end

    -- Формирование промпта с контекстом проекта (только контекст, инструкции в system prompt)
    local function build_prompt(selected_text)
      local cwd = vim.fn.getcwd()
      local project_name = vim.fn.fnamemodify(cwd, ":t")
      local file_path = vim.fn.expand("%:.")
      local filetype = vim.bo.filetype

      return string.format(
        [[
Контекст:
- Проект: %s
- Файл: %s
- Тип файла: %s

<prompt>
%s
</prompt>
]],
        project_name,
        file_path,
        filetype,
        selected_text
      )
    end

    -- Конфиг плагинов: отключаем паразитные, оставляем полезные для анализа
    local enabled_plugins = vim.json.encode({
      enabledPlugins = {
        ["context7@claude-plugins-official"] = false,
        ["commit-commands@claude-plugins-official"] = false,
        ["typescript-lsp@claude-plugins-official"] = false,
        ["lua-lsp@claude-plugins-official"] = false,
        ["code-simplifier@claude-plugins-official"] = false,
        ["superpowers@superpowers-marketplace"] = false,
        ["claude-md-management@claude-plugins-official"] = false,
        ["rust-analyzer-lsp@claude-plugins-official"] = false,
        ["frontend-design@claude-plugins-official"] = true,
        ["elements-of-style@superpowers-marketplace"] = true,
        ["feature-dev@claude-plugins-official"] = true,
        ["serena@claude-plugins-official"] = false,
        ["skill-creator@claude-plugins-official"] = false,
        ["explanatory-output-style@claude-plugins-official"] = false,
        ["code-review@claude-plugins-official"] = false,
        ["claude-code-setup@claude-plugins-official"] = false,
        ["plugin-dev@claude-plugins-official"] = false,
        ["hookify@claude-plugins-official"] = false,
        ["superpowers-developing-for-claude-code@superpowers-marketplace"] = false,
      },
    })

    -- Async вызов Claude Code CLI через stdin
    local function call_claude(prompt, callback)
      local stdout_data = {}
      local stderr_data = {}

      local system_prompt = build_system_prompt()

      local job_id = vim.fn.jobstart({
        "claude",
        "-p",
        "-", -- читать промт из stdin
        "--output-format", "text",
        "--model", "opus",
        "--tools", "Read,Grep,Glob,WebSearch,WebFetch,Bash,Task",
        "--append-system-prompt", system_prompt,
        "--settings", enabled_plugins,
        "--permission-mode", "bypassPermissions",
        "--no-session-persistence",
      }, {
        stdin = "pipe",
        stdout_buffered = true,
        stderr_buffered = true,
        on_stdout = function(_, data)
          if data then
            vim.list_extend(stdout_data, data)
          end
        end,
        on_stderr = function(_, data)
          if data then
            vim.list_extend(stderr_data, data)
          end
        end,
        on_exit = function(_, code)
          if code == 0 then
            local result = table.concat(stdout_data, "\n")
            result = result:gsub("^%s+", ""):gsub("%s+$", "")
            callback(nil, result)
          else
            local err = table.concat(stderr_data, "\n")
            callback("Claude Code failed: " .. err, nil)
          end
        end,
      })

      if job_id <= 0 then
        callback("Failed to start Claude process", nil)
        return
      end

      -- Отправляем промт через stdin и закрываем
      vim.fn.chansend(job_id, prompt)
      vim.fn.chanclose(job_id, "stdin")
    end

    -- Замена текста в буфере
    local function replace_selection(sel, new_text)
      local lines = vim.split(new_text, "\n")

      local ok, err =
        pcall(vim.api.nvim_buf_set_text, sel.bufnr, sel.start_line - 1, sel.start_col, sel.end_line - 1, sel.end_col, lines)

      if not ok then
        vim.notify("Failed to replace text: " .. tostring(err), vim.log.levels.ERROR)
      end
    end

    -- Основная функция
    local function optimize_prompt()
      local sel = get_visual_selection()
      if not sel or sel.text == "" then
        vim.notify("No text selected", vim.log.levels.WARN)
        return
      end

      start_spinner("Optimizing prompt with Claude...")

      local prompt = build_prompt(sel.text)

      call_claude(prompt, function(err, result)
        vim.schedule(function()
          if err then
            stop_spinner("✗ " .. err, vim.log.levels.ERROR)
            return
          end

          if result and result ~= "" then
            replace_selection(sel, result)
            stop_spinner("✓ Prompt optimized!", vim.log.levels.INFO)
          else
            stop_spinner("⚠ Empty response from Claude", vim.log.levels.WARN)
          end
        end)
      end)
    end

    -- Keymap для visual mode
    -- Используем :<C-u> чтобы marks '< и '> были установлены перед вызовом функции
    vim.keymap.set("x", "<leader>po", ":<C-u>lua _G.prompt_optimizer_run()<CR>", { desc = "Optimize prompt with Claude", silent = true })

    -- Expose function globally for keymap
    _G.prompt_optimizer_run = optimize_prompt
  end,
}
