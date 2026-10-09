"use client";

import { useState } from "react";
import {
  Sources,
  type Source,
} from "@/components/assistant-ui/elements/sources";

const SOURCES: Source[] = [
  {
    title: "Draft restore",
    url: "https://www.assistant-ui.com/elements/draft-restore",
    snippet:
      "Come back to a thread and the sentence you never sent is still waiting.",
    author: "assistant-ui",
  },
  {
    title: "You Might Not Need an Effect",
    url: "https://react.dev/learn/you-might-not-need-an-effect",
    snippet: "Effects are an escape hatch from the React paradigm.",
  },
  {
    title:
      "core: InMemoryThreadList carries one thread's composer into the next",
    url: "https://github.com/assistant-ui/assistant-ui/issues/8046",
    publishedAt: "2026-09-23",
  },
];

export function SourcesDemo() {
  const [open, setOpen] = useState(false);

  return <Sources sources={SOURCES} open={open} onOpenChange={setOpen} />;
}
