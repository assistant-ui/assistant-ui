"use client";

import type { ReactNode } from "react";
import { AssistantPanel } from "@/components/docs/assistant/panel";
import { useAssistantPanel } from "@/components/docs/assistant/context";

export function DocsContent({ children }: { children: ReactNode }): ReactNode {
  const { open, width } = useAssistantPanel();
  const panelWidth = open ? `${width}px` : "44px";

  return (
    <div
      className="transition-[margin] duration-300 ease-out md:mr-(--chat-panel-width)"
      style={{ "--chat-panel-width": panelWidth } as React.CSSProperties}
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
        { "--panel-width": open ? `${width}px` : "44px" } as React.CSSProperties
      }
    >
      <AssistantPanel />
    </div>
  );
}
