export interface CodecInfo {
  codec_name: string;
  codec_long_name: string;
}

export interface VideoCodecResult {
  video: CodecInfo | null;
  audio: CodecInfo | null;
}

export const UNSUPPORTED_AUDIO_CODECS = new Set([
  "dts",
  "dts_hd",
  "ac3",
  "eac3",
  "truehd",
  "mlp",
  "wmapro",
  "wmalossless",
  "wmavoice",
  "dtshd",
  "flac",
  "opus",
  "vorbis",
  "pcm_s16le",
  "pcm_s24le",
  "pcm_f32le",
]);

export function isAudioCodecUnsupported(codecName: string): boolean {
  return UNSUPPORTED_AUDIO_CODECS.has(codecName);
}

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
