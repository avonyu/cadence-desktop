import { useRef, useCallback, useState, memo } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";
import { sanitizeSubtitleHtml } from "@/lib/html-sanitize";

/**
 * SubtitleMask — a draggable & resizable black overlay placed over the
 * video to hide hard-burned subtitles.
 *
 * - Drag handle: grip icon at the top center → moves the mask vertically only,
 *   keeping its vertical symmetry axis aligned with the video center
 * - Resize handle: icon at the bottom-right corner → resizes the mask; width
 *   grows symmetrically (mirrored) about the mask's vertical symmetry axis
 * - In fullscreen mode the active subtitle is rendered inside the mask so the
 *   user keeps reading captions after the surrounding UI is hidden.
 *
 * Positions are stored as **percentages** of the video container so that
 * the mask stays correct when the container is resized.
 */

interface SubtitleMaskProps {
  /** Active subtitle text to render inside the mask (fullscreen only). */
  activeDisplay?: { primary: string; secondary: string } | null;
  /** Whether the player is currently in fullscreen mode. */
  isFullscreen?: boolean;
}

const MIN_WIDTH = 20; // minimum mask width in percent
const MIN_HEIGHT = 6; // minimum mask height in percent

/** Drag grip icon — three horizontal lines */
function DragGripIcon() {
  return (
    <svg
      width="12"
      height="10"
      viewBox="0 0 12 10"
      fill="none"
      className="text-white/60"
    >
      <rect y="0.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect y="7.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

/** Resize icon — two diverging arrows at bottom-right */
function ResizeIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      className="text-white/60"
    >
      <path
        d="M7 1v6H1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7L1 1"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  );
}

export const SubtitleMask = memo(function SubtitleMask({
  activeDisplay,
  isFullscreen = false,
}: SubtitleMaskProps) {
  const maskRect = usePlayerStore((s) => s.subtitleMaskRect);
  const setSubtitleMaskRect = usePlayerStore((s) => s.setSubtitleMaskRect);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const interactionRef = useRef<{
    type: "move" | "resize";
    startX: number;
    startY: number;
    startRect: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const getContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    return { w: el.offsetWidth, h: el.offsetHeight };
  }, []);

  // --- Drag handle (top center grip) ---
  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setInteracting(true);
      interactionRef.current = {
        type: "move",
        startX: e.clientX,
        startY: e.clientY,
        startRect: { ...maskRect },
      };
    },
    [maskRect],
  );

  // --- Resize handle (bottom-right corner) ---
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setInteracting(true);
      interactionRef.current = {
        type: "resize",
        startX: e.clientX,
        startY: e.clientY,
        startRect: { ...maskRect },
      };
    },
    [maskRect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const info = interactionRef.current;
      if (!info) return;
      const size = getContainerSize();
      if (!size) return;

      const dx = ((e.clientX - info.startX) / size.w) * 100;
      const dy = ((e.clientY - info.startY) / size.h) * 100;
      const sr = info.startRect;

      // Move — only vertical: keep the mask's vertical symmetry axis aligned
      // with the video's vertical center (x = 50%).
      if (info.type === "move") {
        const width = sr.width;
        const x = 50 - width / 2;
        const y = Math.max(0, Math.min(100 - sr.height, sr.y + dy));
        setSubtitleMaskRect({ x, y, width, height: sr.height });
        return;
      }

      // Resize (bottom-right) — width grows symmetrically about the mask's
      // vertical symmetry axis (center x fixed); height grows downward.
      if (info.type === "resize") {
        const centerX = sr.x + sr.width / 2;
        const maxWidth = 2 * Math.min(centerX, 100 - centerX);
        const width = Math.min(Math.max(sr.width + dx * 2, MIN_WIDTH), maxWidth);
        const x = centerX - width / 2;
        const height = Math.min(Math.max(sr.height + dy, MIN_HEIGHT), 100 - sr.y);
        setSubtitleMaskRect({ x, y: sr.y, width, height });
        return;
      }
    },
    [getContainerSize, setSubtitleMaskRect],
  );

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null;
    setInteracting(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className={cn(
          "absolute pointer-events-auto border border-white/20 rounded-md transition-opacity duration-150",
          interacting ? "bg-black/40" : "bg-black/90",
        )}
        style={{
          left: `${maskRect.x}%`,
          top: `${maskRect.y}%`,
          width: `${maskRect.width}%`,
          height: `${maskRect.height}%`,
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Subtitle text — shown inside the mask only in fullscreen */}
        {isFullscreen && activeDisplay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1vh] px-[2%] text-center overflow-hidden pointer-events-none select-none">
            {activeDisplay.primary && (
              <p
                className="text-[2.6vh] font-semibold leading-[1.3] text-white break-words"
                dangerouslySetInnerHTML={{
                  __html: sanitizeSubtitleHtml(activeDisplay.primary),
                }}
              />
            )}
            {activeDisplay.secondary && (
              <p
                className="text-[2.2vh] leading-[1.3] text-white/75 break-words"
                dangerouslySetInnerHTML={{
                  __html: sanitizeSubtitleHtml(activeDisplay.secondary),
                }}
              />
            )}
          </div>
        )}

        {/* Drag handle — top center (vertical move only) */}
        {hovering && (
          <div
            className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-ns-resize py-1 pointer-events-auto z-10"
            onPointerDown={handleDragPointerDown}
          >
            <DragGripIcon />
          </div>
        )}

        {/* Resize handle — bottom right inside */}
        {hovering && (
          <div
            className="absolute bottom-1 right-1 flex items-center justify-center cursor-se-resize p-0.5 pointer-events-auto z-10"
            onPointerDown={handleResizePointerDown}
          >
            <ResizeIcon />
          </div>
        )}
      </div>
    </div>
  );
});
