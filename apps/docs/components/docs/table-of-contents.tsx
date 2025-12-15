"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  if (items.length === 0) return null;

  return (
    <div id="nd-toc" className="w-56 [grid-area:toc] max-xl:hidden">
      <div className="sticky top-14 pe-4 pt-12 pb-2">
        <p className="mb-3 text-muted-foreground/70 text-xs">On this page</p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = activeId === item.url.slice(1);
            const indent = item.depth > 2 ? (item.depth - 2) * 12 : 0;

            return (
              <li key={item.url}>
                <a
                  href={item.url}
                  style={{
                    paddingLeft: indent > 0 ? `${indent}px` : undefined,
                  }}
                  className={cn(
                    "block py-1 text-[13px] leading-snug transition-colors",
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
        {githubEditUrl && (
          <a
            href={githubEditUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-6 inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
          >
            <EditIcon className="size-3" />
            Edit on GitHub
          </a>
        )}
        <div className="mt-6">
          <TOCHiringBanner />
        </div>
      </div>
    </div>
  );
}
