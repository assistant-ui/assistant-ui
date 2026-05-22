import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type StatusType = "idle" | "running" | "error" | "cancelled";

const defaultFormat = (status: StatusType) => status;

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
  const status = useAuiState((s): StatusType => {
    if (s.thread.isRunning) return "running";

    const lastAssistant = s.thread.messages.findLast(
      (m) => m.role === "assistant",
    );
    if (lastAssistant?.status?.type === "incomplete") {
      if (lastAssistant.status.reason === "error") return "error";
      if (lastAssistant.status.reason === "cancelled") return "cancelled";
    }

    return "idle";
  });

  return <Text {...textProps}>{format(status)}</Text>;
};

StatusBarPrimitiveStatus.displayName = "StatusBarPrimitive.Status";
