import { useState, useRef } from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/agent-playground/ui/button";
import { CommandList } from "../primitives/CommandList";
import type { CodeHandoff, PlaygroundExample, PreviewTarget } from "../types";

type ExportStatus = "idle" | "exporting" | "error";

export function ExamplePreviewCard({
  example,
  preview,
  codeHandoff,
  compact = false,
  onExportWorkspace,
  exportStatus = "idle",
  exportError = null,
  exportDisabled = true,
  exportTitle = "",
}: {
  example: PlaygroundExample;
  preview: PreviewTarget;
  codeHandoff: CodeHandoff;
  compact?: boolean | undefined;
  onExportWorkspace?: (() => void | Promise<void>) | undefined;
  exportStatus?: ExportStatus | undefined;
  exportError?: string | null | undefined;
  exportDisabled?: boolean | undefined;
  exportTitle?: string | undefined;
}) {
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const iframeLoadedRef = useRef(false);
  const prevUrlRef = useRef(preview.url);
  if (preview.url !== prevUrlRef.current) {
    prevUrlRef.current = preview.url;
    iframeLoadedRef.current = false;
    setIframeBlocked(false);
  }
  const canOpenPreview = Boolean(preview.url);

  const downloadUrl =
    preview.source === "sandbox" && preview.downloadUrl
      ? preview.downloadUrl
      : preview.source === "hosted" && (preview.sourceUrl || example.sourceUrl)
        ? preview.sourceUrl || example.sourceUrl
        : null;

  const downloadLabel =
    preview.source === "sandbox" ? "Download" : "View Source";

  return (
    <div className="flex h-full min-h-[420px] flex-col p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-foreground text-sm">
            {preview.label}
          </div>
          <div className="mt-1 truncate text-muted-foreground text-xs">
            {preview.url ??
              (preview.status === "failed" ? "Preview failed" : preview.hint)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setIframeKey((k) => k + 1)}
            disabled={!canOpenPreview}
          >
            <RefreshCw className="size-3.5" />
          </Button>
          {downloadUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.open(downloadUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <Download className="size-3.5" />
              {downloadLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!canOpenPreview}
            onClick={() => {
              if (!preview.url) return;
              window.open(preview.url, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="size-3.5" />
            Open
          </Button>
          {onExportWorkspace ? (
            <span title={exportTitle}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onExportWorkspace}
                disabled={exportDisabled}
                title={exportTitle}
              >
                {exportStatus === "exporting" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                {exportStatus === "exporting" ? "Exporting" : "Export"}
              </Button>
            </span>
          ) : null}
          {exportError ? (
            <span
              className="max-w-[140px] truncate text-destructive text-xs"
              title={exportError}
            >
              {exportError}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30 shadow-sm">
        {preview.status === "ready" && preview.url && !iframeBlocked ? (
          <iframe
            key={iframeKey}
            title={preview.label}
            src={preview.url}
            className="h-full w-full bg-background"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
            onLoad={() => {
              iframeLoadedRef.current = true;
            }}
            onError={() => setIframeBlocked(true)}
          />
        ) : preview.status === "ready" && preview.url && iframeBlocked ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8">
            <div className="font-semibold text-foreground text-sm">
              Preview blocked by site policy
            </div>
            <p className="text-muted-foreground text-sm">
              This site doesn't allow embedding. Open it in a new tab instead.
            </p>
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium text-sm transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-3.5" />
              Open preview
            </a>
          </div>
        ) : preview.status === "loading" ? (
          <div className="flex h-full w-full items-center justify-center bg-background p-8">
            <div className="max-w-xl">
              <div className="mb-2 font-semibold text-foreground text-sm">
                Building preview
              </div>
              <p className="text-muted-foreground text-sm leading-6">
                {preview.hint ?? "The runtime is preparing a preview URL."}
              </p>
            </div>
          </div>
        ) : preview.status === "failed" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-8">
            <AlertTriangle className="size-8 text-destructive/60" />
            <div className="font-semibold text-foreground text-sm">
              {preview.source === "sandbox"
                ? "Sandbox preview failed"
                : "Preview unavailable"}
            </div>
            <p className="max-w-md text-center text-muted-foreground text-sm leading-6">
              {preview.error ??
                preview.hint ??
                "The preview could not be opened."}
            </p>
            {codeHandoff.commands.length > 0 ? (
              <div className="mt-3 w-full max-w-md">
                <CommandList commands={codeHandoff.commands} />
              </div>
            ) : null}
          </div>
        ) : preview.source === "sandbox" || preview.source === "local" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-background p-8">
            <div className="font-semibold text-foreground text-sm">
              Workspace preview not ready
            </div>
            <p className="max-w-md text-center text-muted-foreground text-sm leading-6">
              {preview.hint ??
                "The workspace preview is being prepared. It will appear here once the dev server is running."}
            </p>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-background p-8">
            <div className="max-w-xl">
              <div className="mb-2 font-semibold text-foreground text-sm">
                No hosted preview available
              </div>
              <p className="mb-6 text-muted-foreground text-sm leading-6">
                {preview.hint ??
                  "This example does not currently expose a public preview. Use the starter locally with the installation steps below."}
              </p>
              <CommandList commands={codeHandoff.commands} />
            </div>
          </div>
        )}
      </div>
      {!compact && preview.status === "ready" ? (
        <div className="mt-4 text-muted-foreground text-xs">
          {preview.source === "sandbox"
            ? "Live sandbox preview"
            : preview.source === "local"
              ? "Live local workspace preview"
              : `Hosted example preview for ${example.label}`}
        </div>
      ) : null}
    </div>
  );
}
