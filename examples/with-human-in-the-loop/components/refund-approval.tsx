"use client";

import { useState } from "react";
import { BanknoteIcon } from "lucide-react";
import type {
  ToolApprovalResponse,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  ApprovalCard,
  type ApprovalState,
} from "@/components/assistant-ui/elements/approval-card";
import {
  AUTO_REFUND_LIMIT,
  formatMoney,
  isFailure,
  refundSummary,
  type RefundRequest,
  type RefundResult,
} from "../lib/orders";

type RefundCall = ToolCallMessagePartProps<RefundRequest, RefundResult>;

function refundState({ approval, result, isError, status }: RefundCall): {
  state: ApprovalState;
  receipt?: string;
} {
  if (approval?.approved === false) {
    return { state: "denied", receipt: "Denied · nothing refunded" };
  }
  if (approval?.resolution) {
    return { state: "denied", receipt: "Not answered · nothing refunded" };
  }
  if (isError || status.type === "incomplete") {
    return { state: "denied", receipt: "Nothing refunded" };
  }
  if (isFailure(result)) return { state: "denied", receipt: result.error };
  if (result) {
    const refunded = `refunded ${formatMoney(result.total)}`;
    return {
      state: "done",
      receipt:
        approval && !approval.isAutomatic
          ? `Approved · ${refunded}`
          : `Refunded ${formatMoney(result.total)}`,
    };
  }
  if (approval && approval.approved === undefined) return { state: "request" };
  return {
    state: "running",
    receipt: approval ? "Approved · refunding" : "Preparing the refund",
  };
}

export const RefundApproval: ToolCallMessagePartComponent<
  RefundRequest,
  RefundResult
> = (call) => {
  const { args, approval, respondToApproval, result, isError } = call;
  const [error, setError] = useState<string>();

  const answer = async (response: ToolApprovalResponse) => {
    setError(undefined);
    try {
      await respondToApproval(response);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  const { state, receipt } = refundState(call);
  const refund = result && !isError && !isFailure(result) ? result : undefined;

  return (
    <div className="my-2 flex flex-col gap-2">
      <ApprovalCard
        state={state}
        icon={<BanknoteIcon className="size-4" />}
        title={`Refund order ${args.orderId ?? ""}`}
        subtitle={
          approval?.isAutomatic
            ? (approval.reason ?? "Approved by policy")
            : approval
              ? `Over the ${formatMoney(AUTO_REFUND_LIMIT)} automatic refund limit`
              : "Customer refund"
        }
        description={approval?.prompt ?? (refund && refundSummary(refund))}
        details={args.reason ? [{ label: "Reason", value: args.reason }] : []}
        allowOnceLabel="Approve refund"
        statusLabel={receipt}
        onAllowOnce={() => void answer({ approved: true })}
        onDeny={() => void answer({ approved: false })}
      />
      {error && (
        <p role="alert" className="text-destructive max-w-sm text-xs">
          {error}
        </p>
      )}
    </div>
  );
};
