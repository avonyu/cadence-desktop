import { describe, expect, it, vi } from "vitest";
import { toggleMediaPlayback } from "./media-playback";

describe("toggleMediaPlayback", () => {
  it("returns false when the media element rejects playback", async () => {
    const video = {
      paused: true,
      play: vi.fn().mockRejectedValue(new DOMException("Unsupported", "NotSupportedError")),
      pause: vi.fn(),
    } as unknown as HTMLVideoElement;

    await expect(toggleMediaPlayback(video)).resolves.toBe(false);
  });

  it("pauses a playing media element", async () => {
    const video = {
      paused: false,
      play: vi.fn(),
      pause: vi.fn(),
    } as unknown as HTMLVideoElement;

    await expect(toggleMediaPlayback(video)).resolves.toBe(false);
    expect(video.pause).toHaveBeenCalledOnce();
  });
});
