# AI 设置 API Key 校验设计

## 目标

在设置对话框的 AI 标签中，用户点击保存时必须提供非空 API Key。空字符串或仅包含空白字符的值不写入全局状态，并通过 Sonner 显示本地化错误提示。

## 设计

- 使用 Zod 定义 AI 设置 schema，统一校验 `apiKey` 和 `model`。
- `apiKey` 在校验前执行 `trim()`，并要求至少一个字符；成功结果使用修剪后的值。
- 保存处理器调用 `safeParse`。失败时显示 `settings.apiKeyRequired` 错误 Toast 并立即返回；成功时保存解析后的值并显示成功 Toast。
- 中文提示为“请提供 API Key”，英文提示为“Please provide an API Key”。

## 验证

- 单元测试覆盖空字符串、纯空白字符串和有效且带首尾空白的 API Key。
- 执行目标测试、完整测试集和生产构建。
