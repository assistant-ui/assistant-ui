import { useCallback, useEffect, useMemo, useState } from "react";
import type { useAugmentAssistantRuntime } from "@/components/agent-playground/runtime/useAugmentAssistantRuntime";
import {
  AugmentApiError,
  augmentClient,
} from "@/components/agent-playground/augment/client";
import { getProductConfig } from "@/components/agent-playground/contexts/ProductContext";
import type { Template } from "@/components/agent-playground/lib/templates";
import { createCodeHandoff } from "./adapters/catalogToPlayground";
import { createPlaygroundHeaderState } from "./adapters/runtimeToPlayground";
import { PlaygroundCanvas } from "./PlaygroundCanvas";
import { PlaygroundChatPane } from "./PlaygroundChatPane";
import { PlaygroundHeader } from "./PlaygroundHeader";
import { ResizableDivider } from "./ResizableDivider";
import { usePlaygroundState } from "./usePlaygroundState";
import type { PlaygroundExample, PreviewTarget } from "./types";

const STORAGE_KEY = "playground:chat-fraction";
const DEFAULT_FRACTION = 0.4;
const EXPORT_GENERIC_ERROR =
  "Workspace export failed. Try again after the workspace finishes preparing.";

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
    threadId:
      runtimeState.debugState.threadId ??
      runtimeState.session?.threadId ??
      null,
    workspace: runtimeState.session?.workspace,
    messages: runtimeState.messages,
    eventLog: runtimeState.eventLog,
  });
  const headerState = createPlaygroundHeaderState(runtimeState);
  const [exportStatus, setExportStatus] = useState<
    "idle" | "exporting" | "error"
  >("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportWorkspace = useCallback(async () => {
    if (
      !headerState.sessionId ||
      !headerState.hasWorkspace ||
      exportStatus === "exporting"
    )
      return;

    setExportStatus("exporting");
    setExportError(null);

    try {
      const archive = await augmentClient.exportWorkspace(
        headerState.sessionId,
      );
      triggerBrowserDownload(archive.blob, archive.filename);
      setExportStatus("idle");
    } catch (error) {
      setExportStatus("error");
      setExportError(getExportErrorMessage(error));
    }
  }, [exportStatus, headerState.hasWorkspace, headerState.sessionId]);

  const templateExample = useMemo(
    () => createTemplateExample(templatePreview, playground.examples),
    [playground.examples, templatePreview],
  );
  const templateCodeHandoff = useMemo(
    () => (templateExample ? createCodeHandoff(templateExample) : null),
    [templateExample],
  );

  // Synthesize a hosted preview from the selected template when the runtime
  // has not yet produced a real livePreview. Real agent-driven previews win.
  const effectivePlayground = useMemo(() => {
    const selectedPlayground = templateExample
      ? {
          ...playground,
          selectedExampleId: templateExample.id,
          selectedExample: templateExample,
          codeHandoff: templateCodeHandoff ?? playground.codeHandoff,
        }
      : playground;

    if (selectedPlayground.livePreview) return selectedPlayground;
    if (!templatePreview?.previewUrl) return selectedPlayground;
    const synthetic: PreviewTarget = {
      status: "ready",
      source: "hosted",
      label: `${templatePreview.title} preview`,
      url: templatePreview.previewUrl,
      hint: `Hosted preview for ${templatePreview.title}.`,
      sourceUrl: templateExample?.sourceUrl,
    };
    return {
      ...selectedPlayground,
      livePreview: synthetic,
      preview: synthetic,
    };
  }, [playground, templateCodeHandoff, templateExample, templatePreview]);

  const [chatFraction, setChatFraction] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_FRACTION;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, chatFraction.toString());
  }, [chatFraction]);

  return (
    <div
      className="flex h-full flex-col bg-background text-foreground"
      style={
        { "--playground-chat-fraction": chatFraction } as React.CSSProperties
      }
    >
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
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={
            showCanvas
              ? "flex w-[calc(var(--playground-chat-fraction)*100%)] min-w-[280px] flex-col border-r"
              : "flex flex-1 flex-col"
          }
        >
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
              <PlaygroundCanvas
                playground={effectivePlayground}
                onExportWorkspace={handleExportWorkspace}
                exportStatus={exportStatus}
                exportError={exportError}
                exportDisabled={
                  !headerState.sessionId ||
                  !headerState.hasWorkspace ||
                  exportStatus === "exporting"
                }
                exportTitle={
                  !headerState.sessionId
                    ? "Start a session before exporting."
                    : !headerState.hasWorkspace
                      ? "Create or attach a workspace before exporting."
                      : "Exports exclude env files, secrets, dependencies, and build/cache output."
                }
              />
            </main>
          </>
        )}
      </div>
    </div>
  );
}

function createTemplateExample(
  template: Template | null | undefined,
  examples: PlaygroundExample[],
): PlaygroundExample | null {
  if (!template) return null;
  const catalogExample = examples.find((example) => example.id === template.id);
  if (catalogExample) return catalogExample;

  return {
    id: template.id,
    label: template.title,
    teaser: template.prompt || template.description,
    description: template.description,
    tags: template.tags,
    category: categoryFromTemplate(template.categoryId),
    complexity: "starter",
    featured: template.featured,
    hasPreview: Boolean(template.previewUrl),
    previewUrl: template.previewUrl ?? "",
    sourceUrl: sourceUrlFromTemplate(template),
    docsUrl: template.docsUrl,
    accentClassName: "bg-sky-400",
  };
}

function categoryFromTemplate(
  categoryId: string,
): PlaygroundExample["category"] {
  switch (categoryId) {
    case "agents":
      return "Agents";
    case "ui-patterns":
      return "UI Patterns";
    case "integrations":
      return "Integrations";
    case "mobile":
      return "Mobile";
    default:
      return "Chat";
  }
}

function sourceUrlFromTemplate(template: Template): string {
  if (template.sourceUrl) return template.sourceUrl;
  const product = getProductConfig();
  if (!template.sourcePath) return product.branding.repoUrl;
  return `https://github.com/${product.branding.githubOwner}/${product.branding.githubRepo}/tree/${product.branding.defaultBranch}/${template.sourcePath}`;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getExportErrorMessage(error: unknown): string {
  if (error instanceof AugmentApiError) {
    const bodyMessage = parseApiErrorBody(error.body);
    if (bodyMessage) return bodyMessage;
    if (error.status === 409) return "No workspace is available to export yet.";
    return `Workspace export failed with status ${error.status}.`;
  }

  if (error instanceof Error && error.message) return error.message;
  return EXPORT_GENERIC_ERROR;
}

function parseApiErrorBody(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    return typeof parsed.error === "string" ? parsed.error : null;
  } catch {
    return body;
  }
}
