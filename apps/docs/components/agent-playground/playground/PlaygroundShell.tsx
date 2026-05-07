import { useCallback, useEffect, useMemo, useState } from 'react';
import type { useAugmentAssistantRuntime } from '@/components/agent-playground/runtime/useAugmentAssistantRuntime';
import { AugmentApiError, augmentClient } from '@/components/agent-playground/augment/client';
import type { Template } from '@/components/agent-playground/lib/templates';
import { createPlaygroundHeaderState } from './adapters/runtimeToPlayground';
import { PlaygroundCanvas } from './PlaygroundCanvas';
import { PlaygroundChatPane } from './PlaygroundChatPane';
import { PlaygroundHeader } from './PlaygroundHeader';
import { ResizableDivider } from './ResizableDivider';
import { usePlaygroundState } from './usePlaygroundState';
import type { PreviewTarget } from './types';

const STORAGE_KEY = 'playground:chat-fraction';
const DEFAULT_FRACTION = 0.4;
const EXPORT_GENERIC_ERROR = 'Workspace export failed. Try again after the workspace finishes preparing.';

export function PlaygroundShell({
  runtimeState,
  debugOpen,
  onToggleDebug,
  onNewChat,
  onShowTemplates,
  initialPrompt,
  showCanvas = true,
  templatePreview,
}: {
  runtimeState: ReturnType<typeof useAugmentAssistantRuntime>;
  debugOpen?: boolean | undefined;
  onToggleDebug?: (() => void) | undefined;
  onNewChat?: (() => void) | undefined;
  onShowTemplates?: (() => void) | undefined;
  initialPrompt?: string | null | undefined;
  showCanvas?: boolean | undefined;
  templatePreview?: Template | null | undefined;
}) {
  const playground = usePlaygroundState({
    sessionId: runtimeState.session?.id ?? null,
    threadId: runtimeState.debugState.threadId ?? runtimeState.session?.threadId ?? null,
    workspace: runtimeState.session?.workspace,
    messages: runtimeState.messages,
    eventLog: runtimeState.eventLog,
  });
  const headerState = createPlaygroundHeaderState(runtimeState);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportWorkspace = useCallback(async () => {
    if (!headerState.sessionId || !headerState.hasWorkspace || exportStatus === 'exporting') return;

    setExportStatus('exporting');
    setExportError(null);

    try {
      const archive = await augmentClient.exportWorkspace(headerState.sessionId);
      triggerBrowserDownload(archive.blob, archive.filename);
      setExportStatus('idle');
    } catch (error) {
      setExportStatus('error');
      setExportError(getExportErrorMessage(error));
    }
  }, [exportStatus, headerState.hasWorkspace, headerState.sessionId]);

  // Synthesize a hosted preview from the selected template when the runtime
  // has not yet produced a real livePreview. Real agent-driven previews win.
  const effectivePlayground = useMemo(() => {
    if (playground.livePreview) return playground;
    if (!templatePreview?.previewUrl) return playground;
    const synthetic: PreviewTarget = {
      status: 'ready',
      source: 'hosted',
      label: `${templatePreview.title} preview`,
      url: templatePreview.previewUrl,
      hint: `Hosted preview for ${templatePreview.title}.`,
    };
    return { ...playground, livePreview: synthetic, preview: synthetic };
  }, [playground, templatePreview]);

  const [chatFraction, setChatFraction] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_FRACTION;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, chatFraction.toString());
  }, [chatFraction]);

  return (
    <div className="flex h-full flex-col bg-background text-foreground" style={{ '--playground-chat-fraction': chatFraction } as React.CSSProperties}>
      <PlaygroundHeader
        headerState={headerState}
        debugOpen={debugOpen}
        onToggleDebug={onToggleDebug}
        onNewChat={onNewChat}
        onShowTemplates={onShowTemplates}
        onExportWorkspace={handleExportWorkspace}
        exportStatus={exportStatus}
        exportError={exportError}
      />
      <div className="flex min-h-0 flex-1">
        <aside className={showCanvas ? 'w-[calc(var(--playground-chat-fraction)*100%)] min-w-[280px] border-r' : 'flex-1'}>
          <PlaygroundChatPane
            runtimeState={runtimeState}
            initialPrompt={initialPrompt}
            templateBanner={templatePreview ?? null}
          />
        </aside>
        {showCanvas && (
          <>
            <ResizableDivider
              initialFraction={chatFraction}
              minFraction={0.2}
              maxFraction={0.8}
              onResize={setChatFraction}
            />
            <main className="min-w-0 flex-1">
              <PlaygroundCanvas playground={effectivePlayground} />
            </main>
          </>
        )}
      </div>
    </div>
  );
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getExportErrorMessage(error: unknown): string {
  if (error instanceof AugmentApiError) {
    const bodyMessage = parseApiErrorBody(error.body);
    if (bodyMessage) return bodyMessage;
    if (error.status === 409) return 'No workspace is available to export yet.';
    return `Workspace export failed with status ${error.status}.`;
  }

  if (error instanceof Error && error.message) return error.message;
  return EXPORT_GENERIC_ERROR;
}

function parseApiErrorBody(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    return typeof parsed.error === 'string' ? parsed.error : null;
  } catch {
    return body;
  }
}
