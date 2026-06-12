import { describe, expect, it } from "vitest";
import { getContainedVideoSize, getFittedAspectRatioSize } from "./video-size";

describe("getContainedVideoSize", () => {
  it("fits a video inside the available area without adding side bars", () => {
    expect(getContainedVideoSize(1920, 1080, 1184, 461)).toEqual({
      width: 820,
      height: 461,
    });
  });

  it("does not enlarge a video beyond its original dimensions", () => {
    expect(getContainedVideoSize(640, 480, 1200, 900)).toEqual({
      width: 640,
      height: 480,
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
