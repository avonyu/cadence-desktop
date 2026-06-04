# Cadence Desktop

<div align="center">

<img src="src-tauri/icons/icon.png" width="128" height="128" alt="Cadence Icon" />

**Immersive Bilingual Subtitle Video Learning Tool**

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[中文文档](docs/README-zh-CN.md)

</div>

---

### About

Cadence — rhythm and flow. A desktop video player designed specifically for **listening + subtitle learning**, precisely tailored for language learners.

### Features

- 🎬 **Subtitle Parsing** — Supports `.srt` / `.ass` formats, auto-detects bilingual subtitles (original + translation)
- 🔄 **Video-Subtitle Sync** — Highlights current caption during playback; click any caption timestamp to seek to that position
- ⌨️ **Global Shortcuts**
  - `Space` Pause / Play
  - `←` Previous caption
  - `→` Next caption
- 📂 **Open Files** — Load local video and subtitle files freely
- 🎨 **Dark UI** — Immersive dark theme for focused learning

### Preview

![Cadence Preview](docs/preview.png)

### Tech Stack

| Category | Tech |
|----------|------|
| Build | Vite + Bun |
| Desktop | Tauri v2 |
| UI | React 19 + React Router |
| Styling | Tailwind CSS v4 + Shadcn |
| Video | Video.js |
| State | Zustand |
| Icons | Lucide |
