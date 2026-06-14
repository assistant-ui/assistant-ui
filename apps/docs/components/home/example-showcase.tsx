"use client";

import { ChatGPT } from "@/components/examples/chatgpt";
import { Claude } from "@/components/examples/claude";
import { Perplexity } from "@/components/examples/perplexity";
import { Base } from "@/components/examples/base";
import { Tab } from "@/components/shared/tab";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { Gemini } from "@/components/examples/gemini";
import { Grok } from "@/components/examples/grok";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRightIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { flushSync } from "react-dom";

const ExampleWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="not-prose h-full overflow-hidden rounded-2xl border">
    {children}
  </div>
);

const EXAMPLE_TABS = [
  {
    label: "Base",
    slug: "base",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Base />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "ChatGPT",
    slug: "chatgpt",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <ChatGPT />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Claude",
    slug: "claude",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Claude />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Grok",
    slug: "grok",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Grok />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Gemini",
    slug: "gemini",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Gemini />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Perplexity",
    slug: "perplexity",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Perplexity />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Explore More →",
    href: "/examples",
  },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ExampleShowcase() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Toggling the panel between its inline box and `fixed inset-0` is wrapped in
  // a View Transition so the browser morphs the shared `example-demo` element
  // between the two states. Timing lives in styles/animate.css.
  const toggleFullscreen = React.useCallback(() => {
    const apply = () => setIsFullscreen((value) => !value);
    if (
      typeof document === "undefined" ||
      !document.startViewTransition ||
      prefersReducedMotion()
    ) {
      apply();
      return;
    }
    document.startViewTransition(() => flushSync(apply));
  }, []);

  React.useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleFullscreen();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    // The homepage <main> creates a z-2 stacking context, which would paint
    // the overlay beneath the sticky z-50 site header.
    const stackingAncestor = sectionRef.current?.closest("main");
    if (stackingAncestor instanceof HTMLElement) {
      stackingAncestor.style.zIndex = "100";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (stackingAncestor instanceof HTMLElement) {
        stackingAncestor.style.zIndex = "";
      }
    };
  }, [isFullscreen, toggleFullscreen]);

  const activeSlug = EXAMPLE_TABS[activeIndex]?.slug;

  return (
    <section ref={sectionRef}>
      {/* Placeholder reserves the inline height so the page doesn't jump when
          the panel detaches to fullscreen. */}
      <div className="relative h-192">
        <div
          className={cn(
            "inset-0 [view-transition-name:example-demo]",
            isFullscreen
              ? "bg-background fixed z-[100] p-4 md:p-6"
              : "absolute",
          )}
        >
          <Tab
            tabs={EXAMPLE_TABS}
            className="h-full"
            variant="ghost"
            onTabChange={(label, index) => {
              setActiveIndex(index);
              analytics.example.tabSwitched(label);
            }}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground size-[30px]"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2Icon className="size-4" />
                  ) : (
                    <Maximize2Icon className="size-4" />
                  )}
                </Button>
                {activeSlug && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-[30px]"
                    aria-label="Open demo"
                    title="Open demo"
                    asChild
                  >
                    <Link href={`/demos/${activeSlug}`}>
                      <ArrowUpRightIcon className="size-4" />
                    </Link>
                  </Button>
                )}
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
