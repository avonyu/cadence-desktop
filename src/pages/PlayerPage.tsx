import { VideoPlayer } from "@/components/player";
import { Subtitles, X } from "lucide-react";
import { useState } from "react";

const VIDEO_SRC =
  "https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4";

const captions = [
  {
    time: "00:00",
    text: "Welcome back everyone to another",
    translation: "欢迎大家回来，大家又来到另一集",
  },
  {
    time: "00:02",
    text: "comprehensible input vlog in my old style.",
    translation: "用我老风格的可理解输入视频日志。",
  },
  {
    time: "00:06",
    text: "Today we are in Hao Long Bay, here in Vietnam.",
    translation: "今天我们身处越南的浩龙湾。",
  },
  {
    time: "00:36",
    text: "Here you can see we just checked",
    translation: "你可以看到我们刚检查过",
  },
  {
    time: "00:38",
    text: "into our room on this cruise ship.",
    translation: "进了我们这艘游轮的房间。",
  },
  {
    time: "00:40",
    text: "Here you have two twin beds.",
    translation: "这里有两张双人床。",
  },
  {
    time: "00:44",
    text: "Two twin beds.",
    translation: "两张单人床。",
  },
  {
    time: "00:45",
    text: "This is my brother's bed, and this is my bed.",
    translation: "这是我哥哥的床，这张是我的床。",
  },
  {
    time: "00:50",
    text: "The balcony opens right onto the water.",
    translation: "阳台正对着海面。",
  },
];

export const PlayerPage = () => {
  const [activeCaption, setActiveCaption] = useState(2);

  return (
    <section className="min-h-90 min-w-120 overflow-y-hidden grid h-screen grid-cols-[minmax(0,1fr)_430px] bg-[#0a0a0a] text-zinc-100">
      <main className="relative flex min-w-0 flex-col border-r border-white/10 bg-[#0b0b0b]">
        <div className="flex gap-2 min-h-0 flex-1 flex-col justify-center px-8">
          <div className="relative mx-auto aspect-video w-full max-w-7xl overflow-hidden bg-black shadow-2xl shadow-black/60">
            <VideoPlayer src={VIDEO_SRC} />
          </div>

          <div className="mx-auto flex min-h-37 w-full max-w-7xl flex-col items-center justify-center text-center">
            <p className="max-w-5xl text-2xl font-semibold leading-tight tracking-normal text-zinc-200">
              {captions[activeCaption].text}
            </p>
            <p className="mt-5 text-2xl leading-tight tracking-normal text-zinc-400">
              {captions[activeCaption].translation}
            </p>
          </div>
        </div>
      </main>

      <aside className="relative flex min-h-0 flex-col bg-[#101010]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 px-8">
          <div className="flex items-center gap-2 text-zinc-300">
            <Subtitles size={20} />
            <span className="text-sm font-semibold uppercase tracking-[0.16em]">
              Subtitles
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex size-8 items-center justify-center rounded-md border border-white/20 text-zinc-500 transition hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:#4b4b4b_transparent] scrollbar-thin">
          <div className="space-y-2">
            {captions.map((caption, index) => {
              const isActive = index === activeCaption;

              return (
                <button
                  className={`grid w-full grid-cols-[62px_1fr] gap-1 rounded-md px-0 py-2 text-left transition ${
                    isActive
                      ? "text-[#f5cc64]"
                      : "text-zinc-500 hover:bg-white/3 hover:text-zinc-300"
                  }`}
                  key={`${caption.time}-${caption.text}`}
                  onClick={() => setActiveCaption(index)}
                >
                  <span
                    className={`text-md font-bold text-center ${
                      isActive ? "text-[#f5cc64]" : "text-zinc-600"
                    }`}
                  >
                    {caption.time}
                  </span>
                  <span>
                    <span className="block text-md font-bold leading-snug tracking-normal">
                      {caption.text}
                    </span>
                    <span
                      className={`mt-2 block text-md leading-snug tracking-normal ${
                        isActive ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {caption.translation}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </section>
  );
};
