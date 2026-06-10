import { useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/player-store";

/**
 * SubtitleMask — a draggable & resizable black overlay placed over the
 * video to hide hard-burned subtitles.
 *
 * - Drag handle: grip icon at the top center → moves the mask
 * - Resize handle: icon at the bottom-right corner → resizes the mask
 *
 * Positions are stored as **percentages** of the video container so that
 * the mask stays correct when the container is resized.
 */

const MIN_SIZE = 4; // minimum width/height in percent

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

export function SubtitleMask() {
  const maskRect = usePlayerStore((s) => s.subtitleMaskRect);
  const setSubtitleMaskRect = usePlayerStore((s) => s.setSubtitleMaskRect);
  const containerRef = useRef<HTMLDivElement>(null);
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

      if (info.type === "move") {
        const x = Math.max(0, Math.min(100 - sr.width, sr.x + dx));
        const y = Math.max(0, Math.min(100 - sr.height, sr.y + dy));
        setSubtitleMaskRect({
          x,
          y,
          width: sr.width,
          height: sr.height,
        });
        return;
      }

      // Resize (se direction only)
      const width = Math.min(Math.max(sr.width + dx, MIN_SIZE), 100 - sr.x);
      const height = Math.min(Math.max(sr.height + dy, MIN_SIZE), 100 - sr.y);
      setSubtitleMaskRect({ x: sr.x, y: sr.y, width, height });
    },
    [getContainerSize, setSubtitleMaskRect],
  );

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="absolute pointer-events-auto border border-white/20 rounded-md bg-black/90"
        style={{
          left: `${maskRect.x}%`,
          top: `${maskRect.y}%`,
          width: `${maskRect.width}%`,
          height: `${maskRect.height}%`,
        }}
      >
        {/* Drag handle — top center inside */}
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-move py-1 pointer-events-auto z-10"
          onPointerDown={handleDragPointerDown}
        >
          <DragGripIcon />
        </div>

        {/* Resize handle — bottom right inside */}
        <div
          className="absolute bottom-1 right-1 flex items-center justify-center cursor-se-resize p-0.5 pointer-events-auto z-10"
          onPointerDown={handleResizePointerDown}
        >
          <ResizeIcon />
        </div>
      </div>
    </div>
  );
}
