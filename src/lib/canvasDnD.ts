import type { BoardElement, ElementType } from "@/types/elements";

/** MIME type for dragging new elements from the left toolbar onto the canvas. */
export const UMBRA_TOOLBAR_DND_TYPE = "application/x-umbra-element-type";

const DROPPABLE_TOOL_TYPES = new Set<ElementType>([
  "board",
  "note",
  "link",
  "checklist",
  "text",
  "table",
]);

function parseToolbarDropType(raw: string): ElementType | null {
  return DROPPABLE_TOOL_TYPES.has(raw as ElementType) ? (raw as ElementType) : null;
}

/* ------------------------------------------------------------------ */
/*  Pointer-based toolbar drag (works in both Chrome and WKWebView)  */
/* ------------------------------------------------------------------ */

/** Shared state for the pointer-based toolbar drag. */
let _activeToolDrag: {
  elementType: ElementType;
  ghost: HTMLElement;
  startX: number;
  startY: number;
} | null = null;

/** Returns whether a pointer-based toolbar drag is currently in progress. */
export function isToolbarDragActive(): boolean {
  return _activeToolDrag !== null;
}

/** Get the currently dragged tool type (if any). */
export function getToolbarDragType(): ElementType | null {
  return _activeToolDrag?.elementType ?? null;
}

/** Begin a pointer-based toolbar drag. Call from onPointerDown on tool buttons. */
export function startToolbarPointerDrag(
  elementType: ElementType,
  clientX: number,
  clientY: number,
  label: string,
) {
  // Create ghost element
  const ghost = document.createElement("div");
  ghost.textContent = label;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${clientX - 30}px`,
    top: `${clientY - 16}px`,
    padding: "4px 12px",
    borderRadius: "6px",
    background: "rgba(74, 158, 255, 0.2)",
    border: "1px solid rgba(74, 158, 255, 0.4)",
    color: "rgba(255,255,255,0.8)",
    fontSize: "12px",
    fontFamily: "system-ui, sans-serif",
    pointerEvents: "none",
    zIndex: "99999",
    backdropFilter: "blur(8px)",
    transition: "opacity 0.1s",
    opacity: "0.9",
    whiteSpace: "nowrap",
  });
  document.body.appendChild(ghost);

  _activeToolDrag = { elementType, ghost, startX: clientX, startY: clientY };

  const onMove = (e: PointerEvent) => {
    if (_activeToolDrag?.ghost) {
      _activeToolDrag.ghost.style.left = `${e.clientX - 30}px`;
      _activeToolDrag.ghost.style.top = `${e.clientY - 16}px`;
    }
  };

  const onUp = (e: PointerEvent) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);

    if (!_activeToolDrag) return;
    const { ghost, elementType: type, startX, startY } = _activeToolDrag;
    ghost.remove();
    _activeToolDrag = null;

    // Only count as drag if moved more than 8px
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) < 8) return;

    // Dispatch a custom event so the canvas can handle the drop
    window.dispatchEvent(
      new CustomEvent("umbra-toolbar-drop", {
        detail: { elementType: type, clientX: e.clientX, clientY: e.clientY },
      }),
    );
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

/* ------------------------------------------------------------------ */
/*  Legacy HTML5 DnD support (still used as fallback in Chrome)       */
/* ------------------------------------------------------------------ */

export function canvasDragOverAllowsDrop(e: React.DragEvent): boolean {
  const dt = e.dataTransfer;
  if (!dt) return false;
  const types = [...dt.types].map((t) => t.toLowerCase());
  const mime = UMBRA_TOOLBAR_DND_TYPE.toLowerCase();
  return types.includes(mime) || types.includes("files");
}

/** Drop toolbar tools or image files at pointer position relative to the canvas root. */
export function handleCanvasToolbarAndFileDrop(
  e: DragEvent,
  canvasEl: HTMLElement,
  createElement: (type: ElementType, at?: { x: number; y: number }) => string | null,
  updateElement: (id: string, patch: Partial<BoardElement>) => void,
): void {
  e.preventDefault();
  const dt = e.dataTransfer;
  if (!dt) return;
  const rect = canvasEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const typeRaw = dt.getData(UMBRA_TOOLBAR_DND_TYPE);
  const toolType = typeRaw ? parseToolbarDropType(typeRaw) : null;
  if (toolType) {
    createElement(toolType, { x, y });
    return;
  }

  const files = dt.files;
  if (files?.length) {
    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      const offsetX = fi * 30;
      const offsetY = fi * 30;
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        // Load image to get natural aspect ratio
        const img = new Image();
        img.onload = () => {
          const maxW = 400;
          const ratio = img.naturalHeight / img.naturalWidth;
          const w = Math.min(img.naturalWidth, maxW);
          const h = Math.round(w * ratio);
          const id = createElement("image", { x: x + offsetX, y: y + offsetY });
          if (id) {
            updateElement(id, {
              assetPath: url,
              content: url,
              fileName: file.name,
              mimeType: file.type,
              width: w,
              height: h,
              aspectRatio: ratio,
            });
          }
        };
        img.src = url;
      } else {
        // Non-image file (doc, pdf, etc)
        const id = createElement("file", { x: x + offsetX, y: y + offsetY });
        if (id) {
          updateElement(id, {
            fileName: file.name,
            mimeType: file.type,
            content: file.name,
          });
        }
      }
    }
  }
}
