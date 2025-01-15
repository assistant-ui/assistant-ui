"use client";

import { TransactionConfirmationPending } from "./transaction-confirmation-pending";
import { TransactionConfirmationFinal } from "./transaction-confirmation-final";
import { makeAssistantToolUI } from "@assistant-ui/react";

type PurchaseStockArgs = {
  ticker: string;
  companyName: string;
  quantity: number;
  maxPurchasePrice: number;
};

export const PurchaseStockTool = makeAssistantToolUI<PurchaseStockArgs, string>(
  {
    toolName: "purchase_stock",
    render: function PurchaseStockUI({
      args,
      argsText,
      result,
      status,
      addResult,
    }) {
      const resultObj = result
        ? (JSON.parse(result) as { transactionId: string })
        : undefined;

      const handleConfirm = async () => {
        addResult({ confirmed: true });
      };

      return (
        <div className="mb-4 flex flex-col items-center gap-2">
          <pre className="whitespace-pre-wrap">purchase_stock({argsText})</pre>
          {!resultObj && status.type !== "running" && (
            <TransactionConfirmationPending
              {...args}
              onConfirm={handleConfirm}
            />
          )}
          {resultObj && <TransactionConfirmationFinal {...args} />}
        </div>
      );
    },
  },
);
