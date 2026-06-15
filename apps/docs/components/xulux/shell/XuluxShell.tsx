"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { Button } from "@/components/ui/button";
import { XuluxThread } from "../chat/XuluxThread";
import type { XuluxTemplate } from "../templates/types";
import type { SelectedTemplateContext } from "../XuluxApp";
import { XuluxCanvas } from "../canvas/XuluxCanvas";
import { XuluxCanvasObserver } from "../canvas/XuluxCanvasObserver";
import { XuluxTemplatePreviewObserver } from "../canvas/XuluxTemplatePreviewObserver";
import { XuluxLandingPage } from "../landing/XuluxLandingPage";
import { TemplatesModal } from "../landing/TemplatesModal";
import { XuluxHeaderActions } from "./XuluxHeaderActions";
import {
  readXuluxMessages,
  updateXuluxPendingUserMessage,
  updateXuluxThreadContext,
  updateXuluxThreadStatus,
  useXuluxStoredThreads,
} from "../runtime/xulux-local-storage";
import type { XuluxCanvasSnapshot, XuluxStoredThread } from "../runtime/types";

const ASSISTANT_UI_REPO_URL = "https://github.com/assistant-ui/assistant-ui";

type XuluxViewMode = "landing" | "chat" | "preview";
type CanvasState = {
  status: "empty" | "loading" | "ready" | "error";
  url: string | null;
  source: "template" | "refresh" | null;
  error: string | null;
  downloadUrl?: string;
  templateId?: string;
  versionId?: string;
  title?: string;
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
        ...(template.downloadUrl ? { downloadUrl: template.downloadUrl } : {}),
        ...(template.templateId ? { templateId: template.templateId } : {}),
        ...(template.versionId ? { versionId: template.versionId } : {}),
        title: template.title,
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
    updateXuluxThreadStatus(currentRemoteId ?? sessionId, "running");
    setViewMode("chat");

    const messages = aui.thread().getState().messages;
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    if (lastUserMessage) {
      void aui.thread().startRun({ parentId: lastUserMessage.id });
      return;
    }

    askAI(interruptedUserMessage);
  }, [askAI, aui, currentRemoteId, interruptedUserMessage, sessionId]);

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
  const canvasTitle = canvas.title ?? selectedTemplate?.title;

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
      <XuluxTemplatePreviewObserver
        onTemplatePreviewReady={(preview) => {
          setCanvas({
            status: "ready",
            url: preview.previewUrl,
            source: "template",
            error: null,
            downloadUrl: preview.downloadUrl,
            templateId: preview.templateId,
            ...(preview.versionId !== undefined
              ? { versionId: preview.versionId }
              : {}),
            title: preview.title,
          });
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
              {...(canvas.downloadUrl
                ? { downloadUrl: canvas.downloadUrl }
                : {})}
              {...(sourceUrl ? { sourceUrl } : {})}
              {...(canvasTitle ? { title: canvasTitle } : {})}
            />
          </Panel>
        </Group>
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
    ...(template.templateId ? { templateId: template.templateId } : {}),
    ...(template.versionId ? { versionId: template.versionId } : {}),
    ...(template.previewUrl ? { previewUrl: template.previewUrl } : {}),
    ...(template.downloadUrl ? { downloadUrl: template.downloadUrl } : {}),
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
    ...(snapshot.templateId ? { templateId: snapshot.templateId } : {}),
    ...(snapshot.versionId ? { versionId: snapshot.versionId } : {}),
    ...(snapshot.title ? { title: snapshot.title } : {}),
  };
}

function getLatestSavedUserMessage(remoteId: string): string | null {
  const repository = readXuluxMessages(remoteId);
  for (let index = repository.messages.length - 1; index >= 0; index -= 1) {
    const row = repository.messages[index];
    if (row?.format !== "ai-sdk/v6") continue;
    if (row.content.role !== "user") continue;

    const text = getTextFromMessageContent(row.content);
    if (text) return text;
  }
  return null;
}

function getTextFromMessageContent(content: Record<string, unknown>): string {
  const parts = content.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const typedPart = part as Record<string, unknown>;
      return typedPart.type === "text" && typeof typedPart.text === "string"
        ? [typedPart.text]
        : [];
    })
    .join("\n")
    .trim();
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
