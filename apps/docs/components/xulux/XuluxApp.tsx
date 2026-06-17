"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AssistantCloud,
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
  const selectedTemplateContextRef = useRef(selectedTemplateContext);
  selectedTemplateContextRef.current = selectedTemplateContext;
  const [limitBlock, setLimitBlock] = useState<XuluxLimitBlock | null>(null);

  useEffect(() => {
    setLimitBlock(null);
  }, [sessionId]);

  const assistantCloud = useMemo(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_XULUX_ASSISTANT_BASE_URL ??
      process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;
    if (!baseUrl) return null;
    return new AssistantCloud({ baseUrl, anonymous: true });
  }, []);

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
          get sessionId() {
            return sessionIdRef.current;
          },
          get selectedTemplate() {
            return selectedTemplateContextRef.current;
          },
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
    [],
  );

  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function XuluxChatRuntimeHook() {
      return useChatRuntime({
        transport,
        isSendDisabled: limitBlock != null,
        ...(assistantCloud ? { cloud: assistantCloud } : {}),
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
