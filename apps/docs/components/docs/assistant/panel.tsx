"use client";

import { AssistantThread } from "@/components/docs/assistant/thread";
import { Button } from "@/components/ui/button";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { PanelRightCloseIcon } from "lucide-react";
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

  const handleClick = () => {
    analytics.assistant.panelToggled({ open: !open, source: "toggle" });
    toggle();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
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

  const handleTriggerClick = () => {
    analytics.assistant.panelToggled({ open: !open, source: "trigger" });
    toggle();
  };

  return (
    <div
      className={cn(
        "relative h-full w-(--panel-content-width) bg-background before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-border before:transition-opacity before:duration-300",
        open ? "before:opacity-100" : "before:opacity-0",
      )}
    >
      <button
        type="button"
        onClick={handleTriggerClick}
        className={cn(
          "absolute inset-y-0 left-0 z-20 w-3 cursor-pointer",
          "before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-border before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-visible:outline-none focus-visible:before:opacity-100",
          open ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        title="Open AI Chat"
        aria-label="Open AI Chat"
      />

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
