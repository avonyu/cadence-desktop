# Cadence Desktop

<div align="center">

<img src="src-tauri/icons/icon.png" width="128" height="128" alt="Cadence Icon" />

**Immersive Bilingual Subtitle Video Learning Tool**

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

English | [简体中文](docs/README-zh-CN.md)

</div>

---

### About

Cadence — rhythm and flow. A desktop video player designed specifically for **listening + subtitle learning**, precisely tailored for language learners.

### Features

- 🎬 **Subtitle Parsing** — Supports `.srt` / `.ass` formats with auto-format detection; parses bilingual subtitles (original + translation)
- 🔄 **Video-Subtitle Sync** — Highlights current caption during playback; click any caption timestamp in the sidebar to seek to that position
- 💾 **Subtitle Cache** — AI translation results are auto-cached via SHA-256 hash; reopening a file skips redundant processing
- 🤖 **AI-Powered Translation** — Integrated DeepSeek API automatically translates subtitles (Chinese ↔ English)
- 🔀 **Dual Subtitle Merge** — Merge two separate subtitle files (e.g., one per language) by timestamp alignment
- 📝 **Large Caption Display** — Dual-line bilingual display below the video player
- 🎭 **Blur Mode** — 4 levels: Off, Blur Top Line, Blur Bottom Line, Blur All; hover to temporarily reveal — perfect for self-testing
- 🔄 **Line Swap** — Toggle the order of source and translation lines
- 📋 **Subtitle Sidebar** — Scrollable full list with timestamp navigation; auto-scrolls to the current caption
- ⌨️ **Keyboard Shortcuts** — Play/pause, skip between captions
- 📂 **Open Files** — Load local video and subtitle files via native file dialog
- 🎨 **Dark UI** — Immersive dark theme for focused learning
- 🌐 **i18n** — UI available in English and Chinese

### Prerequisites

**ffmpeg** (includes ffprobe) is required for audio transcoding and codec detection. Install it via your system package manager:

<details>
<summary><b>Windows</b></summary>

```powershell
# Option 1: winget (recommended)
winget install Gyan.FFmpeg

# Option 2: scoop
scoop install ffmpeg

# Option 3: choco
choco install ffmpeg
```

After installation, restart your terminal or add `ffmpeg` to your `PATH`.

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

### Usage

1. **Open a Video** — Click the folder button on the toolbar, select a video file (`.mp4`, `.webm`, `.mkv`, `.avi`, `.mov`, `.flv`, `.wmv`)
2. **Load Subtitles** — Click the subtitle button, select `.srt` or `.ass` file
3. **AI Translation** — If the subtitle is monolingual, the app will prompt you to configure a DeepSeek API key for automatic translation
4. **Control Playback** — Use toolbar buttons or keyboard shortcuts
5. **Adjust Display** — Use the subtitle settings popover to toggle blur mode or swap line order

### Keyboard Shortcuts

| Key     | Action                   |
| ------- | ------------------------ |
| `Space` | Play / Pause             |
| `←`     | Jump to previous caption |
| `→`     | Jump to next caption     |

### Settings

| Setting        | Options                                 |
| -------------- | --------------------------------------- |
| Theme          | System / Light / Dark                   |
| Language       | English / 中文                          |
| DeepSeek Model | `deepseek-v4-flash` / `deepseek-v4-pro` |
| API Key        | DeepSeek API key (stored locally)       |

### Preview

|           Light Mode            |              Dark Mode              |
| :-----------------------------: | :---------------------------------: |
| ![Light Mode](docs/preview.png) | ![Dark Mode](docs/preview-dark.png) |
