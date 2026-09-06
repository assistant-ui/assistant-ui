"use client";

import { type ReactNode } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

export function ClientOnly({
  children,
  minHeight,
}: {
  children: ReactNode;
  minHeight: number;
}) {
  const mounted = useHydrated();

  if (!mounted) {
    return (
      <div
        className="border-border bg-muted/20 animate-pulse rounded-lg border"
        style={{ minHeight }}
      />
    );
  }

  return <>{children}</>;
}
