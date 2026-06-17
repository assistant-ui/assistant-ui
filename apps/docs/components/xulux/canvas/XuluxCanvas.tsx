"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons/github";
import { XuluxPreviewTabBar } from "./XuluxPreviewTabBar";

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ?? null;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function XuluxCanvas({
  sessionId,
  status,
  previewUrl,
  source,
  error,
  downloadUrl,
  sourceUrl,
  title,
}: {
  sessionId: string;
  status: "empty" | "loading" | "ready" | "error";
  previewUrl: string | null;
  source: "template" | "refresh" | null;
  error: string | null;
  downloadUrl?: string;
  sourceUrl?: string;
  title?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const canDownloadTemplate = Boolean(downloadUrl) && status === "ready";
  const canDownloadSandbox = source === "refresh" && status === "ready";
  const canOpenSource =
    source === "template" && status === "ready" && sourceUrl;
  const resolvedPreviewUrl = toAbsoluteUrl(previewUrl);
  const canRefresh = !!resolvedPreviewUrl && status === "ready";
  const iframeKey = resolvedPreviewUrl
    ? `${resolvedPreviewUrl}-${iframeVersion}`
    : "empty";

  useEffect(() => {
    setIsPreviewLoading(!!resolvedPreviewUrl);
  }, [resolvedPreviewUrl]);

  const handleRefreshPreview = useCallback(() => {
    setIsPreviewLoading(true);
    setIframeVersion((value) => value + 1);
  }, []);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch("/api/xulux/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to download workspace.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        filenameFromDisposition(response.headers.get("Content-Disposition")) ??
        `xulux-workspace-${sessionId.slice(0, 12)}.tar.gz`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadErr) {
      setDownloadError(
        downloadErr instanceof Error
          ? downloadErr.message
          : String(downloadErr),
      );
    } finally {
      setIsDownloading(false);
    }
  }, [sessionId]);

  const hasPreview = !!resolvedPreviewUrl;
  const tabTitle = hasPreview
    ? (title ?? hostnameFromUrl(resolvedPreviewUrl))
    : status === "error"
      ? "Preview unavailable"
      : "Preview";

  const tabActions = (
    <>
      {hasPreview && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          asChild
        >
          <a href={resolvedPreviewUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" />
            <span className="sr-only">Open preview</span>
          </a>
        </Button>
      )}
      {canRefresh && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          disabled={isPreviewLoading}
          onClick={handleRefreshPreview}
        >
          <RefreshCw
            className={isPreviewLoading ? "size-3.5 animate-spin" : "size-3.5"}
          />
          <span className="sr-only">Refresh preview</span>
        </Button>
      )}
      {canDownloadTemplate && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          asChild
        >
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            <Download className="size-3.5" />
            <span className="sr-only">Download</span>
          </a>
        </Button>
      )}
      {canDownloadSandbox && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          disabled={isDownloading}
          onClick={handleDownload}
        >
          {isDownloading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          <span className="sr-only">Download</span>
        </Button>
      )}
      {canOpenSource && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          asChild
        >
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            <GitHubIcon className="size-3.5" />
            <span className="sr-only">Source</span>
          </a>
        </Button>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#e8eaed] dark:bg-[#202124]">
      <XuluxPreviewTabBar
        title={tabTitle}
        isLoading={isPreviewLoading}
        isActive={hasPreview}
        actions={tabActions}
      />

      {downloadError && (
        <div className="border-destructive/30 bg-background text-destructive z-10 border-b px-3 py-1.5 text-xs">
          {downloadError}
        </div>
      )}

      {/* Content pane — same bg as active tab */}
      <div className="bg-background relative min-h-0 flex-1">
        {resolvedPreviewUrl ? (
          <>
            {isPreviewLoading && (
              <div className="bg-background/80 absolute inset-0 z-5 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-background text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Loading preview...</span>
                </div>
              </div>
            )}
            <iframe
              key={iframeKey}
              title={title ?? "Xulux preview"}
              src={resolvedPreviewUrl}
              onLoad={() => setIsPreviewLoading(false)}
              className="h-full w-full border-0 bg-white"
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <p className="text-sm font-medium">
                {status === "error"
                  ? "Preview unavailable"
                  : "Waiting for preview"}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {error ??
                  "The preview will appear after the agent finishes preparing the app."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
