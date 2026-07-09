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
import { XuluxAnalyticsProvider } from "@/lib/xulux/analytics-context";
import type { XuluxTemplate } from "./templates/types";
import { XuluxShell } from "./shell/XuluxShell";
import { createXuluxLocalThreadListAdapter } from "./runtime/xulux-thread-list-adapter";
import { XuluxThreadStatusObserver } from "./runtime/XuluxThreadStatusObserver";
import {
  parseXuluxLimitBlock,
  XuluxUsageBudgetProvider,
  type XuluxLimitBlock,
} from "./chat/XuluxUsageLimitBanner";
import type { XuluxActivePreviewContext } from "./runtime/types";

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
  const [activePreviewContext, setActivePreviewContext] =
    useState<XuluxActivePreviewContext | null>(null);

  const resetSession = () => {
    setSelectedTemplateContext(null);
    setActivePreviewContext(null);
  };

  return (
    <XuluxRuntimeProvider
      sessionId={sessionId}
      selectedTemplateContext={selectedTemplateContext}
      activePreviewContext={activePreviewContext}
    >
      <AssistantPanelProvider>
        <XuluxShell
          sessionId={sessionId}
          onSetSessionId={setSessionId}
          onSetSelectedTemplateContext={setSelectedTemplateContext}
          onSetActivePreviewContext={setActivePreviewContext}
          onResetSession={resetSession}
        />
      </AssistantPanelProvider>
    </XuluxRuntimeProvider>
  );
}

function XuluxRuntimeProvider({
  sessionId,
  selectedTemplateContext,
  activePreviewContext,
  children,
}: {
  sessionId: string;
  selectedTemplateContext: SelectedTemplateContext | null;
  activePreviewContext: XuluxActivePreviewContext | null;
  children: ReactNode;
}) {
  const cloudBaseUrl =
    process.env.NEXT_PUBLIC_XULUX_ASSISTANT_BASE_URL ??
    process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;

  if (!cloudBaseUrl) {
    return <XuluxMissingCloudConfig />;
  }

  return (
    <XuluxRuntimeProviderInner
      sessionId={sessionId}
      selectedTemplateContext={selectedTemplateContext}
      activePreviewContext={activePreviewContext}
      cloudBaseUrl={cloudBaseUrl}
    >
      {children}
    </XuluxRuntimeProviderInner>
  );
}

function XuluxMissingCloudConfig() {
  return (
    <div className="text-muted-foreground flex min-h-[320px] items-center justify-center p-6 text-center text-sm">
      <p>
        Xulux playground requires{" "}
        <code className="text-foreground">NEXT_PUBLIC_ASSISTANT_BASE_URL</code>{" "}
        (or{" "}
        <code className="text-foreground">
          NEXT_PUBLIC_XULUX_ASSISTANT_BASE_URL
        </code>
        ) to be set for Assistant Cloud message history.
      </p>
    </div>
  );
}

function XuluxRuntimeProviderInner({
  sessionId,
  selectedTemplateContext,
  activePreviewContext,
  cloudBaseUrl,
  children,
}: {
  sessionId: string;
  selectedTemplateContext: SelectedTemplateContext | null;
  activePreviewContext: XuluxActivePreviewContext | null;
  cloudBaseUrl: string;
  children: ReactNode;
}) {
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const selectedTemplateContextRef = useRef(selectedTemplateContext);
  selectedTemplateContextRef.current = selectedTemplateContext;
  const activePreviewContextRef = useRef(activePreviewContext);
  activePreviewContextRef.current = activePreviewContext;
  const [limitBlock, setLimitBlock] = useState<XuluxLimitBlock | null>(null);

  useEffect(() => {
    setLimitBlock(null);
  }, [sessionId]);

  const assistantCloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: cloudBaseUrl,
        anonymous: true,
        telemetry: {
          beforeReport: (report) => ({
            ...report,
            metadata: {
              ...(report.metadata ?? {}),
              app: "xulux_playground",
            },
          }),
        },
      }),
    [cloudBaseUrl],
  );

  const adapter = useMemo(
    () =>
      createXuluxLocalThreadListAdapter({
        getCurrentSessionId: () => sessionIdRef.current,
        cloud: assistantCloud,
      }),
    [assistantCloud],
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
          get activePreviewContext() {
            return activePreviewContextRef.current;
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
      });
    },
  });

  return (
    <XuluxUsageBudgetProvider
      limitBlock={limitBlock}
      clearLimitBlock={() => setLimitBlock(null)}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <XuluxAnalyticsProvider sessionId={sessionId}>
          <XuluxThreadStatusObserver />
          {children}
        </XuluxAnalyticsProvider>
      </AssistantRuntimeProvider>
    </XuluxUsageBudgetProvider>
  );
}
