"use client";

import { useEffect } from "react";
import { ComposerPrimitive, useAui } from "@assistant-ui/react";
import {
  ComposerQuotePreview,
  QuoteBlock,
} from "@/components/assistant-ui/elements/quote.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

const SHORT = "The runtime system follows a layered architecture";
const LONG =
  "Each thread keeps its own composer, so a draft typed in one conversation never leaks into another. When the user switches threads, the composer state is saved to the thread list adapter and restored the next time that thread opens, including attachments that finished uploading.";

function UserMessage({ quote, text }: { quote: string; text: string }) {
  return (
    <div className="flex w-full max-w-md justify-end">
      <div className="bg-muted max-w-[85%] rounded-2xl px-4 py-2.5">
        <QuoteBlock text={quote} messageId="assistant-1" />
        <p className="text-foreground text-sm">{text}</p>
      </div>
    </div>
  );
}

function SeedQuote({ text }: { text: string }) {
  const aui = useAui();
  useEffect(() => {
    aui.composer.setQuote({ text, messageId: "assistant-1" });
    return () => aui.composer.setQuote(undefined);
  }, [aui, text]);
  return null;
}

function ComposerFixture({ quote }: { quote: string }) {
  return (
    <SampleRuntimeProvider>
      <SeedQuote text={quote} />
      <div className="w-full max-w-md">
        <ComposerPrimitive.Root className="bg-background flex flex-col rounded-2xl border">
          <ComposerQuotePreview className="mx-3 mt-3" />
          <ComposerPrimitive.Input
            placeholder="Ask about this passage..."
            rows={1}
            className="min-h-10 w-full resize-none bg-transparent px-4 py-3 text-sm outline-none"
          />
        </ComposerPrimitive.Root>
      </div>
    </SampleRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "composer-quote",
    label: "In composer",
    note: "A quoted passage waits above the input until the message is sent or dismissed.",
    Component: () => <ComposerFixture quote={SHORT} />,
  },
  {
    key: "sent",
    label: "Sent",
    note: "The quote rides above the user's question in the sent message.",
    Component: () => (
      <UserMessage
        quote={SHORT}
        text="Can you explain how the layers connect?"
      />
    ),
  },
  {
    key: "long-content",
    label: "Long quote",
    note: "A long passage clamps to two lines in both the composer and the message.",
    Component: () => (
      <div className="flex w-full max-w-md flex-col gap-6">
        <UserMessage quote={LONG} text="Does this also cover remote threads?" />
        <ComposerFixture quote={LONG} />
      </div>
    ),
  },
]);
