"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMOS } from "@/lib/demos";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import { cn } from "@/lib/utils";

/** How far a demo is scaled down, so a full app reads as a miniature. */
const SCALE = 0.62;

const FRAME_HEIGHT = "28rem";

/**
 * The demos (Base, ChatGPT, Claude, and the rest) as segmented tabs on a
 * tinted plate, each a live miniature: rendered at full size, then scaled
 * into the frame, so it can still be clicked and typed in. Only the open
 * tab is mounted.
 */
export function DemoPanel({ className }: { className?: string }) {
  const [slug, setSlug] = useState(DEMOS[0]!.slug);
  const active = DEMOS.find((demo) => demo.slug === slug) ?? DEMOS[0]!;

  return (
    <figure
      className={cn(
        "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex min-w-0 flex-col gap-3 p-3",
        className,
      )}
    >
      <Tabs
        value={slug}
        onValueChange={(value) => {
          if (typeof value === "string") setSlug(value);
        }}
        className="items-center gap-3"
      >
        <TabsList aria-label="Demos">
          {DEMOS.map((demo) => (
            <TabsTrigger
              key={demo.slug}
              value={demo.slug}
              className="px-2.5 text-[13px]"
            >
              {demo.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {DEMOS.map((demo) => {
          const Demo = demo.component;
          return (
            <TabsContent
              key={demo.slug}
              value={demo.slug}
              className="rounded-document bg-background relative flex-none self-stretch overflow-hidden"
              style={{ height: FRAME_HEIGHT }}
            >
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{
                  width: `${100 / SCALE}%`,
                  height: `${100 / SCALE}%`,
                  transform: `scale(${SCALE})`,
                }}
              >
                <DocsRuntimeProvider>
                  <Demo />
                </DocsRuntimeProvider>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
      <figcaption className="flex items-baseline justify-between gap-4 px-1 text-[13px]">
        <span className="text-muted-foreground min-w-0 truncate">
          {active.tagline}
        </span>
        <Link
          href={`/demos/${active.slug}`}
          className="group/link text-foreground/80 hover:text-foreground inline-flex shrink-0 items-center gap-1 transition-colors"
        >
          Open the demo
          <ArrowRightIcon
            aria-hidden
            className="size-3.5 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </figcaption>
    </figure>
  );
}
