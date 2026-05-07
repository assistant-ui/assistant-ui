import { useState, useRef } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/agent-playground/ui/button';
import { CommandList } from '../primitives/CommandList';
import type { CodeHandoff, PlaygroundExample, PreviewTarget } from '../types';

export function ExamplePreviewCard({
  example,
  preview,
  codeHandoff,
  compact = false,
}: {
  example: PlaygroundExample;
  preview: PreviewTarget;
  codeHandoff: CodeHandoff;
  compact?: boolean | undefined;
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

  const downloadUrl = preview.source === 'sandbox' && preview.downloadUrl
    ? preview.downloadUrl
    : preview.source === 'hosted' && (preview.sourceUrl || example.sourceUrl)
      ? preview.sourceUrl || example.sourceUrl
      : null;

  const downloadLabel = preview.source === 'sandbox' ? 'Download' : 'View Source';

  return (
    <div className="flex h-full min-h-[420px] flex-col p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{preview.label}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{preview.url ?? preview.hint}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon-sm" onClick={() => setIframeKey((k) => k + 1)} disabled={!canOpenPreview}>
            <RefreshCw className="size-3.5" />
          </Button>
          {downloadUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.open(downloadUrl, '_blank', 'noopener,noreferrer');
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
              window.open(preview.url, '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className="size-3.5" />
            Open
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30 shadow-sm">
        {preview.status === 'ready' && preview.url && !iframeBlocked ? (
          <iframe
            key={iframeKey}
            title={preview.label}
            src={preview.url}
            className="h-full w-full bg-background"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
            onLoad={() => { iframeLoadedRef.current = true; }}
            onError={() => setIframeBlocked(true)}
          />
        ) : preview.status === 'ready' && preview.url && iframeBlocked ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8">
            <div className="text-sm font-semibold text-foreground">Preview blocked by site policy</div>
            <p className="text-sm text-muted-foreground">This site doesn't allow embedding. Open it in a new tab instead.</p>
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink className="size-3.5" />
              Open preview
            </a>
          </div>
        ) : preview.status === 'loading' ? (
          <div className="flex h-full w-full items-center justify-center bg-background p-8">
            <div className="max-w-xl">
              <div className="mb-2 text-sm font-semibold text-foreground">Building preview</div>
              <p className="text-sm leading-6 text-muted-foreground">
                {preview.hint ?? 'The runtime is preparing a preview URL.'}
              </p>
            </div>
          </div>
        ) : preview.status === 'failed' ? (
          <div className="flex h-full w-full items-center justify-center bg-background p-8">
            <div className="max-w-xl">
              <div className="mb-2 text-sm font-semibold text-foreground">Preview unavailable</div>
              <p className="mb-6 text-sm leading-6 text-muted-foreground">
                {preview.error ?? preview.hint ?? 'The preview could not be opened.'}
              </p>
              <CommandList commands={codeHandoff.commands} />
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-background p-8">
            <div className="max-w-xl">
              <div className="mb-2 text-sm font-semibold text-foreground">No hosted preview available</div>
              <p className="mb-6 text-sm leading-6 text-muted-foreground">
                {preview.hint ?? 'This example does not currently expose a public preview. Use the starter locally with the installation steps below.'}
              </p>
              <CommandList commands={codeHandoff.commands} />
            </div>
          </div>
        )}
      </div>
      {!compact && preview.status === 'ready' ? (
        <div className="mt-4 text-xs text-muted-foreground">
          {preview.source === 'sandbox'
            ? 'Live sandbox preview'
            : preview.source === 'local'
              ? 'Live local workspace preview'
              : `Hosted example preview for ${example.label}`}
        </div>
      ) : null}
    </div>
  );
}
