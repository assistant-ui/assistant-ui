"use generative";

import { defineToolkit, externalTool } from "@assistant-ui/react";
import { PriceSnapshotToolUI } from "@/components/tools/price-snapshot/PriceSnapshotTool";
import { PurchaseStockToolUI } from "@/components/tools/purchase-stock/PurchaseStockTool";

export default defineToolkit({
  price_snapshot: {
    execute: externalTool(),
    render: PriceSnapshotToolUI,
  },
  purchase_stock: {
    execute: externalTool(),
    render: PurchaseStockToolUI,
  },
});
