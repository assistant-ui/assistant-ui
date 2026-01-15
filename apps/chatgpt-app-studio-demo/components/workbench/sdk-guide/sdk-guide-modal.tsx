"use client";

import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  AssistantModalPrimitive,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { useWorkbenchStore, useIsSDKGuideOpen } from "@/lib/workbench/store";
import { SDKGuideThread } from "./sdk-guide-thread";

function getWorkbenchContext() {
  const state = useWorkbenchStore.getState();
  return {
    selectedComponent: state.selectedComponent,
    displayMode: state.displayMode,
    toolInput: state.toolInput,
    toolOutput: state.toolOutput,
    widgetState: state.widgetState,
    recentConsoleLogs: state.consoleLogs.slice(-10),
  };
}

function SDKGuideRuntimeProvider({ children }: { children: React.ReactNode }) {
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/sdk-guide",
        body: () => ({
          workbenchContext: getWorkbenchContext(),
        }),
      }),
    [],
  );

  const runtime = useChatRuntime({ transport });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

export function SDKGuideModal() {
  const isOpen = useIsSDKGuideOpen();
  const setSDKGuideOpen = useWorkbenchStore((s) => s.setSDKGuideOpen);

  return (
    <SDKGuideRuntimeProvider>
      <AssistantModalPrimitive.Root
        open={isOpen}
        onOpenChange={setSDKGuideOpen}
      >
        <AssistantModalPrimitive.Anchor className="fixed right-4 bottom-4 size-0" />
        <AssistantModalPrimitive.Content
          side="top"
          align="end"
          sideOffset={16}
          className="data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 flex h-[calc(100vh-6rem)] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-clip rounded-xl border bg-background/90 text-popover-foreground shadow-lg outline-none backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in [&>.aui-thread-root]:bg-inherit"
        >
          <SDKGuideThread />
        </AssistantModalPrimitive.Content>
      </AssistantModalPrimitive.Root>
    </SDKGuideRuntimeProvider>
  );
}
