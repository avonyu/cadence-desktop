export interface VideoSize {
  width: number;
  height: number;
}

export const getFittedAspectRatioSize = (
  aspectWidth: number,
  aspectHeight: number,
  containerWidth: number,
  containerHeight: number,
): VideoSize | null => {
  if (
    aspectWidth <= 0 ||
    aspectHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return null;
  }

  const scale = Math.min(
    containerWidth / aspectWidth,
    containerHeight / aspectHeight,
  );

  return {
    width: Math.round(aspectWidth * scale),
    height: Math.round(aspectHeight * scale),
  };
};

export const getContainedVideoSize = (
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): VideoSize | null => {
  if (
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return null;
  }

  const scale = Math.min(
    containerWidth / videoWidth,
    containerHeight / videoHeight,
  );

  return {
    width: Math.round(videoWidth * scale),
    height: Math.round(videoHeight * scale),
  };
};
