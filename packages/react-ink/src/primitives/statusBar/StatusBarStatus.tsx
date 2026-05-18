import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type StatusType = "idle" | "running" | "error" | "cancelled";

const defaultFormat = (status: StatusType) => status;

const COLOR_MAP: Record<StatusType, string> = {
  idle: "green",
  running: "yellow",
  error: "red",
  cancelled: "gray",
};

export type StatusBarPrimitiveStatusProps = {
  format?: (status: StatusType) => string;
};

export namespace StatusBarPrimitiveStatus {
  export type Props = StatusBarPrimitiveStatusProps;
}

export const StatusBarPrimitiveStatus = ({
  format = defaultFormat,
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

  return <Text color={COLOR_MAP[status]}>{format(status)}</Text>;
};

StatusBarPrimitiveStatus.displayName = "StatusBarPrimitive.Status";
