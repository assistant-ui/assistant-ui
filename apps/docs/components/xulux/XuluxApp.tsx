"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { AssistantPanelProvider } from "@/components/docs/assistant/context";
import type { XuluxTemplate } from "./templates/types";
import { XuluxShell } from "./shell/XuluxShell";
import { createXuluxLocalThreadListAdapter } from "./runtime/xulux-thread-list-adapter";
import { XuluxThreadStatusObserver } from "./runtime/XuluxThreadStatusObserver";

export type SelectedTemplateContext = Pick<
  XuluxTemplate,
  "id" | "title" | "description" | "kind" | "prompt" | "sourcePath" | "docsUrl"
>;

export function XuluxApp() {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [selectedTemplateContext, setSelectedTemplateContext] =
    useState<SelectedTemplateContext | null>(null);

  const resetSession = () => {
    setSelectedTemplateContext(null);
  };

  return (
    <XuluxRuntimeProvider
      sessionId={sessionId}
      selectedTemplateContext={selectedTemplateContext}
    >
      <AssistantPanelProvider>
        <XuluxShell
          sessionId={sessionId}
          onSetSessionId={setSessionId}
          onSetSelectedTemplateContext={setSelectedTemplateContext}
          onResetSession={resetSession}
        />
      </AssistantPanelProvider>
    </XuluxRuntimeProvider>
  );
}

function XuluxRuntimeProvider({
  sessionId,
  selectedTemplateContext,
  children,
}: {
  sessionId: string;
  selectedTemplateContext: SelectedTemplateContext | null;
  children: ReactNode;
}) {
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const adapter = useMemo(
    () =>
      createXuluxLocalThreadListAdapter({
        getCurrentSessionId: () => sessionIdRef.current,
      }),
    [],
  );

  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function XuluxChatRuntimeHook() {
      return useChatRuntime({
        transport: new AssistantChatTransport({
          api: "/api/xulux/chat",
          body: {
            sessionId,
            selectedTemplate: selectedTemplateContext,
          },
        }),
      });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <XuluxThreadStatusObserver />
      {children}
    </AssistantRuntimeProvider>
  );
}
