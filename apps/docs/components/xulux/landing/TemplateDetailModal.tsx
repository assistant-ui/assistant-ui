"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Code2,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { XuluxTemplate } from "../templates/types";
import { Thumbnail } from "./Thumbnail";

type Props = {
  template: XuluxTemplate | null;
  allTemplates: XuluxTemplate[];
  onClose: () => void;
  onSelect: (template: XuluxTemplate) => void;
};

export function TemplateDetailModal({
  template,
  allTemplates,
  onClose,
  onSelect,
}: Props) {
  const [current, setCurrent] = useState<XuluxTemplate | null>(template);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(template);
    setIframeLoaded(false);
  }, [template]);

  const others = allTemplates
    .filter((candidate) => candidate.id !== current?.id)
    .slice(0, 4);

  const handleOther = (nextTemplate: XuluxTemplate) => {
    setCurrent(nextTemplate);
    setIframeLoaded(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!current) return null;

  const hasPreview = Boolean(current.previewUrl);
  const hasDownload = Boolean(current.downloadUrl);
  const requiredEnv = current.env.filter((item) => item.required);
  const startLabel =
    current.kind === "template" ? "Spin up app" : "Use this example";
  const previewLabel =
    current.previewStatus === "live"
      ? "Hosted preview"
      : current.previewStatus === "stale"
        ? "Stale preview"
        : current.screenshotUrl
          ? "Screenshot only"
          : "No preview";

  return (
    <Dialog open={!!template} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{current.title}</DialogTitle>
        </DialogHeader>
        <div className="flex shrink-0 flex-col sm:flex-row">
          <div className="relative min-h-[320px] overflow-hidden bg-black sm:min-h-[460px] sm:w-[65%]">
            {hasPreview ? (
              <>
                {!iframeLoaded && (
                  <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-3">
                    <Thumbnail
                      gradient={current.gradient}
                      src={current.screenshotUrl}
                      previewUrl={current.previewUrl}
                      className="absolute inset-0 h-full w-full rounded-none"
                    />
                    <div className="relative flex flex-col items-center gap-2 rounded-md bg-black/40 px-4 py-2 text-white/90 backdrop-blur-sm">
                      <Loader2 className="size-6 animate-spin" />
                      <span className="text-xs tracking-wider uppercase">
                        Loading preview...
                      </span>
                    </div>
                  </div>
                )}
                <iframe
                  key={current.id}
                  src={current.previewUrl}
                  className="absolute inset-0 z-10 h-full w-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title={`${current.title} preview`}
                  onLoad={() => setIframeLoaded(true)}
                  style={{
                    opacity: iframeLoaded ? 1 : 0,
                    transition: "opacity 200ms",
                  }}
                />
                <a
                  href={current.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs text-white/80 backdrop-blur-sm transition-colors hover:text-white"
                >
                  <ExternalLink className="size-3" />
                  Open in new tab
                </a>
              </>
            ) : (
              <Thumbnail
                gradient={current.gradient}
                src={current.screenshotUrl}
                previewUrl={current.previewUrl}
                label={current.title}
                className="absolute inset-0 h-full w-full rounded-none"
              />
            )}
          </div>

          <div className="border-border flex flex-col justify-between border-l p-7 sm:w-[35%]">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {current.title}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {current.description}
              </p>

              {current.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {current.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-muted text-muted-foreground rounded-md px-2.5 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-border bg-muted/25 mt-5 space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap gap-1.5">
                  <InfoPill>
                    {current.kind === "template"
                      ? "Hosted template"
                      : "Reference example"}
                  </InfoPill>
                  <InfoPill>{previewLabel}</InfoPill>
                  {hasDownload && <InfoPill>Download ready</InfoPill>}
                  <InfoPill>{current.tech.framework}</InfoPill>
                </div>
                <div className="text-muted-foreground flex items-start gap-2 text-xs">
                  <Code2 className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Runtime: {current.tech.runtime}; pattern:{" "}
                    {current.tech.frontendPattern}
                  </span>
                </div>
                {requiredEnv.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-foreground flex items-center gap-2 text-xs font-medium">
                      <KeyRound className="size-3.5" />
                      Required environment
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {requiredEnv.map((item) => (
                        <span
                          key={item.name}
                          className="border-border bg-background text-muted-foreground rounded-md border px-2 py-1 text-[11px]"
                          title={item.description}
                        >
                          {item.name}
                          {item.secret ? " (secret)" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {!current.canStart ? (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      This item does not have a scaffold source in the catalog
                      yet.
                    </span>
                  </div>
                ) : null}
                {current.versions && current.versions.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="text-foreground text-xs font-medium">
                      Available versions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {current.versions.map((version) => (
                        <span
                          key={version.id}
                          className="border-border bg-background text-muted-foreground rounded-md border px-2 py-1 text-[11px]"
                        >
                          {version.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => current.canStart && onSelect(current)}
                disabled={!current.canStart}
                className="bg-foreground text-background w-full rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {startLabel}
              </button>
              {current.downloadUrl ? (
                <a
                  href={current.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  <Download className="size-4" />
                  Download app
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {others.length > 0 && (
          <div
            ref={scrollRef}
            className="scrollbar-thin overflow-y-auto border-t px-6 py-5"
          >
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              More templates
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {others.map((other) => (
                <button
                  key={other.id}
                  type="button"
                  onClick={() => handleOther(other)}
                  className="border-border bg-card/40 hover:border-border/80 hover:bg-card/60 flex flex-col gap-2 rounded-lg border p-2 text-left transition-colors"
                >
                  <Thumbnail
                    gradient={other.gradient}
                    src={other.screenshotUrl}
                    previewUrl={other.previewUrl}
                    label={other.title}
                    className="aspect-video w-full"
                  />
                  <div className="px-1 pb-0.5">
                    <div className="truncate text-xs font-medium">
                      {other.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="bg-background text-muted-foreground rounded-md px-2.5 py-1 text-[11px] font-medium">
      {children}
    </span>
  );
}
