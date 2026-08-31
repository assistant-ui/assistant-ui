import type { ReactNode } from "react";
import Link from "next/link";
import { DESIGN_SECTIONS } from "@/components/pages/design/registry-meta";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";

export function DesignRail({ activeSlug }: { activeSlug?: string }): ReactNode {
  return (
    <nav aria-label="Components" className="flex flex-col gap-5">
      {DESIGN_SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          <p className={cn(typeEyebrow, "px-2")}>{section.label}</p>
          <div className="flex flex-col gap-0.5">
            {section.components.map((component) => {
              const active = component.slug === activeSlug;
              return (
                <Link
                  key={component.slug}
                  href={`/design/components/${component.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-control flex h-7 items-center px-2 text-[13px] transition-colors",
                    active
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                  )}
                >
                  <span className="min-w-0 truncate">{component.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
