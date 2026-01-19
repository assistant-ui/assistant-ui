"use client";

import type { ReactNode } from "react";
import { AIChatPanel } from "@/components/docs/layout/ai-chat-panel";
import { useChatPanel } from "@/components/docs/contexts/chat-panel";
import { cn } from "@/lib/utils";

interface DocsWithChatProps {
  children: ReactNode;
}

export function DocsContentWithMargin({
  children,
}: DocsWithChatProps): React.ReactNode {
  const { open } = useChatPanel();

  return (
    <div
      className="transition-[margin] duration-200 md:mr-[var(--chat-panel-width)]"
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
        open ? "w-[400px]" : "w-12",
      )}
    >
      <AIChatPanel />
    </div>
  );
}
