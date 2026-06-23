"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BudgetDenyCode } from "@/lib/xulux/usage-budget-codes";
import { isDailyLimitCode } from "@/lib/xulux/usage-budget-codes";
import { Button } from "@/components/ui/button";

export type XuluxLimitBlock = {
  code: BudgetDenyCode;
  message: string;
};

type XuluxUsageBudgetContextValue = {
  limitBlock: XuluxLimitBlock | null;
  clearLimitBlock: () => void;
};

const XuluxUsageBudgetContext =
  createContext<XuluxUsageBudgetContextValue | null>(null);

export function XuluxUsageBudgetProvider({
  limitBlock,
  clearLimitBlock,
  children,
}: {
  limitBlock: XuluxLimitBlock | null;
  clearLimitBlock: () => void;
  children: ReactNode;
}) {
  return (
    <XuluxUsageBudgetContext.Provider value={{ limitBlock, clearLimitBlock }}>
      {children}
    </XuluxUsageBudgetContext.Provider>
  );
}

export function useXuluxUsageBudget(): XuluxUsageBudgetContextValue {
  const ctx = useContext(XuluxUsageBudgetContext);
  if (!ctx) {
    return { limitBlock: null, clearLimitBlock: () => {} };
  }
  return ctx;
}

export function parseXuluxLimitBlock(payload: unknown): XuluxLimitBlock | null {
  if (!payload || typeof payload !== "object") return null;
  const { code, error } = payload as { code?: unknown; error?: unknown };
  if (typeof code !== "string" || typeof error !== "string") return null;
  return { code: code as BudgetDenyCode, message: error };
}

export function XuluxUsageLimitBanner({
  onNewThread,
}: {
  onNewThread: () => void;
}): ReactNode {
  const { limitBlock } = useXuluxUsageBudget();
  if (!limitBlock) return null;

  const showNewChat = !isDailyLimitCode(limitBlock.code);

  return (
    <div
      className="border-destructive/30 bg-destructive/10 text-destructive mb-2 rounded-lg border px-3 py-2 text-xs dark:text-red-200"
      role="alert"
    >
      <p>{limitBlock.message}</p>
      {showNewChat ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-7"
          onClick={onNewThread}
        >
          New chat
        </Button>
      ) : null}
    </div>
  );
}
