"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

const MAX_LINE_WIDTH = 36; // h2 active width, used as fixed container width

function getLineWidth(depth: number, isActive: boolean): number {
  const base = depth <= 2 ? 24 : depth === 3 ? 16 : 10;
  return isActive ? base + 12 : base;
}

export function BlogTOC({ items }: { items: TOCItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  const isClickScrolling = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const headingIds = items.map((item) => item.url.slice(1));

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
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    setActiveId(id);
    isClickScrolling.current = true;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  if (items.length === 0) return null;

  return (
    <nav
      ref={listRef}
      className="fixed top-1/2 right-6 z-40 -translate-y-1/2 max-lg:hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ul className="flex flex-col" style={{ width: MAX_LINE_WIDTH }}>
        {items.map((item) => {
          const id = item.url.slice(1);
          const isActive = activeId === id;
          const lineWidth = getLineWidth(item.depth, isActive);

          return (
            <li key={item.url}>
              <a
                href={item.url}
                onClick={() => handleClick(id)}
                className="group relative flex h-6 items-center justify-end"
              >
                <div
                  className={cn(
                    "h-px shrink-0 rounded-full transition-all duration-200",
                    isActive
                      ? "bg-foreground"
                      : "bg-foreground/20 group-hover:bg-foreground/40",
                  )}
                  style={{ width: lineWidth }}
                />
                <span
                  className={cn(
                    "absolute right-full mr-3 whitespace-nowrap text-[12px] leading-none transition-all duration-200",
                    isHovered
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none -translate-x-2 opacity-0",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {item.title}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
