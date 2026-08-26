"use client";

import type { SourceMessagePartProps } from "@assistant-ui/react";
import { Sources } from "@/components/assistant-ui/sources";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function SourcesDocumentSample() {
  const part: SourceMessagePartProps = {
    type: "source",
    sourceType: "document",
    id: "source-document",
    title: "Q3 Planning Notes",
    mediaType: "application/pdf",
    filename: "q3-planning-notes.pdf",
    status: { type: "complete" },
  };

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Sources {...part} />
    </SampleFrame>
  );
}
