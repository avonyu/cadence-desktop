# 幕听 (Cadence)

<div align="center">

<img src="../src-tauri/icons/icon.png" width="128" height="128" alt="幕听图标" />

**沉浸式双语字幕视频学习工具**

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

简体中文 | [English](../README.md)

</div>

---

### 简介

Cadence，意为韵律与节奏。这是一款专为 **听力 + 字幕学习** 设计的桌面视频播放器，精准贴合语言学习者的需求。

### 功能特性

- 🎬 **字幕解析** — 支持 `.srt` / `.ass` 格式，自动识别文件类型；解析双语字幕（原文 + 翻译）
- 🔄 **视频字幕同步** — 播放时自动高亮当前字幕；侧边栏点击时间戳可跳转至对应位置
- 💾 **字幕缓存** — AI 翻译结果通过 SHA-256 哈希自动缓存到本地，重复打开无需重新处理
- 🤖 **AI 智能翻译** — 集成 DeepSeek API，自动翻译单语字幕（中 ↔ 英）
- 🔀 **双字幕合并** — 支持合并两个独立的字幕文件（如每种语言一个文件），按时间戳对齐
- 📝 **大字幕显示** — 视频下方双行双语展示，主次分明
- 🎭 **模糊模式** — 4 级模糊：关闭、模糊第一行、模糊第二行、全模糊；悬停可临时揭示，适合自测
- 🔄 **位置切换** — 一键交换原文和翻译的显示顺序
- 📋 **字幕侧边栏** — 完整的可滚动字幕列表，点击时间戳跳转，自动跟随当前播放位置
- ⌨️ **键盘快捷键** — 暂停/播放、逐条跳转字幕
- 📂 **自由加载** — 通过原生文件对话框打开本地视频和字幕文件
- 🎨 **暗色界面** — 沉浸式深色主题，专注学习不刺眼
- 🌐 **国际化** — 支持中文和 English 界面

### 环境依赖

需要安装 **ffmpeg**（包含 ffprobe）以支持音频转码和编码检测：

<details>
<summary><b>Windows</b></summary>

```powershell
# 方式一：winget（推荐）
winget install Gyan.FFmpeg

# 方式二：scoop
scoop install ffmpeg

# 方式三：choco
choco install ffmpeg
```

安装后重启终端，或将 `ffmpeg` 添加到系统 `PATH` 环境变量。

</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install ffmpeg
```

</details>

<details>
<summary><b>Linux</b></summary>

```bash
# Debian / Ubuntu
sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

</details>

### 使用说明

1. **打开视频** — 点击工具栏的文件夹按钮，选择视频文件（`.mp4` / `.webm` / `.mkv` / `.avi` / `.mov` / `.flv` / `.wmv`）
2. **加载字幕** — 点击字幕按钮，选择 `.srt` 或 `.ass` 文件
3. **AI 翻译** — 若字幕为单语，系统会提示配置 DeepSeek API 密钥以自动翻译
4. **播放控制** — 使用工具栏按钮或键盘快捷键控制播放
5. **显示调整** — 通过字幕设置弹窗切换模糊模式或交换行序

### 键盘快捷键

| 按键   | 功能             |
| ------ | ---------------- |
| `空格` | 播放 / 暂停      |
| `←`    | 跳转到上一条字幕 |
| `→`    | 跳转到下一条字幕 |

### 设置项

| 设置          | 选项                                    |
| ------------- | --------------------------------------- |
| 主题          | 跟随系统 / 浅色 / 深色                  |
| 界面语言      | 中文 / English                          |
| DeepSeek 模型 | `deepseek-v4-flash` / `deepseek-v4-pro` |
| API 密钥      | DeepSeek API 密钥（本地存储）           |

### 预览

|         亮色模式         |           暗色模式            |
| :----------------------: | :---------------------------: |
| ![亮色模式](preview.png) | ![暗色模式](preview-dark.png) |
