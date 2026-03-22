import React, { useCallback, useRef } from "react";

import ElementSettingsPanel from "@/features/toolbar/ElementSettingsPanel";
import {
  BoardIcon,
  ChecklistIcon,
  ConnectorIcon,
  DrawingIcon,
  LinkIcon,
  NoteIcon,
  TableIcon,
  TextIcon,
} from "@/features/toolbar/ToolbarIcons";
import { UMBRA_TOOLBAR_DND_TYPE, startToolbarPointerDrag } from "@/lib/canvasDnD";
import type { ElementType } from "@/types/elements";
import { useBoardStore } from "@/store/useBoardStore";

const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

function ToolBtn({
  label,
  elementType,
  onClick,
  children,
}: {
  label: string;
  elementType: ElementType;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  // Pointer-based drag — works in both Chrome and Tauri WKWebView
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      // In Tauri, capture the pointer so native drag doesn't steal events
      if (isTauri) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;
    },
    [],
  );

  const onPointerMoveCapture = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      // Start drag after 6px of movement
      if (Math.sqrt(dx * dx + dy * dy) > 6) {
        pointerStartRef.current = null;
        didDragRef.current = true;
        // Release capture before handing off to window-level drag listeners
        if (isTauri) {
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch { /* */ }
        }
        startToolbarPointerDrag(elementType, e.clientX, e.clientY, label);
      }
    },
    [elementType, label],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointerStartRef.current = null;
    if (isTauri) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch { /* */ }
    }
  }, []);

  // onClick handles both regular clicks AND keyboard activation.
  // Skip if a drag just occurred.
  const handleClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onClick();
  }, [onClick]);

  // Also keep HTML5 DnD as fallback for Chrome
  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(UMBRA_TOOLBAR_DND_TYPE, elementType);
      e.dataTransfer.effectAllowed = "copy";
    },
    [elementType],
  );

  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        draggable={!isTauri}
        onDragStart={isTauri ? (e) => e.preventDefault() : onDragStart}
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerMoveCapture={onPointerMoveCapture}
        onPointerUp={onPointerUp}
        className="flex flex-col items-center justify-center w-10 h-12 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/[0.06] active:bg-white/[0.1] transition-all cursor-grab active:cursor-grabbing gap-0.5"
      >
        {children}
        <span className="text-[8px] leading-none text-inherit opacity-60">{label}</span>
      </button>
    </div>
  );
}

const DRAW_COLORS = ["#ffffff", "#4a9eff", "#ff4a6a", "#ffc44a", "#4aff8b", "#c44aff"];
const DRAW_THICKNESSES = [1, 2, 4, 6];

function DrawSettingsPanel({ onBack }: { onBack: () => void }) {
  const drawingColor = useBoardStore((s) => s.drawingColor);
  const drawingThickness = useBoardStore((s) => s.drawingThickness);
  const setDrawingColor = useBoardStore((s) => s.setDrawingColor);
  const setDrawingThickness = useBoardStore((s) => s.setDrawingThickness);

  return (
    <div className="flex flex-col h-full min-h-0">
      <button
        type="button"
        onClick={onBack}
        className="flex-shrink-0 flex items-center justify-center h-11 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>
      <div className="flex-1 min-h-0 flex flex-col items-center gap-1 px-1.5 pt-2 pb-2 overflow-y-auto scrollbar-hide">
        <div className="text-[9px] uppercase tracking-wider text-white/20 mt-1 mb-1">Color</div>
        <div className="flex flex-col items-center gap-1.5">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDrawingColor(c)}
              className="w-[16px] h-[16px] rounded-full border-[1.5px] hover:scale-125 transition-transform"
              style={{
                backgroundColor: c,
                borderColor: drawingColor === c ? "#fff" : "transparent",
              }}
            />
          ))}
        </div>
        <div className="w-6 my-2 h-px bg-white/[0.06]" />
        <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Size</div>
        <div className="flex flex-col items-center gap-1">
          {DRAW_THICKNESSES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDrawingThickness(t)}
              className="flex items-center justify-center w-10 h-7 rounded-md hover:bg-white/[0.06] transition-colors"
              style={{ opacity: drawingThickness === t ? 1 : 0.4 }}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.min(20, 8 + t * 3),
                  height: t,
                  backgroundColor: drawingColor,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONNECTOR_STYLES: { value: "straight" | "orthogonal" | "curve"; label: string; icon: React.ReactNode }[] = [
  {
    value: "straight",
    label: "Straight",
    icon: (
      <svg width={24} height={14} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        <line x1="2" y1="12" x2="22" y2="2" />
      </svg>
    ),
  },
  {
    value: "orthogonal",
    label: "Elbow",
    icon: (
      <svg width={24} height={14} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,12 2,2 22,2" />
      </svg>
    ),
  },
  {
    value: "curve",
    label: "Curve",
    icon: (
      <svg width={24} height={14} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        <path d="M2,12 C2,2 22,12 22,2" />
      </svg>
    ),
  },
];

