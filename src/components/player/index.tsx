import "@videojs/react/video/skin.css";
import { createPlayer, videoFeatures } from "@videojs/react";
import { VideoSkin, Video } from "@videojs/react/video";

const Player = createPlayer({ features: videoFeatures });

interface VideoPlayerProps {
  src: string | null;
}

export const VideoPlayer = ({ src }: VideoPlayerProps) => {
  return (
    <Player.Provider>
      <VideoSkin>
        <div className="relative h-full w-full">
          <Video
            className="h-full w-full object-cover"
            src={src ?? undefined}
            playsInline
          />
          {!src && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
              <svg className="size-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <p className="text-sm font-medium text-zinc-600">No video loaded</p>
            </div>
          )}
        </div>
      </VideoSkin>
    </Player.Provider>
  );
};
