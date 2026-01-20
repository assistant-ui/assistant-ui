"use client";

import type { ReactNode } from "react";
import { AIChatPanel } from "@/components/docs/layout/ai-chat-panel";
import { useChatPanel } from "@/components/docs/contexts/chat-panel";
import { cn } from "@/lib/utils";

export function DocsContent({
  children,
}: {
  children: ReactNode;
}): React.ReactNode {
  const { open, width } = useChatPanel();

  return (
    <div
      className="transition-[margin] duration-300 ease-out md:mr-(--chat-panel-width)"
      style={{
        ["--chat-panel-width" as string]: open ? `${width}px` : "44px",
      }}
    >
      {children}
    </div>
  );
}

export function DocsChatPanel(): React.ReactNode {
  const { open, width } = useChatPanel();

  return (
    <div
      className={cn(
        "fixed top-12 right-0 bottom-0 hidden transition-[width] duration-300 ease-out md:block",
        !open && "w-11",
      )}
      style={open ? { width: `${width}px` } : undefined}
    >
      <AIChatPanel />
    </div>
  );
}
