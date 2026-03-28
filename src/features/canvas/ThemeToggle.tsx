import React from "react";
import { useBoardStore } from "@/store/useBoardStore";

interface ThemeToggleProps {
  /** When true, renders inline (no fixed positioning) for use inside headers/toolbars */
  inline?: boolean;
}

export default function ThemeToggle({ inline }: ThemeToggleProps) {
  const theme = useBoardStore((s) => s.userSettings.theme || "dark");
  const updateUserSettings = useBoardStore((s) => s.updateUserSettings);

  const isDark = theme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    updateUserSettings({ theme: next });
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`${inline ? "" : "fixed top-3 right-3 z-50 "}flex items-center justify-center w-8 h-8 rounded-lg bg-[--theme-toggle-bg] hover:bg-[--theme-toggle-hover] border border-[--theme-toggle-border] transition-colors`}
      style={{
        "--theme-toggle-bg": isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        "--theme-toggle-hover": isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
        "--theme-toggle-border": isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
      } as React.CSSProperties}
    >
      {isDark ? (
        /* Sun icon */
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon icon */
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
