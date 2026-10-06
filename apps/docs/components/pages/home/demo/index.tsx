"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import { useFullscreenOverlay } from "./fullscreen";
import { DemoShell, type DemoView } from "./shell";

export function HomeDemo(): ReactNode {
  const { expanded, toggle, overlayRef } = useFullscreenOverlay();
  // Entering fullscreen portals the shell into a new tree, so the surface the
  // visitor is on is held here rather than inside it.
  const [view, setView] = useState<DemoView>("thread");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  return (
    <section aria-label="Thread" className="flex flex-col gap-3">
      <div className="border-foreground/10 rounded-document h-[min(36rem,72svh)] min-h-[26rem] overflow-hidden border">
        <DocsRuntimeProvider devtools={false} followUps countConversations>
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
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>
          <span className="font-mono text-xs">fig. 01</span> · Thread
        </p>
        <Link
          href="/examples"
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center transition-colors"
        >
          Explore other examples
        </Link>
      </div>
    </section>
  );
}
