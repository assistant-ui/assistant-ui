import type { ComponentProps, FC } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type AttachmentThumbProps = ComponentProps<typeof Text>;

export const AttachmentThumb: FC<AttachmentThumbProps> = ({
  children,
  ...textProps
}) => {
  const attachment = useAuiState("attachment");
  const dot = attachment.name.lastIndexOf(".");
  const label =
    dot > 0 && dot < attachment.name.length - 1
      ? `.${attachment.name.slice(dot + 1)}`
      : attachment.type;
  return <Text {...textProps}>{children ?? label}</Text>;
};
