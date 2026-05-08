import { cn } from "@/lib/utils";
import type { AnchorHTMLAttributes, ReactNode } from "react";

export function SurfaceLink({
  children,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a
      {...props}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded border px-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
    </a>
  );
}
