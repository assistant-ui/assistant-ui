"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface RailSection {
  id: string;
  label: string;
}

export function SectionRail({ sections }: { sections: RailSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Sections"
      className="group/rail fixed top-1/2 right-8 z-30 hidden -translate-y-1/2 xl:block"
    >
      <ul className="flex flex-col items-end gap-1">
        {sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id}>
              <button
                type="button"
                aria-current={current ? "true" : undefined}
                onClick={() =>
                  document
                    .getElementById(section.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="group/item flex h-6 cursor-pointer items-center justify-end gap-2.5 outline-none"
              >
                <span
                  className={cn(
                    "translate-x-1 text-[12.5px] whitespace-nowrap opacity-0 transition-[opacity,translate,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 motion-reduce:transition-none",
                    current
                      ? "text-foreground/90 font-medium"
                      : "text-foreground/45 group-hover/item:text-foreground/70",
                  )}
                >
                  {section.label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "h-px transition-[width,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                    current
                      ? "bg-foreground/90 w-7"
                      : "bg-foreground/25 group-hover/item:bg-foreground/55 w-4 group-hover/item:w-6",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
