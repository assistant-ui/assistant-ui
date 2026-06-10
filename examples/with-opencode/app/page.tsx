"use client";

import { AssistantRuntimeProvider, Tools, useAui } from "@assistant-ui/react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  useOpenCodeRuntime,
  useOpenCodeSession,
} from "@assistant-ui/react-opencode";
import {
  Thread,
  type ThreadComponents,
} from "@/components/assistant-ui/thread";
import { OpenCodeDataPart } from "@/components/opencode-data-part";
import { FallbackTool } from "@/components/tools/opencode-tools";
import { ReasoningGroup } from "@/components/tools/reasoning-ghost";
import { ToolGroup } from "@/components/tools/tool-group";
import toolkit from "@/components/tools/toolkit";
import { useEffect } from "react";

const THREAD_COMPONENTS: ThreadComponents = {
  ToolFallback: FallbackTool,
  ToolGroup,
  ReasoningGroup,
};

export default function Home() {
  const runtime = useOpenCodeRuntime({
    baseUrl:
      process.env.NEXT_PUBLIC_OPENCODE_BASE_URL ?? "http://localhost:4096",
  });

  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  useEffect(
    () => aui.dataRenderers().setFallbackDataUI(OpenCodeDataPart),
    [aui],
  );

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full overflow-hidden pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="min-w-0">
                <div className="text-sm font-medium">OpenCode</div>
                <SelectedSessionTitle />
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <Thread components={THREAD_COMPONENTS} />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
}

function SelectedSessionTitle() {
  const session = useOpenCodeSession();
  const title = session?.title?.trim();

  if (!title) return null;

  return (
    <div className="text-muted-foreground truncate text-xs leading-tight">
      {title}
    </div>
  );
}
