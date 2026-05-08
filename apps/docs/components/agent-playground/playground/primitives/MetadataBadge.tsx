import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function MetadataBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[9px]", className)}>
      {children}
    </span>
  );
}
