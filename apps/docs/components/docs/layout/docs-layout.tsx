"use client";

import { useEffect, type ReactNode } from "react";
import {
  AssistantPanelContent,
  AssistantPanelToggle,
} from "@/components/docs/assistant/panel";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { DOCS_SIDEBAR_WIDTH } from "@/components/docs/contexts/sidebar";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const COLLAPSED_WIDTH = "12px";

export function getPanelWidth(open: boolean, width: number): string {
  return open ? `${width}px` : COLLAPSED_WIDTH;
}

export function DocsContent({ children }: { children: ReactNode }): ReactNode {
  const { open, width, isResizing } = useAssistantPanel();

  return (
    <div
      className={cn(
        "@container md:mr-(--chat-panel-width) md:ml-(--sidebar-width)",
        !isResizing &&
          "transition-[margin] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
      )}
      style={
        {
          "--chat-panel-width": getPanelWidth(open, width),
          "--sidebar-width": `${DOCS_SIDEBAR_WIDTH}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function DocsAssistantPanel(): ReactNode {
  const { open, width, isResizing, toggle } = useAssistantPanel();

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

  return (
    <div
      className={cn(
        "fixed top-0 right-0 bottom-0 z-50 hidden w-(--panel-width) md:block",
        !isResizing &&
          "transition-[width] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
      )}
      style={
        {
          "--panel-width": getPanelWidth(open, width),
          "--panel-content-width": `${width}px`,
        } as React.CSSProperties
      }
    >
      <AssistantPanelToggle />
      <div className="h-full overflow-hidden">
        <AssistantPanelContent />
      </div>
    </div>
  );
}
