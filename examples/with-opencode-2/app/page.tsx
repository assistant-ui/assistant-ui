"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { useOpenCodeRuntime } from "@assistant-ui/react-opencode-2";
import { Thread } from "../components/assistant-ui/thread";
import { OpenCodePermissions } from "../components/opencode-permissions";

export default function Home() {
  const runtime = useOpenCodeRuntime({
    baseUrl:
      process.env["NEXT_PUBLIC_OPENCODE_BASE_URL"] ?? "http://localhost:4096",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full overflow-hidden pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div>
                <div className="font-medium text-sm">OpenCode v2</div>
                <div className="text-muted-foreground text-xs">
                  Existing assistant-ui primitives only
                </div>
              </div>
            </header>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="min-w-0 flex-1 overflow-hidden">
                <Thread />
              </div>
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l bg-background p-4 lg:block">
                <OpenCodePermissions />
              </aside>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
}
