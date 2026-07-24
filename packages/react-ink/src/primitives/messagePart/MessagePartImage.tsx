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
  const label = useAuiState((s) => {
    if (s.part.type !== "image") return "";
    return s.part.filename ? `[image: ${s.part.filename}]` : "[image]";
  });
  return <Text {...props}>{label}</Text>;
};

MessagePartPrimitiveImage.displayName = "MessagePartPrimitive.Image";
