"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { PriceSnapshotTool } from "@/components/tools/price-snapshot/PriceSnapshotTool";
import { PurchaseStockTool } from "@/components/tools/purchase-stock/PurchaseStockTool";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export default function Home() {
  return (
    <div className="flex h-dvh">
      <div className="max-w-md">
        <ThreadList />
      </div>
      <div className="flex-grow">
        <Thread />
        <PriceSnapshotTool />
        <PurchaseStockTool />
      </div>
    </div>
  );
}
