"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

/**
 * A hosted demo in an iframe, the way the Native and Ink pages show theirs.
 * The frame loads after hydration and only once it nears the viewport.
 */
export function LiveFrame({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  return (
    <div
      className={cn(
        "border-foreground/10 rounded-document bg-foreground/[0.025] dark:bg-foreground/[0.04] overflow-hidden border",
        className,
      )}
    >
      {hydrated ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="clipboard-read; clipboard-write"
          className="block size-full border-0"
        />
      ) : null}
    </div>
  );
}
