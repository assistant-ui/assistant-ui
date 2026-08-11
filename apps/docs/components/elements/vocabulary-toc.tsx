"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import type { ComponentCategory } from "@/lib/component-reference";

export function VocabularyToc({
  categories,
}: {
  categories: readonly ComponentCategory[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const total = categories.reduce(
    (count, category) => count + category.components.length,
    0,
  );
  let runningIndex = 0;

  useEffect(() => {
    const ids = categories.flatMap((category) => [...category.components]);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [categories]);

  return (
    <aside className="hidden lg:block">
      <nav
        aria-label="Component categories"
        className="sticky top-36 -ms-2 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain ps-2 pe-3 pb-8"
      >
        <p className="flex items-baseline justify-between text-[13px] font-medium">
          Vocabulary
          <span className={cn(mono, "text-foreground/35 tabular-nums")}>
            {total}
          </span>
        </p>
        {categories.map((category) => (
          <div key={category.label} className="mt-6">
            <p className={cn(mono, "text-foreground/35")}>{category.label}</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {category.components.map((name) => {
                runningIndex += 1;
                const index = runningIndex;
                const active = activeId === name;
                return (
                  <li key={name}>
                    <a
                      href={`#${name}`}
                      aria-current={active ? "location" : undefined}
                      className={cn(
                        "-mx-2 flex items-baseline gap-2 rounded-md px-2 py-1 text-[13px] transition-colors",
                        active
                          ? "bg-foreground/[0.05] text-foreground dark:bg-foreground/[0.08] font-medium"
                          : "text-foreground/45 hover:bg-foreground/[0.03] hover:text-foreground/90",
                      )}
                    >
                      <span
                        className={cn(mono, "text-foreground/30 tabular-nums")}
                      >
                        {String(index).padStart(2, "0")}
                      </span>
                      <span className="truncate">{name}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
