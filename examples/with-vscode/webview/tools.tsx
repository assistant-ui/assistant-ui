import type {
  ToolCallMessagePartComponent,
  Toolkit,
} from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import {
  APPROVAL_TOOL_NAME,
  type ApprovalResult,
} from "../src/fixtures/fixtures";

const ApprovalToolUI: ToolCallMessagePartComponent<
  { action: string },
  ApprovalResult
> = ({ args, result, addResult }) => {
  if (result) {
    return (
      <p className="text-muted-foreground my-2 text-sm">
        {result.approved ? "Approved" : "Denied"}: {args.action}
      </p>
    );
  }
  return (
    <div className="my-2 flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm">
        Allow <span className="font-medium">{args.action}</span>?
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => addResult({ approved: true })}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => addResult({ approved: false })}
        >
          Deny
        </Button>
      </div>
    </div>
  );
};

export const toolkit: Toolkit = {
  [APPROVAL_TOOL_NAME]: {
    type: "human",
    description: "Ask the user to approve an action before running it.",
    parameters: {
      type: "object",
      properties: { action: { type: "string" } },
      required: ["action"],
    },
    render: ApprovalToolUI,
  },
};
