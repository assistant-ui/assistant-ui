import type { FC } from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type AttachmentThumbProps = TextProps;

export const AttachmentThumb: FC<AttachmentThumbProps> = (props) => {
  const ext = useAuiState((s) => {
    const parts = s.attachment.name.split(".");
    return parts.length > 1 ? parts.pop()! : "";
  });
  return <Text {...props}>.{ext}</Text>;
};
