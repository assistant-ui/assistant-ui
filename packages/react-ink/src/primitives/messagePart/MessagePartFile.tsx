import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

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
  const label = useAuiState("part", (s) => {
    if (s.type !== "file") return "";
    const { filename, mimeType } = s;
    return filename ? `[file: ${filename} ${mimeType}]` : `[file: ${mimeType}]`;
  });
  return <Text {...props}>{label}</Text>;
};

MessagePartPrimitiveFile.displayName = "MessagePartPrimitive.File";
