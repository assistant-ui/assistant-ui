import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Code2, ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/agent-playground/ui/dialog";
import type { Template } from "@/components/agent-playground/lib/templates";
import { Thumbnail } from "./Thumbnail";

type Props = {
  template: Template | null;
  allTemplates: Template[];
  onClose: () => void;
  onSelect: (template: Template) => void;
};

export function TemplateDetailModal({ template, allTemplates, onClose, onSelect }: Props) {
  const [current, setCurrent] = useState<Template | null>(template);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(template);
    setIframeLoaded(false);
  }, [template]);

  const others = allTemplates.filter((t) => t.id !== current?.id).slice(0, 4);

  const handleOther = (t: Template) => {
    setCurrent(t);
    setIframeLoaded(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!current) return null;

  const hasPreview = current.hasHostedPreview;
  const requiredEnv = current.env.filter((item) => item.required);
  const startLabel = current.canStart
    ? current.kind === "template"
      ? "Start building"
      : "Use this example"
    : "Source unavailable";
  const previewLabel = current.previewStatus === "live"
    ? "Hosted preview"
    : current.previewStatus === "stale"
      ? "Stale preview"
      : current.screenshotUrl
        ? "Screenshot only"
        : "No preview";

  return (
    <Dialog open={!!template} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top: preview + info side by side */}
        <div className="flex flex-col sm:flex-row" style={{ flexShrink: 0 }}>
          {/* Preview — 65% width on desktop, taller */}
          <div className="sm:w-[65%] relative bg-black overflow-hidden" style={{ minHeight: 460 }}>
            {hasPreview ? (
              <>
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-0">
                    <Thumbnail
                      gradient={current.gradient}
                      src={current.screenshotUrl}
                      className="absolute inset-0 w-full h-full rounded-none"
                    />
                    <div className="relative flex flex-col items-center gap-2 text-white/90 bg-black/40 px-4 py-2 rounded-md backdrop-blur-sm">
                      <Loader2 className="size-6 animate-spin" />
                      <span className="text-xs uppercase tracking-wider">Loading preview...</span>
                    </div>
                  </div>
                )}
                <iframe
                  key={current.id}
                  src={current.previewUrl}
                  className="absolute inset-0 w-full h-full border-0 z-10"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title={`${current.title} preview`}
                  onLoad={() => setIframeLoaded(true)}
                  style={{ opacity: iframeLoaded ? 1 : 0, transition: "opacity 200ms" }}
                />
                <a
                  href={current.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs text-white/80 hover:text-white backdrop-blur-sm transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Open in new tab
                </a>
              </>
            ) : (
              <Thumbnail
                gradient={current.gradient}
                src={current.screenshotUrl}
                label={current.title}
                className="w-full h-full rounded-none absolute inset-0"
              />
            )}
          </div>

          {/* Info — 35% width */}
          <div className="sm:w-[35%] flex flex-col justify-between p-7 border-l border-border">
            <div>
              <h2 className="text-xl font-semibold leading-snug">{current.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>

              {current.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {current.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-3 rounded-lg border border-border bg-muted/25 p-3">
                <div className="flex flex-wrap gap-1.5">
                  <InfoPill>{current.kind === "template" ? "Editable template" : "Reference example"}</InfoPill>
                  <InfoPill>{previewLabel}</InfoPill>
                  <InfoPill>{current.tech.framework}</InfoPill>
                  <InfoPill>{current.verifyProfile} verify</InfoPill>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Code2 className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Runtime: {current.tech.runtime}; pattern: {current.tech.frontendPattern}
                  </span>
                </div>
                {requiredEnv.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <KeyRound className="size-3.5" />
                      Required environment
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {requiredEnv.map((item) => (
                        <span
                          key={`${item.scope}:${item.name}`}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground"
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
                    <span>This item does not have a scaffold source in the catalog yet.</span>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => current.canStart && onSelect(current)}
              disabled={!current.canStart}
              className="mt-6 w-full rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {startLabel}
            </button>
          </div>
        </div>

        {/* Bottom: more templates */}
        {others.length > 0 && (
          <div ref={scrollRef} className="border-t px-6 py-5 overflow-y-auto">
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              More templates
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {others.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleOther(t)}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card/40 p-2 text-left transition-colors hover:border-border/80 hover:bg-card/60"
                >
                  <Thumbnail gradient={t.gradient} src={t.screenshotUrl} label={t.title} className="aspect-video w-full" />
                  <div className="px-1 pb-0.5">
                    <div className="text-xs font-medium truncate">{t.title}</div>
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

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}
