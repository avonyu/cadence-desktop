# Changelog

All notable changes to this project are documented in this file.

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
