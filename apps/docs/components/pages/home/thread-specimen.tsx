"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HomeThread } from "@/components/pages/home/home-thread";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import Link from "next/link";

export function ThreadSpecimen() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [expanded]);

  const thread = (
    <HomeThread
      expanded={expanded}
      onToggleExpanded={() => setExpanded((prev) => !prev)}
    />
  );

  return (
    <section aria-label="Thread" className="flex flex-col gap-3">
      <div className="border-foreground/10 h-[min(52rem,88svh)] overflow-hidden rounded-(--radius-document) border">
        <DocsRuntimeProvider devtools={false}>
          {expanded
            ? createPortal(
                <div className="bg-background fixed inset-0 z-[60] overflow-hidden">
                  {thread}
                </div>,
                document.body,
              )
            : thread}
        </DocsRuntimeProvider>
      </div>
      <div className="flex justify-end">
        <Link
          href="/examples"
          className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
        >
          Explore other examples
        </Link>
      </div>
    </section>
  );
}
