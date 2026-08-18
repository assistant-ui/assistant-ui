"use client";

import { useEffect, useState } from "react";

const INK_DEMO_URL =
  process.env.NEXT_PUBLIC_INK_DEMO_URL ?? "https://assistant-ui-ink.vercel.app";

export function TerminalDemo() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(INK_DEMO_URL);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted/40 overflow-hidden rounded-2xl">
        {src ? (
          <iframe
            src={src}
            className="h-[480px] w-full border-0"
            title="assistant-ui ink live demo"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="h-[480px] w-full" aria-hidden />
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        A live Ink render loop. Click the terminal and type.
      </p>
    </div>
  );
}
