import React, { useEffect, useRef } from "react";
import { useBoardStore } from "@/store/useBoardStore";
import { NOTE_COLORS } from "@/types/elements";

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string | null;
  onClose: () => void;
  onCreateNote: (x: number, y: number) => void;
}

function MenuItem({
  label,
  shortcut,
  onClick,
  danger,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-[6px] text-[13px] flex items-center justify-between gap-4 transition-colors ${
        danger
          ? "text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
          : "text-white/70 hover:bg-white/[0.06] hover:text-white/90"
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[11px] text-white/20">{shortcut}</span>}
    </button>
  );
}

function Separator() {
  return <div className="mx-2 my-1 h-px bg-white/[0.06]" />;
}

export default function ContextMenu({
  x,
  y,
  elementId,
  onClose,
  onCreateNote,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteElement = useBoardStore((s) => s.deleteElement);
  const updateElement = useBoardStore((s) => s.updateElement);
  const createElement = useBoardStore((s) => s.createElement);
  const elements = useBoardStore((s) => s.elements);

  const element = elementId ? elements[elementId] : null;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const closeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeKey);
    };
  }, [onClose]);

  // Position menu so it doesn't overflow viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  const [showColors, setShowColors] = React.useState(false);

  const handleDuplicate = () => {
    if (!element) return;
    const id = createElement(element.type, {
      x: element.position.x + element.width + 20,
      y: element.position.y,
    });
    if (id) {
      updateElement(id, {
        content: element.content,
        color: element.color,
        width: element.width,
        height: element.height,
      });
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-[#252730] border border-white/[0.08] rounded-lg shadow-2xl py-1 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {element ? (
        <>
          <MenuItem
            label="Duplicate"
            shortcut="⌘D"
            onClick={handleDuplicate}
          />
          <Separator />
          {element.type === "note" && (
            <>
              <div className="px-3 py-1.5">
                <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Color</span>
                <div className="flex gap-1 mt-1.5">
                  {Object.entries(NOTE_COLORS).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        updateElement(element.id, { color: key });
                        onClose();
                      }}
                      className="w-[16px] h-[16px] rounded-full border-[1.5px] hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: val.bar === "rgba(255,255,255,0.08)" ? "#3a3c40" : val.bar,
                        borderColor: element.color === key ? "#fff" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}
          <MenuItem
            label="Delete"
            shortcut="⌫"
            onClick={() => {
              deleteElement(element.id);
              onClose();
            }}
            danger
          />
        </>
      ) : (
        <>
          <MenuItem
            label="New Note"
            onClick={() => {
              onCreateNote(x, y);
              onClose();
            }}
          />
          <MenuItem
            label="Paste"
            shortcut="⌘V"
            onClick={() => {
              onClose();
            }}
          />
        </>
      )}
    </div>
  );
}
