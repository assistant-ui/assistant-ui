"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { typeSection } from "@/components/shared/type";
import {
  bundleHref,
  bundlePreviewHref,
  type ExampleBundle,
} from "@/lib/example-bundles";

export function BundleCard({
  example,
  index,
}: {
  example: ExampleBundle;
  index: number;
}) {
  const { resolvedTheme } = useTheme();
  const previewHref = resolvedTheme
    ? `${bundlePreviewHref(example.slug)}?theme=${resolvedTheme === "dark" ? "dark" : "light"}`
    : bundlePreviewHref(example.slug);
  return (
    <article className="min-w-0">
      <div className="flex items-baseline gap-3">
        <span className="text-muted-foreground font-mono text-xs">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className={typeSection}>
          <Link
            href={bundleHref(example.slug)}
            className="underline-offset-4 hover:underline"
          >
            {example.title}
          </Link>
        </h2>
      </div>
      <p className="text-muted-foreground mt-3 max-w-[48ch] text-sm leading-relaxed">
        {example.summary}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          variant="outline"
          render={
            <a href={previewHref} target="_blank" rel="noopener noreferrer" />
          }
          nativeButton={false}
        >
          Full-screen preview
          <ArrowUpRight aria-hidden data-icon="inline-end" />
        </Button>
        <Button
          variant="ghost"
          render={<Link href={bundleHref(example.slug)} />}
          nativeButton={false}
        >
          Explore this bundle
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Button>
      </div>
    </article>
  );
}
