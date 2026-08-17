"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { gutter, meta } from "./atlas";

type TocSection = { id: string; label: string };

export function FamilyToc({ sections }: { sections: TocSection[] }) {
  const [active, setActive] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= 240) current = section.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const item = itemRefs.current.get(active);
    if (!container || !item) return;
    const left = item.offsetLeft;
    const right = left + item.offsetWidth;
    const viewStart = container.scrollLeft;
    const viewEnd = viewStart + container.clientWidth;
    if (left < viewStart + 16 || right > viewEnd - 16) {
      container.scrollTo({ left: left - 24, behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav
      aria-label="Families"
      className="sticky top-13 z-30 border-y border-(--da-line) bg-(--da-paper)"
    >
      <div
        ref={containerRef}
        className={cn(gutter, "overflow-x-auto whitespace-nowrap")}
      >
        <div className="flex items-stretch gap-7">
          {sections.map((section, i) => {
            const isActive = section.id === active;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                ref={(el) => {
                  if (el) itemRefs.current.set(section.id, el);
                  else itemRefs.current.delete(section.id);
                }}
                className={cn(
                  meta,
                  "relative flex items-baseline gap-2 py-3 transition-colors",
                  isActive
                    ? "text-(--da-ink)"
                    : "text-(--da-ink)/50 hover:text-(--da-ink)",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] tabular-nums transition-colors",
                    isActive ? "text-(--da-red)" : "text-(--da-ink)/30",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {section.label}
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-(--da-red)"
                  />
                ) : null}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
