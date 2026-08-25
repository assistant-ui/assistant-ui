"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

const SM_BREAKPOINT = 640;

function useIsSmallScreen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.innerWidth < SM_BREAKPOINT,
    () => false,
  );
}
import { useAui, useAuiState, type ThreadMessage } from "@assistant-ui/react";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import {
  getXuluxTemplateAnalyticsId,
  useXuluxAnalytics,
  withXuluxContext,
} from "@/lib/xulux/analytics-context";
import { XuluxThread } from "../chat/XuluxThread";
import { XuluxTemplateProvider } from "../chat/XuluxTemplateContext";
import type { XuluxPreviewFrame, XuluxTemplate } from "../templates/types";
import type { SelectedTemplateContext } from "../XuluxApp";
import type { XuluxMode } from "../XuluxApp";
import { XuluxCanvas } from "../canvas/XuluxCanvas";
import { XuluxCanvasObserver } from "../canvas/XuluxCanvasObserver";
import { XuluxTemplatePreviewObserver } from "../canvas/XuluxTemplatePreviewObserver";
import { XuluxLandingPage } from "../landing/XuluxLandingPage";
import { TemplatesModal } from "../landing/TemplatesModal";
import { XuluxHeaderActions } from "./XuluxHeaderActions";
import {
  updateXuluxPendingUserMessage,
  updateXuluxThreadContext,
  updateXuluxThreadStatus,
  useXuluxStoredThreads,
} from "../runtime/xulux-local-storage";
import type {
  XuluxActivePreviewContext,
  XuluxCanvasSnapshot,
  XuluxJsonObject,
  XuluxStoredThread,
} from "../runtime/types";
import { LearnCanvas } from "../learn/LearnCanvas";
import {
  LearnCourseObserver,
  LearnModeProvider,
} from "../learn/LearnModeContext";
import { LearnStageSourceProvider } from "../learn/LearnStageSourceContext";
import {
  LEARN_START_MESSAGE,
  shouldAutoStartLearnCourse,
  startLearnCourse,
} from "@/lib/xulux/learn/session";
import { getLearnCourse } from "@/lib/xulux/learn/registry";
import type { LearnProgress } from "@/lib/xulux/learn/types";
import type {
  LearnAutoStartSource,
  LearnCourseStartSource,
} from "@/lib/xulux/learn/types";

const ASSISTANT_UI_REPO_URL = "https://github.com/assistant-ui/assistant-ui";

type XuluxViewMode = "landing" | "chat" | "preview";
type CanvasState = {
  status: "empty" | "loading" | "ready" | "error";
  url: string | null;
  source: "template" | "agent_template" | "refresh" | null;
  error: string | null;
  downloadUrl?: string;
  previewFrame?: XuluxPreviewFrame;
  templateId?: string;
  versionId?: string;
  title?: string;
};
type PromptStart = {
  source: "typed_prompt" | "suggestion";
  suggestionId?: string;
  suggestionGroup?: string;
  suggestionLabel?: string;
};

