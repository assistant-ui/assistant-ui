"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
  useAui,
} from "@assistant-ui/react";
import {
  AssistantShellMain,
  AssistantShellMobileSidebar,
  AssistantShellRoot,
  AssistantShellSidebar,
  AssistantShellSidebarToggle,
} from "@/components/assistant-ui/assistant-shell";
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

const SetFallbackDataUI = () => {
  const aui = useAui();
  useEffect(() => aui.dataRenderers.setFallbackDataUI(OpenCodeDataPart), [aui]);
  return null;
};

const THREAD_COMPONENTS: ThreadComponents = {
  ToolFallback: FallbackTool,
  ToolGroup,
  ReasoningGroup,
};

// OpenCode streams generated titles through its event stream into the session,
// not into the core thread list, so the shell's thread-list-backed title would
// go stale; read the session directly instead.
const SessionTitle = () => {
  const session = useOpenCodeSession();
  return (
    <span className="min-w-0 truncate text-sm font-medium">
      {session?.title?.trim() || "New Chat"}
    </span>
  );
};

export default function Home() {
  const runtime = useOpenCodeRuntime({
    baseUrl:
      process.env.NEXT_PUBLIC_OPENCODE_BASE_URL ?? "http://localhost:4096",
  });

  const config = AuiConfig({
    tools: Tools({ toolkit }),
  });

  return (
    <AssistantRuntimeProvider config={config} runtime={runtime}>
      <SetFallbackDataUI />
      <AssistantShellRoot title="OpenCode">
        <AssistantShellSidebar />
        <AssistantShellMain>
          <header className="flex h-12 shrink-0 items-center gap-2 px-4">
            <AssistantShellMobileSidebar />
            <AssistantShellSidebarToggle />
            <SessionTitle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Thread components={THREAD_COMPONENTS} />
          </main>
        </AssistantShellMain>
      </AssistantShellRoot>
    </AssistantRuntimeProvider>
  );
}
