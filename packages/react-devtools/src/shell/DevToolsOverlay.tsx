"use client";

import { useEffect, useState } from "react";
import { DevToolsPanel } from "./DevToolsPanel";
import type { DevToolsPanelPlugin } from "./registry";
import type { DevToolsClient } from "../data/types";

export interface DevToolsOverlayProps {
  plugins?: DevToolsPanelPlugin[] | undefined;
  theme: "light" | "dark";
  client?: DevToolsClient | undefined;
}

/**
 * The full devtools surface (floating launcher + window), rendered inside the
 * shadow root so every element is styled with the package's own Tailwind tokens
 * and isolated from the host page. The window floats over the live app with no
 * backdrop; close with the × or Escape.
 */
export const DevToolsOverlay = ({
  plugins,
  theme,
  client,
}: DevToolsOverlayProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open assistant-ui DevTools"
        title="Open assistant-ui DevTools"
        className="bg-foreground text-background fixed end-5 bottom-5 z-[2147483646] flex size-9 [animation:aui-dt-launcher-in_200ms_cubic-bezier(0.175,0.885,0.32,1.1)] items-center justify-center rounded-full shadow-[var(--shadow-launcher)] backdrop-blur-2xl transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 z-[2147483646] [animation:aui-dt-fade-in_150ms_ease-out] bg-black/20 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-label="assistant-ui DevTools"
        className="bg-background text-foreground border-border fixed top-1/2 left-1/2 z-[2147483647] flex h-[min(560px,80vh)] w-[min(960px,92vw)] -translate-x-1/2 -translate-y-1/2 [animation:aui-dt-window-in_200ms_cubic-bezier(0.175,0.885,0.32,1.1)] flex-col overflow-hidden rounded-xl border shadow-[var(--shadow-window)]"
      >
        <DevToolsPanel
          theme={theme}
          plugins={plugins}
          client={client}
          onClose={() => setIsOpen(false)}
        />
      </div>
    </>
  );
};
