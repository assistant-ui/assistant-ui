"use client";

import { Thread } from "@assistant-ui/react";
import { PriceSnapshotTool } from "@/components/tools/price-snapshot/PriceSnapshotTool";
import { PurchaseStockTool } from "@/components/tools/purchase-stock/PurchaseStockTool";

export default function Home() {
  return (
    <div className="flex h-full flex-col">
      <Thread />
      <PriceSnapshotTool />
      <PurchaseStockTool />
    </div>
  );
}
