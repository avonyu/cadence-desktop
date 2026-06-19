import { Volume2, VolumeX } from "lucide-react";

interface VolumeOSDProps {
  volume: number;
  muted: boolean;
  visible: boolean;
}

export function VolumeOSD({ volume, muted, visible }: VolumeOSDProps) {
  if (!visible) return null;

  const displayVolume = muted ? 0 : volume;
  const Icon = muted || displayVolume === 0 ? VolumeX : Volume2;

  return (
    <div
      className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 pointer-events-none
        flex items-center gap-3 rounded-lg bg-black/70 px-4 py-2.5
        text-white backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-bottom-2
        duration-200 select-none"
    >
      <Icon size={20} className="shrink-0" />
      <div className="flex h-1.5 w-24 rounded-full bg-white/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-(--player-accent) transition-[width] duration-100"
          style={{ width: `${displayVolume * 100}%` }}
        />
      </div>
    </div>
  );
}
