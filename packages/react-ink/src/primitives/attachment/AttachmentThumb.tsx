import type { ComponentProps, FC } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type AttachmentThumbProps = ComponentProps<typeof Text>;

export const AttachmentThumb: FC<AttachmentThumbProps> = (props) => {
  const ext = useAuiState((s) => {
    const parts = s.attachment.name.split(".");
    return parts.length > 1 ? parts.pop()! : "";
  });
  return <Text {...props}>.{ext}</Text>;
};
