# Changelog

All notable changes to this project are documented in this file.

## [0.8.2] - 2026-07-03

### 🚀 New Features

- **Auto-pronounce word setting**: A new "Auto-pronounce word" switch in Settings > Basic controls whether the word translate popover automatically plays pronunciation when opening a word. Defaults to on.

### ⚡ Improvements

- **Word conjugations in favorites**: The sidebar favorites tab now displays the base form (lemma) and conjugation badges (third-person singular, present participle, past tense, past participle) for bookmarked words, matching the display in the word translate popover.

### 🐛 Bug Fixes

- **Bilingual SRT block splitting**: Bilingual SRT files containing both original text and translation on separate subtitle blocks are now correctly detected and split into `text` / `preTranslation` fields, ensuring AI subtitle processing receives accurate source text.
- **Hyphen preservation in translations**: The AI subtitle prompt no longer converts hyphens to em dashes in translated text, preserving punctuation fidelity.

### 🧹 Refactoring

- **Static language config**: Language selection in settings has been replaced with a static language configuration file, removing runtime language selectors.

## [0.8.1] - 2026-07-03

### 🚀 New Features

- **Native / learning language settings**: The settings dialog now lets you configure your native language and learning language. The subtitle pipeline auto-normalizes the `text` / `translation` fields on every caption entry, ensuring the learning language is always shown as the primary text regardless of the source file's column arrangement (`src/lib/subtitles.ts`, `src/hooks/use-video-file.ts`, `src/stores/player-store.ts`).
- **Word pronunciation in lookup panel**: The word translation popover now includes a pronunciation feature for opened words, allowing you to hear vocabulary spoken without navigating to the favorites page (`src/lib/word-pronunciation.ts`).

### 🐛 Bug Fixes

- **Truncated AI JSON recovery**: AI subtitle responses truncated by token limits are now partially recovered — the parser scans remaining text for individual `{...}` objects and salvages as many entries as possible instead of discarding the entire response (`src/lib/ai-subtitle.ts`).
- **Non-dialogue positioning tags**: ASS subtitle lines containing positioning override tags (`\an8`, `\pos(`, `\move(`) are now correctly skipped during AI preprocessing. Previously, these on-screen text overlays (chapter titles, location labels) were incorrectly treated as dialogue (`src/lib/ai-subtitle.ts`).
- **Transcoded filename suffix**: Video files with duplicated `_transcoded` suffixes in their names are now normalized to display the correct original filename (`src/hooks/use-video-file.ts`).

### ⚡ Improvements

- **Enhanced non-dialogue detection**: The AI subtitle prompt now recognizes additional on-screen text overlay patterns (bracketed book titles, descriptive meta-text) and filters them from the output (`src-tauri/prompts/subtitle-processor.md`).
- **Language-agnostic AI explainer**: Sentence explanations now work for any source language. The verb conjugation analysis adapts to the detected language (`src-tauri/prompts/subtitle-processor.md`, `src/lib/sentence-explanation.ts`).
- **Verb conjugation display**: Conjugation forms are rendered with the shadcn `Badge` component for better visual hierarchy, and the base form is shown in the popover header (`src/components/word-translate-popover.tsx`).
- **Loading state polish**: The sentence explanation drawer shows a shiny text effect during loading for visual feedback (`src/components/subtitles/sentence-explanation-drawer.tsx`).

### 🎨 Style

- Hide scrollbar in the explanation drawer (`src/components/subtitles/sentence-explanation-drawer.tsx`).
- Use muted foreground for the base form text in the word translate header.

### 🧹 Refactoring

- **Database consolidation**: Subtitle favorites and word favorites now share a single database (`data.db` instead of `favorites.db`). Tables renamed for clarity: `favorites` → `words`, `favorite_sentences` → `sentences` (`src/lib/favorites-db.ts`, `src/lib/sentence-favorites-db.ts`).
- **Captions interface cleanup**: Removed HTML-safe fields (`htmlText`, `htmlTranslation`) from the `Caption` interface — HTML wrapping is now handled closer to the render layer (`src/lib/subtitles.ts`, `src/components/player/captions-display.tsx`).

### 📖 Documentation

- Added subtitle pipeline architecture document (`documents/subtitle-pipeline.html`) covering the full processing flow, data types, AI integration, and file references.

## [0.8.0] - 2026-07-02

### 🚀 New Features

- **Sentence explanation (AI-powered)**: Select any subtitle sentence to get an AI-generated explanation including context, grammar analysis, and key vocabulary via the DeepSeek API. The explanation appears in a left-side drawer that opens from the player page (`src/lib/sentence-explanation.ts`, `src/components/subtitles/sentence-explanation-drawer.tsx`).
- **Sentence bookmarking**: Bookmark subtitle sentences for later review. Bookmarked sentences appear in the sidebar favorites tab with search, sort, and one-click seek-to-time functionality (`src/lib/sentence-favorites-db.ts`, `src/components/subtitles/sidebar-subtitles-tab.tsx`).

### ⚡ Improvements

- **Video filter toggle persistence**: The video filter (e.g. black-and-white, high-contrast) toggle state is now persisted in the player store, surviving page navigation (`src/stores/player-store.ts`).
- Clicking a bookmarked sentence's timestamp syncs the active caption and seeks the video to the exact time.

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
