"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AssistantCloud,
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { XuluxAnalyticsProvider } from "@/lib/xulux/analytics-context";
import { feedbackAdapter } from "@/lib/feedback-adapter";
import type { XuluxTemplate } from "./templates/types";
import { XuluxShell } from "./shell/XuluxShell";
import { createXuluxLocalThreadListAdapter } from "./runtime/xulux-thread-list-adapter";
import { createXuluxChatFetch } from "./runtime/xulux-chat-fetch";
import { anonymousSessionFetch } from "@/lib/anonymous-session-client";
import { XuluxThreadStatusObserver } from "./runtime/XuluxThreadStatusObserver";
import {
  parseXuluxLimitBlock,
  XuluxUsageBudgetProvider,
  type XuluxLimitBlock,
} from "./chat/XuluxUsageLimitBanner";
import type { XuluxActivePreviewContext } from "./runtime/types";
import {
  createInitialLearnProgress,
  readLearnProgress,
  writeLearnProgress,
} from "@/lib/xulux/learn/progress";
import { DEFAULT_LEARN_COURSE_ID } from "@/lib/xulux/learn/registry";
import type { LearnProgress } from "@/lib/xulux/learn/types";
import { toLearnContext } from "@/lib/xulux/learn/context";
import type { LearnAutoStartSource } from "@/lib/xulux/learn/types";

export type XuluxMode = "playground" | "learn";

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

export function XuluxApp({
  mode = "playground",
  courseId = DEFAULT_LEARN_COURSE_ID,
  autoStart = false,
  autoStartSource = "suggestion",
}: {
  mode?: XuluxMode;
  courseId?: string;
  autoStart?: boolean;
  autoStartSource?: LearnAutoStartSource;
}) {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [learnProgress, setLearnProgress] = useState<LearnProgress>(() =>
    createInitialLearnProgress(courseId),
  );
  const [learnReady, setLearnReady] = useState(mode !== "learn");
  const [selectedTemplateContext, setSelectedTemplateContext] =
    useState<SelectedTemplateContext | null>(null);
  const [activePreviewContext, setActivePreviewContext] =
    useState<XuluxActivePreviewContext | null>(null);

  const resetSession = () => {
    setSelectedTemplateContext(null);
    setActivePreviewContext(null);
  };

  useEffect(() => {
    if (mode !== "learn") return;
    const stored = readLearnProgress(window.localStorage, courseId);
    // The stored progress is a fresh object per read, so it cannot back a
    // cached external-store snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLearnProgress(stored);
    if (stored.threadId) setSessionId(stored.threadId);
    setLearnReady(true);
  }, [courseId, mode]);

  const updateLearnProgress = useCallback((progress: LearnProgress) => {
    setLearnProgress(progress);
    writeLearnProgress(window.localStorage, progress);
  }, []);

  return (
    <XuluxRuntimeProvider
      mode={mode}
      sessionId={sessionId}
      selectedTemplateContext={selectedTemplateContext}
      activePreviewContext={activePreviewContext}
      learnProgress={mode === "learn" ? learnProgress : null}
    >
      <AssistantPanelProvider>
        <XuluxShell
          mode={mode}
          courseId={courseId}
          autoStart={autoStart}
          autoStartSource={autoStartSource}
          learnProgress={learnProgress}
          learnReady={learnReady}
          onUpdateLearnProgress={updateLearnProgress}
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
  mode,
  sessionId,
  selectedTemplateContext,
  activePreviewContext,
  learnProgress,
  children,
}: {
  mode: XuluxMode;
  sessionId: string;
  selectedTemplateContext: SelectedTemplateContext | null;
  activePreviewContext: XuluxActivePreviewContext | null;
  learnProgress: LearnProgress | null;
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
      mode={mode}
      sessionId={sessionId}
      selectedTemplateContext={selectedTemplateContext}
      activePreviewContext={activePreviewContext}
      learnProgress={learnProgress}
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
  mode,
  sessionId,
  selectedTemplateContext,
  activePreviewContext,
  learnProgress,
  cloudBaseUrl,
  children,
}: {
  mode: XuluxMode;
  sessionId: string;
  selectedTemplateContext: SelectedTemplateContext | null;
  activePreviewContext: XuluxActivePreviewContext | null;
  learnProgress: LearnProgress | null;
  cloudBaseUrl: string;
  children: ReactNode;
}) {
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const selectedTemplateContextRef = useRef(selectedTemplateContext);
  selectedTemplateContextRef.current = selectedTemplateContext;
  const activePreviewContextRef = useRef(activePreviewContext);
  activePreviewContextRef.current = activePreviewContext;
  const learnProgressRef = useRef(learnProgress);
  learnProgressRef.current = learnProgress;
  const [limitBlock, setLimitBlock] = useState<XuluxLimitBlock | null>(null);
  const [limitSessionId, setLimitSessionId] = useState(sessionId);

  if (limitSessionId !== sessionId) {
    setLimitSessionId(sessionId);
    setLimitBlock(null);
  }

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

  const transport = useMemo(() => {
    const chatFetch = createXuluxChatFetch(anonymousSessionFetch);
    return new AssistantChatTransport({
      api: mode === "learn" ? "/api/xulux/learn/chat" : "/api/xulux/chat",
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
        get learnContext() {
          const progress = learnProgressRef.current;
          return progress ? toLearnContext(progress) : undefined;
        },
      },
      fetch: async (input, init) => {
        const res = await chatFetch(input, init);
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
    });
  }, [mode]);

  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function XuluxChatRuntimeHook() {
      return useChatRuntime({
        transport,
        isSendDisabled: limitBlock != null,
        adapters: {
          feedback: feedbackAdapter,
        },
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
