"use client";

import { useState } from "react";
import {
  QuoteReply,
  type QuoteAction,
} from "@/components/elements/quote-reply";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const ACTIONS: readonly QuoteAction[] = [
  { key: "quote", label: "Quote", icon: "quote" },
  { key: "explain", label: "Explain", icon: "explain" },
  { key: "rewrite", label: "Rewrite", icon: "rewrite" },
];

const SELECTION = "the converter drops parts with no text";
const PHASES = [1400, 0] as const;

export function QuoteReplyDemo() {
  const { phase, takeOver } = useStoryPhases(PHASES);
  const [quoted, setQuoted] = useState("");

  return (
    <QuoteReply
      before="The regression happens because "
      selection={SELECTION}
      after=", so an empty assistant turn never reaches the thread."
      actions={ACTIONS}
      toolbarVisible={phase >= 1 && quoted === ""}
      quoted={quoted}
      onAction={() => {
        takeOver();
        setQuoted(SELECTION);
      }}
    />
  );
}
