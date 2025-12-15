"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EditIcon } from "lucide-react";
import { TOCHiringBanner } from "@/components/docs/toc-hiring-banner";

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

type TableOfContentsProps = {
  items: TOCItem[];
  githubEditUrl?: string;
};

export function TableOfContents({
  items,
  githubEditUrl,
}: TableOfContentsProps) {
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
    <div id="nd-toc" className="w-56 [grid-area:toc] max-xl:hidden">
      <div className="sticky top-14 flex max-h-[calc(100vh-3.5rem)] flex-col pe-4 pb-2">
        <p className="mb-3 shrink-0 text-muted-foreground/70 text-xs">
          On this page
        </p>
        <ul
          ref={listRef}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const id = item.url.slice(1);
            const isActive = activeId === id;
            const indent = item.depth > 2 ? (item.depth - 2) * 12 : 0;

            return (
              <li key={item.url} data-toc-id={id}>
                <a
                  href={item.url}
                  style={{
                    paddingLeft: indent > 0 ? `${indent}px` : undefined,
                  }}
                  className={cn(
                    "wrap-break-word block py-1 text-[13px] leading-snug transition-colors",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 shrink-0 space-y-4 border-t pt-4">
          {githubEditUrl && (
            <a
              href={githubEditUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
            >
              <EditIcon className="size-3" />
              Edit on GitHub
            </a>
          )}
          <TOCHiringBanner />
        </div>
      </div>
    </div>
  );
}
