"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { PriceSnapshotToolUI } from "@/components/tools/price-snapshot/PriceSnapshotTool";
import { PurchaseStockToolUI } from "@/components/tools/purchase-stock/PurchaseStockTool";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import {
  useAui,
  AuiProvider,
  Suggestions,
  Tools,
  type Toolkit,
} from "@assistant-ui/react";

const toolkit = {
  price_snapshot: {
    type: "backend",
    render: PriceSnapshotToolUI,
  },
  purchase_stock: {
    type: "backend",
    render: PurchaseStockToolUI,
  },
} satisfies Toolkit;

function ThreadWithSuggestions() {
  const aui = useAui({
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
      </div>
    </div>
  );
}
