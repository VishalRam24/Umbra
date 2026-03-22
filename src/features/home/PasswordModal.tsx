import React, { useEffect, useRef, useState } from "react";

export type PasswordMode = "set" | "enter" | "unlock";

interface Props {
  open: boolean;
  mode: PasswordMode;
  canvasName: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  error?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function PasswordModal({ open, mode, canvasName, onSubmit, onCancel, error }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setLocalError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const title =
    mode === "set" ? "Lock Canvas" :
    mode === "enter" ? "Enter Password" :
    "Unlock Canvas";

  const subtitle =
    mode === "set" ? `Set a password to lock "${canvasName}"` :
    mode === "enter" ? `"${canvasName}" is locked` :
    `Enter password to unlock "${canvasName}"`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setLocalError("Password cannot be empty");
      return;
    }
    if (mode === "set" && password !== confirm) {
      setLocalError("Passwords don't match");
      return;
    }
    setLocalError("");
    onSubmit(password);
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-[340px] bg-[#1e2026] border border-white/[0.08] rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/10">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-white/90">{title}</h3>
            <p className="text-[11px] text-white/35 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Password input */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-3 py-2.5 rounded-lg bg-[#14161a] border border-white/[0.06] text-[13px] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-yellow-500/40 transition-colors"
            autoComplete="off"
          />

          {/* Confirm field only for "set" mode */}
          {mode === "set" && (
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-3 py-2.5 rounded-lg bg-[#14161a] border border-white/[0.06] text-[13px] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-yellow-500/40 transition-colors"
              autoComplete="off"
            />
          )}
        </div>

        {/* Error */}
        {displayError && (
          <p className="text-[11px] text-red-400/80 -mt-1">{displayError}</p>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-[12px] font-medium text-white bg-yellow-600/80 hover:bg-yellow-600 transition-colors"
          >
            {mode === "set" ? "Lock" : mode === "enter" ? "Open" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}
