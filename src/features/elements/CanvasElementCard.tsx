import React, { useCallback, useEffect, useRef, useState } from "react";

import type { BoardElement } from "@/types/elements";
import { NOTE_COLORS } from "@/types/elements";
import { useBoardStore } from "@/store/useBoardStore";
import { fetchLinkMeta, isTauri } from "@/lib/desktopApi";

interface Props {
  element: BoardElement;
  scale: number;
  onCanvasDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onCanvasDrop: (e: React.DragEvent<HTMLElement>) => void;
}

/* ---------- PDF Preview ---------- */
function PdfPreview({ assetLocalPath }: { assetLocalPath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetLocalPath) return;
    if (isTauri) {
      import("@tauri-apps/api/core").then(({ convertFileSrc }) => {
        setUrl(convertFileSrc(assetLocalPath));
      });
    }
  }, [assetLocalPath]);

  if (!url) {
    return (
      <div className="flex-1 px-4 py-3 flex flex-col gap-2 overflow-hidden">
        <div className="h-2 bg-white/8 rounded w-full animate-pulse" />
        <div className="h-2 bg-white/6 rounded w-11/12 animate-pulse" />
        <div className="h-2 bg-white/8 rounded w-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
      <iframe
        src={url}
        className="w-full h-full border-0"
        title="PDF preview"
        style={{ background: "#fff" }}
      />
    </div>
  );
}

/* ---------- Save As Button ---------- */
function SaveAsButton({ assetLocalPath, fileName }: { assetLocalPath?: string; fileName?: string }) {
  if (!assetLocalPath || !isTauri) return null;
  return (
    <button
      className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors shrink-0"
      title="Save to disk"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={async (e) => {
        e.stopPropagation();
        const { saveAssetAs } = await import("@/lib/desktopApi");
        await saveAssetAs(assetLocalPath, fileName || "file");
      }}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}

/* ---------- Media Player (Audio/Video) ---------- */
function MediaPlayer({ assetLocalPath, type }: { assetLocalPath?: string; type: "audio" | "video" }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetLocalPath) return;
    if (isTauri) {
      import("@tauri-apps/api/core").then(({ convertFileSrc }) => {
        setUrl(convertFileSrc(assetLocalPath));
      });
    }
  }, [assetLocalPath]);

  if (!url) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20 text-[12px]">
        Loading...
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="flex-1 overflow-hidden bg-black" onPointerDown={(e) => e.stopPropagation()}>
        <video
          src={url}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <audio src={url} controls className="w-full" preload="metadata" style={{ height: 40 }} />
  );
}

