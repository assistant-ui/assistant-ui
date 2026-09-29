"use client";

import { useState } from "react";
import {
  Citation,
  InlineCitation,
  type Source,
} from "@/components/assistant-ui/elements/inline-citation";

const SOURCES = [
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
] as const satisfies readonly Source[];

export function InlineCitationDemo() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <InlineCitation>
      Optimistic updates keep the thread responsive while the server confirms
      the write
      <Citation
        index={0}
        source={SOURCES[0]}
        open={openIndex === 0}
        onOpenChange={(open) => setOpenIndex(open ? 0 : null)}
      />
      . The store already exposes a consistent snapshot for every subscriber
      <Citation
        index={1}
        source={SOURCES[1]}
        open={openIndex === 1}
        onOpenChange={(open) => setOpenIndex(open ? 1 : null)}
      />
      , so no extra reconciliation pass is needed.
    </InlineCitation>
  );
}
