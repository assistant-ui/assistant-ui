import type { FC } from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type AttachmentNameProps = TextProps;

export const AttachmentName: FC<AttachmentNameProps> = (props) => {
  const name = useAuiState("attachment", (s) => s.name);
  return <Text {...props}>{name}</Text>;
};
