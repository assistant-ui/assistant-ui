"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { ToolUIProvider } from "@assistant-ui/react";
import {
  ToolUIRuntimeImpl,
  SafeContentFrameSandbox,
} from "@assistant-ui/tool-ui-runtime";
import { useRef } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { toolUIRegistry } from "@/lib/registry";
import { TooltipProvider } from "./ui/tooltip";

/**
 * Custom hook to create and manage Tool UI runtime
 */
function useToolUIRuntimeSetup() {
  const runtimeRef = useRef<ToolUIRuntimeImpl | null>(null);

  if (!runtimeRef.current) {
    runtimeRef.current = new ToolUIRuntimeImpl({
      registry: toolUIRegistry,
      createSandbox: () => new SafeContentFrameSandbox(),
    });
  }

  return runtimeRef.current;
}

export function Assistant() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  const toolUIRuntime = useToolUIRuntimeSetup();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolUIProvider runtime={toolUIRuntime}>
        <TooltipProvider>
          <div className="h-dvh">
            <Thread />
          </div>
        </TooltipProvider>
      </ToolUIProvider>
    </AssistantRuntimeProvider>
  );
}
