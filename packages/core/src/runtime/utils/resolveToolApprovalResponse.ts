import {
  toolApprovalAcceptsText,
  type ToolApprovalDisplay,
  type ToolApprovalOption,
  type ToolApprovalResponse,
} from "../../types/message";
import type { RespondToToolApprovalOptions } from "../interfaces/thread-runtime-core";

const APPROVED_BY_KIND: Record<string, boolean> = {
  "allow-once": true,
  "allow-always": true,
  "reject-once": false,
  "reject-always": false,
};

/**
 * Resolves a renderer-facing approval response (boolean, optionId, or
 * free-form answer) against the approval's request shape into the
 * runtime-facing decision shape.
 */
export const resolveToolApprovalResponse = (
  approval: {
    readonly id: string;
    readonly display?: ToolApprovalDisplay;
    readonly allowFreeform?: boolean;
    readonly options?: readonly ToolApprovalOption[];
  },
  response: ToolApprovalResponse,
): RespondToToolApprovalOptions => {
  const text = response.text;
  if (text !== undefined && !toolApprovalAcceptsText(approval))
    throw new Error(
      `Tool approval "${approval.id}" does not accept a free-form answer; the request must declare display "text" or allowFreeform`,
    );

  let approved: boolean;
  let optionId: string | undefined;

  if ("optionId" in response) {
    const option = approval.options?.find((o) => o.id === response.optionId);
    if (!option)
      throw new Error(
        `Tool approval has no option with id "${response.optionId}"`,
      );

    if ("approved" in response) {
      approved = response.approved;
    } else {
      if (!Object.hasOwn(APPROVED_BY_KIND, option.kind))
        throw new Error(
          `Tool approval option "${option.id}" has a custom kind "${option.kind}"; respond with an explicit approved value instead`,
        );
      approved = APPROVED_BY_KIND[option.kind]!;
    }
    optionId = option.id;
  } else if ("approved" in response) {
    approved = response.approved;
  } else {
    // A bare answer resolves a question, where answering is not refusing. On a
    // decision the approval itself is the authorization, so inferring one from
    // a typed note would let the note authorize the call.
    if (approval.display !== "text" && approval.display !== "select")
      throw new Error(
        `Tool approval "${approval.id}" is a decision, not a question; respond with an explicit approved value, optionally alongside the answer`,
      );
    approved = true;
  }

  return {
    approvalId: approval.id,
    approved,
    ...(optionId !== undefined && { optionId }),
    ...(text !== undefined && { text }),
    ...(response.reason != null && { reason: response.reason }),
  };
};
