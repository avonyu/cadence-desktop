import { useRef, useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

/**
 * Shared word pronunciation logic. Uses the Edge TTS backend command and
 * falls back to the Web Speech API when it is unavailable. Tracks which word
 * is currently being pronounced so multiple callers (e.g. a list of rows) can
 * reflect per-word loading state.
 */
export function useWordPronounce() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pronouncingWord, setPronouncingWord] = useState<string | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  }, []);

  useEffect(() => cleanupAudio, [cleanupAudio]);

  const pronounce = useCallback(
    async (word: string) => {
      if (!word) return;
      setPronouncingWord(word);
      cleanupAudio();
      try {
        const base64 = await invoke<string>("synthesize_edge_tts", {
          text: word,
        });
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setPronouncingWord(null);
        audio.onerror = () => setPronouncingWord(null);
        await audio.play();
      } catch (e) {
        console.warn("[word-pronounce] Edge TTS failed, falling back to Web Speech:", e instanceof Error ? e.message : e);
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = "en-US";
        utterance.rate = 0.8;
        utterance.onend = () => setPronouncingWord(null);
        utterance.onerror = () => setPronouncingWord(null);
        speechSynthesis.speak(utterance);
      }
    },
    [cleanupAudio],
  );

  return { pronounce, pronouncingWord };
}
