import React, { useState, useRef, useEffect } from "react";

interface Props {
  mode: "set" | "unlock";
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export default function LockModal({ mode, onConfirm, onCancel }: Props) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = () => {
    if (mode === "set") {
      if (pw.length < 1) {
        setError("Password cannot be empty");
        return;
      }
      if (pw !== confirm) {
        setError("Passwords do not match");
        return;
      }
    }
    onConfirm(pw);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-[340px] rounded-xl bg-graphite-800 border border-white/[0.08] shadow-2xl p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3">
          {mode === "set" ? "Set Password" : "Enter Password to Unlock"}
        </h3>

        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && (mode === "unlock" ? handleSubmit() : null)}
          placeholder="Password"
          className="w-full rounded-lg bg-graphite-900 border border-white/[0.08] px-3 py-2 text-[13px] text-white placeholder:text-graphite-500 focus:outline-none focus:border-accent/60 mb-2"
        />

        {mode === "set" && (
          <input
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Confirm password"
            className="w-full rounded-lg bg-graphite-900 border border-white/[0.08] px-3 py-2 text-[13px] text-white placeholder:text-graphite-500 focus:outline-none focus:border-accent/60 mb-2"
          />
        )}

        {error && (
          <p className="text-[11px] text-red-400 mb-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-[12px] text-graphite-300 hover:text-white hover:bg-graphite-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded-lg text-[12px] text-white bg-accent hover:bg-accent-hover transition-colors"
          >
            {mode === "set" ? "Lock" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}

export async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
