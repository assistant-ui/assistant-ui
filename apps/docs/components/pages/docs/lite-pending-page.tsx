"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Shown by `pnpm dev:lite` while the dev server compiles this page.
export function LitePendingPage() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <p className="text-muted-foreground text-sm">
      Compiling this page (lite mode). It loads in a few seconds.
    </p>
  );
}
