"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FilterInput } from "@/components/pages/elements/filter-input";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { ELEMENT_COUNT, ELEMENT_SECTIONS } from "./registry";

export function ElementsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const current = pathname.split("/").filter(Boolean).at(-1) ?? "";

  const normalized = query.trim().toLowerCase();
  const sections = normalized
    ? ELEMENT_SECTIONS.map((section) => ({
        label: section.label,
        elements: section.elements.filter((element) =>
          `${element.title} ${element.slug}`.toLowerCase().includes(normalized),
        ),
      })).filter((section) => section.elements.length > 0)
    : ELEMENT_SECTIONS;
  const matchCount = sections.reduce(
    (total, section) => total + section.elements.length,
    0,
  );

  return (
    <aside className="hidden lg:block">
      <div className="bg-background fixed top-12 bottom-0 w-52 [scrollbar-width:none] overflow-y-auto overscroll-contain pt-20 pb-8 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/elements"
          className="text-muted-foreground hover:text-foreground flex items-baseline justify-between px-2 text-[13px] transition-colors"
        >
          Elements
          <span className="font-mono text-[11px] tabular-nums">
            {normalized ? `${matchCount} / ${ELEMENT_COUNT}` : ELEMENT_COUNT}
          </span>
        </Link>
        <FilterInput
          value={query}
          onValueChange={setQuery}
          onEnter={() => {
            const first = sections[0]?.elements[0];
            if (first)
              router.push(`/elements/${first.slug}`, { scroll: false });
          }}
          placeholder="Filter"
          aria-label="Filter elements"
          className="mx-0.5 mt-3"
        />
        {normalized && sections.length === 0 && (
          <p className="text-muted-foreground mt-4 px-2 font-mono text-[11px]">
            Nothing matches.
          </p>
        )}
        <nav aria-label="Elements" className="mt-5 flex flex-col gap-5">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <p className={cn(typeEyebrow, "px-2")}>{section.label}</p>
              <div className="flex flex-col gap-0.5">
                {section.elements.map((element) => {
                  const active = element.slug === current;
                  return (
                    <Link
                      key={element.slug}
                      href={`/elements/${element.slug}`}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-7 items-center rounded-(--radius-control) px-2 text-[13px] transition-colors",
                        active
                          ? "bg-foreground/[0.06] text-foreground"
                          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0 truncate">{element.title}</span>
                    </Link>
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
