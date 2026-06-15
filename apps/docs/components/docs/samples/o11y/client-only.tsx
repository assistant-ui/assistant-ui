"use client";

import { useEffect, useState, type ReactNode } from "react";

export function ClientOnly({
  children,
  minHeight,
}: {
  children: ReactNode;
  minHeight: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
