"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

type TableOfContentsProps = {
  items: TOCItem[];
};

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const headingIds = items.map((item) => item.url.slice(1));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const id of headingIds) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    if (!activeId || !listRef.current) return;

    const activeElement = listRef.current.querySelector(
      `[data-toc-id="${activeId}"]`,
    );
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeId]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className="docs-toc w-48 max-xl:hidden">
      <div className="sticky top-[calc(var(--docs-header-height)_+_2.5rem)] flex max-h-[calc(100vh_-_var(--docs-header-height)_-_2.5rem)] flex-col pe-4 pb-4">
        <p className="text-muted-foreground mb-3 shrink-0 text-xs font-medium">
          On this page
        </p>
        <ul
          ref={listRef}
          className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-1 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const id = item.url.slice(1);
            const isActive = activeId === id;
            const indent = Math.max(0, item.depth - 2) * 12;

            return (
              <li key={item.url} data-toc-id={id}>
                <a
                  href={item.url}
                  aria-current={isActive ? "location" : undefined}
                  style={{ paddingLeft: indent || undefined }}
                  className={cn(
                    "focus-visible:outline-ring block py-1 text-[13px] leading-snug wrap-break-word transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export function MobileTableOfContents({ items }: { items: TOCItem[] }) {
  if (items.length === 0) return null;

  return (
    <details className="not-prose group border-foreground/10 mb-8 border-b pb-3 xl:hidden">
      <summary className="text-muted-foreground hover:text-foreground focus-visible:outline-ring flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        On this page
        <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <nav aria-label="On this page">
        <ul className="grid gap-1 pt-2 pb-3 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                className="text-muted-foreground hover:text-foreground focus-visible:outline-ring block py-2 text-sm leading-relaxed focus-visible:outline-2"
                style={{
                  paddingLeft: Math.max(0, item.depth - 2) * 12 || undefined,
                }}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
