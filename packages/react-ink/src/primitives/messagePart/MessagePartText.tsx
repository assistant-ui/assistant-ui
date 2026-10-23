import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";
import { sanitizeTerminalText } from "../../sanitizeTerminalText";

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
  const text = useAuiState((s) => {
    if (s.part.type !== "text" && s.part.type !== "reasoning") return "";
    return s.part.text;
  });
  return <Text {...props}>{sanitizeTerminalText(text)}</Text>;
};

MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";