export function XuluxShell({
  mode,
  courseId,
  autoStart,
  autoStartSource,
  learnProgress,
  learnReady,
  onUpdateLearnProgress,
  sessionId,
  onSetSessionId,
  onSetSelectedTemplateContext,
  onSetActivePreviewContext,
  onResetSession,
}: {
  mode: XuluxMode;
  courseId: string;
  autoStart: boolean;
  autoStartSource: LearnAutoStartSource;
  learnProgress: LearnProgress;
  learnReady: boolean;
  onUpdateLearnProgress: (progress: LearnProgress) => void;
  sessionId: string;
  onSetSessionId: (sessionId: string) => void;
  onSetSelectedTemplateContext: (
    template: SelectedTemplateContext | null,
  ) => void;
  onSetActivePreviewContext: (
    context: XuluxActivePreviewContext | null,
  ) => void;
  onResetSession: () => void;
}) {
  const { askAI } = useAssistantPanel();
  const aui = useAui();
  const analyticsCtx = useXuluxAnalytics();
  const isSmallScreen = useIsSmallScreen();
  const currentRemoteId = useAuiState((state) => state.threadListItem.remoteId);
  const isThreadRunning = useAuiState((state) => state.thread.isRunning);
  const threadMessages = useAuiState((state) => state.thread.messages);
  const storedThreads = useXuluxStoredThreads();
  const [viewMode, setViewMode] = useState<XuluxViewMode>("landing");
  const [selectedTemplate, setSelectedTemplate] =
    useState<XuluxTemplate | null>(null);
  const [selectedTemplateContext, setSelectedTemplateContext] =
    useState<SelectedTemplateContext | null>(null);
  const [activePreviewContext, setActivePreviewContext] =
    useState<XuluxActivePreviewContext | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [canvas, setCanvas] = useState<CanvasState>({
    status: "empty",
    url: null,
    source: null,
    error: null,
  });
  const viewedRef = useRef(false);
  const previewTrackedRef = useRef<string | null>(null);
  const autoStartRef = useRef(false);
  const startInFlightRef = useRef(false);
  const startRequestRunningRef = useRef(false);
  const startProgressRef = useRef<LearnProgress | null>(null);
  const restoredLearnThreadRef = useRef<string | null>(null);
  const learnCourse = useMemo(() => getLearnCourse(courseId), [courseId]);

  useEffect(() => {
    if (!learnReady) return;
    if (viewedRef.current) return;
    viewedRef.current = true;
    if (mode === "learn") {
      analytics.xulux.learnPageViewed(
        withXuluxContext(analyticsCtx, {
          course_id: courseId,
          status: learnProgress.status,
        }),
      );
      return;
    }
    analytics.xulux.playgroundViewed(withXuluxContext(analyticsCtx, {}));
  }, [analyticsCtx, courseId, learnProgress.status, learnReady, mode]);

  useEffect(() => {
    previewTrackedRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!startInFlightRef.current) return;
    if (isThreadRunning) {
      startRequestRunningRef.current = true;
      return;
    }
    if (!startRequestRunningRef.current) return;

    startInFlightRef.current = false;
    startRequestRunningRef.current = false;
    const previousProgress = startProgressRef.current;
    startProgressRef.current = null;
    const hasAssistantMessage = threadMessages.some(
      ({ role }) => role === "assistant",
    );
    if (!previousProgress || hasAssistantMessage) return;
    onUpdateLearnProgress(previousProgress);
  }, [isThreadRunning, onUpdateLearnProgress, threadMessages]);

  const handleStartChat = useCallback(
    (prompt: string, start: PromptStart = { source: "typed_prompt" }) => {
      analytics.xulux.promptSubmitted(
        withXuluxContext(analyticsCtx, {
          source: start.source,
          message_length: prompt.length,
          ...(start.suggestionGroup
            ? { suggestion_group: start.suggestionGroup }
            : {}),
          ...(start.suggestionLabel
            ? { suggestion_label: start.suggestionLabel }
            : {}),
        }),
      );
      updateXuluxPendingUserMessage(currentRemoteId ?? sessionId, prompt);
      setSelectedTemplate(null);
      setSelectedTemplateContext(null);
      setActivePreviewContext(null);
      onSetSelectedTemplateContext(null);
      onSetActivePreviewContext(null);
      setCanvas({ status: "empty", url: null, source: null, error: null });
      setViewMode("chat");
      setTemplatesOpen(false);
      aui.thread.append({
        role: "user",
        content: [{ type: "text", text: prompt }],
        ...(start.suggestionId
          ? {
              runConfig: {
                custom: { xuluxSuggestionId: start.suggestionId },
              },
            }
          : {}),
      });
    },
    [
      analyticsCtx,
      aui,
      currentRemoteId,
      onSetActivePreviewContext,
      onSetSelectedTemplateContext,
      sessionId,
    ],
  );

  const handleStartCourse = useCallback(
    (source: LearnCourseStartSource) => {
      if (!learnReady) return;
      if (startInFlightRef.current) return;
      const transition = startLearnCourse(learnProgress, sessionId);
      if (!transition.shouldSubmitStartMessage) {
        setViewMode("chat");
        return;
      }

      startInFlightRef.current = true;
      startRequestRunningRef.current = false;
      startProgressRef.current = learnProgress;
      try {
        handleStartChat(LEARN_START_MESSAGE);
        onUpdateLearnProgress(transition.progress);
        analytics.xulux.learnCourseStarted(
          withXuluxContext(analyticsCtx, {
            course_id: courseId,
            source,
          }),
        );
      } catch {
        startInFlightRef.current = false;
        startProgressRef.current = null;
      }
    },
    [
      analyticsCtx,
      courseId,
      handleStartChat,
      learnProgress,
      learnReady,
      onUpdateLearnProgress,
      sessionId,
    ],
  );

  useEffect(() => {
    if (
      mode !== "learn" ||
      !learnReady ||
      autoStartRef.current ||
      !shouldAutoStartLearnCourse(learnProgress, autoStart)
    ) {
      return;
    }
    autoStartRef.current = true;
    handleStartCourse(autoStartSource);
  }, [
    autoStart,
    autoStartSource,
    handleStartCourse,
    learnProgress,
    learnReady,
    mode,
  ]);

  useEffect(() => {
    if (
      mode !== "learn" ||
      !learnReady ||
      startInFlightRef.current ||
      learnProgress.status === "not_started" ||
      !learnProgress.threadId
    ) {
      return;
    }

    setViewMode("chat");
    const storedLearnThread = storedThreads.find(
      (thread) =>
        thread.custom.sessionId === learnProgress.threadId &&
        thread.remoteId.startsWith("thread_"),
    );
    if (
      !storedLearnThread ||
      restoredLearnThreadRef.current === storedLearnThread.remoteId ||
      currentRemoteId === storedLearnThread.remoteId
    ) {
      return;
    }

    restoredLearnThreadRef.current = storedLearnThread.remoteId;
    void Promise.resolve(
      aui.threads().switchToThread(storedLearnThread.remoteId),
    ).catch(() => {
      restoredLearnThreadRef.current = null;
    });
  }, [aui, currentRemoteId, learnProgress, learnReady, mode, storedThreads]);

  const handleSelectTemplate = useCallback(
    (template: XuluxTemplate) => {
      const context = toSelectedTemplateContext(template);
      void aui.threads.switchToNewThread();
      const previewContext = toTemplateModalPreviewContext(template);
      setSelectedTemplate(template);
      setSelectedTemplateContext(context);
      setActivePreviewContext(previewContext);
      onSetSelectedTemplateContext(context);
      onSetActivePreviewContext(previewContext);
      setCanvas({
        status: template.previewUrl ? "ready" : "empty",
        url: template.previewUrl ?? null,
        source: template.previewUrl ? "template" : null,
        error: null,
        ...(template.downloadUrl ? { downloadUrl: template.downloadUrl } : {}),
        ...(template.previewFrame
          ? { previewFrame: template.previewFrame }
          : {}),
        templateId: getXuluxTemplateAnalyticsId(template),
        ...(template.versionId ? { versionId: template.versionId } : {}),
        title: template.title,
      });
      setTemplatesOpen(false);
      setViewMode(template.previewUrl ? "preview" : "chat");
    },
    [aui, onSetActivePreviewContext, onSetSelectedTemplateContext],
  );

  const handleNewChat = useCallback(() => {
    const nextSessionId = crypto.randomUUID();
    onSetSessionId(nextSessionId);
    setSelectedTemplate(null);
    setSelectedTemplateContext(null);
    setActivePreviewContext(null);
    setCanvas({ status: "empty", url: null, source: null, error: null });
    onSetActivePreviewContext(null);
    previewTrackedRef.current = null;
    setTemplatesOpen(false);
    setViewMode("landing");
    onResetSession();
    void aui.threads.switchToNewThread();
  }, [aui, onResetSession, onSetActivePreviewContext, onSetSessionId]);

  const handleRestoreThread = useCallback(
    (thread: XuluxStoredThread) => {
      const restoredTemplate = thread.custom.selectedTemplate ?? null;
      const restoredPreviewContext = thread.custom.activePreviewContext ?? null;
      onSetSessionId(thread.custom.sessionId);
      setSelectedTemplate(null);
      setSelectedTemplateContext(restoredTemplate);
      setActivePreviewContext(restoredPreviewContext);
      onSetSelectedTemplateContext(restoredTemplate);
      onSetActivePreviewContext(restoredPreviewContext);
      setCanvas(fromCanvasSnapshot(thread.custom.canvas));
      setTemplatesOpen(false);
      setViewMode(thread.custom.canvas?.url ? "preview" : "chat");
    },
    [onSetActivePreviewContext, onSetSelectedTemplateContext, onSetSessionId],
  );

  const activeStoredThread =
    storedThreads.find((thread) => thread.remoteId === currentRemoteId) ?? null;
  const isInterrupted =
    activeStoredThread?.custom.xuluxStatus === "interrupted";
  const runtimeMessages = useAuiState((s) => s.thread.messages);
  const interruptedUserMessage = useMemo(() => {
    if (!isInterrupted || !currentRemoteId) return null;
    const pending = activeStoredThread?.custom.pendingUserMessage?.trim();
    if (pending) return pending;
    return getLatestUserTextFromMessages(runtimeMessages);
  }, [activeStoredThread, currentRemoteId, isInterrupted, runtimeMessages]);

  useEffect(() => {
    if (!isInterrupted || !currentRemoteId) return;
    if (activeStoredThread?.custom.pendingUserMessage?.trim()) return;

    const latestUserText = getLatestUserTextFromMessages(runtimeMessages);
    if (latestUserText) {
      updateXuluxPendingUserMessage(currentRemoteId, latestUserText);
    }
  }, [activeStoredThread, currentRemoteId, isInterrupted, runtimeMessages]);

  const handleRetryInterrupted = useCallback(() => {
    if (!interruptedUserMessage) return;
    analytics.xulux.promptSubmitted(
      withXuluxContext(analyticsCtx, {
        source: "retry",
        message_length: interruptedUserMessage.length,
      }),
    );
    updateXuluxPendingUserMessage(
      currentRemoteId ?? sessionId,
      interruptedUserMessage,
    );
    updateXuluxThreadStatus(currentRemoteId ?? sessionId, "running");
    setViewMode("chat");

    const messages = aui.thread.getState().messages;
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    if (lastUserMessage) {
      void aui.thread.startRun({ parentId: lastUserMessage.id });
      return;
    }

    askAI(interruptedUserMessage);
  }, [
    analyticsCtx,
    askAI,
    aui,
    currentRemoteId,
    interruptedUserMessage,
    sessionId,
  ]);

  useEffect(() => {
    if (!currentRemoteId) return;
    updateXuluxThreadContext(currentRemoteId, {
      selectedTemplate: selectedTemplateContext,
      activePreviewContext,
      canvas: toCanvasSnapshot(
        canvas,
        selectedTemplate?.title ?? selectedTemplateContext?.title,
      ),
    });
  }, [
    activePreviewContext,
    canvas,
    currentRemoteId,
    selectedTemplate,
    selectedTemplateContext,
  ]);

  useEffect(() => {
    if (canvas.status !== "ready" || !canvas.url || !canvas.source) return;
    const source =
      canvas.source === "refresh" ? "agent_sandbox" : canvas.source;
    const key = `${source}:${canvas.url}`;
    if (previewTrackedRef.current === key) return;
    previewTrackedRef.current = key;
    analytics.xulux.previewShown(
      withXuluxContext(analyticsCtx, {
        source,
        ...(canvas.templateId ? { template_id: canvas.templateId } : {}),
      }),
    );
  }, [
    analyticsCtx,
    canvas.source,
    canvas.status,
    canvas.templateId,
    canvas.url,
  ]);

  const sourceUrl =
    canvas.source === "template" &&
    (selectedTemplate || selectedTemplateContext)
      ? getTemplateSourceUrl(selectedTemplate ?? selectedTemplateContext!)
      : undefined;
  const canvasTitle = canvas.title ?? selectedTemplate?.title;

  if (mode === "learn") {
    if (!learnReady) {
      return (
        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
          Loading course…
        </div>
      );
    }

    const started = learnProgress.status !== "not_started";
    return (
      <XuluxTemplateProvider template={null}>
        <LearnModeProvider
          course={learnCourse}
          progress={learnProgress}
          updateProgress={onUpdateLearnProgress}
        >
          <LearnStageSourceProvider>
            <LearnCourseObserver />
            <div className="bg-background text-foreground grid h-full min-h-0 grid-rows-[minmax(0,55%)_minmax(0,45%)] overflow-hidden md:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)] md:grid-rows-1">
              <section
                className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b md:border-r md:border-b-0"
                aria-label="Learn chat"
              >
                <XuluxThread
                  learn={{
                    started,
                    onStartCourse: () => handleStartCourse("chat"),
                  }}
                />
              </section>
              <LearnCanvas
                onStartCourse={() => handleStartCourse("curriculum")}
              />
            </div>
          </LearnStageSourceProvider>
        </LearnModeProvider>
      </XuluxTemplateProvider>
    );
  }

  return (
    <XuluxTemplateProvider template={selectedTemplateContext}>
      <div className="bg-background text-foreground flex h-full min-h-0 flex-col overflow-hidden">
        <XuluxCanvasObserver
          onCanvasReady={(url) => {
            setCanvas({
              status: "ready",
              url,
              source: "refresh",
              error: null,
            });
            setViewMode("preview");
          }}
          onCanvasError={(error) => {
            setCanvas({ status: "error", url: null, source: null, error });
            setViewMode("preview");
          }}
        />
        <XuluxTemplatePreviewObserver
          onTemplatePreviewReady={(preview) => {
            setCanvas({
              status: "ready",
              url: preview.previewUrl,
              source: "agent_template",
              error: null,
              ...(preview.downloadUrl
                ? { downloadUrl: preview.downloadUrl }
                : {}),
              ...(preview.previewFrame
                ? { previewFrame: preview.previewFrame }
                : {}),
              templateId: preview.templateId,
              ...(preview.versionId !== undefined
                ? { versionId: preview.versionId }
                : {}),
              title: preview.title,
            });
            const previewContext = toAgentPreviewContext(preview);
            setActivePreviewContext(previewContext);
            onSetActivePreviewContext(previewContext);
            setViewMode("preview");
          }}
          onCanvasError={(error) => {
            setCanvas({ status: "error", url: null, source: null, error });
            setViewMode("preview");
          }}
        />

        <XuluxHeaderActions
          visible
          showChatActions={viewMode !== "landing"}
          onNewChat={handleNewChat}
          onShowTemplates={() => setTemplatesOpen(true)}
          onRestoreThread={handleRestoreThread}
        />

        {viewMode === "landing" ? (
          <XuluxLandingPage
            onStartChat={handleStartChat}
            onSelectTemplate={handleSelectTemplate}
          />
        ) : viewMode === "preview" ? (
          isSmallScreen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-hidden">
                <XuluxCanvas
                  sessionId={sessionId}
                  status={canvas.status}
                  previewUrl={canvas.url}
                  source={canvas.source}
                  error={canvas.error}
                  {...(canvas.templateId
                    ? { templateId: canvas.templateId }
                    : {})}
                  {...(canvas.downloadUrl
                    ? { downloadUrl: canvas.downloadUrl }
                    : {})}
                  {...(canvas.versionId ? { versionId: canvas.versionId } : {})}
                  {...(canvas.previewFrame
                    ? { previewFrame: canvas.previewFrame }
                    : {})}
                  {...(sourceUrl ? { sourceUrl } : {})}
                  {...(canvasTitle ? { title: canvasTitle } : {})}
                />
              </div>
              <div className="flex h-[45%] min-h-[180px] flex-col overflow-hidden border-t">
                {isInterrupted && (
                  <InterruptedRunBanner
                    lastUserMessage={interruptedUserMessage}
                    onRetry={handleRetryInterrupted}
                  />
                )}
                <XuluxThread onNewThread={handleNewChat} />
              </div>
            </div>
          ) : (
            <Group
              orientation="horizontal"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <Panel
                defaultSize="30%"
                minSize="20%"
                maxSize="55%"
                className="flex h-full flex-col overflow-hidden border-r"
              >
                {isInterrupted && (
                  <InterruptedRunBanner
                    lastUserMessage={interruptedUserMessage}
                    onRetry={handleRetryInterrupted}
                  />
                )}
                <XuluxThread onNewThread={handleNewChat} />
              </Panel>
              <Separator className="bg-border hover:bg-primary/30 w-1 cursor-col-resize transition-colors" />
              <Panel className="h-full overflow-hidden">
                <XuluxCanvas
                  sessionId={sessionId}
                  status={canvas.status}
                  previewUrl={canvas.url}
                  source={canvas.source}
                  error={canvas.error}
                  {...(canvas.templateId
                    ? { templateId: canvas.templateId }
                    : {})}
                  {...(canvas.downloadUrl
                    ? { downloadUrl: canvas.downloadUrl }
                    : {})}
                  {...(canvas.versionId ? { versionId: canvas.versionId } : {})}
                  {...(canvas.previewFrame
                    ? { previewFrame: canvas.previewFrame }
                    : {})}
                  {...(sourceUrl ? { sourceUrl } : {})}
                  {...(canvasTitle ? { title: canvasTitle } : {})}
                />
              </Panel>
            </Group>
          )
        ) : (
          <div className="flex min-h-0 flex-1 justify-center overflow-hidden">
            <section className="flex w-full max-w-3xl flex-col">
              {isInterrupted && (
                <InterruptedRunBanner
                  lastUserMessage={interruptedUserMessage}
                  onRetry={handleRetryInterrupted}
                />
              )}
              <XuluxThread onNewThread={handleNewChat} />
            </section>
          </div>
        )}

        <TemplatesModal
          open={templatesOpen}
          onOpenChange={setTemplatesOpen}
          onSelect={handleSelectTemplate}
          openSurface="header"
        />
      </div>
    </XuluxTemplateProvider>
  );
}

