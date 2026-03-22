import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import CanvasElementCard from "@/features/elements/CanvasElementCard";
import ContextMenu from "@/features/canvas/ContextMenu";
import { connectorPath, sideAnchor, elementRect, allAnchors } from "@/features/canvas/connectorGeometry";
import type { Side } from "@/features/canvas/connectorGeometry";
import {
  canvasDragOverAllowsDrop,
  handleCanvasToolbarAndFileDrop,
} from "@/lib/canvasDnD";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { useBoardStore } from "@/store/useBoardStore";
import type { ElementType } from "@/types/elements";
import { isTauri, importAsset } from "@/lib/desktopApi";

interface MarqueeRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/** Check if a line segment (p1→p2) intersects an axis-aligned rectangle */
function lineIntersectsRect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  minX: number, minY: number, maxX: number, maxY: number,
): boolean {
  // Cohen–Sutherland style: check if line crosses any of the 4 rect edges
  const segIntersect = (
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, dx: number, dy: number,
  ): boolean => {
    const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
    const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    if (d1 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) return true;
    if (d2 === 0 && onSegment(cx, cy, dx, dy, bx, by)) return true;
    if (d3 === 0 && onSegment(ax, ay, bx, by, cx, cy)) return true;
    if (d4 === 0 && onSegment(ax, ay, bx, by, dx, dy)) return true;
    return false;
  };
  const onSegment = (sx: number, sy: number, ex: number, ey: number, px: number, py: number) =>
    px >= Math.min(sx, ex) && px <= Math.max(sx, ex) && py >= Math.min(sy, ey) && py <= Math.max(sy, ey);

  // Test against all 4 edges
  return (
    segIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, maxX, minY) || // top
    segIntersect(p1.x, p1.y, p2.x, p2.y, maxX, minY, maxX, maxY) || // right
    segIntersect(p1.x, p1.y, p2.x, p2.y, minX, maxY, maxX, maxY) || // bottom
    segIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, minX, maxY)    // left
  );
}

