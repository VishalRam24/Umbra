import React, { useState, useRef, useEffect } from "react";
import { useBoardStore } from "@/store/useBoardStore";
import UmbraLogo from "./UmbraLogo";
import UserSettingsModal from "./UserSettingsModal";
import PasswordModal, { hashPassword, type PasswordMode } from "./PasswordModal";

export default function HomePage() {
  const displayName = useBoardStore((s) => s.userSettings.displayName);
  const workspaces = useBoardStore((s) => s.workspaces);
  const createWorkspace = useBoardStore((s) => s.createWorkspace);
  const renameWorkspace = useBoardStore((s) => s.renameWorkspace);
  const deleteWorkspace = useBoardStore((s) => s.deleteWorkspace);
  const openWorkspace = useBoardStore((s) => s.openWorkspace);
  const lockWorkspace = useBoardStore((s) => s.lockWorkspace);
  const unlockWorkspace = useBoardStore((s) => s.unlockWorkspace);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // Password modal state
  const [pwModal, setPwModal] = useState<{
    open: boolean;
    mode: PasswordMode;
    wsId: string;
  }>({ open: false, mode: "set", wsId: "" });
  const [pwError, setPwError] = useState("");

  const handlePasswordSubmit = async (password: string) => {
    const ws = workspaces[pwModal.wsId];
    if (!ws) return;

    const hash = await hashPassword(password);

    if (pwModal.mode === "set") {
      lockWorkspace(pwModal.wsId, hash);
      setPwModal({ open: false, mode: "set", wsId: "" });
      setPwError("");
    } else if (pwModal.mode === "enter") {
      if (hash === ws.lockHash) {
        openWorkspace(pwModal.wsId);
        setPwModal({ open: false, mode: "set", wsId: "" });
        setPwError("");
      } else {
        setPwError("Incorrect password");
      }
    } else if (pwModal.mode === "unlock") {
      if (hash === ws.lockHash) {
        unlockWorkspace(pwModal.wsId);
        setPwModal({ open: false, mode: "set", wsId: "" });
        setPwError("");
      } else {
        setPwError("Incorrect password");
      }
    }
  };

  const handleOpenWorkspace = (id: string) => {
    const ws = workspaces[id];
    if (ws?.locked && ws.lockHash) {
      setPwError("");
      setPwModal({ open: true, mode: "enter", wsId: id });
    } else {
      openWorkspace(id);
    }
  };

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const sorted = Object.values(workspaces).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const greeting = displayName
    ? `Welcome back, ${displayName}`
    : "Welcome to Umbra";

  const handleCreate = () => {
    const id = createWorkspace("Untitled Canvas");
    setRenamingId(id);
    setRenameValue("Untitled Canvas");
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameWorkspace(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#111214] overflow-auto">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-3">
          <UmbraLogo size={24} className="text-white/80" />
          <span className="text-[15px] font-semibold text-white/90 tracking-tight">
            Umbra
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white/35 hover:text-white/70 hover:bg-white/[0.04] transition-all"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
            Settings
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-8 py-8 max-w-5xl mx-auto w-full">
        <h1 className="text-[28px] font-bold text-white/90 mb-1">{greeting}</h1>
        <p className="text-[13px] text-white/30 mb-8">
          Your creative workspace awaits.
        </p>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-medium text-white/50">Canvases</h2>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-white font-medium bg-accent hover:bg-accent-hover transition-colors"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Canvas
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
            <p className="text-[13px]">No canvases yet</p>
            <p className="text-[11px] mt-1 text-white/15">Create one to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map((ws) => (
              <div
                key={ws.id}
                onDoubleClick={() => handleOpenWorkspace(ws.id)}
                onContextMenu={(e) => handleContext(e, ws.id)}
                className="group relative rounded-xl bg-[#1a1c20] border border-white/[0.04] p-4 cursor-pointer hover:border-accent/30 hover:bg-[#1e2026] transition-all duration-200"
              >
                {/* Canvas preview */}
                <div className="flex items-center justify-center h-20 rounded-lg bg-[#14161a] border border-white/[0.03] mb-3 overflow-hidden">
                  <div className="grid grid-cols-3 gap-1 p-3 opacity-30">
                    <div className="w-6 h-4 rounded-sm bg-accent/20" />
                    <div className="w-6 h-6 rounded-sm bg-purple-500/20" />
                    <div className="w-6 h-3 rounded-sm bg-green-500/20" />
                    <div className="w-6 h-5 rounded-sm bg-yellow-500/20" />
                    <div className="w-6 h-4 rounded-sm bg-red-500/20" />
                    <div className="w-6 h-5 rounded-sm bg-blue-500/20" />
                  </div>
                </div>

                {renamingId === ws.id ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-full bg-transparent border-b border-accent text-[13px] text-white focus:outline-none pb-0.5"
                  />
                ) : (
                  <p className="text-[13px] font-medium text-white/80 truncate">
                    {ws.name}
                  </p>
                )}
                <p className="text-[10px] text-white/20 mt-1">
                  {new Date(ws.updatedAt).toLocaleDateString()}
                </p>

                {/* Lock indicator */}
                {ws.locked && (
                  <div className="absolute top-2.5 right-2.5 flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.06]" title="Locked">
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500/70">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenWorkspace(ws.id);
                  }}
                  className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white bg-accent/80 hover:bg-accent transition-all duration-200"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[90] bg-[#1e2026] border border-white/[0.08] rounded-xl shadow-2xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              handleOpenWorkspace(contextMenu.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-[12px] text-white/60 hover:bg-white/[0.05] hover:text-white/90 transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => {
              const ws = workspaces[contextMenu.id];
              setRenamingId(contextMenu.id);
              setRenameValue(ws?.name ?? "");
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-[12px] text-white/60 hover:bg-white/[0.05] hover:text-white/90 transition-colors"
          >
            Rename
          </button>
          <button
            onClick={() => {
              const ws = workspaces[contextMenu.id];
              const mode: PasswordMode = ws?.locked ? "unlock" : "set";
              setPwError("");
              setPwModal({ open: true, mode, wsId: contextMenu.id });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-[12px] text-white/60 hover:bg-white/[0.05] hover:text-white/90 transition-colors flex items-center gap-2"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500/60">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {workspaces[contextMenu.id]?.locked ? "Unlock" : "Lock"}
          </button>
          <div className="mx-2 my-0.5 h-px bg-white/[0.04]" />
          <button
            onClick={() => {
              setDeleteConfirm(contextMenu.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-[12px] text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      <UserSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[360px] rounded-xl bg-[#1e2026] border border-white/[0.08] shadow-2xl p-6">
            <h3 className="text-[15px] font-semibold text-white mb-2">Delete Canvas</h3>
            <p className="text-[13px] text-white/50 mb-5">
              Are you sure you want to delete{" "}
              <span className="text-white/80 font-medium">
                {workspaces[deleteConfirm]?.name || "this canvas"}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteWorkspace(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 rounded-lg text-[12px] text-white font-medium bg-red-500/80 hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <PasswordModal
        open={pwModal.open}
        mode={pwModal.mode}
        canvasName={workspaces[pwModal.wsId]?.name ?? ""}
        error={pwError}
        onSubmit={handlePasswordSubmit}
        onCancel={() => {
          setPwModal({ open: false, mode: "set", wsId: "" });
          setPwError("");
        }}
      />
    </div>
  );
}
