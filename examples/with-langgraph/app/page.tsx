"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import {
  useAui,
  AuiProvider,
  AuiConfig,
  Suggestions,
  Tools,
} from "@assistant-ui/react";
import toolkit from "./toolkit";

function ThreadWithSuggestions() {
  const aui = useAui();
  const config = AuiConfig({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Check stock price",
        label: "get the latest AAPL snapshot",
        prompt: "What's the current price of AAPL?",
      },
      {
        title: "Buy shares",
        label: "execute a stock purchase",
        prompt: "Buy 10 shares of TSLA.",
      },
    ]),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      <Thread />
    </AuiProvider>
  );
}

export default function Home() {
  return (
    <div className="flex h-dvh">
      <div className="max-w-md">
        <ThreadList />
      </div>
      <div className="flex-grow">
        <ThreadWithSuggestions />
      </div>
    </div>
  );
}
