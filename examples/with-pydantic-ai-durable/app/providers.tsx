"use client";

import dynamic from "next/dynamic";

const loading = () => (
  <p className="text-muted-foreground p-4 text-sm">Loading…</p>
);

// With NEXT_PUBLIC_ASSISTANT_BASE_URL set, Assistant Cloud keeps the thread
// list and the messages. Without it, the durable server keeps both.
// Both read the browser, so they render there only.
export const Providers = process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]
  ? dynamic(
      () =>
        import("./CloudRuntimeProvider").then((m) => m.CloudRuntimeProvider),
      { ssr: false, loading },
    )
  : dynamic(
      () => import("./MyRuntimeProvider").then((m) => m.MyRuntimeProvider),
      { ssr: false, loading },
    );
