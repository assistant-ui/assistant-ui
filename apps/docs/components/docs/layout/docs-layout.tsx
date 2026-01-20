"use client";

import type { ReactNode } from "react";
import { AIChatPanel } from "@/components/docs/layout/ai-chat-panel";
import { useChatPanel } from "@/components/docs/contexts/chat-panel";
import { SidebarRuntimeProvider } from "@/contexts/SidebarRuntimeProvider";
import { cn } from "@/lib/utils";

export function DocsContent({
  children,
}: {
  children: ReactNode;
}): React.ReactNode {
  const { open } = useChatPanel();

  return (
    <div
      className="transition-[margin] duration-200 md:mr-(--chat-panel-width)"
      style={{
        ["--chat-panel-width" as string]: open ? "400px" : "48px",
      }}
    >
      {children}
    </div>
  );
}

export function DocsChatPanel(): React.ReactNode {
  const { open } = useChatPanel();

  return (
    <div
      className={cn(
        "fixed top-12 right-0 bottom-0 hidden transition-[width] duration-200 md:block",
        open ? "w-100" : "w-12",
      )}
    >
      <SidebarRuntimeProvider>
        <AIChatPanel />
      </SidebarRuntimeProvider>
    </div>
  );
}
