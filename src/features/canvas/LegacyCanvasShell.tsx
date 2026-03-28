import React from "react";

import BreadcrumbNav from "@/features/navigation/BreadcrumbNav";
import InfiniteCanvas from "@/features/canvas/InfiniteCanvas";
import ZoomBar from "@/features/canvas/ZoomBar";
import ThemeToggle from "@/features/canvas/ThemeToggle";

export default function LegacyCanvasShell() {
  return (
    <div className="flex-1 min-h-0 min-w-0 relative flex flex-col">
      <div className="flex-1 min-h-0 relative">
        <InfiniteCanvas />
        <BreadcrumbNav />
        <ThemeToggle />
        <ZoomBar />
      </div>
    </div>
  );
}
