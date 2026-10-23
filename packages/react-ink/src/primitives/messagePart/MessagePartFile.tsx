import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";
import { sanitizeTerminalText } from "../../sanitizeTerminalText";

export type MessagePartPrimitiveFileProps = Omit<
  ComponentProps<typeof Text>,
  "children"
>;

export namespace MessagePartPrimitiveFile {
  export type Props = MessagePartPrimitiveFileProps;
}

export const MessagePartPrimitiveFile = (
  props: MessagePartPrimitiveFile.Props,
) => {
  const label = useAuiState((s) => {
    if (s.part.type !== "file") return "";
    const { filename, mimeType } = s.part;
    return filename ? `[file: ${filename} ${mimeType}]` : `[file: ${mimeType}]`;
  });
  return <Text {...props}>{sanitizeTerminalText(label)}</Text>;
};

MessagePartPrimitiveFile.displayName = "MessagePartPrimitive.File";
