import React, { useEffect } from "react";
import CanvasWorkspace from "@/features/canvas/CanvasWorkspace";
import HomePage from "@/features/home/HomePage";
import { useBoardStore } from "@/store/useBoardStore";

export default function App() {
  const view = useBoardStore((s) => s.view);
  const hydrate = useBoardStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (view === "home") {
    return <HomePage />;
  }

  return <CanvasWorkspace />;
}
