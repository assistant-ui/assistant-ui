"use client";

import type { ReactNode } from "react";
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/elements/reasoning.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

const STEPS = [
  "The user wants the cheapest way to cut cold-start time on the docs search route.",
  "Moving the embedding model into a module-level singleton avoids reloading it on every request, which accounts for most of the 1.8s.",
  "Caching the top 200 queries would also help, but it adds invalidation work whenever the docs are rebuilt.",
  "Lazy-loading the reranker only matters on long queries, so it is the lowest priority.",
];

function Frame({ children }: { children: ReactNode }) {
  return (
    <SampleRuntimeProvider>
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </SampleRuntimeProvider>
  );
}

function Paragraphs({ lines }: { lines: string[] }) {
  return lines.map((line) => <p key={line}>{line}</p>);
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "Reasoning is still arriving, so the panel holds open with a live preview.",
    Component: () => (
      <Frame>
        <ReasoningRoot streaming className="mb-0">
          <ReasoningTrigger active />
          <ReasoningContent aria-busy>
            <ReasoningText>
              <Paragraphs lines={STEPS.slice(0, 2)} />
            </ReasoningText>
          </ReasoningContent>
        </ReasoningRoot>
      </Frame>
    ),
  },
  {
    key: "collapsed",
    label: "Collapsed",
    note: "Finished reasoning folds away and the trigger shows how long it took.",
    Component: () => (
      <Frame>
        <ReasoningRoot className="mb-0">
          <ReasoningTrigger duration={14} />
          <ReasoningContent>
            <ReasoningText>
              <Paragraphs lines={STEPS} />
            </ReasoningText>
          </ReasoningContent>
        </ReasoningRoot>
      </Frame>
    ),
  },
  {
    key: "long-content",
    label: "Long reasoning",
    note: "Reasoning taller than the panel scrolls inside its own region.",
    Component: () => (
      <Frame>
        <ReasoningRoot defaultOpen className="mb-0">
          <ReasoningTrigger duration={41} />
          <ReasoningContent>
            <ReasoningText>
              <Paragraphs lines={STEPS} />
              <p>
                Checking the trace again: the first request after a deploy
                spends 1.2s loading the model, 0.4s warming the vector index,
                and 0.2s in the reranker.
              </p>
              <p>
                A singleton fixes the first two on every warm instance. The
                cache would only shave the remaining 0.2s for repeated queries,
                which are about a third of traffic.
              </p>
              <p>
                So the order is: singleton first, measure again, then decide
                whether the cache is worth the invalidation work.
              </p>
            </ReasoningText>
          </ReasoningContent>
        </ReasoningRoot>
      </Frame>
    ),
  },
]);
