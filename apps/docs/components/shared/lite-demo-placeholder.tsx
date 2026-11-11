"use client";

import { useEffect, useRef, useState } from "react";
import { loadLiteDemoAction } from "@/lib/lite-demos-action";

// Stands in for a heavy demo under `pnpm dev:lite`; see lib/lite-demos.ts.
function LiteDemoPlaceholder({ demo, label }: { demo: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const reload = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reload.current), []);
  return (
    <div
      data-lite-placeholder
      className="border-foreground/10 text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm"
    >
      <p>Lite mode skips {label} to save memory.</p>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await loadLiteDemoAction(demo);
          } catch (error) {
            console.error(error);
            setLoading(false);
            return;
          }
          // The demo compiles on the next request; give the watcher a moment.
          reload.current = setTimeout(() => window.location.reload(), 1500);
        }}
        className="bg-foreground text-background rounded-md px-3 py-1.5 font-medium disabled:opacity-60"
      >
        {loading ? "Compiling the demo…" : "Load demo"}
      </button>
    </div>
  );
}

export const HomeDemoPlaceholder = () => (
  <LiteDemoPlaceholder demo="home" label="the home page demo" />
);

export const PlaygroundPlaceholder = () => (
  <LiteDemoPlaceholder demo="playground" label="the playground" />
);
