"use client";

import { useState } from "react";
import {
  InlineCitation,
  type Source,
} from "@/components/assistant-ui/elements/inline-citation";

const SOURCES: Source[] = [
  {
    domain: "assistant-ui.com",
    title: "Optimistic updates in the runtime",
    snippet:
      "The runtime applies local edits immediately and reconciles them once the server acknowledges the write.",
  },
  {
    domain: "react.dev",
    title: "useSyncExternalStore reference",
    snippet:
      "Subscribes a component to an external store, re-rendering on every store change with a consistent snapshot.",
  },
];

export function InlineCitationDemo() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <InlineCitation
      sources={SOURCES}
      openIndex={openIndex}
      onOpenIndexChange={setOpenIndex}
    />
  );
}
