import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualBackdrop, visualLift, type VisualTone } from "./library-visual";

/** The link at the foot of a library page, with a small visual of what it leads to. */
export function LibraryRelatedVisual({
  heading,
  href,
  title,
  description,
  tone,
  labels,
}: {
  heading: string;
  href: string;
  title: string;
  description: string;
  tone: VisualTone;
  /** A few names from the linked page, shown as pills on the visual. */
  labels: readonly string[];
}) {
  return (
    <aside
      aria-labelledby="library-related-visual"
      className="border-t pt-12 pb-12"
    >
      <h2 id="library-related-visual" className="mb-4 text-base font-medium">
        {heading}
      </h2>
      <Link
        href={href}
        className="group/related ring-foreground/10 hover:bg-foreground/[0.025] focus-visible:ring-ring flex items-center gap-6 rounded-[32px] p-2 pe-7 ring-1 transition-colors outline-none focus-visible:ring-2"
      >
        <VisualBackdrop
          tone={tone}
          className="flex h-28 w-44 shrink-0 flex-col items-start justify-center gap-1.5 rounded-[24px] ps-4"
        >
          {labels.map((label, index) => (
            <span
              key={label}
              aria-hidden
              style={{ marginInlineStart: `${index * 14}px` }}
              className={cn(
                "bg-background/90 h-7 rounded-full px-3 text-xs leading-7 whitespace-nowrap backdrop-blur-md",
                visualLift,
              )}
            >
              {label}
            </span>
          ))}
        </VisualBackdrop>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base font-medium">{title}</span>
          <span className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </span>
        </span>
        <ArrowRightIcon
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-hover/related:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </aside>
  );
}
