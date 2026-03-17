"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { PriceSnapshotTool } from "@/components/tools/price-snapshot/PriceSnapshotTool";
import { PurchaseStockTool } from "@/components/tools/purchase-stock/PurchaseStockTool";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";

function ThreadWithSuggestions() {
  const aui = useAui({
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
    <AuiProvider value={aui}>
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
        <PriceSnapshotTool />
        <PurchaseStockTool />
      </div>
    </div>
  );
}
