import type {
  RespondToToolApprovalOptions,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import type {
  OpenCodePermissionRequest,
  OpenCodePermissionResponse,
} from "./types";

type ToolCallApproval = NonNullable<ToolCallMessagePart["approval"]>;

export const projectOpenCodePermissionApproval = (
  request: OpenCodePermissionRequest,
): ToolCallApproval => ({
  id: request.id,
  options: [
    {
      id: "once",
      kind: "allow-once",
    },
    ...(request.always.length > 0
      ? [
          {
            id: "always",
            kind: "allow-always",
            description: "Allow these patterns until OpenCode is restarted.",
            grants: request.always,
            confirm: true,
          },
        ]
      : []),
    {
      id: "reject",
      kind: "reject-once",
    },
  ],
});

export const projectResolvedOpenCodePermissionApproval = (entry: {
  request: OpenCodePermissionRequest;
  reply: OpenCodePermissionResponse;
}): ToolCallApproval => ({
  id: entry.request.id,
  approved: entry.reply !== "reject",
  optionId: entry.reply,
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
