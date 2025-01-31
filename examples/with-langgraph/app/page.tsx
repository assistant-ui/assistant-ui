"use client";

import { Thread, ThreadList } from "@assistant-ui/react-ui";
import { PriceSnapshotTool } from "@/components/tools/price-snapshot/PriceSnapshotTool";
import { PurchaseStockTool } from "@/components/tools/purchase-stock/PurchaseStockTool";
import { ToolFallback } from "@/components/tools/ToolFallback";
import { makeMarkdownText } from "@assistant-ui/react-markdown";

const MarkdownText = makeMarkdownText({});

export default function Home() {
  return (
    <div className="flex h-full">
      <div className="max-w-md">
        <ThreadList />
      </div>
      <div className="flex-grow">
        <Thread
          welcome={{
            suggestions: [
              {
                prompt: "How much revenue did Apple make last year?",
              },
              {
                prompt: "Is McDonald's profitable?",
              },
              {
                prompt: "What's the current stock price of Tesla?",
              },
            ],
          }}
          assistantMessage={{
            components: { Text: MarkdownText, ToolFallback },
          }}
          tools={[PriceSnapshotTool, PurchaseStockTool]}
        />
      </div>
    </div>
  );
}
