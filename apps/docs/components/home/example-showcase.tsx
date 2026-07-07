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
import { ArrowUpRightIcon, Maximize2Icon, XIcon } from "lucide-react";
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
  const panelRef = React.useRef<HTMLDivElement>(null);
  const animationRef = React.useRef<Animation | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // FLIP: measure the panel before and after toggling between its inline
  // `absolute` slot and `fixed inset-0`, then tween width/height plus a
  // translate offset. The content keeps its real pixel size throughout (no
  // scaling), so nothing stretches the way a View Transition's bitmap morph —
  // or a non-uniform transform scale across the aspect-ratio change — would.
  const toggleFullscreen = React.useCallback(() => {
    const el = panelRef.current;
    if (!el || prefersReducedMotion()) {
      setIsFullscreen((value) => !value);
      return;
    }

    const first = el.getBoundingClientRect();
    flushSync(() => setIsFullscreen((value) => !value));
    const last = el.getBoundingClientRect();
    const expanding = last.height > first.height;

    animationRef.current?.cancel();
    animationRef.current = el.animate(
      [
        {
          transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)`,
          width: `${first.width}px`,
          height: `${first.height}px`,
        },
        {
          transform: "translate(0px, 0px)",
          width: `${last.width}px`,
          height: `${last.height}px`,
        },
      ],
      {
        duration: expanding ? 350 : 250,
        easing: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    );
  }, []);

  // Inline, the demo is a static preview: clicking anywhere except the tab bar
  // expands it to fullscreen, where it becomes interactive.
  const handlePanelClick = (e: React.MouseEvent) => {
    if (isFullscreen) return;
    if ((e.target as HTMLElement).closest('[data-slot="tab-list"]')) return;
    toggleFullscreen();
  };

  React.useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // An open Radix layer (dropdown, popover, dialog) handles Escape in the
      // capture phase and preventDefaults it; let that close first, don't unzoom.
      if (e.defaultPrevented) return;
      if (e.key === "Escape") toggleFullscreen();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    // The homepage <main> creates a z-2 stacking context, which would paint
    // the overlay beneath the sticky z-50 site header.
    const stackingAncestor = sectionRef.current?.closest("main");
    if (stackingAncestor instanceof HTMLElement) {
      stackingAncestor.style.zIndex = "50";
    }
    // The panel stays in the page's DOM (no portal), so keep Tab focus inside
    // by inerting every element outside its ancestor chain. Radix portals
    // opened while zoomed mount into <body> afterwards and stay interactive.
    const inertedSiblings: HTMLElement[] = [];
    for (
      let node: HTMLElement | null = panelRef.current;
      node && node !== document.body;
      node = node.parentElement
    ) {
      for (const sibling of node.parentElement?.children ?? []) {
        if (
          sibling !== node &&
          sibling instanceof HTMLElement &&
          !sibling.inert
        ) {
          sibling.inert = true;
          inertedSiblings.push(sibling);
        }
      }
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (stackingAncestor instanceof HTMLElement) {
        stackingAncestor.style.zIndex = "";
      }
      for (const sibling of inertedSiblings) {
        sibling.inert = false;
      }
    };
  }, [isFullscreen, toggleFullscreen]);

  const activeSlug = EXAMPLE_TABS[activeIndex]?.slug;

  return (
    <section ref={sectionRef}>
      {/* Placeholder reserves the inline height so the page doesn't jump when
          the panel detaches to fullscreen. */}
      <div className="relative h-160">
        <div
          ref={panelRef}
          onClick={handlePanelClick}
          className={cn(
            "inset-0",
            isFullscreen
              ? "bg-background fixed z-[100] p-4 md:p-6"
              : "absolute cursor-zoom-in [&_[data-slot=tab-content-panel]]:pointer-events-none",
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground size-[30px]"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <XIcon className="size-4" />
                  ) : (
                    <Maximize2Icon className="size-4" />
                  )}
                </Button>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
