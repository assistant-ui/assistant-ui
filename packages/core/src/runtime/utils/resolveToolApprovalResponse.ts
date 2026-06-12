import type {
  ToolApprovalOption,
  ToolApprovalResponse,
} from "../../types/message";
import type { RespondToToolApprovalOptions } from "../interfaces/thread-runtime-core";

const APPROVED_BY_KIND: Record<string, boolean> = {
  "allow-once": true,
  "allow-always": true,
  "reject-once": false,
  "reject-always": false,
};

/**
 * Resolves a renderer-facing approval response (boolean or optionId form)
 * against the approval's option list into the runtime-facing decision shape.
 */
export const resolveToolApprovalResponse = (
  approval: {
    readonly id: string;
    readonly options?: readonly ToolApprovalOption[];
  },
  response: ToolApprovalResponse,
): RespondToToolApprovalOptions => {
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
  } else {
    approved = response.approved;
  }

  return {
    approvalId: approval.id,
    approved,
    ...(optionId !== undefined && { optionId }),
    ...(response.reason != null && { reason: response.reason }),
  };
};
