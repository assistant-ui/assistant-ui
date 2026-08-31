"use client";

import { TextMessagePartProvider } from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function MarkdownDocument() {
  const richMarkdown = `## Product brief

A useful response can combine **clear structure**, _emphasis_, and [source links](https://www.assistant-ui.com).

### What ships

1. Accessible message primitives
2. Runtime adapters
   - Local runtime
   - External stores

> Keep the interface composable, then customize the presentation.

---

| Capability | Included |
| :-- | --: |
| Streaming | Yes |
| Tool calls | Yes |`;

  return (
    <TextMessagePartProvider text={richMarkdown} isRunning={false}>
      <MarkdownText />
    </TextMessagePartProvider>
  );
}

export function MarkdownRichDocumentSample() {
  return (
    <SampleFrame className="h-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <MarkdownDocument />
      </div>
    </SampleFrame>
  );
}
