"use client";

import { TextMessagePartProvider } from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function GfmMarkdown() {
  const gfmMarkdown = `### Rollout tasks

- [x] Ship the markdown renderer
- [x] Enable GFM parsing
- [ ] Collect feedback

The legacy renderer is ~~no longer maintained~~ replaced.

Docs live at https://www.assistant-ui.com

| Feature | Status | Notes |
| :-- | :-: | --: |
| Task lists | Done | Checkboxes |
| Strikethrough | Done | Tildes |
| Autolinks | Done | Bare URLs |`;

  return (
    <TextMessagePartProvider text={gfmMarkdown} isRunning={false}>
      <MarkdownText />
    </TextMessagePartProvider>
  );
}

export function MarkdownGfmSample() {
  return (
    <SampleFrame className="h-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <GfmMarkdown />
      </div>
    </SampleFrame>
  );
}
