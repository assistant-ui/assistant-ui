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
 * The full devtools surface (floating launcher + modal + panel), rendered inside
 * the shadow root so every element is styled with the package's own Tailwind
 * tokens and isolated from the host page.
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open assistant-ui DevTools"
        title="Open assistant-ui DevTools"
        className="bg-primary text-primary-foreground fixed end-4 bottom-4 z-[2147483646] flex size-11 items-center justify-center rounded-full shadow transition-transform hover:scale-110 active:scale-90"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[2147483646] [animation:aui-dt-fade-in_0.12s_ease] bg-black/40 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-label="assistant-ui DevTools"
            className="bg-background fixed top-1/2 left-1/2 z-[2147483647] flex h-[min(720px,85vh)] w-[min(960px,90vw)] -translate-x-1/2 -translate-y-1/2 [animation:aui-dt-zoom-in_0.16s_ease] flex-col overflow-hidden rounded-2xl border shadow-2xl"
          >
            <DevToolsPanel
              theme={theme}
              plugins={plugins}
              client={client}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      ) : null}
    </>
  );
};
