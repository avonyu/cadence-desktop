import { describe, it, expect } from "vitest";
import { parseSRT, parseASS, parseSubtitles, type Caption } from "./subtitles";

/** Helper to build a Caption snapshot without relying on Object instance */
function strip(c: Caption) {
  return {
    time: c.time,
    start: c.start,
    end: c.end,
    text: c.text,
    translation: c.translation,
  };
}

// ---------------------------------------------------------------------------
// Basic parsing
// ---------------------------------------------------------------------------
describe("parseSRT", () => {
  it("parses a single caption", () => {
    const src = ["1", "00:00:02,000 --> 00:00:05,000", "Hello World"].join(
      "\n",
    );

    const result = parseSRT(src);
    expect(result).toHaveLength(1);
    expect(strip(result[0])).toEqual({
      time: "00:02",
      start: 2,
      end: 5,
      text: "Hello World",
      translation: "",
    });
  });

  it("parses multiple captions", () => {
    const src = [
      "1",
      "00:00:01,000 --> 00:00:03,000",
      "First",
      "",
      "2",
      "00:00:05,000 --> 00:00:08,000",
      "Second",
    ].join("\n");

    const result = parseSRT(src);
    expect(result).toHaveLength(2);
    expect(strip(result[0])).toMatchObject({ text: "First", start: 1 });
    expect(strip(result[1])).toMatchObject({ text: "Second", start: 5 });
  });

  it("handles hours in timestamps", () => {
    const src = ["1", "01:30:45,000 --> 02:15:30,500", "Long duration"].join(
      "\n",
    );

    const result = parseSRT(src);
    expect(result[0].start).toBe(1 * 3600 + 30 * 60 + 45); // 5445
    expect(result[0].end).toBe(2 * 3600 + 15 * 60 + 30 + 0.5); // 8130.5
  });

  it("defaults end time to start + 2 when missing", () => {
    const src = ["1", "00:00:10,000 -->", "Missing end"].join("\n");

    const result = parseSRT(src);
    expect(result[0].end).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Multi-line text & bilingual detection
// ---------------------------------------------------------------------------
describe("parseSRT - multiline text", () => {
  it("joins multi-line text with newline, splits first line as text", () => {
    const src = [
      "1",
      "00:00:02,000 --> 00:00:05,000",
      "Original line",
      "Translation line",
    ].join("\n");

    const result = parseSRT(src);
    expect(result[0].text).toBe("Original line");
    expect(result[0].translation).toBe("Translation line");
  });

  it("treats 3+ lines as text + translation (rest joined)", () => {
    const src = [
      "1",
      "00:00:02,000 --> 00:00:05,000",
      "Line A",
      "Line B",
      "Line C",
    ].join("\n");

    const result = parseSRT(src);
    expect(result[0].text).toBe("Line A");
    expect(result[0].translation).toBe("Line B\nLine C");
  });

  it("single-line text has empty translation", () => {
    const src = ["1", "00:00:02,000 --> 00:00:05,000", "Just one line"].join(
      "\n",
    );

    const result = parseSRT(src);
    expect(result[0].text).toBe("Just one line");
    expect(result[0].translation).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("parseSRT - edge cases", () => {
  it("returns empty array for empty string", () => {
    expect(parseSRT("")).toEqual([]);
  });

  it("returns empty array for whitespace-only", () => {
    expect(parseSRT("   \n\n  \n  ")).toEqual([]);
  });

  it("skips blocks without a timestamp", () => {
    const src = [
      "1",
      "This has no timestamp",
      "Just some text",
      "",
      "2",
      "00:00:02,000 --> 00:00:05,000",
      "Valid caption",
    ].join("\n");

    const result = parseSRT(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid caption");
  });

  it("skips blocks with fewer than 2 lines", () => {
    const src = ["1", "", "2", "00:00:02,000 --> 00:00:05,000", "Valid"].join(
      "\n",
    );

    const result = parseSRT(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid");
  });

  it("sorts captions by start time", () => {
    const src = [
      "2",
      "00:00:10,000 --> 00:00:12,000",
      "Second",
      "",
      "1",
      "00:00:01,000 --> 00:00:03,000",
      "First",
    ].join("\n");

    const result = parseSRT(src);
    expect(result[0].text).toBe("First");
    expect(result[1].text).toBe("Second");
  });

  it("handles CRLF line endings", () => {
    const src = [
      "1",
      "00:00:01,000 --> 00:00:03,000",
      "Hello",
      "",
      "2",
      "00:00:05,000 --> 00:00:08,000",
      "World",
    ].join("\r\n");

    const result = parseSRT(src);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Hello");
    expect(result[1].text).toBe("World");
  });

  it("handles CR-only line endings", () => {
    const src = [
      "1",
      "00:00:01,000 --> 00:00:03,000",
      "Line",
      "",
      "2",
      "00:00:05,000 --> 00:00:08,000",
      "Text",
    ].join("\r");

    const result = parseSRT(src);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Line");
    expect(result[1].text).toBe("Text");
  });

  it("handles trailing blank lines", () => {
    const src = ["1", "00:00:02,000 --> 00:00:05,000", "Hello", "", ""].join(
      "\n",
    );

    const result = parseSRT(src);
    expect(result).toHaveLength(1);
  });

  it("handles leading blank lines", () => {
    const src = ["", "", "1", "00:00:02,000 --> 00:00:05,000", "Hello"].join(
      "\n",
    );

    const result = parseSRT(src);
    expect(result).toHaveLength(1);
  });

  it("ignores index numbers (non-sequential)", () => {
    const src = [
      "999",
      "00:00:02,000 --> 00:00:05,000",
      "First",
      "",
      "42",
      "00:00:06,000 --> 00:00:09,000",
      "Second",
    ].join("\n");

    const result = parseSRT(src);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ASS tag stripping in SRT context
// ---------------------------------------------------------------------------
describe("parseSRT - ASS tag stripping", () => {
  it("strips ASS style tags from text", () => {
    const src = [
      "1",
      "00:00:02,000 --> 00:00:05,000",
      "{\\b1}Hello{\\b0} World",
      "{\\i1}Translation{\\i0}",
    ].join("\n");

    const result = parseSRT(src);
    expect(result[0].text).toBe("Hello World");
    expect(result[0].translation).toBe("Translation");
  });

  it("strips color tags", () => {
    const src = [
      "1",
      "00:00:02,000 --> 00:00:05,000",
      "{\\c&H00FFFF&}Colored text",
    ].join("\n");

    const result = parseSRT(src);
    expect(result[0].text).toBe("Colored text");
  });

  it("handles empty text after stripping", () => {
    const src = ["1", "00:00:02,000 --> 00:00:05,000", "{\\b1}"].join("\n");

    const result = parseSRT(src);
    // After stripping "{b1}" and trimming, text becomes ""
    expect(result[0].text).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Real-world SRT snippets
// ---------------------------------------------------------------------------
describe("parseSRT - real-world SRT", () => {
  it("parses HTML-italic subtitles with music notes", () => {
    const src = [
      "1",
      "00:00:41,600 --> 00:00:47,480",
      "<i>♪ I walk along the city streets",
      "You used to walk along with me ♪</i>",
      "",
      "2",
      "00:00:48,880 --> 00:00:54,440",
      "<i>♪ And every step I take",
      "Recalls how much in love we used to be ♪</i>",
    ].join("\n");

    const result = parseSRT(src);
    expect(result).toHaveLength(2);
    // Current behavior: first line = text, second line = translation
    expect(result[0].text).toBe("<i>♪ I walk along the city streets");
    expect(result[0].translation).toBe("You used to walk along with me ♪</i>");
  });

  it("parses subtitles with sound effect descriptions", () => {
    const src = [
      "1",
      "00:01:54,040 --> 00:01:56,240",
      "<i>- ♪ I was born-- ♪</i>",
      "- [engine and music stop]",
    ].join("\n");

    const result = parseSRT(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("<i>- ♪ I was born-- ♪</i>");
    expect(result[0].translation).toBe("- [engine and music stop]");
  });
});

// ===========================================================================
// parseASS
// ===========================================================================

/** Build a minimal ASS file with given Dialogue lines */
function assFile(dialogues: string[]): string {
  return [
    "[Script Info]",
    "Title: Test",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...dialogues,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Basic parsing
// ---------------------------------------------------------------------------
describe("parseASS", () => {
  it("parses a single Default dialogue line", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Hello World",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(strip(result[0])).toEqual({
      time: "00:02",
      start: 2,
      end: 5,
      text: "Hello World",
      translation: "",
    });
  });

  it("parses multiple Default dialogue lines", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,First",
      "Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,Second",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("First");
    expect(result[1].text).toBe("Second");
  });

  it("handles hours in ASS timestamps (dot separator)", () => {
    const src = assFile([
      "Dialogue: 0,1:30:45.00,2:15:30.50,Default,,0,0,0,,Long",
    ]);

    const result = parseASS(src);
    expect(result[0].start).toBe(1 * 3600 + 30 * 60 + 45); // 5445
    expect(result[0].end).toBe(2 * 3600 + 15 * 60 + 30 + 0.5); // 8130.5
  });

  it("defaults end time to start + 2 when end is empty", () => {
    const src = assFile(["Dialogue: 0,0:00:10.00,,Default,,0,0,0,,Text"]);

    const result = parseASS(src);
    expect(result[0].end).toBe(12);
  });

  it("handles ASS timestamps without leading zero on hour", () => {
    const src = assFile([
      "Dialogue: 0,0:05:30.00,0:05:35.00,Default,,0,0,0,,Short",
    ]);

    const result = parseASS(src);
    expect(result[0].start).toBe(5 * 60 + 30); // 330
    expect(result[0].end).toBe(5 * 60 + 35); // 335
  });
});

// ---------------------------------------------------------------------------
// Style filtering
// ---------------------------------------------------------------------------
describe("parseASS - style filtering", () => {
  it("processes '歌词' (lyrics) style lines", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,歌词,,0,0,0,,Lyrics text",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Lyrics text");
  });

  it("accepts styles containing 'Default' (case-insensitive)", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,*Default,,0,0,0,,Should pass",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Also passes",
      "Dialogue: 0,0:00:03.00,0:00:06.00,DEFAULT,,0,0,0,,Case insensitive",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe("Should pass");
    expect(result[1].text).toBe("Also passes");
    expect(result[2].text).toBe("Case insensitive");
  });

  it("skips styles without 'Default' (or 歌词)", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,Comment,,0,0,0,,Should skip",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Should keep",
      "Dialogue: 0,0:00:03.00,0:00:06.00,OP,,0,0,0,,Should skip too",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Should keep");
  });

  it("skips lines with fewer than 9 commas", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,Default",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Valid",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid");
  });
});

// ---------------------------------------------------------------------------
// Positioning tag filtering
// ---------------------------------------------------------------------------
describe("parseASS - positioning tags", () => {
  it("skips lines with \\pos( tag", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,{\\pos(100,200)}Positioned text",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Normal text",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Normal text");
  });

  it("skips lines with \\pos( regardless of style", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,歌词,,0,0,0,,{\\pos(50,50)}Skipped lyrics",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(0);
  });

  it("skips lines with \\move( tag (credits scrolling)", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,*Default,,0,0,0,,{\\move(74,241,-130,241)}Credits name",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Real dialogue",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Real dialogue");
  });

  it("skips lines with both \\move( and \\clip( animation", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,*Default,,0,0,0,,{\\clip(74,220,73,227)\\move(74,241,-130,241)}Animating text",
    ]);

    expect(parseASS(src)).toEqual([]);
  });

  it("skips lines with \\an8 (on-screen text translation)", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,*Default,,0,0,0,,{\\an8}{\\fs18}Sign translation",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Real dialogue",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Real dialogue");
  });
});

// ---------------------------------------------------------------------------
// ASS tag stripping
// ---------------------------------------------------------------------------
describe("parseASS - tag stripping", () => {
  it("strips bold and italic tags", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,{\\b1}Hello{\\b0} {\\i1}World{\\i0}",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("Hello World");
  });

  it("strips color and alpha tags", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,{\\c&H00FFFF&}{\\alpha&H80&}Colored",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("Colored");
  });

  it("strips font and size tags", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,{\\fnArial}{\\fs20}Text",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("Text");
  });
});

// ---------------------------------------------------------------------------
// Bilingual text with \\N separator
// ---------------------------------------------------------------------------
describe("parseASS - \\N bilingual splitting", () => {
  it("splits on \\N: first part = text, second = translation", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Hello\\N你好",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("Hello");
    expect(result[0].translation).toBe("你好");
  });

  it("splits on literal \\n in text", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Hello\\nWorld",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("Hello");
    expect(result[0].translation).toBe("World");
  });

  it("3+ parts: first = text, rest joined as translation", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,A\\NB\\NC",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("A");
    expect(result[0].translation).toBe("B\nC");
  });

  it("single part = no translation", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Just text",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("Just text");
    expect(result[0].translation).toBe("");
  });

  it("handles tags around \\N separator", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,{\\b1}Bold{\\b0}\\N{\\i1}Italic{\\i0}",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("Bold");
    expect(result[0].translation).toBe("Italic");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("parseASS - edge cases", () => {
  it("returns empty array for empty string", () => {
    expect(parseASS("")).toEqual([]);
  });

  it("returns empty array when no Dialogue lines", () => {
    const src = [
      "[Script Info]",
      "Title: Test",
      "",
      "[V4+ Styles]",
      "Style: Default,Arial,20,...",
    ].join("\n");

    expect(parseASS(src)).toEqual([]);
  });

  it("returns empty array for only non-Default styles", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,Comment,,0,0,0,,Nope",
      "Dialogue: 0,0:00:02.00,0:00:05.00,OP,,0,0,0,,Also nope",
    ]);

    expect(parseASS(src)).toEqual([]);
  });

  it("sorts captions by start time", () => {
    const src = assFile([
      "Dialogue: 0,0:00:10.00,0:00:12.00,Default,,0,0,0,,Second",
      "Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,First",
    ]);

    const result = parseASS(src);
    expect(result[0].text).toBe("First");
    expect(result[1].text).toBe("Second");
  });

  it("does not split text on commas in the Text field", () => {
    const src = assFile([
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Hello, world, how are you?",
    ]);

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello, world, how are you?");
  });

  it("handles CRLF line endings", () => {
    const lines = [
      "[Script Info]",
      "Title: Test",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      "Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,CRLF",
    ];
    const src = lines.join("\r\n");

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("CRLF");
  });

  it("ignores non-Dialogue lines (Format, Style, comments)", () => {
    const src = [
      "[Script Info]",
      "; This is a comment",
      "Title: Test",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize",
      "Style: Default,Arial,20",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Comment: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Skip comment",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Keep this",
    ].join("\n");

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Keep this");
  });

  it("returns empty array when all lines have positioning tags", () => {
    const src = assFile([
      "Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,{\\pos(10,20)}A",
      "Dialogue: 0,0:00:02.00,0:00:05.00,歌词,,0,0,0,,{\\pos(30,40)}B",
    ]);

    expect(parseASS(src)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Real-world ASS snippets
// ---------------------------------------------------------------------------
describe("parseASS - real-world", () => {
  it("parses a typical bilingual ASS file", () => {
    const src = [
      "[Script Info]",
      "Title: Bilingual Subtitle",
      "ScriptType: v4.00+",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      "Style: Default,Arial,18,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Hello\\N你好",
      "Dialogue: 0,0:00:06.00,0:00:09.00,Default,,0,0,0,,How are you?\\N你好吗？",
    ].join("\n");

    const result = parseASS(src);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Hello");
    expect(result[0].translation).toBe("你好");
    expect(result[1].text).toBe("How are you?");
    expect(result[1].translation).toBe("你好吗？");
  });

  it("parses ASS with mixed styles and skips non-Default", () => {
    const src = [
      "[Script Info]",
      "Title: Mixed Styles",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
      "Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1",
      "Style: OP,Arial,26,&H00FFFF00,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:01.00,0:00:03.00,OP,,0,0,0,,Opening song",
      "Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,Actual dialogue",
      "Dialogue: 0,0:00:10.00,0:00:13.00,ED,,0,0,0,,Ending song",
    ].join("\n");

    const result = parseASS(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Actual dialogue");
  });
});

// ===========================================================================
// parseSubtitles (auto-detect format)
// ===========================================================================

describe("parseSubtitles", () => {
  it("auto-detects and parses SRT format", () => {
    const src = ["1", "00:00:02,000 --> 00:00:05,000", "Hello World"].join("\n");
    const result = parseSubtitles(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello World");
  });

  it("auto-detects and parses ASS format", () => {
    const src = [
      "[Script Info]",
      "Title: Test",
      "",
      "[V4+ Styles]",
      "Style: Default,Arial,20",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:02.00,0:00:05.00,Default,,0,0,0,,Hello World",
    ].join("\n");

    const result = parseSubtitles(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello World");
  });

  it("detects ASS with [V4+ Styles] header", () => {
    const src = ["[V4+ Styles]", "Style: Default,Arial,20"].join("\n");
    const result = parseSubtitles(src);
    expect(result).toEqual([]);
  });

  it("detects ASS with [V4 Styles] header", () => {
    const src = ["[V4 Styles]", "Style: Default,Arial,20"].join("\n");
    const result = parseSubtitles(src);
    expect(result).toEqual([]);
  });

  it("detects ASS with [Events] header (AI response fragment)", () => {
    const src = [
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello",
    ].join("\n");
    const result = parseSubtitles(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello");
  });

  it("detects ASS from Dialogue lines without header", () => {
    const src = "Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello";
    const result = parseSubtitles(src);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello");
  });

  it("defaults to SRT for unknown format", () => {
    const src = "Just some random text";
    const result = parseSubtitles(src);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(parseSubtitles("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseSubtitles("   \n\n  ")).toEqual([]);
  });
});
