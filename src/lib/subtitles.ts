/**
 * Subtitle parsing utilities for SRT and ASS formats.
 * Converts raw subtitle files into a frontend-friendly format.
 */

export interface Caption {
  /** Display time string in "MM:SS" format */
  time: string;
  /** Start time in seconds (for sync) */
  start: number;
  /** End time in seconds (for sync) */
  end: number;
  text: string;
  translation: string;
  /** Pre-sanitized HTML-safe version of `text` */
  textHtml: string;
  /** Pre-sanitized HTML-safe version of `translation` */
  translationHtml: string;
}

/**
 * Parse a timestamp string to seconds.
 * Handles formats like "00:00:02,000" (SRT) or "0:00:02.00" (ASS).
 */
function timestampToSeconds(timestamp: string): number {
  let match = timestamp.trim().match(/(\d+):(\d{2}):(\d{2})([,.](\d+))?/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const secs = parseInt(match[3], 10);
    let frac = 0;
    if (match[5]) {
      frac = parseInt(match[5].padEnd(3, "0").slice(0, 3), 10);
    }
    return hours * 3600 + mins * 60 + secs + frac / 1000;
  }
  match = timestamp.trim().match(/(\d+):(\d{2})([,.](\d+))?/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    let frac = 0;
    if (match[4]) {
      frac = parseInt(match[4].padEnd(3, "0").slice(0, 3), 10);
    }
    return mins * 60 + secs + frac / 1000;
  }
  return 0;
}

/**
 * Format seconds to "MM:SS" display string.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Sanitize subtitle text for safe HTML rendering.
 * Escapes all HTML characters, then unescapes only <i> / </i> tags.
 */
export function sanitizeSubtitleHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>");
}

/**
 * Strip ASS/SSA style tags from text.
 * Handles tags like {\b1}, {\i1}, {\c&H00FFFF&}, etc.
 */
function stripAssTags(text: string): string {
  return text.replace(/\{[^}]*\}/g, "").trim();
}

/**
 * Detect whether the content is SRT or ASS format.
 */
export function detectFormat(content: string): "srt" | "ass" {
  const trimmed = content.trim();
  const lower = trimmed.toLowerCase();

  // Standard ASS headers
  if (
    lower.startsWith("[script info]") ||
    lower.startsWith("[v4+ styles]") ||
    lower.startsWith("[v4 styles]") ||
    lower.startsWith("[events]")
  ) {
    return "ass";
  }

  // If the content contains Dialogue: lines, it's ASS
  // (AI may return only [Events] + Dialogue: without the full header)
  if (/^Dialogue:/m.test(trimmed)) {
    return "ass";
  }

  return "srt";
}

/**
 * Parse SRT format content into captions.
 *
 * SRT format example:
 * 1
 * 00:00:00,000 --> 00:00:02,000
 * Hello World
 *
 * 2
 * 00:00:02,000 --> 00:00:06,000
 * Second line
 */
