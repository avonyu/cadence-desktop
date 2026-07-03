# Qwen-ASR 语音转字幕功能规划

## 总体流程

```
视频文件 → ffmpeg 提取音频(WAV) → 上传 DashScope Qwen-ASR API → 解析 JSON → 生成 SRT 字幕 → 缓存
```

## 1. 新增 Rust 模块 `src-tauri/src/qwen_asr.rs`

| 命令                    | 功能                                            |
| ----------------------- | ----------------------------------------------- |
| `transcribe_audio`      | 核心命令：提取音频 → 调用 API → 返回 SRT 字符串 |
| `check_qwen_asr_config` | 验证 API Key 是否有效                           |

### 内部流程

1. 用 ffmpeg 提取视频音频：
   ```
   ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 temp.wav
   ```
2. 通过 `multipart/form-data` 上传到 DashScope 兼容 OpenAI 格式的端点：
   ```
   POST https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions
   ```
3. 请求参数：
   - `model: "qwen-asr"`
   - `language: "zh"` (可选，不传则自动检测)
   - `response_format: "verbose_json"`（包含 segments 及时间戳）
4. 解析返回的 `{ segments: [{ text, start, end }] }` → 转换为标准 SRT 格式
5. 通过 Tauri events 发送进度事件（`asr-progress`: extracting / uploading / transcribing）
6. 清理临时 WAV 文件

### Deps

无需新的 Cargo 依赖——已有 `tauri_plugin_http::reqwest`（含 `multipart` feature）可处理文件上传。

## 2. 前端改动

### a. 状态管理 (`player-store.ts`)

- 新增 `qwenAsrApiKey: string`（类似 `deepseekApiKey`）
- 复用现有 `aiProcessing` 状态机：`idle → loading(提取音频) → processing(ASR识别) → done / error`

### b. 设置页面 (`settings-tab-ai.tsx` / `settings-dialog.tsx`)

- 在 AI 设置 tab 中新增 Qwen ASR 配置区域：
  - API Key 输入框
  - 获取 API Key 的链接（指向阿里云百炼控制台）

### c. 新 Hook (`hooks/use-qwen-asr.ts`)

- 调用 `invoke("transcribe_audio", { videoPath, apiKey })`
- 监听 `asr-progress` 事件获取进度
- 收到 SRT 文本 → 解析 → `Caption[]` → 设置字幕并缓存到 IndexedDB
- 支持取消操作

### d. UI 入口

- 当视频已加载但无匹配字幕时，在播放器控制栏或字幕侧边栏展示"AI 生成字幕"按钮
- 进度指示：提取音频中 → 语音识别中（带进度动画）

## 3. Cache 策略

- 复用现有 `ai-subtitle.ts` 的 IndexedDB 缓存体系
- 缓存 key：视频文件名 + 音频的 SHA-256 hash
- 同一视频不重复识别

## 4. API 细节

| 参数                | 值                                                                       |
| ------------------- | ------------------------------------------------------------------------ |
| **端点**            | `https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions` |
| **认证**            | `Authorization: Bearer <api_key>`                                        |
| **请求方式**        | `multipart/form-data`                                                    |
| **model**           | `qwen-asr`                                                               |
| **response_format** | `verbose_json`（包含 segments 及时间戳）                                 |
| **language**        | 可选 `zh` / `en`，不传则自动检测                                         |

## 5. 边界情况

- 长视频：Qwen-ASR 有文件大小或时长限制，超过限制需要分片处理
- API Key 未配置或无效 → 提示用户
- 音频提取失败 → 回退到视频文件中的音频流
- 识别结果为空 → 提示用户
- 取消操作 → 清理临时文件

## 6. 待确认事项

1. **API 端点确认**：是否使用 DashScope 兼容 OpenAI 格式的端点（`dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions`），还是需要通过百炼的其他接口？
2. **ASR 入口位置**：是在现有"加载字幕"按钮旁边加一个"生成字幕"按钮，还是当视频无字幕时自动提示？
3. **长视频处理策略**：对于超过 1 小时的视频，是分片识别后拼接，还是直接提示用户文件太长？
