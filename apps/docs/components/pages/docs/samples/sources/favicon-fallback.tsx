"use client";

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
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <SourcesFaviconFallback />
    </SampleFrame>
  );
}
