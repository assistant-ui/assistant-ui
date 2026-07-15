"use client";

import { useEffect, useState } from "react";
import type { ComponentCategory } from "@/lib/component-reference";

export function ComponentsToc({
  categories,
}: {
  categories: readonly ComponentCategory[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

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
    <nav
      aria-label="Component categories"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto lg:block"
    >
      <div className="flex flex-col gap-6">
        {categories.map((category) => (
          <div key={category.label}>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              {category.label}
            </p>
            <ul className="flex flex-col gap-1">
              {category.components.map((name) => {
                const isActive = activeId === name;
                return (
                  <li key={name}>
                    <a
                      href={`#${name}`}
                      className={`hover:text-foreground block text-sm transition-colors ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
