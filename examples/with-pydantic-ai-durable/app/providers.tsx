"use client";

import dynamic from "next/dynamic";

// The runtime reads the thread id from the URL, so it renders in the browser only.
export const Providers = dynamic(
  () => import("./MyRuntimeProvider").then((m) => m.MyRuntimeProvider),
  {
    ssr: false,
    loading: () => (
      <p className="text-muted-foreground p-4 text-sm">Loading…</p>
    ),
  },
);
