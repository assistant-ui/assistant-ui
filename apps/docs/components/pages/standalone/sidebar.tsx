"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { STANDALONE_COMPONENTS, STANDALONE_COUNT } from "@/lib/standalone";

function useStandaloneSlug() {
  const pathname = usePathname();
  return pathname.split("/").filter(Boolean).at(-1) ?? "";
}

export function StandaloneSidebar() {
  const current = useStandaloneSlug();

  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-32 -ms-2 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain ps-2 pe-3 pb-8">
        <Link
          href="/standalone"
          className="hover:text-foreground/70 flex items-baseline justify-between text-[13px] font-medium transition-colors"
        >
          Standalone
          <span className={cn(mono, "text-foreground/35 tabular-nums")}>
            {STANDALONE_COUNT}
          </span>
        </Link>
        <ul className="mt-6 flex flex-col gap-0.5">
          {STANDALONE_COMPONENTS.map((item, index) => {
            const active = item.slug === current;
            return (
              <li key={item.slug}>
                <Link
                  href={`/standalone/${item.slug}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mx-2 flex items-baseline gap-2 rounded-md px-2 py-1 text-[13px] transition-colors",
                    active
                      ? "bg-foreground/[0.05] text-foreground dark:bg-foreground/[0.08] font-medium"
                      : "text-foreground/45 hover:bg-foreground/[0.03] hover:text-foreground/90",
                  )}
                >
                  <span className={cn(mono, "text-foreground/30 tabular-nums")}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export function StandaloneMobileNav() {
  const current = useStandaloneSlug();

  return (
    <nav className="mt-6 flex flex-wrap gap-x-3 gap-y-1.5 lg:hidden">
      {STANDALONE_COMPONENTS.map((item) => {
        const active = item.slug === current;
        return (
          <Link
            key={item.slug}
            href={`/standalone/${item.slug}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-[13px] transition-colors",
              active
                ? "text-foreground font-medium"
                : "text-foreground/45 hover:text-foreground/90",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
