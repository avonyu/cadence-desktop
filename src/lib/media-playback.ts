export async function toggleMediaPlayback(
  video: HTMLVideoElement,
): Promise<boolean> {
  if (!video.paused) {
    video.pause();
    return false;
  }

  try {
    await video.play();
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return !video.paused;
    }
    return false;
  }
}
