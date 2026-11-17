import type { ToolApprovalStatus } from "ai";
import {
  AUTO_REFUND_LIMIT,
  formatMoney,
  isFailure,
  quoteRefund,
  refundParameters,
  refundSummary,
} from "./orders";

/**
 * Decides whether a refund runs on its own or waits for a person. The amount
 * comes from the order on record, so the model cannot talk its way under the
 * limit by describing a smaller refund.
 */
export function refundApproval(input: unknown): ToolApprovalStatus {
  const request = refundParameters.safeParse(input);
  if (!request.success) return "not-applicable";

  const quote = quoteRefund(request.data);
  if (isFailure(quote)) return "not-applicable";

  if (quote.total <= AUTO_REFUND_LIMIT) {
    return {
      type: "approved",
      reason: `Within the ${formatMoney(AUTO_REFUND_LIMIT)} automatic refund limit`,
    };
  }
  return { type: "user-approval", reason: refundSummary(quote) };
}
