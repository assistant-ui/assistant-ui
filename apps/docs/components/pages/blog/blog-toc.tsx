"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

export function BlogTOC({ items }: { items: TOCItem[] }) {
  const headings = useMemo(
    () => items.filter((item) => item.depth <= 2),
    [items],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const isClickScrolling = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const headingIds = headings.map((item) => item.url.slice(1));

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
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
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (id: string) => {
    setActiveId(id);
    isClickScrolling.current = true;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="w-64 max-lg:hidden">
      <div className="lg:sticky lg:top-24">
        <p className="text-muted-foreground mb-3 text-sm">On this page</p>
        <ul className="flex flex-col gap-2">
          {headings.map((item) => {
            const id = item.url.slice(1);
            const isActive = activeId === id;

            return (
              <li key={item.url}>
                <a
                  href={item.url}
                  onClick={() => handleClick(id)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "block text-sm leading-snug text-pretty transition-colors",
                    isActive
                      ? "text-foreground"
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
