import type { ComponentProps, FC } from "react";
import { Text } from "ink";
import Spinner from "ink-spinner";
import { useAuiState } from "@assistant-ui/store";

export type AttachmentStatusProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  showComplete?: boolean | undefined;
};

export const AttachmentStatus: FC<AttachmentStatusProps> = ({
  showComplete,
  ...textProps
}) => {
  const status = useAuiState((s) => s.attachment.status);

  if (status.type === "running") {
    const percent = Math.round(status.progress * 100);
    return (
      <Text {...textProps} color={textProps.color ?? "yellow"}>
        <Spinner type="line" /> uploading {percent}%
      </Text>
    );
  }

  if (status.type === "requires-action") {
    return (
      <Text {...textProps} color={textProps.color ?? "cyan"}>
        ? pending
      </Text>
    );
  }

  if (status.type === "incomplete" && status.reason === "error") {
    return (
      <Text {...textProps} color={textProps.color ?? "red"}>
        x error
      </Text>
    );
  }

  if (status.type === "incomplete" && status.reason === "upload-paused") {
    return (
      <Text {...textProps} color={textProps.color ?? "yellow"}>
        || paused
      </Text>
    );
  }

  if (status.type === "complete" && showComplete) {
    return (
      <Text {...textProps} color={textProps.color ?? "green"}>
        + ready
      </Text>
    );
  }

  return null;
};
