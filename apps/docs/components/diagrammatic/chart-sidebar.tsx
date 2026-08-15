"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { CHART_COUNT, CHART_SECTIONS } from "./registry";

export function ChartSidebar() {
  const pathname = usePathname();
  const current = pathname.split("/").filter(Boolean).at(-1) ?? "";

  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-36 -ms-2 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain ps-2 pe-3 pb-8">
        <Link
          href="/diagrammatic"
          className="hover:text-foreground/70 flex items-baseline justify-between text-[13px] font-medium transition-colors"
        >
          Diagrammatic
          <span className={cn(mono, "text-foreground/35 tabular-nums")}>
            {CHART_COUNT}
          </span>
        </Link>
        {CHART_SECTIONS.map((section) => (
          <div key={section.label} className="mt-6">
            <p className={cn(mono, "text-foreground/35")}>{section.label}</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {section.charts.map((chart) => {
                const active = chart.slug === current;
                return (
                  <li key={chart.slug}>
                    <Link
                      href={`/diagrammatic/${chart.slug}`}
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
                        {String(chart.index).padStart(2, "0")}
                      </span>
                      <span className="truncate">{chart.name}</span>
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
