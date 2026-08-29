import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState, type AssistantState } from "@assistant-ui/store";

export type StatusType = "idle" | "running" | "error" | "cancelled";

const defaultFormat = (status: StatusType) => status;

const getStatus = (thread: AssistantState["thread"]): StatusType => {
  if (thread.isRunning) return "running";

  const lastAssistant = thread.messages.findLast((m) => m.role === "assistant");
  if (lastAssistant?.status?.type === "incomplete") {
    if (lastAssistant.status.reason === "error") return "error";
    if (lastAssistant.status.reason === "cancelled") return "cancelled";
  }

  return "idle";
};

export type StatusBarPrimitiveStatusProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  format?: (status: StatusType) => string;
};

export namespace StatusBarPrimitiveStatus {
  export type Props = StatusBarPrimitiveStatusProps;
}

export const StatusBarPrimitiveStatus = ({
  format = defaultFormat,
  ...textProps
}: StatusBarPrimitiveStatus.Props) => {
  const thread = useAuiState("thread");
  const status = getStatus(thread);

  return <Text {...textProps}>{format(status)}</Text>;
};

StatusBarPrimitiveStatus.displayName = "StatusBarPrimitive.Status";
