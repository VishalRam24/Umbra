import React, { useEffect, useRef, useState } from "react";
import { biometricAvailable, biometricAuthenticate } from "@/lib/desktopApi";

export type PasswordMode = "set" | "enter" | "unlock";

interface Props {
  open: boolean;
  mode: PasswordMode;
  canvasName: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  /** Called when biometric auth succeeds — bypasses password entry */
  onBiometricSuccess?: () => void;
  error?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function PasswordModal({ open, mode, canvasName, onSubmit, onCancel, onBiometricSuccess, error }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const [hasBiometric, setHasBiometric] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setLocalError("");
      setShowPasswordFallback(false);
      setBiometricChecked(false);
      autoTriggeredRef.current = false;
      // Check biometric availability for enter/unlock modes
      if (mode !== "set") {
        biometricAvailable().then((available) => {
          setHasBiometric(available);
          setBiometricChecked(true);
        });
      } else {
        setBiometricChecked(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [open, mode]);

  // Auto-trigger biometric when available and modal opens
  useEffect(() => {
    if (biometricChecked && hasBiometric && mode !== "set" && onBiometricSuccess && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      handleBiometric();
    }
    // If no biometric, focus password input
    if (biometricChecked && !hasBiometric && mode !== "set") {
      setShowPasswordFallback(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [biometricChecked, hasBiometric]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBiometric = async () => {
    setLocalError("");
    const ok = await biometricAuthenticate(`Unlock "${canvasName}"`);
    if (ok) {
      onBiometricSuccess?.();
    } else {
      setLocalError("Biometric authentication failed");
    }
  };

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
  const biometricUnlockMode = hasBiometric && mode !== "set" && onBiometricSuccess;

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

        {/* Biometric-first view (enter/unlock with biometric available) */}
        {biometricUnlockMode && !showPasswordFallback && (
          <>
            {/* Fingerprint / Touch ID primary button */}
            <button
              type="button"
              onClick={handleBiometric}
              className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
            >
              {/* Fingerprint icon */}
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" className="text-yellow-500/80">
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02.76 2 2 2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                <path d="M12 6a6 6 0 0 0-6 6c0 1.63.42 3.1 1.14 4.36" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                <path d="M12 6a6 6 0 0 1 6 6c0 2.05-.7 3.7-1.82 5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                <path d="M12 2a10 10 0 0 0-10 10c0 2.05.52 3.93 1.4 5.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                <path d="M12 2a10 10 0 0 1 10 10c0 3.35-1.36 6.35-3.5 8.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                <path d="M12 14a2 2 0 0 0 2-2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
              <span className="text-[13px] text-white/70 font-medium">Use Touch ID</span>
            </button>

            {/* Use password instead link */}
            <button
              type="button"
              onClick={() => {
                setShowPasswordFallback(true);
                setLocalError("");
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="text-[11px] text-white/30 hover:text-white/50 transition-colors text-center"
            >
              Use password instead
            </button>
          </>
        )}

        {/* Password form (shown by default for "set", or when fallback is toggled, or when no biometric) */}
        {(mode === "set" || showPasswordFallback || !biometricUnlockMode) && (
          <>
            {/* Back to biometric link (only when biometric is available and in fallback mode) */}
            {biometricUnlockMode && showPasswordFallback && (
              <button
                type="button"
                onClick={() => {
                  setShowPasswordFallback(false);
                  setLocalError("");
                }}
                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
                Back to Touch ID
              </button>
            )}

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
          </>
        )}

        {/* Error — shown in both views */}
        {displayError && (
          <p className="text-[11px] text-red-400/80 -mt-1">{displayError}</p>
        )}

        {/* Cancel button in biometric view */}
        {biometricUnlockMode && !showPasswordFallback && (
          <div className="flex items-center justify-center mt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