export default function InfiniteCanvas() {
  const viewport = useBoardStore((s) => s.viewport);
  const setViewport = useBoardStore((s) => s.setViewport);
  const elements = useBoardStore((s) => s.elements);
  const currentBoardId = useBoardStore((s) => s.currentBoardId);
  const createElement = useBoardStore((s) => s.createElement);
  const updateElement = useBoardStore((s) => s.updateElement);
  const selectedElementId = useBoardStore((s) => s.selectedElementId);
  const setSelectedElement = useBoardStore((s) => s.setSelectedElement);
  const setSelectedElements = useBoardStore((s) => s.setSelectedElements);
  const addToSelection = useBoardStore((s) => s.addToSelection);
  const selectedElementIds = useBoardStore((s) => s.selectedElementIds);
  const drawingMode = useBoardStore((s) => s.drawingMode);
  const drawingColor = useBoardStore((s) => s.drawingColor);
  const drawingThickness = useBoardStore((s) => s.drawingThickness);
  const connectMode = useBoardStore((s) => s.connectMode);
  const connectorStyle = useBoardStore((s) => s.connectorStyle);
  const createConnector = useBoardStore((s) => s.createConnector);
  const deleteElement = useBoardStore((s) => s.deleteElement);
  const selectedConnectorId = useBoardStore((s) => s.selectedConnectorId);
  const setSelectedConnector = useBoardStore((s) => s.setSelectedConnector);

  useKeyboardShortcuts();

  const visible = useMemo(() => {
    if (currentBoardId === null) return [];
    return Object.values(elements).filter((e) => e.parentBoardId === currentBoardId);
  }, [elements, currentBoardId]);

  const fitToFrame = useBoardStore((s) => s.fitToFrame);

  const canvasRootRef = useRef<HTMLDivElement>(null);
  const panning = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const spaceHeld = useRef(false);
  const lastSpaceTap = useRef(0);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string | null;
  } | null>(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeRef = useRef<MarqueeRect | null>(null);

  // Drawing state — accumulates points while pointer is down in drawing mode
  const drawingPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [activeDrawPath, setActiveDrawPath] = useState<string | null>(null);
  const drawingActiveRef = useRef(false);

  // Connect mode state
  const [connectDrag, setConnectDrag] = useState<{
    fromId: string;
    fromSide: Side;
    fromPt: { x: number; y: number };
    currentPt: { x: number; y: number };
    snapTo: { elementId: string; side: Side; pt: { x: number; y: number } } | null;
  } | null>(null);
  const connectDragRef = useRef(connectDrag);
  connectDragRef.current = connectDrag;
  const [hoveredConnectorId, setHoveredConnectorId] = useState<string | null>(null);

  // Space key for pan mode + double-tap spacebar for fit-to-frame
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();

        // Detect double-tap spacebar (two presses within 400ms)
        const now = Date.now();
        if (now - lastSpaceTap.current < 400) {
          // Double-tap spacebar → fit to frame
          lastSpaceTap.current = 0;
          const el = canvasRootRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            fitToFrame(rect.width, rect.height);
          }
          return;
        }
        lastSpaceTap.current = now;

        spaceHeld.current = true;
        canvasRootRef.current?.classList.add("cursor-grab");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        canvasRootRef.current?.classList.remove("cursor-grab", "cursor-grabbing");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Wheel handler as a ref-stable callback (used by native addEventListener)
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const setViewportRef = useRef(setViewport);
  setViewportRef.current = setViewport;

  // Attach wheel listener with { passive: false } — this is critical for
  // WKWebView (Tauri) where React's onWheel is passive and ignores preventDefault().
  useEffect(() => {
    const el = canvasRootRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x: vx, y: vy, scale } = viewportRef.current;

      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldX = (mx - vx) / scale;
        const worldY = (my - vy) / scale;
        const zoomIntensity = 0.008;
        const delta = -e.deltaY * zoomIntensity;
        const nextScale = Math.min(3, Math.max(0.1, scale * (1 + delta)));
        const nx = mx - worldX * nextScale;
        const ny = my - worldY * nextScale;
        setViewportRef.current({ x: nx, y: ny, scale: nextScale });
      } else {
        setViewportRef.current({
          x: vx - e.deltaX,
          y: vy - e.deltaY,
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Listen for the custom pointer-based toolbar drop event (works in Tauri WKWebView)
  const createElementRef = useRef(createElement);
  createElementRef.current = createElement;
  const updateElementRef = useRef(updateElement);
  updateElementRef.current = updateElement;

  useEffect(() => {
    const el = canvasRootRef.current;
    if (!el) return;

    const handleToolbarDrop = (e: Event) => {
      const { elementType, clientX, clientY } = (e as CustomEvent).detail as {
        elementType: ElementType;
        clientX: number;
        clientY: number;
      };
      const rect = el.getBoundingClientRect();
      // Only accept drops that land inside the canvas
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        createElementRef.current(elementType, {
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      }
    };

    window.addEventListener("umbra-toolbar-drop", handleToolbarDrop);
    return () => window.removeEventListener("umbra-toolbar-drop", handleToolbarDrop);
  }, []);

  // Tauri-native file drop handler — receives actual file paths from OS
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const { convertFileSrc } = await import("@tauri-apps/api/core");
        if (cancelled) return; // Effect was cleaned up before async resolved

        unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (cancelled) return;
          if (event.payload.type !== "drop") return;
          const { paths, position } = event.payload;
          const el = canvasRootRef.current;
          if (!el || !paths.length) return;

          const rect = el.getBoundingClientRect();
          // Tauri gives physical pixels; convert to CSS pixels
          const dpr = window.devicePixelRatio || 1;
          const x = position.x / dpr - rect.left;
          const y = position.y / dpr - rect.top;

          for (let i = 0; i < paths.length; i++) {
            const filePath = paths[i];
            const fileName = filePath.split("/").pop() || "file";
            const ext = fileName.split(".").pop()?.toLowerCase() || "";
            const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tiff", "tif", "heic", "heif", "avif"].includes(ext);
            const isPdf = ext === "pdf";
            const isAudio = ["mp3", "wav", "ogg", "aac", "flac", "m4a", "wma", "opus", "aiff"].includes(ext);
            const isVideo = ["mp4", "webm", "mov", "avi", "mkv", "m4v", "ogv", "wmv"].includes(ext);
            const offsetX = i * 30;
            const offsetY = i * 30;

            try {
              // Copy file to app's asset directory for persistence
              const asset = await importAsset(filePath, fileName);
              const assetUrl = convertFileSrc(asset.path);

              if (isImage) {
                // Load image to get dimensions
                const img = new Image();
                img.onload = () => {
                  const maxW = 400;
                  const ratio = img.naturalHeight / img.naturalWidth;
                  const w = Math.min(img.naturalWidth, maxW);
                  const h = Math.round(w * ratio);
                  const id = createElementRef.current("image", { x: x + offsetX, y: y + offsetY });
                  if (id) {
                    updateElementRef.current(id, {
                      assetPath: assetUrl,
                      content: assetUrl,
                      fileName,
                      mimeType: `image/${ext === "jpg" ? "jpeg" : ext}`,
                      width: w,
                      height: h,
                      aspectRatio: ratio,
                      assetLocalPath: asset.path,
                    });
                  }
                };
                img.src = assetUrl;
              } else if (isPdf) {
                const id = createElementRef.current("document", { x: x + offsetX, y: y + offsetY });
                if (id) {
                  updateElementRef.current(id, {
                    fileName,
                    mimeType: "application/pdf",
                    content: fileName,
                    assetPath: assetUrl,
                    assetLocalPath: asset.path,
                    width: 280,
                    height: 360,
                  });
                }
              } else if (isAudio) {
                const id = createElementRef.current("file", { x: x + offsetX, y: y + offsetY });
                if (id) {
                  updateElementRef.current(id, {
                    fileName,
                    mimeType: `audio/${ext === "mp3" ? "mpeg" : ext}`,
                    content: fileName,
                    assetPath: assetUrl,
                    assetLocalPath: asset.path,
                    width: 300,
                    height: 120,
                  });
                }
              } else if (isVideo) {
                const id = createElementRef.current("file", { x: x + offsetX, y: y + offsetY });
                if (id) {
                  updateElementRef.current(id, {
                    fileName,
                    mimeType: `video/${ext === "mov" ? "quicktime" : ext}`,
                    content: fileName,
                    assetPath: assetUrl,
                    assetLocalPath: asset.path,
                    width: 400,
                    height: 280,
                  });
                }
              } else {
                const id = createElementRef.current("file", { x: x + offsetX, y: y + offsetY });
                if (id) {
                  updateElementRef.current(id, {
                    fileName,
                    mimeType: `application/${ext}`,
                    content: fileName,
                    assetPath: assetUrl,
                    assetLocalPath: asset.path,
                  });
                }
              }
            } catch (err) {
              console.error("Failed to import dropped file:", err);
            }
          }
        });
      } catch (err) {
        console.error("Failed to set up Tauri drag-drop listener:", err);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Close context menu on any click
      if (contextMenu) {
        setContextMenu(null);
        return;
      }

      // Middle-click, Alt+click, or Space+click = pan
      if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && spaceHeld.current)) {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        panning.current = {
          x: e.clientX,
          y: e.clientY,
          vx: viewport.x,
          vy: viewport.y,
        };
        canvasRootRef.current?.classList.add("cursor-grabbing");
        return;
      }

      const target = e.target as HTMLElement;
      const isCanvasBg = target === e.currentTarget || target.parentElement === e.currentTarget;

      // Connect mode — clicking on canvas background clears connector selection
      if (connectMode && e.button === 0 && isCanvasBg) {
        setSelectedConnector(null);
        return;
      }

      // Drawing mode — start capturing freehand stroke (anywhere on canvas)
      if (drawingMode && e.button === 0) {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        const rect = canvasRootRef.current!.getBoundingClientRect();
        const { x: vx, y: vy, scale } = viewport;
        const wx = (e.clientX - rect.left - vx) / scale;
        const wy = (e.clientY - rect.top - vy) / scale;
        drawingPointsRef.current = [{ x: wx, y: wy }];
        drawingActiveRef.current = true;
        setActiveDrawPath(`M${wx.toFixed(1)},${wy.toFixed(1)}`);
        return;
      }

      // Left-click on empty canvas = start marquee or deselect
      if (e.button === 0 && isCanvasBg) {
        if (!e.shiftKey) {
          setSelectedElement(null);
        }
        // Start marquee selection
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        const rect = { startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY };
        marqueeRef.current = rect;
        setMarquee(rect);
      }
    },
    [setSelectedElement, viewport.x, viewport.y, viewport.scale, contextMenu, drawingMode, connectMode],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Panning
      const p = panning.current;
      if (p) {
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        setViewport({ x: p.vx + dx, y: p.vy + dy });
        return;
      }

      // Connect drag — update line endpoint and check for snap
      if (connectDragRef.current) {
        const rect = canvasRootRef.current!.getBoundingClientRect();
        const { x: vx, y: vy, scale } = viewport;
        const wx = (e.clientX - rect.left - vx) / scale;
        const wy = (e.clientY - rect.top - vy) / scale;

        // Check snap to nearby connection points — use screen-space distance for consistent feel
        const SNAP_SCREEN_PX = 60;
        const snapDist = SNAP_SCREEN_PX / viewport.scale;
        let snap: typeof connectDragRef.current.snapTo = null;
        let bestDist = Infinity;
        const nonArrows = visible.filter((el) => el.type !== "arrow" && el.type !== "drawing" && el.id !== connectDragRef.current!.fromId);
        for (const el of nonArrows) {
          for (const anchor of allAnchors(el)) {
            const d = Math.hypot(anchor.x - wx, anchor.y - wy);
            if (d < snapDist && d < bestDist) {
              bestDist = d;
              snap = { elementId: el.id, side: anchor.side, pt: { x: anchor.x, y: anchor.y } };
            }
          }
        }

        setConnectDrag({
          ...connectDragRef.current!,
          currentPt: snap ? snap.pt : { x: wx, y: wy },
          snapTo: snap,
        });
        return;
      }

      // Drawing — accumulate stroke points
      if (drawingActiveRef.current) {
        const rect = canvasRootRef.current!.getBoundingClientRect();
        const { x: vx, y: vy, scale } = viewport;
        const wx = (e.clientX - rect.left - vx) / scale;
        const wy = (e.clientY - rect.top - vy) / scale;
        drawingPointsRef.current.push({ x: wx, y: wy });
        // Build SVG path string from all points
        const pts = drawingPointsRef.current;
        let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < pts.length; i++) {
          d += `L${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
        }
        setActiveDrawPath(d);
        return;
      }

      // Marquee drag
      const m = marqueeRef.current;
      if (m) {
        const updated = { ...m, currentX: e.clientX, currentY: e.clientY };
        marqueeRef.current = updated;
        setMarquee(updated);
      }
    },
    [setViewport, viewport, visible],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      // End panning
      if (panning.current) {
        panning.current = null;
        canvasRootRef.current?.classList.remove("cursor-grabbing");
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch { /* */ }
        return;
      }

      // End connect drag — create connector if snapped
      if (connectDragRef.current) {
        const drag = connectDragRef.current;
        if (drag.snapTo) {
          createConnector(drag.fromId, drag.fromSide, drag.snapTo.elementId, drag.snapTo.side);
        }
        setConnectDrag(null);
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch { /* */ }
        return;
      }

      // End drawing — create a drawing element from the captured stroke
      if (drawingActiveRef.current) {
        drawingActiveRef.current = false;
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch { /* */ }
        const pts = drawingPointsRef.current;
        if (pts.length < 2) {
          setActiveDrawPath(null);
          drawingPointsRef.current = [];
          return;
        }
        // Compute bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        const padding = 10;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;
        const w = Math.max(20, maxX - minX);
        const h = Math.max(20, maxY - minY);
        // Normalize points relative to bounding box origin
        let d = `M${(pts[0].x - minX).toFixed(1)},${(pts[0].y - minY).toFixed(1)}`;
        for (let i = 1; i < pts.length; i++) {
          d += `L${(pts[i].x - minX).toFixed(1)},${(pts[i].y - minY).toFixed(1)}`;
        }
        // Create drawing element — pass screen-relative coords so createElement converts correctly
        // createElement expects: worldX = snapToGrid((screenX - vx) / scale)
        // We want worldX = minX, so screenX = minX * scale + vx
        const screenX = minX * viewport.scale + viewport.x;
        const screenY = minY * viewport.scale + viewport.y;
        const id = createElement("drawing", { x: screenX, y: screenY });
        if (id) {
          updateElement(id, {
            width: Math.round(w),
            height: Math.round(h),
            drawingPath: d,
            drawingColor,
            drawingThickness,
          });
          // Deselect so user can continue drawing more strokes
          setSelectedElement(null);
        }
        setActiveDrawPath(null);
        drawingPointsRef.current = [];
        return;
      }

      // End marquee
      const m = marqueeRef.current;
      if (m) {
        marqueeRef.current = null;
        setMarquee(null);
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch { /* */ }

        // Calculate marquee bounds in screen coords
        const rect = canvasRootRef.current?.getBoundingClientRect();
        if (!rect) return;
        const minX = Math.min(m.startX, m.currentX) - rect.left;
        const maxX = Math.max(m.startX, m.currentX) - rect.left;
        const minY = Math.min(m.startY, m.currentY) - rect.top;
        const maxY = Math.max(m.startY, m.currentY) - rect.top;

        // Only select if marquee was actually dragged (not just a click)
        if (Math.abs(m.currentX - m.startX) < 5 && Math.abs(m.currentY - m.startY) < 5) return;

        // Convert screen rect to world coords
        const { x: vx, y: vy, scale } = viewport;
        const wMinX = (minX - vx) / scale;
        const wMaxX = (maxX - vx) / scale;
        const wMinY = (minY - vy) / scale;
        const wMaxY = (maxY - vy) / scale;

        // Find elements within marquee
        const selected = visible
          .filter((el) => el.type !== "arrow")
          .filter((el) => {
            const ex = el.position.x;
            const ey = el.position.y;
            const ew = el.width;
            const eh = el.height;
            // Element intersects marquee
            return ex + ew > wMinX && ex < wMaxX && ey + eh > wMinY && ey < wMaxY;
          })
          .map((el) => el.id);

        // Find connectors within marquee (line segment intersects marquee rect)
        const selectedArrows = arrows.filter((a) => {
          const from = elements[a.linkFromId!];
          const to = elements[a.linkToId!];
          if (!from || !to) return false;
          const fromSide = (a.linkFromSide || "right") as Side;
          const toSide = (a.linkToSide || "left") as Side;
          const fPt = sideAnchor(elementRect(from), fromSide);
          const tPt = sideAnchor(elementRect(to), toSide);
          // Check if either endpoint is inside
          const fIn = fPt.x >= wMinX && fPt.x <= wMaxX && fPt.y >= wMinY && fPt.y <= wMaxY;
          const tIn = tPt.x >= wMinX && tPt.x <= wMaxX && tPt.y >= wMinY && tPt.y <= wMaxY;
          if (fIn || tIn) return true;
          // Check if line segment intersects any edge of the marquee rect
          return lineIntersectsRect(fPt, tPt, wMinX, wMinY, wMaxX, wMaxY);
        });

        const allSelected = [...selected, ...selectedArrows.map((a) => a.id)];
        if (allSelected.length > 0) {
          setSelectedElements(allSelected);
        }
      }
    },
    [viewport, visible, setSelectedElements, createElement, updateElement, drawingColor, drawingThickness, createConnector],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (drawingMode || connectMode) return; // No note creation while drawing/connecting
      const target = e.target as HTMLElement;
      // Allow double-click on the canvas root or its direct transform wrapper child
      if (target !== e.currentTarget && target.parentElement !== e.currentTarget) return;
      const rect = e.currentTarget.getBoundingClientRect();
      createElement("note", {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [createElement, drawingMode],
  );

  // Right-click context menu
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const cardEl = target.closest("[data-canvas-element]");
      const elementId = cardEl ? findElementIdFromDom(cardEl as HTMLElement, visible) : null;

      if (elementId) {
        setSelectedElement(elementId);
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        elementId: elementId || selectedElementId,
      });
    },
    [visible, selectedElementId, setSelectedElement],
  );

  const onCanvasDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!canvasDragOverAllowsDrop(e)) return;
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt) dt.dropEffect = "copy";
  }, []);

  const onCanvasDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      const root = canvasRootRef.current;
      if (!root) return;
      handleCanvasToolbarAndFileDrop(
        e.nativeEvent,
        root,
        createElement,
        updateElement,
      );
    },
    [createElement, updateElement],
  );

  const handleContextCreateNote = useCallback(
    (cx: number, cy: number) => {
      const root = canvasRootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      createElement("note", { x: cx - rect.left, y: cy - rect.top });
    },
    [createElement],
  );

  // Handle shift+click on cards for multi-select
  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string) => {
      if (e.shiftKey) {
        e.stopPropagation();
        if (selectedElementIds.includes(elementId)) {
          // Remove from selection
          const store = useBoardStore.getState();
          store.removeFromSelection(elementId);
        } else {
          addToSelection(elementId);
        }
      }
    },
    [selectedElementIds, addToSelection],
  );

  const arrows = visible.filter((el) => el.type === "arrow" && el.linkFromId && el.linkToId);

  // Handler: start dragging from a connection point
  const onAnchorPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string, side: Side, anchorPt: { x: number; y: number }) => {
      e.stopPropagation();
      e.preventDefault();
      const rootEl = canvasRootRef.current;
      if (rootEl) {
        rootEl.setPointerCapture(e.pointerId);
      }
      setConnectDrag({
        fromId: elementId,
        fromSide: side,
        fromPt: anchorPt,
        currentPt: anchorPt,
        snapTo: null,
      });
    },
    [],
  );

  // Handle click on a connector for selection
  const onConnectorClick = useCallback(
    (e: React.MouseEvent, connectorId: string) => {
      e.stopPropagation();
      setSelectedConnector(selectedConnectorId === connectorId ? null : connectorId);
    },
    [selectedConnectorId, setSelectedConnector],
  );

  // Delete selected connector on Delete/Backspace
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedConnectorId) return;
      const t = e.target as HTMLElement;
      const isEditing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable;
      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing) {
        e.preventDefault();
        deleteElement(selectedConnectorId);
        setSelectedConnector(null);
      }
      if (e.key === "Escape") {
        setSelectedConnector(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedConnectorId, deleteElement]);

  // Compute marquee rect for rendering
  const marqueeStyle = marquee ? {
    left: Math.min(marquee.startX, marquee.currentX),
    top: Math.min(marquee.startY, marquee.currentY),
    width: Math.abs(marquee.currentX - marquee.startX),
    height: Math.abs(marquee.currentY - marquee.startY),
  } : null;

  return (
    <div
      ref={canvasRootRef}
      className={`absolute inset-0 min-w-0 overflow-hidden canvas-bg${drawingMode ? " cursor-crosshair" : connectMode ? " cursor-crosshair" : ""}`}
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255, 255, 255, 0.13) 1.5px, transparent 1.5px)",
        backgroundSize: `${40 * viewport.scale}px ${40 * viewport.scale}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragOver={onCanvasDragOver}
      onDrop={onCanvasDrop}
    >
      <div
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        {/* Connector lines */}
        <svg
          className="absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1, pointerEvents: "none" }}
        >
          {arrows.map((a) => {
            const from = elements[a.linkFromId!];
            const to = elements[a.linkToId!];
            if (!from || !to) return null;
            const fromSide = (a.linkFromSide || "right") as Side;
            const toSide = (a.linkToSide || "left") as Side;
            const fromPt = sideAnchor(elementRect(from), fromSide);
            const toPt = sideAnchor(elementRect(to), toSide);
            const mode = a.connectorMode || "straight";
            const d = connectorPath(fromPt, toPt, fromSide, toSide, mode);
            const isSelected = selectedConnectorId === a.id || selectedElementIds.includes(a.id);
            const isHovered = hoveredConnectorId === a.id;
            const lineColor = a.connectorColor || "rgba(255,255,255,0.15)";
            const lineThickness = a.connectorThickness || 1.5;
            const displayColor = isSelected ? "#4a9eff" : isHovered ? "rgba(255,255,255,0.35)" : lineColor;
            const displayWidth = (isSelected ? Math.max(lineThickness, 2.5) : lineThickness) / viewport.scale;
            return (
              <g key={a.id}>
                {/* Fat invisible hit area for clicking */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12 / viewport.scale}
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onClick={(ev) => onConnectorClick(ev, a.id)}
                  onMouseEnter={() => setHoveredConnectorId(a.id)}
                  onMouseLeave={() => setHoveredConnectorId(null)}
                />
                {/* Visible line */}
                <path
                  d={d}
                  fill="none"
                  stroke={displayColor}
                  strokeWidth={displayWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: "none", transition: "stroke 0.15s, stroke-width 0.15s" }}
                />
                {/* Arrowhead */}
                {(() => {
                  const headSize = 8 / viewport.scale;
                  const angle = Math.atan2(
                    toPt.y - (mode === "straight" ? fromPt.y : toPt.y - (toSide === "top" ? -1 : toSide === "bottom" ? 1 : 0) * 20),
                    toPt.x - (mode === "straight" ? fromPt.x : toPt.x - (toSide === "left" ? -1 : toSide === "right" ? 1 : 0) * 20),
                  );
                  const x1 = toPt.x - headSize * Math.cos(angle - Math.PI / 6);
                  const y1 = toPt.y - headSize * Math.sin(angle - Math.PI / 6);
                  const x2 = toPt.x - headSize * Math.cos(angle + Math.PI / 6);
                  const y2 = toPt.y - headSize * Math.sin(angle + Math.PI / 6);
                  return (
                    <polygon
                      points={`${toPt.x},${toPt.y} ${x1},${y1} ${x2},${y2}`}
                      fill={displayColor}
                      style={{ pointerEvents: "none", transition: "fill 0.15s" }}
                    />
                  );
                })()}
              </g>
            );
          })}

          {/* Active connect drag line */}
          {connectDrag && (() => {
            const d = connectorPath(
              connectDrag.fromPt,
              connectDrag.currentPt,
              connectDrag.fromSide,
              connectDrag.snapTo?.side || "left",
              connectorStyle,
            );
            return (
              <>
                <path
                  d={d}
                  fill="none"
                  stroke={connectDrag.snapTo ? "#4a9eff" : "rgba(255,255,255,0.4)"}
                  strokeWidth={2 / viewport.scale}
                  strokeLinecap="round"
                  strokeDasharray={connectDrag.snapTo ? "none" : `${6 / viewport.scale}`}
                  style={{ pointerEvents: "none" }}
                />
                {/* Snap indicator dot */}
                {connectDrag.snapTo && (
                  <circle
                    cx={connectDrag.snapTo.pt.x}
                    cy={connectDrag.snapTo.pt.y}
                    r={5 / viewport.scale}
                    fill="#4a9eff"
                    style={{ pointerEvents: "none" }}
                  />
                )}
              </>
            );
          })()}
        </svg>

        {/* Connection point indicators in connect mode */}
        {connectMode && !connectDrag && visible
          .filter((el) => el.type !== "arrow" && el.type !== "drawing")
          .map((el) =>
            allAnchors(el).map((anchor) => (
              <div
                key={`${el.id}-${anchor.side}`}
                className="absolute z-10"
                style={{
                  left: anchor.x - 8,
                  top: anchor.y - 8,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "rgba(74, 158, 255, 0.7)",
                  border: "2px solid #4a9eff",
                  cursor: "crosshair",
                  transition: "transform 0.1s, background 0.1s",
                  pointerEvents: "auto",
                }}
                onPointerDown={(e) => onAnchorPointerDown(e, el.id, anchor.side, { x: anchor.x, y: anchor.y })}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.5)";
                  (e.currentTarget as HTMLElement).style.background = "#4a9eff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(74, 158, 255, 0.7)";
                }}
              />
            )),
          )}

        {/* Elements */}
        {visible
          .filter((el) => el.type !== "arrow")
          .map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => handleCardPointerDown(e, el.id)}
            >
              <CanvasElementCard
                element={el}
                scale={viewport.scale}
                onCanvasDragOver={onCanvasDragOver}
                onCanvasDrop={onCanvasDrop}
              />
            </div>
          ))}

        {/* Active drawing stroke (while pointer is down) */}
        {activeDrawPath && (
          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: 0, top: 0, width: 1, height: 1 }}
          >
            <path
              d={activeDrawPath}
              fill="none"
              stroke={drawingColor}
              strokeWidth={drawingThickness}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Marquee selection rectangle */}
      {marqueeStyle && marqueeStyle.width > 3 && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            ...marqueeStyle,
            border: "1px solid rgba(74, 158, 255, 0.5)",
            backgroundColor: "rgba(74, 158, 255, 0.08)",
            borderRadius: 2,
          }}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          onClose={() => setContextMenu(null)}
          onCreateNote={handleContextCreateNote}
        />
      )}
    </div>
  );
}

/** Find the element ID from a DOM node by matching position */
function findElementIdFromDom(
  domEl: HTMLElement,
  visible: { id: string; position: { x: number; y: number } }[],
): string | null {
  const left = parseFloat(domEl.style.left || "");
  const top = parseFloat(domEl.style.top || "");
  if (isNaN(left) || isNaN(top)) return null;
  const match = visible.find(
    (el) => Math.abs(el.position.x - left) < 1 && Math.abs(el.position.y - top) < 1,
  );
  return match?.id ?? null;
}
