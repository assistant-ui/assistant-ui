"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterInput } from "./filter-input";
import { typeEyebrow } from "@/components/shared/type";
import {
  ELEMENT_COUNT,
  ELEMENT_SECTIONS,
  ELEMENTS,
  getElement,
} from "./registry";

const stepClass = "grid size-7 place-items-center rounded-sm transition-colors";

export function ElementPager({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const element = getElement(slug);
  if (!element) return null;

  const previous = ELEMENTS[element.index - 2];
  const next = ELEMENTS[element.index];

  const normalized = query.trim().toLowerCase();
  const sections = normalized
    ? ELEMENT_SECTIONS.map((section) => ({
        label: section.label,
        elements: section.elements.filter((entry) =>
          `${entry.title} ${entry.slug}`.toLowerCase().includes(normalized),
        ),
      })).filter((section) => section.elements.length > 0)
    : ELEMENT_SECTIONS;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const jumpToFirst = () => {
    const first = sections[0]?.elements[0];
    if (!first) return;
    handleOpenChange(false);
    router.push(`/elements/${first.slug}`, { scroll: false });
  };

  return (
    <nav aria-label="Browse elements" className="flex items-center gap-0.5">
      {previous ? (
        <Link
          href={`/elements/${previous.slug}`}
          scroll={false}
          aria-label={`Previous: ${previous.title}`}
          className={cn(
            stepClass,
            "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
          )}
        >
          <ChevronLeftIcon className="size-3.5" />
        </Link>
      ) : (
        <span aria-hidden className={cn(stepClass, "text-foreground/20")}>
          <ChevronLeftIcon className="size-3.5" />
        </span>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          aria-label="Jump to element"
          className="text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground flex h-7 items-center rounded-sm px-1.5 font-mono text-[11px] tabular-nums transition-colors"
        >
          {String(element.index).padStart(2, "0")}
          <span className="text-foreground/30 px-1">/</span>
          {ELEMENT_COUNT}
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-64 gap-0 p-0">
          <div className="border-foreground/10 border-b p-2">
            <FilterInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              onEnter={jumpToFirst}
              placeholder="Filter elements"
              aria-label="Filter elements"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {sections.length === 0 && (
              <p className="text-muted-foreground px-2 py-1.5 font-mono text-[11px]">
                Nothing matches.
              </p>
            )}
            {sections.map((section) => (
              <div key={section.label} className="pt-3 first:pt-0">
                <p className={cn(typeEyebrow, "px-2")}>{section.label}</p>
                <div className="mt-1 flex flex-col gap-0.5">
                  {section.elements.map((entry) => {
                    const active = entry.slug === slug;
                    return (
                      <Link
                        key={entry.slug}
                        href={`/elements/${entry.slug}`}
                        scroll={false}
                        aria-current={active ? "page" : undefined}
                        onClick={() => handleOpenChange(false)}
                        className={cn(
                          "rounded-control flex h-7 items-center px-2 text-[13px] transition-colors",
                          active
                            ? "bg-foreground/[0.06] text-foreground"
                            : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                        )}
                      >
                        <span className="min-w-0 truncate">{entry.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {next ? (
        <Link
          href={`/elements/${next.slug}`}
          scroll={false}
          aria-label={`Next: ${next.title}`}
          className={cn(
            stepClass,
            "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
          )}
        >
          <ChevronRightIcon className="size-3.5" />
        </Link>
      ) : (
        <span aria-hidden className={cn(stepClass, "text-foreground/20")}>
          <ChevronRightIcon className="size-3.5" />
        </span>
      )}
    </nav>
  );
}
