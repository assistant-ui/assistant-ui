import type { ComponentProps } from "react";
import { Text } from "ink";
import { useMessagePartFile } from "@assistant-ui/core/react";

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
  const { filename, mimeType } = useMessagePartFile();
  const label = filename
    ? `[file: ${filename} ${mimeType}]`
    : `[file: ${mimeType}]`;
  return <Text {...props}>{label}</Text>;
};

MessagePartPrimitiveFile.displayName = "MessagePartPrimitive.File";
