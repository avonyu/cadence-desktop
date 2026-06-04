/**
 * Subtitle parsing utilities for SRT and ASS formats.
 * Converts raw subtitle files into a frontend-friendly format.
 */

export interface Caption {
  time: string;
  text: string;
  translation: string;
}

/**
 * Parse the start time from a timestamp string.
 * Handles formats like "00:00:02,000" (SRT) or "0:00:02.00" (ASS).
 * Returns simplified "MM:SS" format.
 */
function parseTime(timestamp: string): string {
  const match = timestamp.trim().match(/(\d+):(\d{2}):(\d{2})[,.]\d+/);
  if (!match) {
    const simpleMatch = timestamp.trim().match(/(\d+):(\d{2})[,.]?\d*/);
    if (simpleMatch) {
      const mins = parseInt(simpleMatch[1], 10);
      const secs = parseInt(simpleMatch[2], 10);
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return "00:00";
  }
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const secs = parseInt(match[3], 10);
  const totalMins = hours * 60 + mins;
  return `${String(totalMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
  const trimmed = content.trim().toLowerCase();
  if (
    trimmed.startsWith("[script info]") ||
    trimmed.startsWith("[v4+ styles]")
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
function parseSRT(content: string): Caption[] {
  const blocks = content.trim().split(/\r?\n\r?\n/);
  const captions: Caption[] = [];

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
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

    const [startStr] = timestampLine.split("-->").map((s) => s.trim());
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
      time: parseTime(startStr),
      text: captionText,
      translation,
    });
  }

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
function parseASS(content: string): Caption[] {
  const lines = content.split(/\r?\n/);
  const captions: Caption[] = [];

  for (const line of lines) {
    if (!line.startsWith("Dialogue:")) continue;

    // Remove "Dialogue: " prefix and split by comma (max 10 parts)
    const contentPart = line.slice("Dialogue:".length).trim();
    const parts = contentPart.split(/,(?=(?:[^,]*,){0,9}[^,]*$)/);

    if (parts.length < 10) continue;

    const startStr = parts[1];
    const rawText = parts.slice(9).join(",").trim();
    const text = stripAssTags(rawText);

    const textParts = text
      .split("\\N")
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
      time: parseTime(startStr),
      text: captionText,
      translation,
    });
  }

  return captions;
}

/**
 * Parse subtitle content (auto-detects SRT or ASS format).
 * Returns an array of Caption objects ready for frontend use.
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
    // Find matching caption by time
    const match = secondary.find((s) => s.time === cap.time);
    return {
      time: cap.time,
      text: cap.text || secondary[0]?.text || "",
      translation: match?.text || cap.translation || "",
    };
  });
}
