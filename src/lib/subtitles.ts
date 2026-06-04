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
}

/**
 * Parse a timestamp string to seconds.
 * Handles formats like "00:00:02,000" (SRT) or "0:00:02.00" (ASS).
 */
function timestampToSeconds(timestamp: string): number {
  const match = timestamp.trim().match(/(\d+):(\d{2}):(\d{2})[,.]\d+/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const secs = parseInt(match[3], 10);
    return hours * 3600 + mins * 60 + secs;
  }
  const simpleMatch = timestamp.trim().match(/(\d+):(\d{2})[,.]?\d*/);
  if (simpleMatch) {
    const mins = parseInt(simpleMatch[1], 10);
    const secs = parseInt(simpleMatch[2], 10);
    return mins * 60 + secs;
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
 * Strip ASS/SSA style tags from text.
 * Handles tags like {\b1}, {\i1}, {\c&H00FFFF&}, etc.
 */
function stripAssTags(text: string): string {
  return text.replace(/\{[^}]*\}/g, "").trim();
}

/**
 * Detect whether the content is SRT or ASS format.
 */
function detectFormat(content: string): "srt" | "ass" {
  const trimmed = content.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("[script info]") ||
    lower.startsWith("[v4+ styles]") ||
    lower.startsWith("[v4 styles]")
  ) {
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

    // Try to detect bilingual: first line = text, second line = translation
    const textParts = text
      .split("\n")
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

    // Only process lines with "Default" or "歌词" style
    const style = fields[3];
    if (style !== "Default" && style !== "歌词") continue;

    // Skip lines with positioning tags regardless of style
    if (/\\pos\(/.test(rawText)) continue;

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

/**
 * Merge two sets of captions by matching timestamps.
 * Useful when you have separate subtitle files for different languages.
 * The primary captions provide the base structure, and secondary captions
 * provide the translation.
 */
export function mergeCaptions(
  primary: Caption[],
  secondary: Caption[],
): Caption[] {
  return primary.map((cap) => {
    const match = secondary.find((s) => s.time === cap.time);
    return {
      time: cap.time,
      start: cap.start,
      end: cap.end,
      text: cap.text || secondary[0]?.text || "",
      translation: match?.text || cap.translation || "",
    };
  });
}
