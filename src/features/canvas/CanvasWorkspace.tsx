import LeftToolbar from "@/features/toolbar/LeftToolbar";
import LegacyCanvasShell from "@/features/canvas/LegacyCanvasShell";

export default function CanvasWorkspace() {
  return (
    <div className="relative flex flex-col h-screen w-screen">
      <LegacyCanvasShell />
      <LeftToolbar />
    </div>
  );
}
