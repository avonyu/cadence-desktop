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
