"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { ELEMENT_COUNT, ELEMENT_SECTIONS, ELEMENTS } from "./registry";

export function ElementsSidebar() {
  const pathname = usePathname();
  const current = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const indexBySlug = new Map(ELEMENTS.map((e) => [e.slug, e.index]));

  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-32 -ms-2 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain ps-2 pe-3 pb-8">
        <Link
          href="/elements"
          className="hover:text-foreground/70 flex items-baseline justify-between text-[13px] font-medium transition-colors"
        >
          Elements
          <span className={cn(mono, "text-foreground/35 tabular-nums")}>
            {ELEMENT_COUNT}
          </span>
        </Link>
        {ELEMENT_SECTIONS.map((section) => (
          <div key={section.label} className="mt-6">
            <p className={cn(mono, "text-foreground/35")}>{section.label}</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {section.elements.map((element) => {
                const active = element.slug === current;
                return (
                  <li key={element.slug}>
                    <Link
                      href={`/elements/${element.slug}`}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
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
                        {String(indexBySlug.get(element.slug) ?? 0).padStart(
                          2,
                          "0",
                        )}
                      </span>
                      <span className="truncate">{element.title}</span>
                    </Link>
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
