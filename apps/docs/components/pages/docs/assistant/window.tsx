"use client";

import { useEffect } from "react";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { AssistantThread } from "@/components/pages/docs/assistant/thread";
import { analytics } from "@/lib/analytics";

export function AskAiWindow() {
  const { open, toggle } = useAssistantPanel();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "i")
        return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      analytics.assistant.panelToggled({ open: !open, source: "shortcut" });
      toggle();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [toggle, open]);

  if (!open) return null;

  return (
    <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 border-border/60 bg-background fixed right-5 bottom-5 z-50 hidden origin-bottom-right overflow-hidden rounded-(--radius-xl) border duration-200 md:flex md:h-[min(42rem,calc(100vh-6rem))] md:w-[min(30rem,calc(100vw-2.5rem))] md:flex-col">
      <div className="min-h-0 flex-1">
        <AssistantThread />
      </div>
    </div>
  );
}
