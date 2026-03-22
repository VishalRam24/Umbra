import React, { useState, useEffect, useRef } from "react";
import { useBoardStore } from "@/store/useBoardStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UserSettingsModal({ open, onClose }: Props) {
  const displayName = useBoardStore((s) => s.userSettings.displayName);
  const updateUserSettings = useBoardStore((s) => s.updateUserSettings);
  const [name, setName] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(displayName);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, displayName]);

  if (!open) return null;

  const handleSave = () => {
    updateUserSettings({ displayName: name.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[380px] rounded-xl bg-graphite-800 border border-white/[0.08] shadow-2xl p-6">
        <h2 className="text-[16px] font-semibold text-white mb-4">Settings</h2>

        <label className="block text-[12px] text-graphite-300 mb-1.5">
          Your Name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Enter your name"
          className="w-full rounded-lg bg-graphite-900 border border-white/[0.08] px-3 py-2.5 text-[13px] text-white placeholder:text-graphite-500 focus:outline-none focus:border-accent/60 mb-6"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12px] text-graphite-300 hover:text-white hover:bg-graphite-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-[12px] text-white bg-accent hover:bg-accent-hover transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
