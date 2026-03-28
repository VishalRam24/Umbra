import { useEffect } from "react";
import { useBoardStore } from "@/store/useBoardStore";
import type { ElementType } from "@/types/elements";

/** Max time between two spacebar presses to count as double-tap (ms) */
const DOUBLE_SPACE_THRESHOLD = 350;

/** Single-key → element type mappings (active when not editing text) */
const ELEMENT_KEYS: Record<string, ElementType> = {
  n: "note",
  t: "text",
  b: "board",
  g: "table",
  l: "link",
  f: "checklist",
};

export function useKeyboardShortcuts() {
  useEffect(() => {
    let lastSpaceTime = 0;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;

      const s = useBoardStore.getState();
      const meta = e.metaKey || e.ctrlKey;

      // Double-spacebar — fit all elements in view (not in editing mode)
      if (e.key === " " && !isEditing && !meta) {
        const now = Date.now();
        if (now - lastSpaceTime < DOUBLE_SPACE_THRESHOLD) {
          e.preventDefault();
          lastSpaceTime = 0;
          // Find canvas dimensions from the DOM
          const canvasEl = document.querySelector(".canvas-bg");
          if (canvasEl) {
            const rect = canvasEl.getBoundingClientRect();
            s.fitToFrame(rect.width, rect.height);
          }
          return;
        }
        lastSpaceTime = now;
        // Don't return — let single space fall through for pan mode
      }

      // Delete / Backspace — delete selected elements (only when not editing text)
      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing) {
        if (s.selectedElementIds.length > 0) {
          e.preventDefault();
          s.deleteSelected();
        }
        return;
      }

      // Escape — deselect, exit modes, cancel pending element
      if (e.key === "Escape") {
        s.setSelectedElement(null);
        s.setPendingElementType(null);
        s.setDrawingMode(false);
        s.setConnectMode(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      // Cmd+A — select all (not in editing mode)
      if (meta && e.key === "a" && !isEditing) {
        e.preventDefault();
        s.selectAll();
        return;
      }

      // Cmd+C — copy selected
      if (meta && e.key === "c" && !isEditing) {
        e.preventDefault();
        s.copySelected();
        return;
      }

      // Cmd+V — paste
      if (meta && e.key === "v" && !isEditing) {
        e.preventDefault();
        s.pasteClipboard();
        return;
      }

      // Cmd+G — group selected into a board
      if (meta && e.key === "g" && !isEditing) {
        e.preventDefault();
        s.groupIntoBoard();
        return;
      }

      // Arrow keys — nudge selected elements (only when not editing)
      if (!isEditing && s.selectedElementIds.length > 0 && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        s.pushUndo();
        const step = e.shiftKey ? 50 : 10;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        for (const id of s.selectedElementIds) {
          const el = s.elements[id];
          if (!el) continue;
          s.updateElement(id, {
            position: { x: el.position.x + dx, y: el.position.y + dy },
          });
        }
        return;
      }

      // Cmd+D — duplicate selected elements
      if (meta && e.key === "d" && !isEditing) {
        e.preventDefault();
        if (s.selectedElementIds.length === 0) return;
        s.pushUndo();
        const newIds: string[] = [];
        for (const id of s.selectedElementIds) {
          const el = s.elements[id];
          if (!el) continue;
          const newId = s.createElement(el.type, {
            x: el.position.x + el.width + 20,
            y: el.position.y,
          });
          if (newId) {
            s.updateElement(newId, {
              content: el.content,
              color: el.color,
              width: el.width,
              height: el.height,
            });
            newIds.push(newId);
          }
        }
        if (newIds.length > 0) {
          useBoardStore.getState().setSelectedElements(newIds);
        }
        return;
      }

      // Cmd+Z — undo
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        s.undo();
        return;
      }

      // Cmd+Shift+Z — redo
      if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        s.redo();
        return;
      }

      // --- Single-key shortcuts (only when not editing and no meta key) ---
      if (isEditing || meta) return;

      const key = e.key.toLowerCase();

      // V — select mode: deselect, exit all modes
      if (key === "v") {
        e.preventDefault();
        s.setSelectedElement(null);
        s.setPendingElementType(null);
        s.setDrawingMode(false);
        s.setConnectMode(false);
        s.setSelectedConnector(null);
        return;
      }

      // C — connect mode
      if (key === "c") {
        e.preventDefault();
        s.setConnectMode(!s.connectMode);
        s.setPendingElementType(null);
        return;
      }

      // D — drawing mode
      if (key === "d") {
        e.preventDefault();
        s.setDrawingMode(!s.drawingMode);
        s.setPendingElementType(null);
        return;
      }

      // [ — send backward
      if (key === "[") {
        e.preventDefault();
        if (s.selectedElementIds.length === 1) {
          s.sendBackward(s.selectedElementIds[0]);
        }
        return;
      }

      // ] — bring forward
      if (key === "]") {
        e.preventDefault();
        if (s.selectedElementIds.length === 1) {
          s.bringForward(s.selectedElementIds[0]);
        }
        return;
      }

      // Element creation keys: N, T, B, G, L, F
      const elementType = ELEMENT_KEYS[key];
      if (elementType) {
        e.preventDefault();
        s.setDrawingMode(false);
        s.setConnectMode(false);
        s.setPendingElementType(elementType);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
