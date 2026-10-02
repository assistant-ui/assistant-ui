"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTheme } from "next-themes";
import { RotateCcw, ArrowUpRight } from "lucide-react";
import { bundlePreviewHref } from "@/lib/example-bundles";
import { useHydrated } from "@/hooks/use-hydrated";

export function BundlePreview({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const [revision, setRevision] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const hydrated = useHydrated();
  const { resolvedTheme } = useTheme();
  const src = `${bundlePreviewHref(slug)}?theme=${resolvedTheme === "dark" ? "dark" : "light"}`;
  const previewKey = `${src}-${revision}`;
  const loaded = loadedKey === previewKey;
  return (
    <figure>
      <div className="bg-foreground/[0.025] overflow-hidden rounded-(--radius-document)">
        <div className="border-foreground/10 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm">
          <span>Interactive preview</span>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="text-muted-foreground"
              onClick={() => {
                setRevision((value) => value + 1);
              }}
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Restart preview
            </Button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              Open full screen
              <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          </div>
        </div>
        <div className="relative h-[700px] md:h-[660px]">
          {!loaded ? (
            <p
              role="status"
              className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm"
            >
              Loading {title.toLowerCase()}…
            </p>
          ) : null}
          {hydrated ? (
            <iframe
              key={previewKey}
              title={`${title} interactive preview`}
              src={src}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms"
              referrerPolicy="no-referrer"
              className="relative h-full w-full border-0"
              onLoad={() => setLoadedKey(previewKey)}
            />
          ) : null}
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-3 flex flex-wrap justify-between gap-2 text-xs">
        <span>fig. 01 · {title}</span>
        <span>Local demo · scripted responses</span>
      </figcaption>
    </figure>
  );
}
