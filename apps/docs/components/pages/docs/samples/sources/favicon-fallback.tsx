"use client";

import { useState } from "react";

import {
  Source,
  SourceIcon,
  SourceTitle,
} from "@/components/assistant-ui/sources";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function SourcesFaviconFallback() {
  return (
    <Source href="https://example.com/reference">
      <SourceIcon
        url="https://example.com/reference"
        faviconUrl={() => "/missing-source-favicon.ico"}
      />
      <SourceTitle>Example Reference</SourceTitle>
    </Source>
  );
}

export function SourcesFaviconFallbackSample() {
  const [mounted, setMounted] = useState(false);
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      {/* The favicon 404s before hydration when server-rendered, which loses
          the img error event and skips the fallback. Mount after hydration so
          the error handler is attached first. */}
      <div
        ref={() => {
          setMounted(true);
        }}
      >
        {mounted && <SourcesFaviconFallback />}
      </div>
    </SampleFrame>
  );
}
