import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

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
  const text = useAuiState("part", (s) => {
    if (s.type !== "text" && s.type !== "reasoning") return "";
    return s.text;
  });
  return <Text {...props}>{text}</Text>;
};

MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";
