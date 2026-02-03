"use client";

import { AssistantThread } from "@/components/docs/assistant/thread";
import { Button } from "@/components/ui/button";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { cn } from "@/lib/utils";
import { PanelRightCloseIcon, SparklesIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

function ResizeHandle() {
  const { width, setWidth } = useAssistantPanel();
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = startXRef.current - e.clientX;
        setWidth(startWidthRef.current + delta);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, setWidth],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-0 bottom-0 -left-0.5 w-1 cursor-col-resize",
        "after:absolute after:top-0 after:bottom-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:transition-colors",
        isResizing
          ? "after:bg-primary/40"
          : "after:bg-transparent hover:after:bg-primary/20",
      )}
    />
  );
}

export function AssistantPanelToggle(): React.ReactNode {
  const { open, toggle } = useAssistantPanel();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(
        "absolute top-1/2 left-0 z-10 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background shadow-sm transition-opacity duration-300",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-label="Close AI Chat"
    >
      <PanelRightCloseIcon className="size-3" />
    </Button>
  );
}

export function AssistantPanelContent(): React.ReactNode {
  const { open, toggle } = useAssistantPanel();

  return (
    <div className="relative h-full w-(--panel-content-width) bg-background before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "group absolute inset-y-0 left-0 z-20 w-[44px] cursor-pointer bg-background transition-opacity duration-300",
          "before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent",
          "after:absolute after:inset-0 after:bg-linear-to-b after:from-transparent after:via-muted/50 after:to-transparent after:opacity-0 after:transition-opacity hover:after:opacity-100",
          open ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-label="Open AI Chat"
      >
        <SparklesIcon className="absolute top-1/2 left-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 text-pink-600 transition-colors group-hover:text-pink-500 dark:text-pink-400" />
      </button>

      <div
        className={cn(
          "flex h-full flex-col transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ResizeHandle />
        <div className="min-h-0 flex-1">
          <AssistantThread />
        </div>
      </div>
    </div>
  );
}
