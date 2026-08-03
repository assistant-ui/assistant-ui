"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DemoIframe } from "@/components/docs/demo-iframe";
import { GitHubIcon } from "@/components/icons/github";
import { DEMO_META } from "@/lib/demos-meta";
import { cn } from "@/lib/utils";

export function DemoShowcase() {
  const [slug, setSlug] = useState(DEMO_META[0]?.slug ?? "");
  const demo = DEMO_META.find((entry) => entry.slug === slug);

  if (!demo) return null;

  return (
    <div className="not-prose flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {DEMO_META.map((entry) => (
          <button
            key={entry.slug}
            type="button"
            onClick={() => setSlug(entry.slug)}
            aria-pressed={entry.slug === slug}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors",
              entry.slug === slug
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {entry.name}
          </button>
        ))}
      </div>

      <div className="border-border/60 bg-background overflow-hidden rounded-xl border shadow-sm">
        <DemoIframe
          key={slug}
          title={`${demo.name} demo`}
          src={`/demos/${slug}/embed`}
          className="block h-[560px] w-full border-none"
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
        <span>{demo.tagline}</span>
        <span className="flex items-center gap-4">
          <Link
            href={`/demos/${slug}`}
            className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            Open full demo
            <ArrowUpRight className="size-3.5" />
          </Link>
          <a
            href={demo.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <GitHubIcon className="size-3.5" />
            Source
          </a>
        </span>
      </div>
    </div>
  );
}
