import type {
  RespondToToolApprovalOptions,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import type {
  OpenCodePermissionRequest,
  OpenCodePermissionResponse,
} from "./types";

export const projectOpenCodePermissionApproval = (
  request: OpenCodePermissionRequest,
): NonNullable<ToolCallMessagePart["approval"]> => ({
  id: request.id,
  options: [
    {
      id: "once",
      kind: "allow-once",
      label: "Allow once",
    },
    {
      id: "always",
      kind: "allow-always",
      label: "Always allow",
      description: "Allow these patterns until OpenCode is restarted.",
      ...(request.always.length > 0 ? { grants: request.always } : {}),
      confirm: true,
    },
    {
      id: "reject",
      kind: "reject-once",
      label: "Reject",
    },
  ],
});

export const toOpenCodePermissionResponse = ({
  approved,
  optionId,
}: RespondToToolApprovalOptions): OpenCodePermissionResponse => {
  if (optionId === undefined) return approved ? "once" : "reject";

  if (optionId === "once" || optionId === "always") {
    if (!approved) {
      throw new Error(`OpenCode permission option "${optionId}" must approve`);
    }
    return optionId;
  }

  if (optionId === "reject") {
    if (approved) {
      throw new Error('OpenCode permission option "reject" must reject');
    }
    return "reject";
  }

  throw new Error(`Unknown OpenCode permission option "${optionId}"`);
};
