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
  const part = useAuiState("part");
  const label =
    part.type !== "file"
      ? ""
      : part.filename
        ? `[file: ${part.filename} ${part.mimeType}]`
        : `[file: ${part.mimeType}]`;
  return <Text {...props}>{label}</Text>;
};

MessagePartPrimitiveFile.displayName = "MessagePartPrimitive.File";