const CONNECTOR_COLORS = [
  "rgba(255,255,255,0.15)",
  "#4a9eff",
  "#ff4a6a",
  "#ffc44a",
  "#4aff8b",
  "#c44aff",
];

const CONNECTOR_THICKNESSES = [1.5, 2.5, 4, 6];

function ConnectSettingsPanel({ onBack }: { onBack: () => void }) {
  const connectorStyle = useBoardStore((s) => s.connectorStyle);
  const setConnectorStyle = useBoardStore((s) => s.setConnectorStyle);
  const connectorColor = useBoardStore((s) => s.connectorColor);
  const setConnectorColor = useBoardStore((s) => s.setConnectorColor);
  const connectorThickness = useBoardStore((s) => s.connectorThickness);
  const setConnectorThickness = useBoardStore((s) => s.setConnectorThickness);

  return (
    <div className="flex flex-col h-full min-h-0">
      <button
        type="button"
        onClick={onBack}
        className="flex-shrink-0 flex items-center justify-center h-11 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>
      <div className="flex-1 min-h-0 flex flex-col items-center gap-1 px-1.5 pt-2 pb-2 overflow-y-auto scrollbar-hide">
        <div className="text-[9px] uppercase tracking-wider text-white/20 mt-1 mb-1">Style</div>
        <div className="flex flex-col items-center gap-1">
          {CONNECTOR_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setConnectorStyle(s.value)}
              className="flex items-center justify-center w-10 h-8 rounded-md hover:bg-white/[0.06] transition-colors"
              style={{ opacity: connectorStyle === s.value ? 1 : 0.35 }}
              title={s.label}
            >
              {s.icon}
            </button>
          ))}
        </div>

        <div className="w-6 my-2 h-px bg-white/[0.06]" />
        <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Color</div>
        <div className="flex flex-col items-center gap-1.5">
          {CONNECTOR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConnectorColor(c)}
              className="w-[16px] h-[16px] rounded-full border-[1.5px] hover:scale-125 transition-transform"
              style={{
                backgroundColor: c === "rgba(255,255,255,0.15)" ? "#3a3c40" : c,
                borderColor: connectorColor === c ? "#fff" : "transparent",
              }}
            />
          ))}
        </div>

        <div className="w-6 my-2 h-px bg-white/[0.06]" />
        <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Size</div>
        <div className="flex flex-col items-center gap-1">
          {CONNECTOR_THICKNESSES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setConnectorThickness(t)}
              className="flex items-center justify-center w-10 h-7 rounded-md hover:bg-white/[0.06] transition-colors"
              style={{ opacity: connectorThickness === t ? 1 : 0.4 }}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.min(20, 8 + t * 3),
                  height: t,
                  backgroundColor: connectorColor,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LeftToolbar() {
  const createElement = useBoardStore((s) => s.createElement);
  const selectedElementId = useBoardStore((s) => s.selectedElementId);
  const elements = useBoardStore((s) => s.elements);
  const setSelectedElement = useBoardStore((s) => s.setSelectedElement);
  const drawingMode = useBoardStore((s) => s.drawingMode);
  const setDrawingMode = useBoardStore((s) => s.setDrawingMode);
  const connectMode = useBoardStore((s) => s.connectMode);
  const setConnectMode = useBoardStore((s) => s.setConnectMode);

  const selectedElement = selectedElementId ? elements[selectedElementId] : null;

  const toolbarRef = useRef<HTMLDivElement>(null);

  const add = useCallback(
    (type: ElementType) => {
      createElement(type);
    },
    [createElement],
  );

  const asideClass =
    "fixed left-2 top-1/2 -translate-y-1/2 flex flex-col w-[52px] rounded-xl z-50 transition-all duration-200 ease-in-out overflow-hidden"
    + " bg-[#1e2026]/95 backdrop-blur-md border border-white/[0.08] shadow-2xl";

  // Connect mode — show connector style settings
  if (connectMode) {
    return (
      <aside ref={toolbarRef} className={asideClass} style={{ maxHeight: "70vh" }}>
        <ConnectSettingsPanel onBack={() => setConnectMode(false)} />
      </aside>
    );
  }

  // Drawing mode — show draw settings
  if (drawingMode) {
    return (
      <aside ref={toolbarRef} className={asideClass} style={{ maxHeight: "70vh" }}>
        <DrawSettingsPanel onBack={() => setDrawingMode(false)} />
      </aside>
    );
  }

  // When element is selected, show settings panel instead of tools
  if (selectedElement) {
    return (
      <aside ref={toolbarRef} className={asideClass} style={{ maxHeight: "70vh" }}>
        <ElementSettingsPanel
          element={selectedElement}
          onBack={() => setSelectedElement(null)}
        />
      </aside>
    );
  }

  return (
    <aside ref={toolbarRef} className={asideClass} style={{ maxHeight: "70vh" }}>
      {/* Tools */}
      <div className="flex-1 min-h-0 flex flex-col items-center gap-0.5 px-1.5 py-2 overflow-y-auto scrollbar-hide">
        <ToolBtn label="Note" elementType="note" onClick={() => add("note")}>
          <NoteIcon size={18} />
        </ToolBtn>
        <ToolBtn label="Board" elementType="board" onClick={() => add("board")}>
          <BoardIcon size={18} />
        </ToolBtn>
        <ToolBtn label="To-do" elementType="checklist" onClick={() => add("checklist")}>
          <ChecklistIcon size={18} />
        </ToolBtn>
        <ToolBtn label="Link" elementType="link" onClick={() => add("link")}>
          <LinkIcon size={18} />
        </ToolBtn>
        <ToolBtn label="Text" elementType="text" onClick={() => add("text")}>
          <TextIcon size={18} />
        </ToolBtn>
        <ToolBtn label="Table" elementType="table" onClick={() => add("table")}>
          <TableIcon size={18} />
        </ToolBtn>

        {/* Divider */}
        <div className="w-6 my-1 h-px bg-white/[0.04]" />

        {/* Draw mode toggle */}
        <button
          type="button"
          title="Draw"
          onClick={() => setDrawingMode(true)}
          className="flex flex-col items-center justify-center w-10 h-12 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/[0.06] active:bg-white/[0.1] transition-all gap-0.5"
        >
          <DrawingIcon size={18} />
          <span className="text-[8px] leading-none text-inherit opacity-60">Draw</span>
        </button>

        {/* Connect mode toggle */}
        <button
          type="button"
          title="Connect"
          onClick={() => setConnectMode(true)}
          className="flex flex-col items-center justify-center w-10 h-12 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/[0.06] active:bg-white/[0.1] transition-all gap-0.5"
        >
          <ConnectorIcon size={18} />
          <span className="text-[8px] leading-none text-inherit opacity-60">Connect</span>
        </button>
      </div>
    </aside>
  );
}
