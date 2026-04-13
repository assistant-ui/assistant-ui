"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
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
import { Thread } from "../components/assistant-ui/thread";

export default function Home() {
  const runtime = useOpenCodeRuntime({
    baseUrl:
      process.env.NEXT_PUBLIC_OPENCODE_BASE_URL ?? "http://localhost:4096",
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
              <div className="min-w-0">
                <div className="font-medium text-sm">OpenCode</div>
                <SelectedSessionTitle />
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <Thread />
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
    <div className="truncate text-muted-foreground text-xs leading-tight">
      {title}
    </div>
  );
}
