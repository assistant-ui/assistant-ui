"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon } from "lucide-react";
import { Variant, Variants } from "@assistant-ui/variants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMOS } from "@/lib/demos";
import { cn } from "@/lib/utils";
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

const FRAME = "h-[min(52rem,88svh)] flex-none overflow-hidden";

const LIFT_SHADOW: CSSProperties = {
  boxShadow: "0 1px 2px rgb(0 0 0 / 0.05), 0 24px 48px -20px rgb(0 0 0 / 0.28)",
};

const TABS_SHADOW: CSSProperties = {
  boxShadow: "0 1px 2px rgb(0 0 0 / 0.05), 0 8px 20px -10px rgb(0 0 0 / 0.2)",
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

type StyleProps = {
  tabs: readonly DemoTab[];
  active: DemoTab;
  onValueChange: (value: unknown) => void;
};

function DemoTabList({
  tabs,
  className,
  triggerClassName,
  style,
}: {
  tabs: readonly DemoTab[];
  className?: string;
  triggerClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <TabsList
      aria-label="Demos"
      className={cn("max-w-full justify-start overflow-x-auto", className)}
      style={style}
    >
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.id}
          value={tab.id}
          className={cn("flex-none px-2.5 text-[13px]", triggerClassName)}
        >
          {tab.name}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

/** The home demo stays mounted when another tab opens, so its conversation survives a tab switch. */
function Panels({
  tabs,
  className,
  style,
}: {
  tabs: readonly DemoTab[];
  className?: string;
  style?: CSSProperties;
}) {
  return tabs.map((tab) => (
    <TabsContent
      key={tab.id}
      value={tab.id}
      keepMounted={tab.id === HOME_TAB}
      className={cn(FRAME, className)}
      style={style}
    >
      {tab.content}
    </TabsContent>
  ));
}

function Caption({ tab, className }: { tab: DemoTab; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 text-[13px]",
        className,
      )}
    >
      <p className="text-muted-foreground min-w-0">{tab.tagline}</p>
      <Link
        href={tab.href}
        className="group/link text-foreground/80 hover:text-foreground inline-flex shrink-0 items-center gap-1 transition-colors"
      >
        {tab.link}
        <ArrowRightIcon
          aria-hidden
          className="size-3.5 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </div>
  );
}

function PlateStyle({ tabs, active, onValueChange }: StyleProps) {
  return (
    <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document p-3">
      <Tabs
        value={active.id}
        onValueChange={onValueChange}
        className="items-center gap-3"
      >
        <DemoTabList tabs={tabs} />
        <Panels
          tabs={tabs}
          className="rounded-document bg-background self-stretch"
        />
        <Caption tab={active} className="self-stretch px-1" />
      </Tabs>
    </div>
  );
}

function ShadowStyle({ tabs, active, onValueChange }: StyleProps) {
  return (
    <Tabs
      value={active.id}
      onValueChange={onValueChange}
      className="items-center gap-4"
    >
      <DemoTabList
        tabs={tabs}
        className="bg-background border-foreground/10 border"
        triggerClassName="data-active:bg-muted"
        style={TABS_SHADOW}
      />
      <Panels
        tabs={tabs}
        className="border-foreground/10 rounded-document bg-background self-stretch border"
        style={LIFT_SHADOW}
      />
      <Caption tab={active} className="self-stretch pt-2" />
    </Tabs>
  );
}

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
  const style: StyleProps = {
    tabs,
    active,
    onValueChange: (value) => {
      if (typeof value === "string") setTabId(value);
    },
  };

  return (
    <section aria-label="Demos" className="flex flex-col">
      <Variants id="home-demo-style" label="Home demo: style" default="plate">
        <Variant id="plate" label="On a plate">
          <PlateStyle {...style} />
        </Variant>
        <Variant id="shadow" label="Lifted, with white tabs">
          <ShadowStyle {...style} />
        </Variant>
      </Variants>
    </section>
  );
}
