"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { ELEMENT_COUNT, ELEMENT_SECTIONS } from "./registry";

export function ElementsSidebar() {
  const pathname = usePathname();
  const current = pathname.split("/").filter(Boolean).at(-1) ?? "";

  return (
    <aside className="hidden lg:block">
      <div className="bg-background fixed top-12 bottom-0 w-52 overflow-y-auto overscroll-contain pt-20 pb-8">
        <Link
          href="/elements"
          className="text-muted-foreground hover:text-foreground flex items-baseline justify-between px-2 text-[13px] transition-colors"
        >
          Elements
          <span className="font-mono text-[11px] tabular-nums">
            {ELEMENT_COUNT}
          </span>
        </Link>
        <nav aria-label="Elements" className="mt-5 flex flex-col gap-5">
          {ELEMENT_SECTIONS.map((section) => (
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
