import type { ComponentProps, FC } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";
import { sanitizeTerminalText } from "../../sanitizeTerminalText";

export type AttachmentNameProps = ComponentProps<typeof Text>;

export const AttachmentName: FC<AttachmentNameProps> = (props) => {
  const name = useAuiState((s) => s.attachment.name);
  return <Text {...props}>{sanitizeTerminalText(name)}</Text>;
};
