"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMOS } from "@/lib/demos";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import { useFullscreenOverlay } from "./fullscreen";
import { GenerativeUIInstructions, generativeUI } from "./generative-ui";
import { DemoShell, type DemoView } from "./shell";

type DemoTab = {
  id: string;
  name: string;
  tagline: string;
  href: string;
  link: string;
  content: ReactNode;
};

const HOME_TAB = "home";

/** An inline style, because the docs theme zeroes the `--shadow-*` tokens. */
const LIFT_SHADOW: CSSProperties = {
  boxShadow: "0 1px 2px rgb(0 0 0 / 0.05), 0 24px 48px -20px rgb(0 0 0 / 0.28)",
};

const CLONE_TABS: DemoTab[] = DEMOS.filter((demo) => demo.slug !== "base").map(
  (demo) => {
    const Demo = demo.component;
    return {
      id: demo.slug,
      name: demo.name,
      tagline: demo.tagline,
      href: `/demos/${demo.slug}`,
      link: "Open the demo",
      content: (
        <DocsRuntimeProvider>
          <Demo />
        </DocsRuntimeProvider>
      ),
    };
  },
);

export function HomeDemo(): ReactNode {
  const { expanded, toggle, overlayRef } = useFullscreenOverlay();
  // Entering fullscreen portals the shell into a new tree, so the surface the
  // visitor is on is held here rather than inside it.
  const [view, setView] = useState<DemoView>("thread");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabId, setTabId] = useState(HOME_TAB);

  const demo = (
    <DemoShell
      expanded={expanded}
      onToggleExpanded={toggle}
      view={view}
      onViewChange={setView}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={setSidebarCollapsed}
    />
  );

  const tabs: DemoTab[] = [
    {
      id: HOME_TAB,
      name: "assistant-ui",
      tagline: "Threads, memory, slash commands, and generative UI in one app.",
      href: "/examples",
      link: "Explore other examples",
      content: (
        <DocsRuntimeProvider
          devtools={false}
          followUps
          countConversations
          toolkit={generativeUI.toolkit}
        >
          <GenerativeUIInstructions />
          {expanded
            ? createPortal(
                <div
                  ref={overlayRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Thread fullscreen"
                  tabIndex={-1}
                  className="bg-background fixed inset-0 z-50 overflow-hidden outline-none"
                >
                  {demo}
                </div>,
                document.body,
              )
            : demo}
        </DocsRuntimeProvider>
      ),
    },
    ...CLONE_TABS,
  ];
  const active = tabs.find((tab) => tab.id === tabId) ?? tabs[0]!;

  return (
    <section aria-label="Demos" className="flex flex-col">
      <Tabs
        value={active.id}
        onValueChange={(value) => {
          if (typeof value === "string") setTabId(value);
        }}
        className="items-center gap-4"
      >
        <TabsList
          aria-label="Demos"
          className="bg-background border-foreground/10 max-w-full justify-start overflow-x-auto border"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-active:bg-muted flex-none px-2.5 text-[13px]"
            >
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* The home demo stays mounted when another tab opens, so its conversation survives a tab switch. */}
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            keepMounted={tab.id === HOME_TAB}
            className="border-foreground/10 rounded-document bg-background h-[min(52rem,88svh)] flex-none self-stretch overflow-hidden border"
            style={LIFT_SHADOW}
          >
            {tab.content}
          </TabsContent>
        ))}
        <div className="flex items-baseline justify-between gap-4 self-stretch pt-2 text-[13px]">
          <p className="text-muted-foreground min-w-0">{active.tagline}</p>
          <Link
            href={active.href}
            className="group/link text-foreground/80 hover:text-foreground inline-flex shrink-0 items-center gap-1 transition-colors"
          >
            {active.link}
            <ArrowRightIcon
              aria-hidden
              className="size-3.5 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </div>
      </Tabs>
    </section>
  );
}
