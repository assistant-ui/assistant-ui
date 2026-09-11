"use client";

import { useEffect } from "react";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { AssistantThread } from "@/components/pages/docs/assistant/thread";
import { analytics } from "@/lib/analytics";

export function AskAiWindow() {
  const { open, toggle, setOpen } = useAssistantPanel();

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

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      analytics.assistant.panelToggled({ open: false, source: "shortcut" });
      setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 bg-popover md:ring-foreground/10 fixed inset-0 z-50 flex flex-col overflow-hidden duration-300 ease-out motion-reduce:animate-none md:inset-auto md:right-5 md:bottom-5 md:h-[min(42rem,calc(100vh-6rem))] md:w-[min(30rem,calc(100vw-2.5rem))] md:rounded-xl md:shadow-[0_16px_48px_-24px_rgb(0_0_0/0.25)] md:ring-1 dark:md:shadow-[0_16px_48px_-24px_rgb(0_0_0/0.6)]">
      <div className="min-h-0 flex-1">
        <AssistantThread />
      </div>
    </div>
  );
}
