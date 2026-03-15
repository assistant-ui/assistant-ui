import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

type StatusType = "idle" | "running" | "error";

const defaultFormat = (status: StatusType) => status;

const COLOR_MAP: Record<StatusType, string> = {
  idle: "green",
  running: "yellow",
  error: "red",
};

export type StatusBarStatusProps = {
  format?: (status: StatusType) => string;
};

export const StatusBarStatus = ({
  format = defaultFormat,
}: StatusBarStatusProps) => {
  const status = useAuiState((s): StatusType => {
    if (s.thread.isRunning) return "running";

    const lastMessage = s.thread.messages.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.status?.type === "incomplete" &&
      lastMessage.status.reason === "error"
    )
      return "error";

    return "idle";
  });

  return <Text color={COLOR_MAP[status]}>{format(status)}</Text>;
};

StatusBarStatus.displayName = "StatusBarPrimitive.Status";
