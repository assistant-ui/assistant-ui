"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CurrentPageProvider } from "@/components/docs/contexts/current-page";
import {
  AssistantPanelProvider,
  useAssistantPanel,
} from "@/components/docs/assistant/context";
import { DocsAssistantRuntimeProvider } from "@/contexts/AssistantRuntimeProvider";
import {
  DocsAssistantPanel,
  getPanelWidth,
} from "@/components/docs/layout/docs-layout";

function HomeShift({
  isHome,
  children,
}: {
  isHome: boolean;
  children: ReactNode;
}) {
  const { open, width, isResizing } = useAssistantPanel();

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        isHome && "md:mr-(--chat-panel-width)",
        isHome &&
          !isResizing &&
          "transition-[margin] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
      )}
      style={
        isHome
          ? ({
              "--chat-panel-width": getPanelWidth(open, width),
            } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function HomeAssistant({ children }: { children: ReactNode }) {
  const isHome = usePathname() === "/";

  return (
    <CurrentPageProvider>
      <AssistantPanelProvider>
        <HomeShift isHome={isHome}>{children}</HomeShift>
        {isHome && (
          <DocsAssistantRuntimeProvider>
            <DocsAssistantPanel />
          </DocsAssistantRuntimeProvider>
        )}
      </AssistantPanelProvider>
    </CurrentPageProvider>
  );
}
