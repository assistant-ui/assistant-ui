"use client";

import { useState } from "react";

export function ModeToggle({
  onModeChange,
}: {
  onModeChange: (isAuiMode: boolean) => void;
}) {
  const [isAuiMode, setIsAuiMode] = useState(true);

  const handleModeChange = (newMode: boolean) => {
    setIsAuiMode(newMode);
    onModeChange(newMode);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-slate-600 text-sm">Mode:</span>
      <div
        role="group"
        aria-label="Display mode"
        className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
      >
        <button
          onClick={() => handleModeChange(true)}
          aria-pressed={isAuiMode}
          className={`rounded-md px-3 py-1 font-medium text-sm transition-colors ${
            isAuiMode
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          AUI
        </button>
        <button
          onClick={() => handleModeChange(false)}
          aria-pressed={!isAuiMode}
          className={`rounded-md px-3 py-1 font-medium text-sm transition-colors ${
            !isAuiMode
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Legacy
        </button>
      </div>
      <span className="text-slate-500 text-xs">
        {isAuiMode ? "🌤️ Rich UI components" : "📝 Plain text responses"}
      </span>
    </div>
  );
}
