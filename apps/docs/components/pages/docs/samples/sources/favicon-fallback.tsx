"use client";

import { useEffect, useState } from "react";

import { Sources } from "@/components/assistant-ui/elements/sources.aui";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function SourcesFaviconFallback() {
  return (
    <Sources.Root href="https://example.com/reference">
      <Sources.Icon
        url="https://example.com/reference"
        faviconUrl={() => "/missing-source-favicon.ico"}
      />
      <Sources.Title>Example Reference</Sources.Title>
    </Sources.Root>
  );
}

export function SourcesFaviconFallbackSample() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      {/* The favicon 404s before hydration when server-rendered, which loses
          the img error event and skips the fallback. Mount after hydration so
          the error handler is attached first. */}
      {mounted && <SourcesFaviconFallback />}
    </SampleFrame>
  );
}
