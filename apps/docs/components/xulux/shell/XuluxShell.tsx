"use client";

import { useCallback, useState } from "react";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { XuluxThread } from "../chat/XuluxThread";
import type { XuluxTemplate } from "../templates/types";
import type { SelectedTemplateContext } from "../XuluxApp";
import { XuluxCanvas } from "../canvas/XuluxCanvas";
import { XuluxCanvasObserver } from "../canvas/XuluxCanvasObserver";
import { XuluxLandingPage } from "../landing/XuluxLandingPage";
import { TemplatesModal } from "../landing/TemplatesModal";
import { XuluxHeaderActions } from "./XuluxHeaderActions";

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
  onSetSelectedTemplateContext,
  onResetSession,
}: {
  sessionId: string;
  onSetSelectedTemplateContext: (
    template: SelectedTemplateContext | null,
  ) => void;
  onResetSession: () => void;
}) {
  const { askAI } = useAssistantPanel();
  const [viewMode, setViewMode] = useState<XuluxViewMode>("landing");
  const [selectedTemplate, setSelectedTemplate] =
    useState<XuluxTemplate | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [canvas, setCanvas] = useState<CanvasState>({
    status: "empty",
    url: null,
    source: null,
    error: null,
  });

  const handleStartChat = useCallback(
    (prompt: string) => {
      onSetSelectedTemplateContext(null);
      setCanvas({ status: "empty", url: null, source: null, error: null });
      setViewMode("chat");
      setTemplatesOpen(false);
      askAI(prompt);
    },
    [askAI, onSetSelectedTemplateContext],
  );

  const handleSelectTemplate = useCallback(
    (template: XuluxTemplate) => {
      setSelectedTemplate(template);
      onSetSelectedTemplateContext(toSelectedTemplateContext(template));
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
    setSelectedTemplate(null);
    setCanvas({ status: "empty", url: null, source: null, error: null });
    setTemplatesOpen(false);
    setViewMode("landing");
    onResetSession();
  }, [onResetSession]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
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
        visible={viewMode !== "landing"}
        onNewChat={handleNewChat}
        onShowTemplates={() => setTemplatesOpen(true)}
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
                sourceUrl={
                  canvas.source === "template" && selectedTemplate
                    ? getTemplateSourceUrl(selectedTemplate)
                    : undefined
                }
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

function getTemplateSourceUrl(template: XuluxTemplate): string | undefined {
  if (!template.sourcePath) return template.docsUrl;
  if (/^https?:\/\//i.test(template.sourcePath)) return template.sourcePath;
  return `${ASSISTANT_UI_REPO_URL}/tree/main/${template.sourcePath}`;
}
