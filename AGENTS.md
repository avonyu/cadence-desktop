# 项目指导

## 文件指定

`./TODO.md` 文档为当前的任务清单，不要修改，我会随时更新

## 技术栈

相应的技术文档使用 Context 7 MCP 来获取最新的内容

- Vite
- Bun
- Tauri v2
- React
- React Router
- Video.js
- Zustand: global status manager
- Tailwind CSS V4+: CSS framework
- Shadcn: UI Component
- Lucide: Icon Library
- react-i18next

## Tauri 注意事项

### CSP 限制

- **dev 模式**：Vite dev server 不应用 Tauri CSP 策略，前端可以直接发起外部 HTTP 请求
- **build 模式**：打包后的应用会严格执行 `tauri.conf.json` 中的 CSP 配置，阻止前端直接访问外部 API
- **解决方案**：通过 Rust 后端代理外部 API 请求（使用 `tauri-plugin-http`），而不是在前端直接调用

### Shadcn/Radix ScrollArea 与 CSP

- Radix `ScrollArea` 会在运行时插入内联 `<style>` 来隐藏原生滚动条，例如 `[data-radix-scroll-area-viewport]{scrollbar-width:none;...}`
- Tauri dev 模式不会应用生产 CSP，因此该内联样式通常能生效；build 模式会应用 `tauri.conf.json` 中的 CSP，若未允许 inline style，Radix 注入的隐藏规则可能被阻止，导致原生滚动条出现
- 不要为了这个问题放宽 CSP 使用 `style-src 'unsafe-inline'`
- 项目内应将隐藏规则写入打包 CSS，例如在 `src/App.css` 中维护 `[data-radix-scroll-area-viewport]` 和 `::-webkit-scrollbar` 规则
- Shadcn `ScrollArea.Root` 应保持 `relative overflow-hidden`，确保 viewport 和自定义 scrollbar 按预期被裁剪
