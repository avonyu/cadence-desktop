import { describe, expect, it } from "vitest";
import {
  getNextCaptionIndex,
  getPreviousCaptionIndex,
} from "./caption-navigation";
import { type Caption } from "./subtitles";

const captions: Caption[] = [
  {
    time: "00:00",
    start: 0,
    end: 2,
    text: "First",
    translation: "",
    textHtml: "First",
    translationHtml: "",
  },
  {
    time: "00:05",
    start: 5,
    end: 7,
    text: "Second",
    translation: "",
    textHtml: "Second",
    translationHtml: "",
  },
  {
    time: "00:10",
    start: 10,
    end: 12,
    text: "Third",
    translation: "",
    textHtml: "Third",
    translationHtml: "",
  },
];

describe("caption navigation", () => {
  it("moves to the previous caption when playback is between two captions", () => {
    expect(getPreviousCaptionIndex(captions, 8, null)).toBe(1);
  });

  it("moves to the previous caption when a caption is active", () => {
    expect(getPreviousCaptionIndex(captions, 5.5, 1)).toBe(0);
  });

  it("moves to the next caption when playback is between two captions", () => {
    expect(getNextCaptionIndex(captions, 8, null)).toBe(2);
  });

  it("moves to previous caption from gap with stale activeCaption (regression)", () => {
    expect(getPreviousCaptionIndex(captions, 8, 2)).toBe(1);
  });
});
