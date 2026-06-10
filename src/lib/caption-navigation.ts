import { type Caption } from "./subtitles";

export function getPreviousCaptionIndex(
  captions: Caption[],
  currentTime: number,
  activeCaption: number | null,
): number | null {
  if (captions.length === 0) return null;

  if (activeCaption !== null) {
    return Math.max(0, activeCaption - 1);
  }

  for (let i = captions.length - 1; i >= 0; i--) {
    if (currentTime >= captions[i].start) {
      return i;
    }
  }

  return 0;
}

export function getNextCaptionIndex(
  captions: Caption[],
  currentTime: number,
  activeCaption: number | null,
): number | null {
  if (captions.length === 0) return null;

  if (activeCaption !== null) {
    return Math.min(captions.length - 1, activeCaption + 1);
  }

  for (let i = 0; i < captions.length; i++) {
    if (currentTime < captions[i].start) {
      return i;
    }
  }

  return captions.length - 1;
}
