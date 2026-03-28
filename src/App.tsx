import React, { useEffect } from "react";
import CanvasWorkspace from "@/features/canvas/CanvasWorkspace";
import HomePage from "@/features/home/HomePage";
import { useBoardStore } from "@/store/useBoardStore";

export default function App() {
  const view = useBoardStore((s) => s.view);
  const theme = useBoardStore((s) => s.userSettings.theme || "dark");
  const hydrate = useBoardStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Sync theme class on <html> element
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  if (view === "home") {
    return <HomePage />;
  }

  return <CanvasWorkspace />;
}
