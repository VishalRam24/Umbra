import React from "react";
import { useBoardStore } from "@/store/useBoardStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TrashPanel({ open, onClose }: Props) {
  const trash = useBoardStore((s) => s.trash);
  const restoreFromTrash = useBoardStore((s) => s.restoreFromTrash);
  const clearTrash = useBoardStore((s) => s.clearTrash);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[440px] max-h-[70vh] rounded-xl bg-graphite-800 border border-white/[0.08] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold text-white">Trash</h2>
          <div className="flex items-center gap-2">
            {trash.length > 0 && (
              <button
                onClick={clearTrash}
                className="px-3 py-1 rounded-md text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-graphite-400 hover:text-white hover:bg-graphite-700 transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {trash.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-graphite-500">
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="mb-2 opacity-40">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <p className="text-[12px]">Trash is empty</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {trash.map((entry, idx) => (
                <div
                  key={`${entry.element.id}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-graphite-700/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-graphite-100 truncate">
                      {entry.element.content || entry.element.type}
                    </p>
                    <p className="text-[10px] text-graphite-500">
                      {entry.element.type} &middot;{" "}
                      {new Date(entry.deletedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreFromTrash(idx)}
                    className="shrink-0 ml-2 px-2.5 py-1 rounded-md text-[11px] text-accent hover:bg-accent/10 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
