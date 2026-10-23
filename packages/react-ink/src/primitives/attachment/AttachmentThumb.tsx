import type { ComponentProps, FC } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";
import { sanitizeTerminalText } from "../../sanitizeTerminalText";

export type AttachmentThumbProps = ComponentProps<typeof Text>;

export const AttachmentThumb: FC<AttachmentThumbProps> = ({
  children,
  ...textProps
}) => {
  const label = useAuiState((s) => {
    const name = s.attachment.name;
    const dot = name.lastIndexOf(".");
    if (dot > 0 && dot < name.length - 1) {
      return `.${name.slice(dot + 1)}`;
    }
    return s.attachment.type;
  });
  return <Text {...textProps}>{children ?? sanitizeTerminalText(label)}</Text>;
};