function toSelectedTemplateContext(
  template: XuluxTemplate,
): SelectedTemplateContext {
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    kind: template.kind,
    prompt: template.prompt,
    ...(template.sourcePath ? { sourcePath: template.sourcePath } : {}),
    ...(template.docsUrl ? { docsUrl: template.docsUrl } : {}),
    ...(template.templateId ? { templateId: template.templateId } : {}),
    ...(template.versionId ? { versionId: template.versionId } : {}),
    ...(template.previewUrl ? { previewUrl: template.previewUrl } : {}),
    ...(template.downloadUrl ? { downloadUrl: template.downloadUrl } : {}),
  };
}

function toTemplateModalPreviewContext(
  template: XuluxTemplate,
): XuluxActivePreviewContext | null {
  if (!template.previewUrl) return null;
  return {
    source: "template_modal",
    templateId: template.templateId ?? template.id,
    versionId: template.versionId ?? null,
    customized: false,
  };
}

function toAgentPreviewContext(preview: {
  templateId: string;
  versionId?: string;
  customized: boolean;
  config?: XuluxJsonObject;
}): XuluxActivePreviewContext {
  return {
    source: "agent_tool",
    templateId: preview.templateId,
    versionId: preview.versionId ?? null,
    customized: preview.customized,
    ...(preview.config ? { config: preview.config } : {}),
  };
}

