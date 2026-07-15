"use client";

import { AssistantRuntimeProvider, Tools, useAui } from "@assistant-ui/react";
import { AssistantShell } from "@/components/assistant-ui/assistant-shell";
import { useOpenCodeRuntime } from "@assistant-ui/react-opencode";
import {
  Thread,
  type ThreadComponents,
} from "@/components/assistant-ui/thread";
import { OpenCodeDataPart } from "@/components/opencode-data-part";
import { FallbackTool } from "@/components/tools/opencode-tools";
import { ReasoningGroup } from "@/components/tools/reasoning-ghost";
import { ToolGroup } from "@/components/tools/tool-group";
import toolkit from "@/components/tools/toolkit";
import { MessagesSquare } from "lucide-react";
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

  useEffect(() => aui.dataRenderers.setFallbackDataUI(OpenCodeDataPart), [aui]);

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <AssistantShell
        logo={<MessagesSquare className="size-5" />}
        title="OpenCode"
      >
        <Thread components={THREAD_COMPONENTS} />
      </AssistantShell>
    </AssistantRuntimeProvider>
  );
}
