import "diagrammatic/styles.css";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const plateSurface =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] [--dg-surface:color-mix(in_oklab,var(--foreground)_2.5%,var(--background))] dark:[--dg-surface:color-mix(in_oklab,var(--foreground)_4%,var(--background))]";

export function Figure({
  n,
  caption,
  children,
  className,
}: {
  n?: number | string;
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className="not-prose my-8">
      <div
        className={cn(
          plateSurface,
          "rounded-document px-4 py-8 sm:px-8 sm:py-10",
          className,
        )}
      >
        <div className="mx-auto w-full max-w-[640px]">{children}</div>
      </div>
      {caption && (
        <figcaption className="text-muted-foreground mt-3 text-xs leading-relaxed">
          {n !== undefined && (
            <span className="tabular-nums">
              fig. {String(n).padStart(2, "0")} ·{" "}
            </span>
          )}
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
