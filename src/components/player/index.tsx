import "@videojs/react/video/skin.css";
// import "@/styles/player.css";
import { Video as VideoIcon } from "lucide-react";
import { createPlayer, videoFeatures } from "@videojs/react";
import { VideoSkin, Video } from "@videojs/react/video";

export { SubtitleMask } from "./subtitle-mask";

const Player = createPlayer({ features: videoFeatures });

interface VideoPlayerProps {
  src: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export const VideoPlayer = ({
  src,
  onTimeUpdate,
  videoRef,
}: VideoPlayerProps) => {
  return (
    <Player.Provider>
      <VideoSkin>
        <Video
          ref={videoRef}
          className="h-full w-full object-contain"
          src={src ?? undefined}
          playsInline
          onTimeUpdate={(e) => {
            const target = e.target as HTMLVideoElement;
            onTimeUpdate?.(target.currentTime);
          }}
        />
        {!src && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <VideoIcon className="size-10 text-zinc-600" strokeWidth={1} />
            <p className="text-sm font-medium text-zinc-600">No video loaded</p>
          </div>
        )}
      </VideoSkin>
    </Player.Provider>
  );
};
