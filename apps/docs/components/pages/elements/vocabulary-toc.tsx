"use client";

import { useEffect, useState } from "react";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";
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
      <div className="bg-background fixed top-12 bottom-0 w-52 overflow-y-auto overscroll-contain pt-20 pb-8">
        <p className="text-muted-foreground flex items-baseline justify-between px-2 text-[13px]">
          Vocabulary
          <span className="font-mono text-[11px] tabular-nums">{total}</span>
        </p>
        <nav
          aria-label="Component categories"
          className="mt-5 flex flex-col gap-5"
        >
          {categories.map((category) => (
            <div key={category.label} className="flex flex-col gap-1">
              <p className={cn(typeEyebrow, "px-2")}>{category.label}</p>
              <div className="flex flex-col gap-0.5">
                {category.components.map((name) => {
                  const active = activeId === name;
                  return (
                    <a
                      key={name}
                      href={`#${name}`}
                      aria-current={active ? "location" : undefined}
                      className={cn(
                        "rounded-control flex h-7 items-center px-2 text-[13px] transition-colors",
                        active
                          ? "bg-foreground/[0.06] text-foreground"
                          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0 truncate">{name}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
