"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import {
  parseXuluxLimitBlock,
  XuluxUsageBudgetProvider,
  type XuluxLimitBlock,
} from "./chat/XuluxUsageLimitBanner";

export type SelectedTemplateContext = Pick<
  XuluxTemplate,
  | "id"
  | "templateId"
  | "versionId"
  | "title"
  | "description"
  | "kind"
  | "prompt"
  | "previewUrl"
  | "downloadUrl"
  | "sourcePath"
  | "docsUrl"
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
  const [limitBlock, setLimitBlock] = useState<XuluxLimitBlock | null>(null);

  useEffect(() => {
    setLimitBlock(null);
  }, [sessionId]);

  const adapter = useMemo(
    () =>
      createXuluxLocalThreadListAdapter({
        getCurrentSessionId: () => sessionIdRef.current,
      }),
    [],
  );

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/xulux/chat",
        body: {
          sessionId,
          selectedTemplate: selectedTemplateContext,
        },
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          if (res.status === 429) {
            const payload = await res
              .clone()
              .json()
              .catch(() => null);
            const block = parseXuluxLimitBlock(payload);
            if (block) setLimitBlock(block);
          }
          return res;
        },
      }),
    [sessionId, selectedTemplateContext],
  );

  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function XuluxChatRuntimeHook() {
      return useChatRuntime({
        transport,
        isSendDisabled: limitBlock != null,
      });
    },
  });

  return (
    <XuluxUsageBudgetProvider
      limitBlock={limitBlock}
      clearLimitBlock={() => setLimitBlock(null)}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <XuluxThreadStatusObserver />
        {children}
      </AssistantRuntimeProvider>
    </XuluxUsageBudgetProvider>
  );
}
