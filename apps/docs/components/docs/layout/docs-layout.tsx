"use client";

import type { ReactNode } from "react";
import {
  AssistantPanelContent,
  AssistantPanelToggle,
} from "@/components/docs/assistant/panel";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { cn } from "@/lib/utils";

export const COLLAPSED_WIDTH = "12px";

function getPanelWidth(open: boolean, width: number): string {
  return open ? `${width}px` : COLLAPSED_WIDTH;
}

export function DocsContent({ children }: { children: ReactNode }): ReactNode {
  const { open, width, isResizing } = useAssistantPanel();

  return (
    <div
      className={cn(
        "@container md:mr-(--chat-panel-width)",
        !isResizing && "transition-[margin] duration-300 ease-out",
      )}
      style={
        {
          "--chat-panel-width": getPanelWidth(open, width),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function DocsAssistantPanel(): ReactNode {
  const { open, width, isResizing } = useAssistantPanel();

  return (
    <div
      className={cn(
        "fixed top-12 right-0 bottom-0 hidden w-(--panel-width) md:block",
        !isResizing && "transition-[width] duration-300 ease-out",
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
