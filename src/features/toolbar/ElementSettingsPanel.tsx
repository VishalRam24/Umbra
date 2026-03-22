import React from "react";

import type { BoardElement } from "@/types/elements";
import { NOTE_COLORS } from "@/types/elements";
import { useBoardStore } from "@/store/useBoardStore";

interface Props {
  element: BoardElement;
  onBack: () => void;
}

function parseTableContent(content: string | undefined) {
  if (!content) return { cells: [] as string[][], cellStyles: {} as Record<string, { bold?: boolean; italic?: boolean; strikethrough?: boolean }> };
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return { cells: parsed, cellStyles: {} };
    return { cells: parsed.cells || [], cellStyles: parsed.cellStyles || {} };
  } catch {
    return { cells: [], cellStyles: {} };
  }
}

export default function ElementSettingsPanel({ element, onBack }: Props) {
  const updateElement = useBoardStore((s) => s.updateElement);
  const deleteSelected = useBoardStore((s) => s.deleteSelected);
  const selectedTableCell = useBoardStore((s) => s.selectedTableCell);

  const colorKey = element.color || "default";
  const isNote = element.type === "note" || element.type === "document" || element.type === "comment";
  const isText = element.type === "text";
  const isTable = element.type === "table";

  // Per-cell style helpers for tables
  const tableData = isTable ? parseTableContent(element.content) : null;
  const cellKey = selectedTableCell ? `${selectedTableCell.r},${selectedTableCell.c}` : null;
  const cellStyle = cellKey && tableData ? (tableData.cellStyles[cellKey] || {}) : {};

  const toggleTableCellStyle = (prop: "bold" | "italic" | "strikethrough") => {
    if (!tableData || !cellKey) return;
    const existing = tableData.cellStyles[cellKey] || {};
    const next = { ...tableData.cellStyles, [cellKey]: { ...existing, [prop]: !existing[prop] } };
    updateElement(element.id, {
      content: JSON.stringify({ cells: tableData.cells, cellStyles: next }),
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Back to tools */}
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
        {/* Color palette (for notes) */}
        {isNote && (
          <>
            <div className="text-[9px] uppercase tracking-wider text-white/20 mt-2 mb-1">Color</div>
            <div className="flex flex-col items-center gap-1.5">
              {Object.entries(NOTE_COLORS).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateElement(element.id, { color: key })}
                  className="w-[16px] h-[16px] rounded-full border-[1.5px] hover:scale-125 transition-transform"
                  style={{
                    backgroundColor: val.bar === "rgba(255,255,255,0.08)" ? "#3a3c40" : val.bar,
                    borderColor: colorKey === key ? "#fff" : "transparent",
                  }}
                  title={key}
                />
              ))}
            </div>
          </>
        )}

        {/* Text formatting buttons (for notes) */}
        {isNote && (
          <>
            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Style</div>
            <div className="flex flex-col items-center gap-0.5">
              <FormatBtn label="B" title="Bold" active={element.textBold} onClick={() => updateElement(element.id, { textBold: !element.textBold })} />
              <FormatBtn label="I" title="Italic" italic active={element.textItalic} onClick={() => updateElement(element.id, { textItalic: !element.textItalic })} />
              <FormatBtn label="S" title="Strikethrough" strikethrough active={element.textStrikethrough} onClick={() => updateElement(element.id, { textStrikethrough: !element.textStrikethrough })} />
            </div>
          </>
        )}

        {/* Text block settings */}
        {isText && (
          <>
            <div className="text-[9px] uppercase tracking-wider text-white/20 mt-2 mb-1">Align</div>
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => updateElement(element.id, { noteTextAlign: "left" })}
                className="flex items-center justify-center w-10 h-8 rounded-md hover:bg-white/[0.06] transition-colors"
                title="Align left"
                style={{
                  color: (element.noteTextAlign || "left") === "left" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)",
                  backgroundColor: (element.noteTextAlign || "left") === "left" ? "rgba(255,255,255,0.06)" : undefined,
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="15" y2="12" />
                  <line x1="3" y1="18" x2="18" y2="18" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => updateElement(element.id, { noteTextAlign: "center" })}
                className="flex items-center justify-center w-10 h-8 rounded-md hover:bg-white/[0.06] transition-colors"
                title="Align center"
                style={{
                  color: element.noteTextAlign === "center" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)",
                  backgroundColor: element.noteTextAlign === "center" ? "rgba(255,255,255,0.06)" : undefined,
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </button>
            </div>

            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <div className="text-[9px] uppercase tracking-wider text-white/20 mt-2 mb-1">Size</div>
            <div className="flex flex-col items-center gap-0.5">
              {[12, 14, 16, 20, 24, 32, 48].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => updateElement(element.id, { textFontSize: sz })}
                  className="flex items-center justify-center w-10 h-7 rounded-md text-[11px] hover:bg-white/[0.06] transition-colors"
                  style={{ opacity: (element.textFontSize || 24) === sz ? 1 : 0.35, color: "rgba(255,255,255,0.8)" }}
                >
                  {sz}
                </button>
              ))}
            </div>

            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Style</div>
            <div className="flex flex-col items-center gap-0.5">
              <FormatBtn label="B" title="Bold" active={element.textBold} onClick={() => updateElement(element.id, { textBold: !element.textBold })} />
              <FormatBtn label="I" title="Italic" italic active={element.textItalic} onClick={() => updateElement(element.id, { textItalic: !element.textItalic })} />
              <FormatBtn label="S" title="Strikethrough" strikethrough active={element.textStrikethrough} onClick={() => updateElement(element.id, { textStrikethrough: !element.textStrikethrough })} />
            </div>

            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Color</div>
            <div className="flex flex-col items-center gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateElement(element.id, { textColor: c })}
                  className="w-[16px] h-[16px] rounded-full border-[1.5px] hover:scale-125 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: (element.textColor || "rgba(255,255,255,0.8)") === c ? "#fff" : "transparent",
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Table settings */}
        {isTable && (
          <>
            <div className="text-[9px] uppercase tracking-wider text-white/20 mt-2 mb-1">Cell H</div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const cur = element.tableCellHeight || 36;
                  updateElement(element.id, { tableCellHeight: Math.min(64, cur + 4) });
                }}
                className="flex items-center justify-center w-10 h-7 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                title="Increase cell height"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18,15 12,9 6,15" />
                </svg>
              </button>
              <span className="text-[11px] text-white/50 font-medium tabular-nums">{element.tableCellHeight || 36}</span>
              <button
                type="button"
                onClick={() => {
                  const cur = element.tableCellHeight || 36;
                  updateElement(element.id, { tableCellHeight: Math.max(20, cur - 4) });
                }}
                className="flex items-center justify-center w-10 h-7 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                title="Decrease cell height"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
            </div>

            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Shade</div>
            <div className="flex flex-col items-center gap-0.5">
              <ToggleBtn
                label="Row 1"
                active={element.tableShadeFirstRow}
                onClick={() => updateElement(element.id, { tableShadeFirstRow: !element.tableShadeFirstRow })}
              />
              <ToggleBtn
                label="Col 1"
                active={element.tableShadeFirstCol}
                onClick={() => updateElement(element.id, { tableShadeFirstCol: !element.tableShadeFirstCol })}
              />
            </div>

            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <ToggleBtn
              label="Title"
              active={element.tableShowTitle}
              onClick={() => updateElement(element.id, { tableShowTitle: !element.tableShowTitle })}
            />

            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">{selectedTableCell ? "Cell" : "Style"}</div>
            <div className="flex flex-col items-center gap-0.5">
              <FormatBtn
                label="B"
                title="Bold"
                active={selectedTableCell ? !!cellStyle.bold : element.textBold}
                onClick={() => selectedTableCell ? toggleTableCellStyle("bold") : updateElement(element.id, { textBold: !element.textBold })}
              />
              <FormatBtn
                label="I"
                title="Italic"
                italic
                active={selectedTableCell ? !!cellStyle.italic : element.textItalic}
                onClick={() => selectedTableCell ? toggleTableCellStyle("italic") : updateElement(element.id, { textItalic: !element.textItalic })}
              />
              <FormatBtn
                label="S"
                title="Strikethrough"
                strikethrough
                active={selectedTableCell ? !!cellStyle.strikethrough : element.textStrikethrough}
                onClick={() => selectedTableCell ? toggleTableCellStyle("strikethrough") : updateElement(element.id, { textStrikethrough: !element.textStrikethrough })}
              />
            </div>

            <div className="w-6 my-2 h-px bg-white/[0.06]" />
            <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Size</div>
            <div className="flex flex-col items-center gap-0.5">
              {[11, 13, 15, 18].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => updateElement(element.id, { textFontSize: sz })}
                  className="flex items-center justify-center w-10 h-7 rounded-md text-[11px] hover:bg-white/[0.06] transition-colors"
                  style={{ opacity: (element.textFontSize || 13) === sz ? 1 : 0.35, color: "rgba(255,255,255,0.8)" }}
                >
                  {sz}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save As (for files/images/media with assets) */}
        {element.assetLocalPath && (
          <>
            <div className="w-6 my-1.5 h-px bg-white/[0.06]" />
            <button
              type="button"
              onClick={async () => {
                const { saveAssetAs } = await import("@/lib/desktopApi");
                await saveAssetAs(element.assetLocalPath!, element.fileName || "file");
              }}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              title="Save As"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </>
        )}

        {/* Delete at bottom */}
        <div className="w-6 my-1.5 h-px bg-white/[0.06]" />
        <button
          type="button"
          onClick={() => deleteSelected()}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors mb-2"
          title="Delete"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,6 5,6 21,6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const TEXT_COLORS = [
  "rgba(255,255,255,0.8)",
  "#4a9eff",
  "#ff4a6a",
  "#ffc44a",
  "#4aff8b",
  "#c44aff",
  "#ff8c4a",
];

function FormatBtn({
  label,
  title,
  italic,
  strikethrough,
  active,
  onClick,
}: {
  label: string;
  title: string;
  italic?: boolean;
  strikethrough?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-10 h-8 rounded-md hover:text-white/70 hover:bg-white/[0.06] transition-colors text-[13px] font-semibold"
      title={title}
      style={{
        fontStyle: italic ? "italic" : undefined,
        textDecoration: strikethrough ? "line-through" : undefined,
        color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)",
        backgroundColor: active ? "rgba(255,255,255,0.06)" : undefined,
      }}
    >
      {label}
    </button>
  );
}

function ToggleBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-10 h-8 rounded-md hover:bg-white/[0.06] transition-colors text-[10px] font-medium"
      style={{
        color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
        backgroundColor: active ? "rgba(255,255,255,0.06)" : undefined,
      }}
    >
      {label}
    </button>
  );
}