/* ---------- Checklist Renderer ---------- */
function ChecklistRenderer({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusNextId = useRef<string | null>(null);

  let items: { id: string; text: string; done: boolean }[];
  try {
    items = JSON.parse(content);
    if (!Array.isArray(items)) items = [];
  } catch {
    items = [];
  }

  // Focus newly created item after render
  React.useEffect(() => {
    if (focusNextId.current) {
      const el = inputRefs.current[focusNextId.current];
      if (el) el.focus();
      focusNextId.current = null;
    }
  });

  const toggle = (idx: number) => {
    const next = items.map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    onChange(JSON.stringify(next));
  };

  const updateText = (idx: number, text: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, text } : it));
    onChange(JSON.stringify(next));
  };

  const insertItemAfter = (idx: number) => {
    const newItem = { id: `item_${Date.now()}`, text: "", done: false };
    const next = [...items];
    next.splice(idx + 1, 0, newItem);
    focusNextId.current = newItem.id;
    onChange(JSON.stringify(next));
  };

  const addItem = () => {
    const newItem = { id: `item_${Date.now()}`, text: "", done: false };
    const next = [...items, newItem];
    focusNextId.current = newItem.id;
    onChange(JSON.stringify(next));
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(JSON.stringify(next));
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      insertItemAfter(idx);
    }
    if (e.key === "Backspace" && items[idx].text === "" && items.length > 1) {
      e.preventDefault();
      removeItem(idx);
      // Focus previous item
      if (idx > 0) {
        const prevId = items[idx - 1].id;
        setTimeout(() => inputRefs.current[prevId]?.focus(), 0);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1 p-4">
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2.5 group/item min-h-[28px]">
          <button
            type="button"
            onClick={() => toggle(i)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
              item.done
                ? "bg-accent border-accent"
                : "border-white/25 hover:border-white/45"
            }`}
          >
            {item.done && (
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            )}
          </button>
          <input
            ref={(el) => { inputRefs.current[item.id] = el; }}
            className={`flex-1 bg-transparent text-[14px] focus:outline-none min-w-0 ${
              item.done ? "line-through text-white/30" : "text-white/80"
            }`}
            value={item.text}
            placeholder="Add a task..."
            onChange={(e) => updateText(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            onPointerDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover/item:opacity-50 hover:!opacity-100 text-white/40 text-[13px] shrink-0 w-5 h-5 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-[13px] text-white/25 hover:text-white/50 text-left mt-0.5 pl-[30px] transition-colors"
      >
        + Add to-do
      </button>
    </div>
  );
}

/* ---------- Table Renderer ---------- */
interface TableData {
  cells: string[][];
  cellStyles: Record<string, { bold?: boolean; italic?: boolean; strikethrough?: boolean; fontSize?: number }>;
}

function parseTableData(content: string): TableData {
  try {
    const parsed = JSON.parse(content);
    // Handle legacy format (plain 2D array)
    if (Array.isArray(parsed)) {
      return { cells: parsed, cellStyles: {} };
    }
    if (parsed.cells && Array.isArray(parsed.cells)) {
      return { cells: parsed.cells, cellStyles: parsed.cellStyles || {} };
    }
  } catch { /* */ }
  return { cells: [["", "", ""], ["", "", ""], ["", "", ""]], cellStyles: {} };
}

function TableRenderer({
  element,
  updateElement,
  editing,
  selected,
}: {
  element: BoardElement;
  updateElement: (id: string, patch: Partial<BoardElement>) => void;
  editing: boolean;
  selected: boolean;
}) {
  const data = parseTableData(element.content);
  const { cells, cellStyles } = data;
  const rows = cells.length;
  const cols = cells[0]?.length || 3;
  const cellH = element.tableCellHeight || 36;
  const shadeRow = element.tableShadeFirstRow ?? false;
  const shadeCol = element.tableShadeFirstCol ?? false;
  const showTitle = element.tableShowTitle ?? true;
  const title = element.tableTitle || "";

  const selectedCell = useBoardStore((s) => s.selectedTableCell);
  const setSelectedCell = useBoardStore((s) => s.setSelectedTableCell);

  const updateCells = (newCells: string[][]) => {
    updateElement(element.id, {
      content: JSON.stringify({ cells: newCells, cellStyles }),
    });
  };

  const updateCellStyle = (r: number, c: number, patch: Partial<TableData["cellStyles"][string]>) => {
    const key = `${r},${c}`;
    const existing = cellStyles[key] || {};
    const next = { ...cellStyles, [key]: { ...existing, ...patch } };
    updateElement(element.id, {
      content: JSON.stringify({ cells, cellStyles: next }),
    });
  };

  const setCellText = (r: number, c: number, text: string) => {
    const newCells = cells.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? text : cell)),
    );
    updateCells(newCells);
  };

  const titleH = showTitle ? 32 : 0;
  const COL_W = 120; // fixed column width

  // Auto-adjust rows/cols when element is resized — integral snapping
  useEffect(() => {
    const needCols = Math.max(1, Math.floor(element.width / COL_W));
    const needRows = Math.max(1, Math.floor((element.height - titleH) / cellH));
    if (needRows !== rows || needCols !== cols) {
      const newCells: string[][] = [];
      for (let r = 0; r < needRows; r++) {
        const row: string[] = [];
        for (let c = 0; c < needCols; c++) {
          row.push(cells[r]?.[c] ?? "");
        }
        newCells.push(row);
      }
      updateElement(element.id, {
        content: JSON.stringify({ cells: newCells, cellStyles }),
      });
    }
  }, [element.width, element.height, cellH]);

  const colW = element.width / cols;

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-[inherit]">
      {/* Title */}
      {showTitle && (
        <div className="shrink-0 px-3 flex items-center" style={{ height: titleH }}>
          {editing ? (
            <input
              className="w-full bg-transparent text-[13px] text-white/80 font-semibold focus:outline-none"
              value={title}
              placeholder="Table title..."
              onChange={(e) => updateElement(element.id, { tableTitle: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-[13px] text-white/80 font-semibold truncate">
              {title || <span className="text-white/20">Table title...</span>}
            </span>
          )}
        </div>
      )}

      {/* Table grid */}
      <div className="flex-1 overflow-hidden" style={showTitle ? { borderTop: "1px solid rgba(255,255,255,0.06)" } : undefined}>
        <table className="w-full h-full border-collapse" style={{ tableLayout: "fixed" }}>
          <tbody>
            {cells.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const isShaded =
                    (shadeRow && ri === 0) || (shadeCol && ci === 0);
                  const styleKey = `${ri},${ci}`;
                  const cs = cellStyles[styleKey];
                  const isSelected = selectedCell?.r === ri && selectedCell?.c === ci;

                  // Determine border colors — darker when adjacent to shaded areas
                  const borderRightColor =
                    (shadeCol && ci === 0) || (shadeRow && ri === 0)
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.06)";
                  const borderBottomColor =
                    (shadeRow && ri === 0) || (shadeCol && ci === 0)
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.06)";

                  return (
                    <td
                      key={ci}
                      data-table-cell
                      className="relative"
                      style={{
                        width: colW,
                        height: cellH,
                        backgroundColor: (editing || selected) && isSelected
                          ? "rgba(74, 158, 255, 0.12)"
                          : isShaded
                            ? "rgba(255,255,255,0.10)"
                            : "transparent",
                        borderRight: ci < cols - 1 ? `1px solid ${borderRightColor}` : undefined,
                        borderBottom: ri < rows - 1 ? `1px solid ${borderBottomColor}` : undefined,
                        boxShadow: (editing || selected) && isSelected
                          ? "inset 0 0 0 1.5px rgba(74, 158, 255, 0.5)"
                          : undefined,
                        padding: 0,
                      }}
                      onPointerDown={() => setSelectedCell({ r: ri, c: ci })}
                      onMouseDown={() => setSelectedCell({ r: ri, c: ci })}
                    >
                      {(editing || selected) && isSelected ? (
                        <input
                          className="w-full h-full px-2 bg-transparent focus:outline-none text-white/80"
                          style={{
                            fontSize: `${cs?.fontSize || element.textFontSize || 13}px`,
                            fontWeight: (cs?.bold ?? element.textBold) ? "bold" : undefined,
                            fontStyle: (cs?.italic ?? element.textItalic) ? "italic" : undefined,
                            textDecoration: (cs?.strikethrough ?? element.textStrikethrough) ? "line-through" : undefined,
                          }}
                          value={cell}
                          autoFocus
                          onChange={(e) => setCellText(ri, ci, e.target.value)}
                          onPointerDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Tab") {
                              e.preventDefault();
                              const nextC = e.shiftKey ? ci - 1 : ci + 1;
                              if (nextC >= 0 && nextC < cols) {
                                setSelectedCell({ r: ri, c: nextC });
                              } else if (!e.shiftKey && ri + 1 < rows) {
                                setSelectedCell({ r: ri + 1, c: 0 });
                              } else if (e.shiftKey && ri - 1 >= 0) {
                                setSelectedCell({ r: ri - 1, c: cols - 1 });
                              }
                            }
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (ri + 1 < rows) {
                                setSelectedCell({ r: ri + 1, c: ci });
                              }
                            }
                            if (e.key === "Escape") {
                              setSelectedCell(null);
                            }
                          }}
                        />
                      ) : (
                        <div
                          className="w-full h-full px-2 flex items-center truncate"
                          style={{
                            fontSize: `${cs?.fontSize || element.textFontSize || 13}px`,
                            fontWeight: (cs?.bold ?? element.textBold) ? "bold" : undefined,
                            fontStyle: (cs?.italic ?? element.textItalic) ? "italic" : undefined,
                            textDecoration: (cs?.strikethrough ?? element.textStrikethrough) ? "line-through" : undefined,
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          {cell}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Link Card with Preview ---------- */
function LinkCard({
  element,
  updateElement,
  editing,
}: {
  element: BoardElement;
  updateElement: (id: string, patch: Partial<BoardElement>) => void;
  editing: boolean;
}) {
  const lastFetchedUrl = useRef("");

  // Fetch link metadata when URL changes
  useEffect(() => {
    const url = element.content?.trim();
    if (!url || url === "https://" || url === lastFetchedUrl.current) return;
    // Only fetch if it looks like a valid URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) return;
    lastFetchedUrl.current = url;
    fetchLinkMeta(url).then((meta) => {
      if (meta) {
        updateElement(element.id, {
          linkTitle: meta.title,
          linkDescription: meta.description,
          linkImage: meta.image,
          linkFavicon: meta.favicon,
        });
      }
    });
  }, [element.content, element.id, updateElement]);

  const hasPreview = element.linkTitle || element.linkImage;
  const hostname = (() => {
    try {
      return new URL(element.content).hostname;
    } catch {
      return "";
    }
  })();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* OG image preview */}
      {element.linkImage && (
        <div className="w-full shrink-0 overflow-hidden" style={{ maxHeight: "55%" }}>
          <img
            src={element.linkImage}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex-1 p-3 flex flex-col gap-1.5 min-h-0 overflow-hidden">
        {/* Favicon + hostname */}
        <div className="flex items-center gap-1.5">
          {element.linkFavicon && (
            <img
              src={element.linkFavicon}
              alt=""
              width={12}
              height={12}
              className="rounded-sm shrink-0"
              draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          {!element.linkFavicon && (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="text-white/30 shrink-0">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
          <span className="text-[10px] text-white/25 truncate">{hostname || "Link"}</span>
        </div>
        {/* Title / URL input */}
        {hasPreview && !editing ? (
          <>
            {element.linkTitle && (
              <div className="text-[13px] font-medium text-white/75 leading-tight line-clamp-2 overflow-hidden">
                {element.linkTitle}
              </div>
            )}
            {element.linkDescription && (
              <div className="text-[11px] text-white/35 leading-snug line-clamp-2 overflow-hidden">
                {element.linkDescription}
              </div>
            )}
          </>
        ) : (
          <input
            className="bg-transparent text-[13px] text-accent focus:outline-none placeholder:text-white/18 truncate"
            value={element.content}
            placeholder="Paste URL..."
            onChange={(e) => {
              updateElement(element.id, {
                content: e.target.value,
                // Clear preview when URL changes
                linkTitle: undefined,
                linkDescription: undefined,
                linkImage: undefined,
                linkFavicon: undefined,
              });
              lastFetchedUrl.current = "";
            }}
            onPointerDown={(e) => e.stopPropagation()}
          />
        )}
        {/* Open link */}
        {element.content && element.content !== "https://" && (
          <a
            href={element.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-white/25 hover:text-white/45 truncate mt-auto transition-colors"
            onPointerDown={(e) => e.stopPropagation()}
          >
            Open link →
          </a>
        )}
      </div>
    </div>
  );
}

/* ---------- Main Card ---------- */
export default function CanvasElementCard({
  element,
  scale,
  onCanvasDragOver,
  onCanvasDrop,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedElementId = useBoardStore((s) => s.selectedElementId);
  const setSelectedElement = useBoardStore((s) => s.setSelectedElement);
  const updateElement = useBoardStore((s) => s.updateElement);
  const deleteElement = useBoardStore((s) => s.deleteElement);
  const enterBoard = useBoardStore((s) => s.enterBoard);
  const allElements = useBoardStore((s) => s.elements);
  const drawingMode = useBoardStore((s) => s.drawingMode);

  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);

  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const resizeRef = useRef<{
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const selectedElementIds = useBoardStore((s) => s.selectedElementIds);
  const selected = selectedElementIds.includes(element.id);
  const colorKey = element.color || "default";
  const colors = NOTE_COLORS[colorKey] || NOTE_COLORS.default;

  /* --- Drag logic --- */
  const beginDrag = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const root = rootRef.current;
      if (!root) return;
      e.stopPropagation();
      root.setPointerCapture(e.pointerId);
      setSelectedElement(element.id);
      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: element.position.x,
        startY: element.position.y,
      };
    },
    [element.id, element.position.x, element.position.y, setSelectedElement],
  );

  // Shared logic for intercepting table cell clicks (works for both pointer and mouse events)
  const handleTableCellDown = useCallback(
    (e: React.SyntheticEvent) => {
      const t = e.target as HTMLElement;
      if (element.type === "table" && t.closest("[data-table-cell]")) {
        e.stopPropagation();
        setEditing(true);
        setSelectedElement(element.id);
        return true;
      }
      return false;
    },
    [element.type, setSelectedElement, element.id],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const t = e.target as HTMLElement;
      // If already editing, let text interactions through
      if (editing && t.closest("textarea, input")) return;
      if (t.closest("button, a[href], [data-resize-handle]")) return;
      // For tables: clicking a cell selects the table + enters cell editing (no drag)
      if (handleTableCellDown(e)) return;
      beginDrag(e);
    },
    [beginDrag, editing, handleTableCellDown],
  );

  // Fallback for WKWebView: mouseDown also handles table cell clicks
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (editing && t.closest("textarea, input")) return;
      if (t.closest("button, a[href], [data-resize-handle]")) return;
      handleTableCellDown(e);
    },
    [editing, handleTableCellDown],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const r = resizeRef.current;
      if (r) {
        const dx = (e.clientX - r.startClientX) / scale;
        const dy = (e.clientY - r.startClientY) / scale;
        const shouldLockRatio = element.type === "image" || element.type === "file";
        if (shouldLockRatio) {
          const ratio = element.aspectRatio || r.startH / r.startW;
          const newW = Math.max(140, Math.round((r.startW + dx) / 10) * 10);
          const newH = Math.max(60, Math.round(newW * ratio / 10) * 10);
          updateElement(element.id, {
            width: newW,
            height: newH,
            aspectRatio: ratio,
          });
        } else {
          updateElement(element.id, {
            width: Math.max(140, Math.round((r.startW + dx) / 10) * 10),
            height: Math.max(60, Math.round((r.startH + dy) / 10) * 10),
          });
        }
        return;
      }
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startClientX) / scale;
      const dy = (e.clientY - d.startClientY) / scale;
      updateElement(element.id, {
        position: {
          x: Math.round((d.startX + dx) / 10) * 10,
          y: Math.round((d.startY + dy) / 10) * 10,
        },
      });
    },
    [element.id, scale, updateElement],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const wasDragging = dragRef.current !== null;
    dragRef.current = null;
    resizeRef.current = null;
    try {
      rootRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }

  }, [element.id, element.type, allElements, updateElement]);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const root = rootRef.current;
      if (!root) return;
      root.setPointerCapture(e.pointerId);
      setSelectedElement(element.id);
      resizeRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startW: element.width,
        startH: element.height,
      };
    },
    [element.id, element.width, element.height, setSelectedElement],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (element.type === "board") {
        enterBoard(element.id);
      } else if (element.type === "link") {
        setEditing(true);
        setTimeout(() => {
          const input = rootRef.current?.querySelector("input");
          input?.focus();
        }, 0);
      } else if (element.type === "note" || element.type === "document" || element.type === "comment" || element.type === "text") {
        setEditing(true);
        // Focus the textarea after a tick
        setTimeout(() => {
          const textarea = rootRef.current?.querySelector("textarea");
          textarea?.focus();
        }, 0);
      } else if (element.type === "table") {
        setEditing(true);
      }
    },
    [element.id, element.type, enterBoard],
  );

  // Exit editing when deselected
  React.useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  /* --- Styles --- */
  const isNote = element.type === "note";
  const isBoard = element.type === "board";
  const isChecklist = element.type === "checklist";
  const isLink = element.type === "link";
  const isImage = element.type === "image";

  const isText = element.type === "text";
  const isFile = element.type === "file";
  const isDrawing = element.type === "drawing";

  const cardBg = isText || isDrawing ? "transparent" : isNote ? colors.bg : "#2a2c30";


  const style: React.CSSProperties = {
    left: element.position.x,
    top: element.position.y,
    width: element.width,
    height: element.height,
    backgroundColor: cardBg,
    borderRadius: isText || isDrawing ? 0 : 6,
    border: isText || isDrawing
      ? (selected ? "1px dashed #4a9eff" : "none")
      : selected ? "2px solid #4a9eff" : "1px solid rgba(255,255,255,0.06)",
    boxShadow: isText || isDrawing
      ? "none"
      : selected
        ? "0 0 0 1px rgba(74, 158, 255, 0.15)"
        : hovered
          ? "0 2px 8px rgba(0,0,0,0.25)"
          : "0 1px 3px rgba(0,0,0,0.15)",
    cursor: drawingMode ? "crosshair" : dragRef.current ? "grabbing" : "default",
    pointerEvents: drawingMode ? "none" : undefined,
  };

  return (
    <div
      ref={rootRef}
      role="presentation"
      data-canvas-element="true"
      draggable={false}
      className={`absolute select-none canvas-card${isText ? "" : " overflow-hidden"}`}
      style={style}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={onCanvasDragOver}
      onDrop={(e) => {
        e.stopPropagation();
        onCanvasDrop(e);
      }}
    >
      {/* Color bar for notes — thin 3px accent strip */}
      {isNote && colorKey !== "default" && (
        <div
          className="w-full shrink-0"
          style={{ height: 3, backgroundColor: colors.bar }}
        />
      )}

      {/* ---- NOTE ---- */}
      {isNote && (
        <div className="flex flex-col h-full">
          {editing ? (
            <textarea
              className="flex-1 w-full bg-transparent text-[14px] leading-[1.6] p-4 resize-none focus:outline-none placeholder:text-white/18"
              style={{ color: colors.text }}
              value={element.content}
              placeholder="Start typing..."
              onChange={(e) => {
                updateElement(element.id, { content: e.target.value });
                // Auto-grow height
                const ta = e.target;
                const minH = 80;
                const needed = ta.scrollHeight + (colorKey !== "default" ? 3 : 0);
                if (needed > element.height) {
                  updateElement(element.id, { height: Math.max(minH, needed) });
                }
              }}
              ref={(ta) => {
                if (ta) {
                  // Measure on mount
                  requestAnimationFrame(() => {
                    const needed = ta.scrollHeight + (colorKey !== "default" ? 3 : 0);
                    if (needed > element.height) {
                      updateElement(element.id, { height: Math.max(80, needed) });
                    }
                  });
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex-1 p-4 text-[14px] leading-[1.6] whitespace-pre-wrap break-words overflow-hidden" style={{ color: colors.text }}>
              {element.content || <span className="text-white/18">Start typing...</span>}
            </div>
          )}
        </div>
      )}

      {/* ---- BOARD (mini-folder style) ---- */}
      {isBoard && (
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-1.5">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-white/40 shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <rect x="6" y="6" width="5" height="5" rx="1" fill="currentColor" fillOpacity={0.15} />
              <rect x="13" y="6" width="5" height="3" rx="1" fill="currentColor" fillOpacity={0.15} />
              <rect x="6" y="13" width="5" height="3" rx="1" fill="currentColor" fillOpacity={0.15} />
            </svg>
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Board</span>
          </div>
          <input
            className="bg-transparent text-[14px] font-semibold text-white/85 focus:outline-none placeholder:text-white/18"
            value={element.content}
            placeholder="Board name..."
            onChange={(e) => updateElement(element.id, { content: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="mt-auto flex items-center gap-1 text-[10px] text-white/20">
            <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="9,18 15,12 9,6" />
            </svg>
            Open
          </div>
        </div>
      )}

      {/* ---- LINK ---- */}
      {isLink && (
        <LinkCard element={element} updateElement={updateElement} editing={editing} />
      )}

      {/* ---- IMAGE ---- */}
      {isImage && (
        <div className="w-full h-full flex items-center justify-center overflow-hidden group/img" style={{ borderRadius: 5 }}>
          {element.assetPath || element.content ? (
            <>
              <img
                src={element.assetPath || element.content}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              {element.assetLocalPath && (
                <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                  <SaveAsButton assetLocalPath={element.assetLocalPath} fileName={element.fileName} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/18">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21,15 16,10 5,21" />
              </svg>
              <span className="text-[11px]">Drop image</span>
            </div>
          )}
        </div>
      )}

      {/* ---- CHECKLIST ---- */}
      {isChecklist && (
        <ChecklistRenderer
          content={element.content}
          onChange={(c) => updateElement(element.id, { content: c })}
        />
      )}

      {/* ---- TEXT ---- */}
      {isText && (() => {
        const fontSize = element.textFontSize || 24;
        const textStyle: React.CSSProperties = {
          fontSize: `${fontSize}px`,
          fontWeight: element.textBold ? "bold" : undefined,
          fontStyle: element.textItalic ? "italic" : undefined,
          textDecoration: element.textStrikethrough ? "line-through" : undefined,
          color: element.textColor || "rgba(255,255,255,0.8)",
          textAlign: element.noteTextAlign || "left",
        };
        return (
          <div className="w-full h-full flex items-start">
            {editing ? (
              <textarea
                className="flex-1 w-full h-full bg-transparent leading-[1.5] resize-none focus:outline-none placeholder:text-white/25 p-2"
                style={textStyle}
                value={element.content}
                placeholder="Type text..."
                onChange={(e) => {
                  updateElement(element.id, { content: e.target.value });
                  const ta = e.target;
                  const needed = ta.scrollHeight;
                  if (needed > element.height) {
                    updateElement(element.id, { height: Math.max(40, needed) });
                  }
                }}
                ref={(ta) => {
                  if (ta) {
                    requestAnimationFrame(() => {
                      const needed = ta.scrollHeight;
                      if (needed > element.height) {
                        updateElement(element.id, { height: Math.max(40, needed) });
                      }
                    });
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex-1 leading-[1.5] whitespace-pre-wrap break-words p-2" style={textStyle}>
                {element.content || <span className="text-white/25">Type text...</span>}
              </div>
            )}
          </div>
        );
      })()}

      {/* ---- TABLE ---- */}
      {element.type === "table" && (
        <TableRenderer
          element={element}
          updateElement={updateElement}
          editing={editing}
          selected={selected}
        />
      )}

      {/* ---- DOCUMENT ---- */}
      {element.type === "document" && (
        element.mimeType === "application/pdf" && element.assetLocalPath ? (
          /* ---- PDF Document Card ---- */
          <div className="h-full flex flex-col overflow-hidden rounded-[inherit]">
            {/* PDF icon + red accent header */}
            <div className="bg-red-600/20 px-4 py-3 flex items-center gap-3 border-b border-white/5">
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" className="shrink-0">
                <rect x="3" y="1" width="18" height="22" rx="2" fill="#dc2626" opacity={0.8} />
                <path d="M14 1v6h6" fill="none" stroke="#fff" strokeWidth={1} opacity={0.5} />
                <text x="12" y="17" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="system-ui">PDF</text>
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white/90 font-medium truncate">{element.fileName || "Document"}</div>
                <div className="text-[10px] text-white/35 mt-0.5">PDF Document</div>
              </div>
            </div>
            {/* PDF preview via iframe */}
            <PdfPreview assetLocalPath={element.assetLocalPath} />
            {/* Open button */}
            <button
              className="mx-3 mb-3 px-3 py-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-white/80 text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={async (e) => {
                e.stopPropagation();
                if (isTauri && element.assetLocalPath) {
                  const { openFileExternal } = await import("@/lib/desktopApi");
                  openFileExternal(element.assetLocalPath);
                }
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open PDF
            </button>
          </div>
        ) : (
          /* ---- Generic Document (text) ---- */
          <div className="p-4 h-full flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-white/35">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider text-white/25 font-medium">Document</span>
            </div>
            {editing ? (
              <textarea
                className="flex-1 w-full bg-transparent text-[14px] text-white/70 leading-[1.6] resize-none focus:outline-none placeholder:text-white/18"
                value={element.content}
                placeholder="Write here..."
                onChange={(e) => updateElement(element.id, { content: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex-1 text-[14px] text-white/70 leading-[1.6] whitespace-pre-wrap break-words overflow-hidden">
                {element.content || <span className="text-white/18">Write here...</span>}
              </div>
            )}
          </div>
        )
      )}

      {/* ---- COMMENT ---- */}
      {element.type === "comment" && (
        <div className="p-4 h-full flex flex-col gap-1.5">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-white/30 shrink-0">
            <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-5A8 8 0 1 1 21 12Z" />
          </svg>
          {editing ? (
            <textarea
              className="flex-1 w-full bg-transparent text-[14px] text-white/60 leading-[1.6] resize-none focus:outline-none placeholder:text-white/18"
              value={element.content}
              placeholder="Add comment..."
              onChange={(e) => updateElement(element.id, { content: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex-1 text-[14px] text-white/60 leading-[1.6] whitespace-pre-wrap break-words overflow-hidden">
              {element.content || <span className="text-white/18">Add comment...</span>}
            </div>
          )}
        </div>
      )}

      {/* ---- DRAWING ---- */}
      {element.type === "drawing" && (
        <svg
          width={element.width}
          height={element.height}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        >
          {element.drawingPath ? (
            <path
              d={element.drawingPath}
              fill="none"
              stroke={element.drawingColor || "#ffffff"}
              strokeWidth={element.drawingThickness || 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.15)" fontSize={11}>
              Drawing
            </text>
          )}
        </svg>
      )}

      {/* ---- ARROW/FILE fallback ---- */}
      {element.type === "arrow" && (
        <div className="p-3 text-[11px] text-white/25 h-full flex items-center justify-center">
          Connector
        </div>
      )}

      {element.type === "file" && (() => {
        const mime = element.mimeType || "";
        const isAudioFile = mime.startsWith("audio/");
        const isVideoFile = mime.startsWith("video/");

        if (isVideoFile) {
          return (
            <div className="h-full flex flex-col overflow-hidden rounded-[inherit]">
              <MediaPlayer assetLocalPath={element.assetLocalPath} type="video" />
              <div className="px-3 py-2 flex items-center gap-2 bg-black/30 border-t border-white/5">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-purple-400 shrink-0">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                <span className="text-[12px] text-white/70 truncate flex-1">{element.fileName || "Video"}</span>
                <SaveAsButton assetLocalPath={element.assetLocalPath} fileName={element.fileName} />
              </div>
            </div>
          );
        }

        if (isAudioFile) {
          return (
            <div className="h-full flex flex-col overflow-hidden rounded-[inherit]">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-emerald-600/15">
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <rect x="3" y="1" width="18" height="22" rx="2" fill="#10b981" opacity={0.7} />
                  <path d="M9 8l6 4-6 4V8z" fill="#fff" opacity={0.8} />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white/90 font-medium truncate">{element.fileName || "Audio"}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">Audio File</div>
                </div>
                <SaveAsButton assetLocalPath={element.assetLocalPath} fileName={element.fileName} />
              </div>
              <div className="flex-1 flex items-center px-3" onPointerDown={(e) => e.stopPropagation()}>
                <MediaPlayer assetLocalPath={element.assetLocalPath} type="audio" />
              </div>
            </div>
          );
        }

        return (
          <div className="h-full flex flex-col overflow-hidden rounded-[inherit]">
            <div className="bg-blue-600/15 px-4 py-3 flex items-center gap-3 border-b border-white/5">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="shrink-0">
                <rect x="3" y="1" width="18" height="22" rx="2" fill="#3b82f6" opacity={0.7} />
                <path d="M14 1v6h6" fill="none" stroke="#fff" strokeWidth={1} opacity={0.5} />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white/90 font-medium truncate">{element.fileName || "File"}</div>
                <div className="text-[10px] text-white/35 mt-0.5">{element.mimeType || "File"}</div>
              </div>
            </div>
            {element.assetLocalPath && (
              <div className="flex gap-2 mx-3 mt-auto mb-3">
                <button
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-600/25 hover:bg-blue-600/40 text-white/80 text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isTauri && element.assetLocalPath) {
                      const { openFileExternal } = await import("@/lib/desktopApi");
                      openFileExternal(element.assetLocalPath);
                    }
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15,3 21,3 21,9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/60 text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (element.assetLocalPath) {
                      const { saveAssetAs } = await import("@/lib/desktopApi");
                      await saveAssetAs(element.assetLocalPath, element.fileName || "file");
                    }
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Save As
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Resize handle — always visible when selected, subtle on hover */}
      {(selected || hovered) && (
        <div
          data-resize-handle
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-40"
          style={{ opacity: selected ? 0.8 : 0.4 }}
          onPointerDown={onResizePointerDown}
        >
          <svg
            width={10}
            height={10}
            viewBox="0 0 10 10"
            className="absolute bottom-1 right-1 text-white/50"
          >
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth={1.5} />
            <line x1="9" y1="4.5" x2="4.5" y2="9" stroke="currentColor" strokeWidth={1.5} />
            <line x1="9" y1="7.5" x2="7.5" y2="9" stroke="currentColor" strokeWidth={1.5} />
          </svg>
        </div>
      )}
    </div>
  );
}
