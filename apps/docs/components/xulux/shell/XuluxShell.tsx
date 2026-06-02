"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { Button } from "@/components/ui/button";
import { XuluxThread } from "../chat/XuluxThread";
import type { XuluxTemplate } from "../templates/types";
import type { SelectedTemplateContext } from "../XuluxApp";
import { XuluxCanvas } from "../canvas/XuluxCanvas";
import { XuluxCanvasObserver } from "../canvas/XuluxCanvasObserver";
import { XuluxLandingPage } from "../landing/XuluxLandingPage";
import { TemplatesModal } from "../landing/TemplatesModal";
import { XuluxHeaderActions } from "./XuluxHeaderActions";
import {
  getXuluxTextFromParts,
  readXuluxMessages,
  updateXuluxPendingUserMessage,
  updateXuluxThreadContext,
  useXuluxStoredThreads,
  type XuluxCanvasSnapshot,
  type XuluxStoredThread,
} from "../runtime/xulux-local-storage";

const ASSISTANT_UI_REPO_URL = "https://github.com/assistant-ui/assistant-ui";

type XuluxViewMode = "landing" | "chat" | "preview";
type CanvasState = {
  status: "empty" | "loading" | "ready" | "error";
  url: string | null;
  source: "template" | "refresh" | null;
  error: string | null;
};

export function XuluxShell({
  sessionId,
  onSetSessionId,
  onSetSelectedTemplateContext,
  onResetSession,
}: {
  sessionId: string;
  onSetSessionId: (sessionId: string) => void;
  onSetSelectedTemplateContext: (
    template: SelectedTemplateContext | null,
  ) => void;
  onResetSession: () => void;
}) {
  const { askAI } = useAssistantPanel();
  const aui = useAui();
  const currentRemoteId = useAuiState((state) => state.threadListItem.remoteId);
  const storedThreads = useXuluxStoredThreads();
  const [viewMode, setViewMode] = useState<XuluxViewMode>("landing");
  const [selectedTemplate, setSelectedTemplate] =
    useState<XuluxTemplate | null>(null);
  const [selectedTemplateContext, setSelectedTemplateContext] =
    useState<SelectedTemplateContext | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [canvas, setCanvas] = useState<CanvasState>({
    status: "empty",
    url: null,
    source: null,
    error: null,
  });

  const handleStartChat = useCallback(
    (prompt: string) => {
      updateXuluxPendingUserMessage(currentRemoteId ?? sessionId, prompt);
      setSelectedTemplate(null);
      setSelectedTemplateContext(null);
      onSetSelectedTemplateContext(null);
      setCanvas({ status: "empty", url: null, source: null, error: null });
      setViewMode("chat");
      setTemplatesOpen(false);
      askAI(prompt);
    },
    [askAI, currentRemoteId, onSetSelectedTemplateContext, sessionId],
  );

  const handleSelectTemplate = useCallback(
    (template: XuluxTemplate) => {
      const context = toSelectedTemplateContext(template);
      setSelectedTemplate(template);
      setSelectedTemplateContext(context);
      onSetSelectedTemplateContext(context);
      setCanvas({
        status: template.previewUrl ? "ready" : "empty",
        url: template.previewUrl ?? null,
        source: template.previewUrl ? "template" : null,
        error: null,
      });
      setTemplatesOpen(false);
      setViewMode(template.previewUrl ? "preview" : "chat");
    },
    [onSetSelectedTemplateContext],
  );

  const handleNewChat = useCallback(() => {
    const nextSessionId = crypto.randomUUID();
    onSetSessionId(nextSessionId);
    setSelectedTemplate(null);
    setSelectedTemplateContext(null);
    setCanvas({ status: "empty", url: null, source: null, error: null });
    setTemplatesOpen(false);
    setViewMode("landing");
    onResetSession();
    void aui.threads().switchToNewThread();
  }, [aui, onResetSession, onSetSessionId]);

  const handleRestoreThread = useCallback(
    (thread: XuluxStoredThread) => {
      const restoredTemplate = thread.custom.selectedTemplate ?? null;
      onSetSessionId(thread.custom.sessionId);
      setSelectedTemplate(null);
      setSelectedTemplateContext(restoredTemplate);
      onSetSelectedTemplateContext(restoredTemplate);
      setCanvas(fromCanvasSnapshot(thread.custom.canvas));
      setTemplatesOpen(false);
      setViewMode(thread.custom.canvas?.url ? "preview" : "chat");
    },
    [onSetSelectedTemplateContext, onSetSessionId],
  );

  const activeStoredThread =
    storedThreads.find((thread) => thread.remoteId === currentRemoteId) ?? null;
  const isInterrupted =
    activeStoredThread?.custom.xuluxStatus === "interrupted";
  const interruptedUserMessage = useMemo(() => {
    if (!isInterrupted || !currentRemoteId) return null;
    const pending = activeStoredThread?.custom.pendingUserMessage?.trim();
    if (pending) return pending;
    return getLatestSavedUserMessage(currentRemoteId);
  }, [activeStoredThread, currentRemoteId, isInterrupted]);

  const handleRetryInterrupted = useCallback(() => {
    if (!interruptedUserMessage) return;
    updateXuluxPendingUserMessage(
      currentRemoteId ?? sessionId,
      interruptedUserMessage,
    );
    setViewMode("chat");
    askAI(interruptedUserMessage);
  }, [askAI, currentRemoteId, interruptedUserMessage, sessionId]);

  useEffect(() => {
    if (!currentRemoteId) return;
    updateXuluxThreadContext(currentRemoteId, {
      selectedTemplate: selectedTemplateContext,
      canvas: toCanvasSnapshot(
        canvas,
        selectedTemplate?.title ?? selectedTemplateContext?.title,
      ),
    });
  }, [canvas, currentRemoteId, selectedTemplate, selectedTemplateContext]);

  const sourceUrl =
    canvas.source === "template" &&
    (selectedTemplate || selectedTemplateContext)
      ? getTemplateSourceUrl(selectedTemplate ?? selectedTemplateContext!)
      : undefined;

  return (
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

      <XuluxHeaderActions
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
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <section
            className={
              viewMode === "preview"
                ? "flex w-[40%] min-w-[320px] flex-col border-r"
                : "flex flex-1 flex-col"
            }
          >
            {isInterrupted && (
              <InterruptedRunBanner
                lastUserMessage={interruptedUserMessage}
                onRetry={handleRetryInterrupted}
              />
            )}
            <XuluxThread onNewThread={handleNewChat} />
          </section>

          {viewMode === "preview" && (
            <main className="min-w-0 flex-1">
              <XuluxCanvas
                sessionId={sessionId}
                status={canvas.status}
                previewUrl={canvas.url}
                source={canvas.source}
                error={canvas.error}
                {...(sourceUrl ? { sourceUrl } : {})}
                {...(selectedTemplate?.title
                  ? { title: selectedTemplate.title }
                  : {})}
              />
            </main>
          )}
        </div>
      )}

      <TemplatesModal
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelect={handleSelectTemplate}
      />
    </div>
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
  };
}

function getLatestSavedUserMessage(remoteId: string): string | null {
  const repository = readXuluxMessages(remoteId);
  for (let index = repository.messages.length - 1; index >= 0; index -= 1) {
    const row = repository.messages[index];
    if (row?.format !== "ai-sdk/v6") continue;
    if (row.content.role !== "user") continue;

    const text = getXuluxTextFromParts(row.content.parts);
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
