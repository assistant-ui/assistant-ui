"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Code2,
  GlobeIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons/github";
import { Tabs } from "@/components/ui/tabs";
import {
  trackXuluxDownload,
  useXuluxAnalytics,
} from "@/lib/xulux/analytics-context";
import { cn } from "@/lib/utils";
import type { XuluxPreviewFrame as XuluxPreviewFrameConfig } from "../templates/types";
import { XuluxCanvasTabBar, type CanvasTab } from "./XuluxCanvasTabBar";
import { XuluxFileBrowser } from "./XuluxFileBrowser";
import { XuluxPreviewFrame } from "./XuluxPreviewFrame";
import { useVirtualArchive } from "./useVirtualArchive";

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const TABS: CanvasTab[] = [
  { id: "preview", label: "Preview", icon: GlobeIcon },
  { id: "code", label: "Code", icon: Code2 },
];

export function XuluxCanvas({
  status,
  previewUrl,
  source,
  error,
  downloadUrl,
  previewFrame,
  templateId,
  versionId,
  sourceUrl,
  title,
}: {
  status: "empty" | "loading" | "ready" | "error";
  previewUrl: string | null;
  source: "template" | "agent_template" | null;
  error: string | null;
  downloadUrl?: string;
  previewFrame?: XuluxPreviewFrameConfig;
  templateId?: string;
  versionId?: string;
  sourceUrl?: string;
  title?: string;
}) {
  const analyticsCtx = useXuluxAnalytics();
  const [activeTab, setActiveTab] = useState("preview");
  const [iframeVersion, setIframeVersion] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewLoadedForUrlRef = useRef<string | null>(null);
  const canDownloadTemplate = Boolean(downloadUrl) && status === "ready";
  const canOpenSource =
    source === "template" && status === "ready" && sourceUrl;
  const resolvedPreviewUrl = toAbsoluteUrl(previewUrl);
  const canRefresh = !!resolvedPreviewUrl && status === "ready";
  const iframeKey = resolvedPreviewUrl
    ? `${resolvedPreviewUrl}-${iframeVersion}`
    : "empty";

  const archiveUrl = canDownloadTemplate ? downloadUrl : undefined;
  const archiveState = useVirtualArchive(archiveUrl, templateId, versionId);

  useEffect(() => {
    if (!resolvedPreviewUrl) {
      previewLoadedForUrlRef.current = null;
      // Paired with the ref write above, which cannot move into render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPreviewLoading(false);
      return;
    }
    if (previewLoadedForUrlRef.current === iframeKey) return;
    setIsPreviewLoading(true);
  }, [resolvedPreviewUrl, iframeKey]);

  const handleRefreshPreview = useCallback(() => {
    previewLoadedForUrlRef.current = null;
    setIsPreviewLoading(true);
    setIframeVersion((value) => value + 1);
  }, []);

  const hasPreview = !!resolvedPreviewUrl;
  const resolvedDownloadUrl = downloadUrl
    ? toAbsoluteUrl(downloadUrl)
    : undefined;

  const tabs: CanvasTab[] = TABS.map((tab) => {
    if (tab.id === "preview") {
      return {
        ...tab,
        label: hasPreview
          ? (title ?? hostnameFromUrl(resolvedPreviewUrl!))
          : status === "error"
            ? "Preview unavailable"
            : "Preview",
      };
    }
    if (tab.id === "code") {
      return {
        ...tab,
        disabled: !canDownloadTemplate,
      };
    }
    return tab;
  });

  const tabActions = (
    <>
      {activeTab === "preview" && hasPreview && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          nativeButton={false}
          render={
            <a href={resolvedPreviewUrl} target="_blank" rel="noreferrer" />
          }
        >
          <ExternalLink className="size-3.5" />
          <span className="sr-only">Open preview</span>
        </Button>
      )}
      {activeTab === "preview" && canRefresh && (
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
          nativeButton={false}
          render={
            <a
              href={resolvedDownloadUrl ?? downloadUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackXuluxDownload(analyticsCtx, {
                  surface: "canvas",
                  download_type: "template",
                  ...(templateId ? { template_id: templateId } : {}),
                })
              }
            />
          }
        >
          <Download className="size-3.5" />
          <span className="sr-only">Download</span>
        </Button>
      )}
      {canOpenSource && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          nativeButton={false}
          render={<a href={sourceUrl} target="_blank" rel="noreferrer" />}
        >
          <GitHubIcon className="size-3.5" />
          <span className="sr-only">Source</span>
        </Button>
      )}
    </>
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex h-full flex-col gap-0 overflow-hidden bg-[#e8eaed] dark:bg-[#202124]"
    >
      <XuluxCanvasTabBar
        tabs={tabs}
        isLoading={
          activeTab === "preview"
            ? isPreviewLoading
            : archiveState.status === "loading"
        }
        actions={tabActions}
      />

      <div className="bg-background relative min-h-0 flex-1">
        {/* Keep both panels mounted and avoid display:none — Radix TabsContent sets
            the hidden attribute on inactive tabs, which tears down iframe paint and
            causes a blank flash when switching back to Preview. */}
        <div
          aria-hidden={activeTab !== "preview"}
          className={cn(
            "absolute inset-0",
            activeTab !== "preview" && "pointer-events-none z-0 opacity-0",
            activeTab === "preview" && "z-10",
          )}
        >
          {resolvedPreviewUrl ? (
            <>
              {isPreviewLoading && activeTab === "preview" && (
                <div className="bg-background/80 absolute inset-0 z-5 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-background text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Loading preview...</span>
                  </div>
                </div>
              )}
              <XuluxPreviewFrame frame={previewFrame}>
                <iframe
                  key={iframeKey}
                  title={title ?? "Xulux preview"}
                  src={resolvedPreviewUrl}
                  onLoad={() => {
                    previewLoadedForUrlRef.current = iframeKey;
                    setIsPreviewLoading(false);
                  }}
                  className="h-full w-full border-0 bg-white"
                />
              </XuluxPreviewFrame>
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

        <div
          aria-hidden={activeTab !== "code"}
          className={cn(
            "absolute inset-0",
            activeTab !== "code" && "pointer-events-none z-0 opacity-0",
            activeTab === "code" && "z-10",
          )}
        >
          {archiveState.status === "loading" && (
            <div className="flex h-full items-center justify-center">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading source...</span>
              </div>
            </div>
          )}
          {archiveState.status === "ready" && (
            <XuluxFileBrowser archive={archiveState.archive} />
          )}
          {archiveState.status === "error" && (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <p className="text-destructive text-sm font-medium">
                  Failed to load source
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {archiveState.error}
                </p>
              </div>
            </div>
          )}
          {archiveState.status === "idle" && (
            <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
              Source code will be available once a template is selected.
            </div>
          )}
        </div>
      </div>
    </Tabs>
  );
}
