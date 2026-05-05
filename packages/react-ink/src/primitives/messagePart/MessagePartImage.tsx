import type { ComponentProps } from "react";
import { Text } from "ink";
import { useMessagePartImage } from "@assistant-ui/core/react";

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
  const { filename } = useMessagePartImage();
  return (
    <Text {...props}>{filename ? `[image: ${filename}]` : "[image]"}</Text>
  );
};

MessagePartPrimitiveImage.displayName = "MessagePartPrimitive.Image";
