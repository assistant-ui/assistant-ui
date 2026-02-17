"use client";

import type { ReactNode } from "react";
import {
  AssistantPanelContent,
  AssistantPanelToggle,
} from "@/components/docs/assistant/panel";
import { useAssistantPanel } from "@/components/docs/assistant/context";

const COLLAPSED_WIDTH = "12px";

function getPanelWidth(open: boolean, width: number): string {
  return open ? `${width}px` : COLLAPSED_WIDTH;
}

export function DocsContent({ children }: { children: ReactNode }): ReactNode {
  const { open, width } = useAssistantPanel();

  return (
    <div
      className="@container transition-[margin] duration-300 ease-out md:mr-(--chat-panel-width)"
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
  const { open, width } = useAssistantPanel();

  return (
    <div
      className="fixed top-12 right-0 bottom-0 hidden w-(--panel-width) transition-[width] duration-300 ease-out md:block"
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
