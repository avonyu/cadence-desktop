# AI Settings API Key Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent saving AI settings without a nonblank API Key and display a localized Sonner error toast.

**Architecture:** A focused Zod schema owns normalization and validation. The settings component consumes the schema result and performs either the error-toast path or the existing persistence path.

**Tech Stack:** TypeScript, React, Zod, Sonner, react-i18next, Vitest

---

### Task 1: Add and test the validation schema

**Files:**
- Create: `src/lib/ai-settings.ts`
- Test: `src/lib/ai-settings.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`

- [x] Add Zod as a runtime dependency.
- [x] Write tests that reject empty and whitespace-only API Keys and normalize a valid API Key.
- [x] Run `bun test src/lib/ai-settings.test.ts` and verify the test fails because the schema does not exist.
- [x] Implement `aiSettingsSchema` with Zod Mini trim and minimum-length checks for `apiKey`.
- [x] Run the target test and verify it passes.

### Task 2: Integrate validation and translations

**Files:**
- Modify: `src/components/settings-dialog.tsx`
- Modify: `src/locales/zh/translation.json`
- Modify: `src/locales/en/translation.json`

- [x] Parse local settings before mutating the Zustand store.
- [x] On validation failure, call `toast.error(t("settings.apiKeyRequired"), { position: "top-center" })` and return.
- [x] On success, save parsed values so the API Key is trimmed.
- [x] Add matching Chinese and English translation keys.

### Task 3: Verify the change

**Files:**
- Verify all modified files.

- [x] Run `bun test src/lib/ai-settings.test.ts`.
- [x] Run `bun test` and record any unrelated existing failures.
- [x] Run `bun run build`.
- [x] Review `git diff --check` and the final diff.
