import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type MessagePartPrimitiveImageProps = Omit<
  ComponentProps<typeof Text>,
  "children"
>;

export namespace MessagePartPrimitiveImage {
  export type Props = MessagePartPrimitiveImageProps;
}

export const MessagePartPrimitiveImage = (
  props: MessagePartPrimitiveImage.Props,
) => {
  const filename = useAuiState((s) => {
    if (s.part.type !== "image")
      throw new Error(
        "MessagePartPrimitive.Image can only be used inside image message parts.",
      );
    return s.part.filename;
  });
  return (
    <Text {...props}>{filename ? `[image: ${filename}]` : "[image]"}</Text>
  );
};

MessagePartPrimitiveImage.displayName = "MessagePartPrimitive.Image";