function getTemplateSourceUrl(
  template: XuluxTemplate | SelectedTemplateContext,
): string | undefined {
  if (!template.sourcePath) return template.docsUrl;
  if (/^https?:\/\//i.test(template.sourcePath)) return template.sourcePath;
  return `${ASSISTANT_UI_REPO_URL}/tree/main/${template.sourcePath}`;
}

function toCanvasSnapshot(
  canvas: CanvasState,
  title: string | undefined,
): XuluxCanvasSnapshot {
  return {
    status: canvas.status === "loading" ? "empty" : canvas.status,
    url: canvas.url,
    source: canvas.source,
    error: canvas.error,
    ...(canvas.downloadUrl ? { downloadUrl: canvas.downloadUrl } : {}),
    ...(canvas.previewFrame ? { previewFrame: canvas.previewFrame } : {}),
    ...(canvas.templateId ? { templateId: canvas.templateId } : {}),
    ...(canvas.versionId ? { versionId: canvas.versionId } : {}),
    ...(title ? { title } : {}),
  };
}

function fromCanvasSnapshot(
  snapshot: XuluxCanvasSnapshot | undefined,
): CanvasState {
  if (!snapshot) {
    return { status: "empty", url: null, source: null, error: null };
  }
  return {
    status: snapshot.status,
    url: snapshot.url,
    source: snapshot.source,
    error: snapshot.error,
    ...(snapshot.downloadUrl ? { downloadUrl: snapshot.downloadUrl } : {}),
    ...(snapshot.previewFrame ? { previewFrame: snapshot.previewFrame } : {}),
    ...(snapshot.templateId ? { templateId: snapshot.templateId } : {}),
    ...(snapshot.versionId ? { versionId: snapshot.versionId } : {}),
    ...(snapshot.title ? { title: snapshot.title } : {}),
  };
}

function getLatestUserTextFromMessages(
  messages: readonly ThreadMessage[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== "user") continue;
    const text = msg.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n")
      .trim();
    if (text) return text;
  }
  return null;
}

function previewText(text: string): string {
  return text.length > 96 ? `${text.slice(0, 93)}...` : text;
}

function InterruptedRunBanner({
  lastUserMessage,
  onRetry,
}: {
  lastUserMessage: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="mx-3 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-amber-700 dark:text-amber-300">
            This run was interrupted.
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {lastUserMessage
              ? `Retry the last saved request: "${previewText(lastUserMessage)}"`
              : "The original request was not saved, so this run cannot be retried safely."}
          </p>
        </div>
        {lastUserMessage && (
          <Button
            type="button"
            size="sm"
            className="h-7 shrink-0 px-2.5 text-xs"
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
