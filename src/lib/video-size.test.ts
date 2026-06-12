import { describe, expect, it } from "vitest";
import { getContainedVideoSize, getFittedAspectRatioSize } from "./video-size";

describe("getContainedVideoSize", () => {
  it("fits a video inside the available area without adding side bars", () => {
    expect(getContainedVideoSize(1920, 1080, 1184, 461)).toEqual({
      width: 820,
      height: 461,
    });
  });

  it("enlarges a video to fill the container while maintaining aspect ratio", () => {
    expect(getContainedVideoSize(640, 480, 1200, 900)).toEqual({
      width: 1200,
      height: 900,
    });
  });
});

describe("getFittedAspectRatioSize", () => {
  it("fills the available area with a 16:9 box when no video is loaded", () => {
    expect(getFittedAspectRatioSize(16, 9, 1184, 461)).toEqual({
      width: 820,
      height: 461,
    });
  });
});
