# Changelog

All notable changes to this project are documented in this file.

## [0.7.2] - 2026-07-01

### 🚀 New Features

- **ASS pre-translation support**: The AI subtitle pipeline now detects pre-existing translations in bilingual ASS files (text after the first `\N`). When the AI returns empty translations, the system falls back to these pre-existing translations, improving accuracy for already-translated subtitle tracks (`src/lib/ai-subtitle.ts`).

### ⚡ Improvements

- **Error handling with logging**: All `catch` blocks now log errors via `console.warn`/`console.error`/`console.debug` with contextual messages. Previously, many failures were silently ignored, making debugging difficult. Affected modules: activation dialog, settings dialog, word pronunciation, dictionary lookup, favorites database, word cache database.

### 📖 Documentation

- **README updates**: Fixed license badge (MIT → GPL v3), added entries for Word Favorites, Word Pronunciation, and Settings Dialog features; restructured settings section into tabbed format (Basic, AI Config, About).

### 🧹 Internal

- Bumped version (0.7.1 → 0.7.2).

## [0.7.1] - 2026-06-30

### 🚀 New Features

- **Settings dialog**: A new SettingsDialog with three tabs — **Basic** (general preferences), **AI Config** (API keys, models, activation codes), and **About** (version info, update check, download progress).
- **Progress component**: New `Progress` UI component for visual feedback during update downloads.
- **Enhanced subtitle processing**: The AI subtitle pipeline now supports JSON output and automatic subtitle format detection (`src-tauri/prompts/subtitle-processor.md`, `src/lib/ai-subtitle.ts`, `src/lib/subtitles.ts`).

### ⚡ Improvements

- **Subtitle mask**: Improved text wrapping behavior (`word-break`/`overflow-wrap`).
- **Subtitle settings popover**: Refactored for better UI and interaction.
- **Sidebar subtitles tab**: Refactored for improved UI and functionality.

### 🧹 Internal

- Bumped dependencies and migrated build scripts to Bun APIs (`scripts/download-ffmpeg.ts`, `scripts/generate-latest-json.ts`).
- Removed stale `prototype/index.html` (~2,490 lines of legacy code).

## [0.7.0] - 2026-06-29

### New Features

- **Sidebar favorites tab**: The subtitle sidebar is now split into "Subtitles" and "Favorites" tabs. The favorites tab supports keyword search, sort by recency / oldest / alphabetical, expand to view translation details, and one-click word pronunciation.
- **Word pronunciation**: Added a speak button in the favorites tab and the word lookup popover to pronounce words aloud.

### Bug Fixes

- **Lookup panel stays open on bookmark**: The word translation popover now remains visible after clicking the favorite button, so you can continue reading the definition.

### Style

- Removed the unnecessary border from the subtitle mask overlay for a cleaner look.

### Changes

- **License**: Changed from MIT to GPL v3.
- **Updater key rotation**: Rotated the auto-updater signing public key. Previous versions will not receive automatic updates — manual upgrade to this version is required.

### Internal

- Removed `package-lock.json` (project uses bun exclusively for dependency management).

## [0.6.6] - 2026-06-24

### New Features

- **Regenerate subtitles**: A new button in the subtitle sidebar re-runs AI processing on the current video's matched subtitle file, bypassing the cache to produce a fresh result.
- **Clear subtitle cache**: A new button clears the cached subtitles for the current video and resets the on-screen captions.

### Improvements

- **More accurate subtitle timing**: The AI subtitle processor no longer merges or splits SRT entries. Every entry keeps its original boundaries and timestamps, and each line is translated in context, so subtitles stay aligned with the original timeline instead of drifting after merges.
- **Subtitle mask overlay**: Added fullscreen support, smoother drag-and-resize behavior, refined resize constraints, and updated button styles (removed the unused top-left resize handle).
- **More readable word lookup panel**: The popover is now wider and the word, phonetic, part-of-speech, definitions, and examples all use larger text for easier reading.

### Internal

- Subtitle cache entries now store the source subtitle file path, enabling the regenerate feature to re-read the original file.
- Broadened the `fs:read-text-file` capability to allow reading subtitle files from any path (required by regenerate).
- Rotated the auto-updater signing public key in `tauri.conf.json`.

## [0.6.5] - 2026-06-22

### Bug Fixes

- **Reliable model list fetching**: Fetching the available DeepSeek model list now goes through the Rust backend (`tauri-plugin-http`) instead of a direct frontend request. This fixes the model list failing to load in packaged builds, where the production Content-Security-Policy blocked the frontend from reaching the API.

### Improvements

- **Request timeout & clearer errors**: The model list request now has a 15s timeout, and failures surface the real reason (e.g. invalid API key, rate limit, server error) in the error toast instead of a generic message.

### Internal

- Adjusted activation functions for commercial mode and added the `tauri-plugin-sql` dependency.

## [0.6.4] - 2026-06-21

### New Features

- **Word favorites**: After clicking a subtitle word to open the lookup panel, save the word with the heart button in the top-right corner; favorited words stay highlighted in the subtitles.
- **SQLite local storage**: Favorites are now persisted with `tauri-plugin-sql` + SQLite (`favorites.db`), with automatic one-time migration of existing favorites from the legacy JSON storage.

### Improvements

- **Screen-adaptive text**: All UI text scales proportionally with window size and fullscreen state for clearer subtitle reading.
- **Stable caption area**: The current-caption area now uses a fixed height, so multi-line subtitles no longer squeeze or jitter the video above.
- **Lookup panel polish**: Heart button moved to the top-right, redundant close button removed, and example sentences now scale adaptively too.

## [0.6.3] - 2026-06-21

### Improvements

- Subtitle sidebar: collapse/expand rendering optimized via conditional hiding for smoother interaction.

### Internal

- Refactored the Tauri Rust backend, splitting the monolithic `lib.rs` into dedicated modules (`activation_commands`, `deepseek`, `ffmpeg`, `tts`, `util`) for better maintainability (no functional changes).

### Docs

- Added a section in AGENTS.md on memory/performance differences between dev and production modes.
