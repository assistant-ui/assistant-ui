"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons/github";

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

export function XuluxCanvas({
  sessionId,
  status,
  previewUrl,
  source,
  error,
  sourceUrl,
  title,
}: {
  sessionId: string;
  status: "empty" | "loading" | "ready" | "error";
  previewUrl: string | null;
  source: "template" | "refresh" | null;
  error: string | null;
  sourceUrl?: string;
  title?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const canDownload = source === "refresh" && status === "ready";
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

  return (
    <div className="relative h-full overflow-hidden bg-muted/20">
      {resolvedPreviewUrl && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            asChild
          >
            <a href={resolvedPreviewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              <span className="sr-only">Open preview</span>
            </a>
          </Button>
          {canRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={isPreviewLoading}
              onClick={handleRefreshPreview}
            >
              <RefreshCw
                className={
                  isPreviewLoading ? "size-3.5 animate-spin" : "size-3.5"
                }
              />
              <span className="sr-only">Refresh preview</span>
            </Button>
          )}
          {canDownload && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              disabled={isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
          {canOpenSource && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              asChild
            >
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                <GitHubIcon className="size-3.5" />
                <span className="hidden sm:inline">Source</span>
              </a>
            </Button>
          )}
        </div>
      )}

      {downloadError && (
        <div className="absolute top-14 right-3 left-3 z-10 rounded-md border border-destructive/30 bg-background px-3 py-2 text-destructive text-xs shadow-sm">
          {downloadError}
        </div>
      )}

      {resolvedPreviewUrl ? (
        <>
          {isPreviewLoading && (
            <div className="absolute inset-0 z-5 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-muted-foreground text-sm shadow-sm">
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
            <p className="font-medium text-sm">
              {status === "error"
                ? "Preview unavailable"
                : "Waiting for preview"}
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              {error ??
                "The preview will appear after the agent finishes preparing the app."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