export function parseSRT(content: string): Caption[] {
  // Normalize line endings to \n, then split on 2+ blank lines
  const normalized = content.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n{2,}/);
  const captions: Caption[] = [];

  for (const block of blocks) {
    const lines = block.trim().split(/\n/);
    if (lines.length < 2) continue;

    // Find the timestamp line (pattern: "HH:MM:SS,mmm --> HH:MM:SS,mmm")
    let timestampLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) {
        timestampLineIdx = i;
        break;
      }
    }
    if (timestampLineIdx === -1) continue;

    const timestampLine = lines[timestampLineIdx];
    const textLines = lines.slice(timestampLineIdx + 1);

    const [startStr, endStr] = timestampLine.split("-->").map((s) => s.trim());
    const text = stripAssTags(textLines.join("\n").trim());

    // Detect bilingual using \N separator (ASS AI output format)
    // or real line breaks (SRT AI output: source\n\ntranslation).
    const textParts = text
      .split(/\\N/)
      .map((l) => l.trim())
      .filter(Boolean);

    let captionText = "";
    let translation = "";

    if (textParts.length >= 2) {
      // \N separator: first part = text, rest = translation
      captionText = textParts[0];
      translation = textParts.slice(1).join("\n");
    } else if (textParts.length === 1) {
      // No \N — check for real line breaks (SRT bilingual output)
      const lines = textParts[0]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length >= 2) {
        // AI-processed SRT: first line = source, rest = translation
        captionText = lines[0];
        translation = lines.slice(1).join("\n");
      } else {
        // Single-language entry
        captionText = lines.join(" ");
        translation = "";
      }
    }

    captions.push({
      time: formatTime(timestampToSeconds(startStr)),
      start: timestampToSeconds(startStr),
      end: endStr
        ? timestampToSeconds(endStr)
        : timestampToSeconds(startStr) + 2,
      text: captionText,
      translation,
      textHtml: sanitizeSubtitleHtml(captionText),
      translationHtml: sanitizeSubtitleHtml(translation),
    });
  }

  captions.sort((a, b) => a.start - b.start);
  return captions;
}

/**
 * Parse ASS/SSA format content into captions.
 *
 * ASS Dialogue line format:
 * Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
 *
 * Example:
 * Dialogue: 0,0:00:00.00,0:00:02.00,Default,,0,0,0,,Hello World
 */
export function parseASS(content: string): Caption[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n/);
  const captions: Caption[] = [];

  for (const line of lines) {
    if (!line.startsWith("Dialogue:")) continue;

    // Remove "Dialogue: " prefix
    const contentPart = line.slice("Dialogue:".length).trim();

    // Split on the first 9 commas; everything after is the text field
    // ASS format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
    const commaIndices: number[] = [];
    for (let i = 0; i < contentPart.length && commaIndices.length < 9; i++) {
      if (contentPart[i] === ",") {
        commaIndices.push(i);
      }
    }

    if (commaIndices.length < 9) continue;

    // Extract the 9 metadata fields
    const fields: string[] = [];
    let prevIdx = 0;
    for (const idx of commaIndices) {
      fields.push(contentPart.slice(prevIdx, idx));
      prevIdx = idx + 1;
    }
    // Everything after the 9th comma is the text field
    const rawText = contentPart.slice(prevIdx).trim();

    // Process lines whose style contains "Default" (case-insensitive) or equals "歌词"
    // const style = fields[3];
    // if (!style.toLowerCase().includes("default") && style !== "歌词") continue;

    // Skip lines with positioning/animation tags (credits, on-screen text, karaoke, effects)
    if (/\\pos\(|\\move\(|\\an8/.test(rawText)) continue;

    const text = stripAssTags(rawText);

    const startStr = fields[1];
    const endStr = fields[2];

    // ASS uses \N for line breaks; also handle literal \n
    const textParts = text
      .split(/\\N|\\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let captionText = "";
    let translation = "";

    if (textParts.length >= 2) {
      captionText = textParts[0];
      translation = textParts.slice(1).join("\n");
    } else if (textParts.length === 1) {
      captionText = textParts[0];
      translation = "";
    }

    captions.push({
      time: formatTime(timestampToSeconds(startStr)),
      start: timestampToSeconds(startStr),
      end: endStr
        ? timestampToSeconds(endStr)
        : timestampToSeconds(startStr) + 2,
      text: captionText,
      translation,
      textHtml: sanitizeSubtitleHtml(captionText),
      translationHtml: sanitizeSubtitleHtml(translation),
    });
  }

  captions.sort((a, b) => a.start - b.start);
  return captions;
}

/**
 * Parse subtitle content (auto-detects SRT or ASS format).
 */
export function parseSubtitles(content: string): Caption[] {
  const format = detectFormat(content);
  return format === "ass" ? parseASS(content) : parseSRT(content);
}
