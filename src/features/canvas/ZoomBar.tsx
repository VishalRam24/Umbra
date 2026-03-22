import React from "react";
import { useBoardStore } from "@/store/useBoardStore";

export default function ZoomBar() {
  const viewport = useBoardStore((s) => s.viewport);
  const setViewport = useBoardStore((s) => s.setViewport);

  const pct = Math.round(viewport.scale * 100);

  const zoomIn = () => setViewport({ scale: viewport.scale * 1.2 });
  const zoomOut = () => setViewport({ scale: viewport.scale / 1.2 });
  const resetZoom = () => setViewport({ scale: 1, x: 0, y: 0 });

  return (
    <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1 glass-panel rounded-lg px-1 py-0.5">
      <button
        type="button"
        onClick={zoomOut}
        className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-[16px]"
        title="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        onClick={resetZoom}
        className="px-2 h-7 flex items-center justify-center rounded text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors font-medium tabular-nums min-w-[44px]"
        title="Reset zoom"
      >
        {pct}%
      </button>
      <button
        type="button"
        onClick={zoomIn}
        className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-[16px]"
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}
