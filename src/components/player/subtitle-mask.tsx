import { useRef, useCallback, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";

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

/** Resize icon rotated for top-left corner */
function ResizeIconNW() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      className="text-white/60 rotate-180"
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
  const [hovering, setHovering] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const interactionRef = useRef<{
    type: "move" | "resize" | "resize-nw";
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

  // --- Resize handle (top-left corner - nw direction) ---
  const handleResizeNWPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setInteracting(true);
      interactionRef.current = {
        type: "resize-nw",
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
      if (info.type === "resize") {
        const width = Math.min(Math.max(sr.width + dx, MIN_SIZE), 100 - sr.x);
        const height = Math.min(Math.max(sr.height + dy, MIN_SIZE), 100 - sr.y);
        setSubtitleMaskRect({ x: sr.x, y: sr.y, width, height });
        return;
      }

      // Resize (nw direction — moves top-left corner)
      if (info.type === "resize-nw") {
        const width = Math.min(Math.max(sr.width - dx, MIN_SIZE), sr.x + sr.width);
        const height = Math.min(Math.max(sr.height - dy, MIN_SIZE), sr.y + sr.height);
        const x = Math.max(0, Math.min(sr.x + sr.width - MIN_SIZE, sr.x + dx));
        const y = Math.max(0, Math.min(sr.y + sr.height - MIN_SIZE, sr.y + dy));
        setSubtitleMaskRect({ x, y, width, height });
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
        {/* Resize handle — top left */}
        {hovering && (
          <div
            className="absolute top-1 left-1 flex items-center justify-center cursor-nw-resize p-0.5 pointer-events-auto z-10"
            onPointerDown={handleResizeNWPointerDown}
          >
            <ResizeIconNW />
          </div>
        )}

        {/* Drag handle — top center */}
        {hovering && (
          <div
            className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-move py-1 pointer-events-auto z-10"
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
}
