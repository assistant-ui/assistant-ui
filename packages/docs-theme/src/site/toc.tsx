"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./utils";

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

function headingId(url: string) {
  const fragment = url.slice(1);
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

export function DocsTableOfContents({
  items,
  children,
}: {
  items: TOCItem[];
  children?: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const headingIds = items.map((item) => headingId(item.url));

    const viewport = window.matchMedia("(min-width: 1280px)");
    let observer: IntersectionObserver | undefined;
    const observeVisibleHeadings = () => {
      observer?.disconnect();
      if (!viewport.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
              break;
            }
          }
        },
        { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
      );
      for (const id of headingIds) {
        const element = document.getElementById(id);
        if (element) observer.observe(element);
      }
    };
    observeVisibleHeadings();
    viewport.addEventListener("change", observeVisibleHeadings);
    return () => {
      observer?.disconnect();
      viewport.removeEventListener("change", observeVisibleHeadings);
    };
  }, [items]);

  useEffect(() => {
    if (!activeId || !listRef.current) return;

    const activeElement = Array.from(listRef.current.children).find(
      (item) => item.getAttribute("data-toc-id") === activeId,
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
    <div className="docs-toc w-56 max-xl:hidden">
      <div className="sticky top-[calc(var(--docs-header-height)_+_1rem)] flex max-h-[calc(100vh_-_var(--docs-header-height)_-_1rem)] flex-col pe-4 pt-4 pb-2">
        <p className="text-muted-foreground mb-3 shrink-0 text-xs">
          On this page
        </p>
        <ul
          ref={listRef}
          className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-1 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const id = headingId(item.url);
            const isActive = activeId === id;
            const indent = Math.max(0, item.depth - 2) * 12;

            return (
              <li key={item.url} data-toc-id={id}>
                <a
                  href={item.url}
                  style={{ paddingLeft: indent || undefined }}
                  className={cn(
                    "block py-1 text-[13px] leading-snug wrap-break-word transition-colors",
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
        <div className="mt-6 shrink-0">{children}</div>
      </div>
    </div>
  );
}
