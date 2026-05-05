import type { ComponentProps } from "react";
import { Text } from "ink";
import { useMessagePartText } from "@assistant-ui/core/react";

export type MessagePartPrimitiveTextProps = Omit<
  ComponentProps<typeof Text>,
  "children"
>;

export namespace MessagePartPrimitiveText {
  export type Props = MessagePartPrimitiveTextProps;
}

export const MessagePartPrimitiveText = (
  props: MessagePartPrimitiveText.Props,
) => {
  const { text } = useMessagePartText();
  return <Text {...props}>{text}</Text>;
};

MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";
