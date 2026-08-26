"use client";

import type { SourceMessagePartProps } from "@assistant-ui/react";
import { Sources } from "@/components/assistant-ui/sources";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function SourcesUrlSample() {
  const parts: SourceMessagePartProps[] = [
    {
      type: "source",
      sourceType: "url",
      id: "source-titled",
      url: "https://react.dev/reference/react",
      title: "React Reference",
      status: { type: "complete" },
    },
    {
      type: "source",
      sourceType: "url",
      id: "source-untitled",
      url: "https://developer.mozilla.org/en-US/docs/Web",
      status: { type: "complete" },
    },
  ];

  return (
    <SampleFrame className="flex h-auto flex-wrap items-center justify-center gap-2 p-6">
      {parts.map((part) => (
        <Sources key={part.id} {...part} />
      ))}
    </SampleFrame>
  );
}
