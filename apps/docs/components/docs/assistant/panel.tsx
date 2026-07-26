"use client";

import { AssistantThread } from "@/components/docs/assistant/thread";
import { Button } from "@/components/ui/button";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { COLLAPSED_WIDTH } from "@/components/docs/layout/docs-layout";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { PanelRightCloseIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

function canScrollVertically(element: HTMLElement, deltaY: number): boolean {
  if (element.scrollHeight <= element.clientHeight) return false;
  if (deltaY < 0) return element.scrollTop > 0;
  return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
}

function hasScrollableAncestor(
  target: EventTarget | null,
  boundary: HTMLElement,
  deltaY: number,
): boolean {
  if (!(target instanceof Node)) return false;

  let element = target instanceof HTMLElement ? target : target.parentElement;

  while (element && boundary.contains(element)) {
    const overflowY = window.getComputedStyle(element).overflowY;
    if (
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      canScrollVertically(element, deltaY)
    ) {
      return true;
    }

    if (element === boundary) break;
    element = element.parentElement;
  }

  return false;
}

function ResizeHandle() {
  const { width, setWidth, setIsResizing, isResizing } = useAssistantPanel();
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
    [width, setWidth, setIsResizing],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-2 bottom-2 left-1.5 w-1 cursor-col-resize",
        "after:absolute after:top-0 after:bottom-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:transition-colors",
        isResizing
          ? "after:bg-primary/40"
          : "hover:after:bg-primary/20 after:bg-transparent",
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
        "bg-background absolute top-1/2 left-0 z-10 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm transition-opacity duration-300",
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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!open || !content) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.ctrlKey) return;
      if (!hasScrollableAncestor(event.target, content, event.deltaY)) {
        event.preventDefault();
      }
    };

    content.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      content.removeEventListener("wheel", handleWheel, {
        capture: true,
      });
    };
  }, [open]);

  const handleTriggerClick = () => {
    analytics.assistant.panelToggled({ open: !open, source: "trigger" });
    toggle();
  };

  return (
    <div ref={contentRef} className="relative h-full w-(--panel-content-width)">
      <button
        type="button"
        onClick={handleTriggerClick}
        className={cn(
          "absolute inset-y-0 left-0 z-20 cursor-pointer",
          "before:bg-border before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-visible:outline-none focus-visible:before:opacity-100",
          open ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        style={{ width: COLLAPSED_WIDTH }}
        title="Open AI Chat"
        aria-label="Open AI Chat"
      />

      <div
        className={cn(
          "relative flex h-full flex-col p-2 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="border-border/60 bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
          <div className="min-h-0 flex-1">
            <AssistantThread />
          </div>
        </div>
        <ResizeHandle />
      </div>
    </div>
  );
}
