# 幕听 (Cadence)

<div align="center">

**沉浸式双语字幕视频学习工具**

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](../README.md)

</div>

---

### 简介

Cadence，意为韵律与节奏。这是一款专为**听力 + 字幕学习**设计的桌面视频播放器，精准贴合语言学习者的需求。

### 功能特性

- 🎬 **字幕解析** — 支持 `.srt` / `.ass` 格式，自动识别双语字幕（原文 + 翻译）
-  **视频字幕同步** — 播放时自动高亮当前字幕，点击字幕时间区域可跳转至对应播放位置
- ⌨️ **全局快捷键**
  - `空格` 暂停 / 播放
  - `←` 上一条字幕
  - `→` 下一条字幕
- 📂 **自由加载** — 支持打开本地视频文件和字幕文件
- 🎨 **暗色界面** — 沉浸式深色主题，专注学习不刺眼

### 预览

![幕听预览](preview.png)

### 技术栈

| 类别 | 技术 |
|------|------|
| 构建 | Vite + Bun |
| 桌面框架 | Tauri v2 |
| UI | React 19 + React Router |
| 样式 | Tailwind CSS v4 + Shadcn |
| 视频 | Video.js |
| 状态管理 | Zustand |
| 图标 | Lucide |
